use std::fs;
use std::path::PathBuf;

use parking_lot::Mutex;
use rusqlite::{Connection, OptionalExtension, params};
use thiserror::Error;

use crate::domain::assets::{Asset, AssetClass, Watchlist, WatchlistAsset};
use crate::domain::collection::{MarketObservationInput, SourceCollectionResult};
use crate::domain::content::{
    ContentOverview, ContentSource, ContentSourceResult, ContentSourceStatus, SourceDocumentInput,
};
use crate::domain::market::{LatestCollectionRun, MarketSnapshot};

const INITIAL_SCHEMA: &str = include_str!("migrations/0001_initial.sql");
const SETTINGS_SCHEMA: &str = include_str!("migrations/0002_settings.sql");
const MARKET_CORE_SCHEMA: &str = include_str!("migrations/0003_market_core.sql");
const COLLECTION_SCHEMA: &str = include_str!("migrations/0004_collection_runs.sql");
const CONTENT_SOURCES_SCHEMA: &str = include_str!("migrations/0005_content_sources.sql");

pub struct Database {
    connection: Mutex<Connection>,
}

#[derive(Debug, Error)]
pub enum DatabaseError {
    #[error("não foi possível preparar o diretório do banco local")]
    CreateDirectory(#[from] std::io::Error),
    #[error("falha ao acessar o banco local")]
    Sqlite(#[from] rusqlite::Error),
    #[error("ativo não encontrado no catálogo")]
    AssetNotFound,
    #[error("a watchlist atingiu o limite configurado")]
    WatchlistLimitExceeded,
}

impl Database {
    pub fn open(path: PathBuf) -> Result<Self, DatabaseError> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        let connection = Connection::open(path)?;
        connection.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;",
        )?;
        connection.execute_batch(INITIAL_SCHEMA)?;
        apply_migration(&connection, 2, SETTINGS_SCHEMA)?;
        apply_migration(&connection, 3, MARKET_CORE_SCHEMA)?;
        apply_migration(&connection, 4, COLLECTION_SCHEMA)?;
        apply_migration(&connection, 5, CONTENT_SOURCES_SCHEMA)?;

        Ok(Self {
            connection: Mutex::new(connection),
        })
    }

    pub fn is_healthy(&self) -> bool {
        self.connection
            .lock()
            .query_row("SELECT 1", [], |_| Ok(()))
            .is_ok()
    }

    pub fn read_bool_setting(&self, key: &str) -> Result<bool, DatabaseError> {
        let value = self.read_setting(key)?;
        Ok(value.is_some_and(|stored| stored == "true"))
    }

    pub fn read_setting_or(&self, key: &str, default: &str) -> Result<String, DatabaseError> {
        Ok(self
            .read_setting(key)?
            .unwrap_or_else(|| default.to_owned()))
    }

    pub fn read_u8_setting(&self, key: &str, default: u8) -> Result<u8, DatabaseError> {
        Ok(self
            .read_setting(key)?
            .and_then(|value| value.parse::<u8>().ok())
            .unwrap_or(default))
    }

    pub fn write_settings(
        &self,
        settings: &[(impl AsRef<str>, String)],
    ) -> Result<(), DatabaseError> {
        let mut connection = self.connection.lock();
        let transaction = connection.transaction()?;
        for (key, value) in settings {
            transaction.execute(
                "INSERT INTO app_settings (key, value, updated_at)
                 VALUES (?1, ?2, CURRENT_TIMESTAMP)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
                params![key.as_ref(), value],
            )?;
        }
        transaction.commit()?;
        Ok(())
    }

    pub fn list_assets(
        &self,
        query: Option<&str>,
        asset_class: Option<AssetClass>,
    ) -> Result<Vec<Asset>, DatabaseError> {
        let query_pattern = query.map(|value| format!("%{}%", escape_like(value)));
        let class = asset_class.map(AssetClass::as_storage_value);
        let connection = self.connection.lock();
        let mut statement = connection.prepare(
            "SELECT DISTINCT a.id, a.symbol, a.name, a.asset_class, a.exchange, a.currency, a.country_code
             FROM assets a
             LEFT JOIN asset_aliases aa ON aa.asset_id = a.id
             WHERE a.active = 1
               AND (?1 IS NULL OR a.asset_class = ?1)
               AND (?2 IS NULL OR a.symbol LIKE ?2 ESCAPE '\\' COLLATE NOCASE
                    OR a.name LIKE ?2 ESCAPE '\\' COLLATE NOCASE
                    OR aa.alias LIKE ?2 ESCAPE '\\' COLLATE NOCASE)
             ORDER BY a.asset_class, a.symbol",
        )?;
        let rows = statement.query_map(params![class, query_pattern], map_asset)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn default_watchlist(&self, limit: u8) -> Result<Watchlist, DatabaseError> {
        let connection = self.connection.lock();
        let (id, name) = connection.query_row(
            "SELECT id, name FROM watchlists WHERE is_default = 1",
            [],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )?;
        let mut statement = connection.prepare(
            "SELECT a.id, a.symbol, a.name, a.asset_class, a.exchange, a.currency, a.country_code,
                    wa.enabled, wa.added_at
             FROM watchlist_assets wa
             JOIN assets a ON a.id = wa.asset_id
             WHERE wa.watchlist_id = ?1
             ORDER BY wa.added_at, a.symbol",
        )?;
        let assets = statement
            .query_map(params![id], |row| {
                Ok(WatchlistAsset {
                    asset: map_asset(row)?,
                    enabled: row.get(7)?,
                    added_at: row.get(8)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(Watchlist {
            id,
            name,
            limit,
            assets,
        })
    }

    pub fn add_default_watchlist_asset(
        &self,
        asset_id: &str,
        limit: u8,
    ) -> Result<(), DatabaseError> {
        let mut connection = self.connection.lock();
        let transaction = connection.transaction()?;
        let asset_exists = transaction.query_row(
            "SELECT EXISTS(SELECT 1 FROM assets WHERE id = ?1 AND active = 1)",
            params![asset_id],
            |row| row.get::<_, bool>(0),
        )?;
        if !asset_exists {
            return Err(DatabaseError::AssetNotFound);
        }
        let already_present = transaction.query_row(
            "SELECT EXISTS(
                SELECT 1 FROM watchlist_assets
                WHERE watchlist_id = 'watchlist:default' AND asset_id = ?1
             )",
            params![asset_id],
            |row| row.get::<_, bool>(0),
        )?;
        if already_present {
            return Ok(());
        }
        let current_count = transaction.query_row(
            "SELECT COUNT(*) FROM watchlist_assets WHERE watchlist_id = 'watchlist:default'",
            [],
            |row| row.get::<_, u8>(0),
        )?;
        if current_count >= limit.min(50) {
            return Err(DatabaseError::WatchlistLimitExceeded);
        }
        transaction.execute(
            "INSERT INTO watchlist_assets (watchlist_id, asset_id)
             VALUES ('watchlist:default', ?1)",
            params![asset_id],
        )?;
        transaction.commit()?;
        Ok(())
    }

    pub fn remove_default_watchlist_asset(&self, asset_id: &str) -> Result<(), DatabaseError> {
        self.connection.lock().execute(
            "DELETE FROM watchlist_assets
             WHERE watchlist_id = 'watchlist:default' AND asset_id = ?1",
            params![asset_id],
        )?;
        Ok(())
    }

    pub fn start_collection_run(
        &self,
        run_id: &str,
        trigger_kind: &str,
        started_at: &str,
    ) -> Result<(), DatabaseError> {
        self.connection.lock().execute(
            "INSERT INTO collection_runs (id, trigger_kind, status, started_at)
             VALUES (?1, ?2, 'running', ?3)",
            params![run_id, trigger_kind, started_at],
        )?;
        Ok(())
    }

    pub fn store_market_observations(
        &self,
        observations: &[MarketObservationInput],
    ) -> Result<usize, DatabaseError> {
        let mut connection = self.connection.lock();
        let transaction = connection.transaction()?;
        let mut stored_count = 0;
        for observation in observations {
            stored_count += transaction.execute(
                "INSERT INTO market_observations (
                    id, asset_id, source_id, interval, observed_at,
                    open_value, high_value, low_value, close_value, volume_value, collected_at
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
                 ON CONFLICT(asset_id, source_id, interval, observed_at) DO UPDATE SET
                    open_value = excluded.open_value,
                    high_value = excluded.high_value,
                    low_value = excluded.low_value,
                    close_value = excluded.close_value,
                    volume_value = excluded.volume_value,
                    collected_at = excluded.collected_at",
                params![
                    observation.id,
                    observation.asset_id,
                    observation.source_id,
                    observation.interval,
                    observation.observed_at,
                    observation.open_value,
                    observation.high_value,
                    observation.low_value,
                    observation.close_value,
                    observation.volume_value,
                    observation.collected_at,
                ],
            )?;
        }
        transaction.commit()?;
        Ok(stored_count)
    }

    pub fn finish_collection_run(
        &self,
        run_id: &str,
        status: &str,
        completed_at: &str,
        stored_observation_count: usize,
        source_error_count: usize,
        sources: &[SourceCollectionResult],
    ) -> Result<(), DatabaseError> {
        let mut connection = self.connection.lock();
        let transaction = connection.transaction()?;
        for source in sources {
            transaction.execute(
                "INSERT INTO collection_run_sources (
                    run_id, source_id, status, stored_observation_count, skipped_asset_count, error_code
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    run_id,
                    source.source_id,
                    source.status,
                    source.stored_observation_count as i64,
                    source.skipped_asset_count as i64,
                    source.error_code,
                ],
            )?;
        }
        transaction.execute(
            "UPDATE collection_runs
             SET status = ?2, completed_at = ?3, stored_observation_count = ?4, source_error_count = ?5
             WHERE id = ?1",
            params![
                run_id,
                status,
                completed_at,
                stored_observation_count as i64,
                source_error_count as i64
            ],
        )?;
        transaction.commit()?;
        Ok(())
    }

    pub fn market_snapshots(&self) -> Result<Vec<MarketSnapshot>, DatabaseError> {
        let connection = self.connection.lock();
        let mut statement = connection.prepare(
            "WITH ranked AS (
                SELECT mo.*,
                       ROW_NUMBER() OVER (
                           PARTITION BY mo.asset_id
                           ORDER BY mo.observed_at DESC, mo.collected_at DESC
                       ) AS position
                FROM market_observations mo
             )
             SELECT a.id, a.symbol, a.name, a.asset_class, a.exchange, a.currency, a.country_code,
                    latest.close_value, previous.close_value, latest.observed_at,
                    source.name, latest.interval
             FROM watchlist_assets wa
             JOIN watchlists w ON w.id = wa.watchlist_id AND w.is_default = 1
             JOIN assets a ON a.id = wa.asset_id
             LEFT JOIN ranked latest ON latest.asset_id = a.id AND latest.position = 1
             LEFT JOIN ranked previous ON previous.asset_id = a.id AND previous.position = 2
             LEFT JOIN sources source ON source.id = latest.source_id
             WHERE wa.enabled = 1
             ORDER BY a.asset_class, a.symbol",
        )?;
        let snapshots = statement
            .query_map([], |row| {
                let close_value = row.get::<_, Option<f64>>(7)?;
                let previous_close_value = row.get::<_, Option<f64>>(8)?;
                let change_percent =
                    close_value
                        .zip(previous_close_value)
                        .and_then(|(current, previous)| {
                            if previous == 0.0 {
                                None
                            } else {
                                Some(((current / previous) - 1.0) * 100.0)
                            }
                        });
                Ok(MarketSnapshot {
                    asset: map_asset(row)?,
                    close_value,
                    previous_close_value,
                    change_percent,
                    observed_at: row.get(9)?,
                    source_name: row.get(10)?,
                    interval: row.get(11)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(snapshots)
    }

    pub fn latest_collection_run(&self) -> Result<Option<LatestCollectionRun>, DatabaseError> {
        self.connection
            .lock()
            .query_row(
                "SELECT id, status, started_at, completed_at,
                        stored_observation_count, source_error_count
                 FROM collection_runs
                 ORDER BY started_at DESC
                 LIMIT 1",
                [],
                |row| {
                    Ok(LatestCollectionRun {
                        run_id: row.get(0)?,
                        status: row.get(1)?,
                        started_at: row.get(2)?,
                        completed_at: row.get(3)?,
                        stored_observation_count: row.get::<_, i64>(4)? as usize,
                        source_error_count: row.get::<_, i64>(5)? as usize,
                    })
                },
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn enabled_content_sources(&self) -> Result<Vec<ContentSource>, DatabaseError> {
        let connection = self.connection.lock();
        let mut statement = connection.prepare(
            "SELECT id, name, source_kind, base_url
             FROM sources
             WHERE enabled = 1 AND source_kind IN ('rss', 'reddit')
             ORDER BY source_kind, name",
        )?;
        statement
            .query_map([], |row| {
                Ok(ContentSource {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    source_kind: row.get(2)?,
                    base_url: row.get(3)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()
            .map_err(Into::into)
    }

    pub fn store_source_documents(
        &self,
        documents: &[SourceDocumentInput],
    ) -> Result<usize, DatabaseError> {
        let mut connection = self.connection.lock();
        let transaction = connection.transaction()?;
        let mut stored_count = 0;
        for document in documents {
            let duplicate_of_id = transaction
                .query_row(
                    "SELECT id FROM source_documents
                     WHERE content_hash = ?1 AND id <> ?2
                     ORDER BY collected_at
                     LIMIT 1",
                    params![document.content_hash, document.id],
                    |row| row.get::<_, String>(0),
                )
                .optional()?;
            stored_count += transaction.execute(
                "INSERT OR IGNORE INTO source_documents (
                    id, source_id, external_id, canonical_url, title, raw_text,
                    author_reference, language, published_at, collected_at, content_hash,
                    duplicate_of_id, retention_expires_at
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
                params![
                    document.id,
                    document.source_id,
                    document.external_id,
                    document.canonical_url,
                    document.title,
                    document.raw_text,
                    document.author_reference,
                    document.language,
                    document.published_at,
                    document.collected_at,
                    document.content_hash,
                    duplicate_of_id,
                    document.retention_expires_at,
                ],
            )?;
        }
        transaction.commit()?;
        Ok(stored_count)
    }

    pub fn purge_expired_source_documents(&self, now: &str) -> Result<usize, DatabaseError> {
        self.connection
            .lock()
            .execute(
                "DELETE FROM source_documents
                 WHERE retention_expires_at IS NOT NULL AND retention_expires_at <= ?1",
                params![now],
            )
            .map_err(Into::into)
    }

    pub fn update_content_source_state(
        &self,
        result: &ContentSourceResult,
        collected_at: &str,
    ) -> Result<(), DatabaseError> {
        self.connection.lock().execute(
            "INSERT INTO source_collection_state (
                source_id, status, stored_document_count, last_collected_at, error_code
             ) VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(source_id) DO UPDATE SET
                status = excluded.status,
                stored_document_count = excluded.stored_document_count,
                last_collected_at = excluded.last_collected_at,
                error_code = excluded.error_code",
            params![
                result.source_id,
                result.status,
                result.stored_document_count as i64,
                collected_at,
                result.error_code,
            ],
        )?;
        Ok(())
    }

    pub fn content_overview(&self) -> Result<ContentOverview, DatabaseError> {
        let connection = self.connection.lock();
        let mut statement = connection.prepare(
            "SELECT s.id, s.name, s.source_kind, s.collection_method, s.enabled,
                    COUNT(sd.id) AS document_count,
                    scs.status, scs.last_collected_at, scs.error_code
             FROM sources s
             LEFT JOIN source_documents sd ON sd.source_id = s.id
             LEFT JOIN source_collection_state scs ON scs.source_id = s.id
             WHERE s.source_kind IN ('rss', 'reddit', 'forum', 'x')
             GROUP BY s.id
             ORDER BY s.enabled DESC, s.source_kind, s.name",
        )?;
        let sources = statement
            .query_map([], |row| {
                Ok(ContentSourceStatus {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    source_kind: row.get(2)?,
                    collection_method: row.get(3)?,
                    enabled: row.get(4)?,
                    document_count: row.get::<_, i64>(5)? as usize,
                    status: row.get(6)?,
                    last_collected_at: row.get(7)?,
                    error_code: row.get(8)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        let total_document_count = connection.query_row(
            "SELECT COUNT(*) FROM source_documents WHERE duplicate_of_id IS NULL",
            [],
            |row| row.get::<_, i64>(0),
        )? as usize;
        let unclassified_document_count = connection.query_row(
            "SELECT COUNT(*)
             FROM source_documents sd
             WHERE sd.duplicate_of_id IS NULL
               AND NOT EXISTS (
                   SELECT 1 FROM document_assets da WHERE da.document_id = sd.id
               )",
            [],
            |row| row.get::<_, i64>(0),
        )? as usize;
        Ok(ContentOverview {
            sources,
            total_document_count,
            unclassified_document_count,
        })
    }

    fn read_setting(&self, key: &str) -> Result<Option<String>, DatabaseError> {
        Ok(self
            .connection
            .lock()
            .query_row(
                "SELECT value FROM app_settings WHERE key = ?1",
                params![key],
                |row| row.get::<_, String>(0),
            )
            .optional()?)
    }
}

fn map_asset(row: &rusqlite::Row<'_>) -> Result<Asset, rusqlite::Error> {
    let stored_class = row.get::<_, String>(3)?;
    let asset_class = AssetClass::from_storage_value(&stored_class).ok_or_else(|| {
        rusqlite::Error::FromSqlConversionFailure(
            3,
            rusqlite::types::Type::Text,
            format!("classe de ativo inválida: {stored_class}").into(),
        )
    })?;
    Ok(Asset {
        id: row.get(0)?,
        symbol: row.get(1)?,
        name: row.get(2)?,
        asset_class,
        exchange: row.get(4)?,
        currency: row.get(5)?,
        country_code: row.get(6)?,
    })
}

fn escape_like(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

fn apply_migration(
    connection: &Connection,
    version: u32,
    sql: &str,
) -> Result<(), rusqlite::Error> {
    let applied = connection.query_row(
        "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = ?1)",
        params![version],
        |row| row.get::<_, bool>(0),
    )?;
    if !applied {
        connection.execute_batch(sql)?;
        connection.execute(
            "INSERT INTO schema_migrations (version) VALUES (?1)",
            params![version],
        )?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use rusqlite::params;
    use tempfile::tempdir;

    use super::Database;

    #[test]
    fn initializes_database_with_safe_defaults() {
        let directory = tempdir().expect("diretório temporário");
        let database =
            Database::open(directory.path().join("test.sqlite3")).expect("banco inicializado");

        assert!(database.is_healthy());
        assert!(
            !database
                .read_bool_setting("background_collection_enabled")
                .expect("configuração")
        );
        assert!(
            !database
                .read_bool_setting("local_api_enabled")
                .expect("configuração")
        );
        assert_eq!(
            database
                .read_u8_setting("watchlist_limit", 0)
                .expect("limite"),
            50
        );
    }

    #[test]
    fn applies_market_schema_with_seed_catalog() {
        let directory = tempdir().expect("diretório temporário");
        let database =
            Database::open(directory.path().join("market.sqlite3")).expect("banco inicializado");
        let connection = database.connection.lock();
        let migration_applied: bool = connection
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = 3)",
                [],
                |row| row.get(0),
            )
            .expect("migration registrada");
        let asset_count: u8 = connection
            .query_row("SELECT COUNT(*) FROM assets", [], |row| row.get(0))
            .expect("catálogo");
        assert!(migration_applied);
        assert_eq!(asset_count, 9);
    }

    #[test]
    fn database_trigger_enforces_absolute_watchlist_limit() {
        let directory = tempdir().expect("diretório temporário");
        let database =
            Database::open(directory.path().join("limit.sqlite3")).expect("banco inicializado");
        let connection = database.connection.lock();
        for index in 0..51 {
            connection
                .execute(
                    "INSERT INTO assets (id, symbol, name, asset_class, exchange, currency)
                     VALUES (?1, ?2, ?3, 'crypto', 'TEST', 'USD')",
                    params![
                        format!("asset:test:{index}"),
                        format!("T{index}"),
                        format!("Test asset {index}")
                    ],
                )
                .expect("ativo de teste");
        }
        for index in 0..50 {
            connection
                .execute(
                    "INSERT INTO watchlist_assets (watchlist_id, asset_id) VALUES ('watchlist:default', ?1)",
                    params![format!("asset:test:{index}")],
                )
                .expect("dentro do limite");
        }
        let result = connection.execute(
            "INSERT INTO watchlist_assets (watchlist_id, asset_id) VALUES ('watchlist:default', ?1)",
            params!["asset:test:50"],
        );
        assert!(result.is_err());
        assert!(
            result
                .expect_err("limite")
                .to_string()
                .contains("watchlist_limit_exceeded")
        );
    }

    #[test]
    fn applies_collection_schema() {
        let directory = tempdir().expect("diretório temporário");
        let database = Database::open(directory.path().join("collection.sqlite3"))
            .expect("banco inicializado");
        let applied: bool = database
            .connection
            .lock()
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = 4)",
                [],
                |row| row.get(0),
            )
            .expect("migration registrada");
        assert!(applied);
    }

    #[test]
    fn applies_content_sources_and_deduplicates_documents() {
        use crate::domain::content::{ContentSourceResult, SourceDocumentInput};

        let directory = tempdir().expect("diretório temporário");
        let database =
            Database::open(directory.path().join("content.sqlite3")).expect("banco inicializado");
        let sources = database.enabled_content_sources().expect("fontes");
        assert!(sources.iter().any(|source| source.id == "source:reddit"));
        assert!(
            sources
                .iter()
                .filter(|source| source.source_kind == "rss")
                .count()
                >= 4
        );

        let document = SourceDocumentInput {
            id: "document:test".to_owned(),
            source_id: "source:rss:cvm-decisoes".to_owned(),
            external_id: "entry:test".to_owned(),
            canonical_url: Some("https://example.com/item".to_owned()),
            title: Some("Decisão".to_owned()),
            raw_text: "Conteúdo".to_owned(),
            author_reference: None,
            language: Some("pt-BR".to_owned()),
            published_at: "2026-11-01T00:00:00Z".to_owned(),
            collected_at: "2026-11-01T00:01:00Z".to_owned(),
            content_hash: "hash".to_owned(),
            retention_expires_at: None,
        };
        assert_eq!(
            database
                .store_source_documents(&[document.clone()])
                .expect("insere"),
            1
        );
        assert_eq!(
            database
                .store_source_documents(&[document])
                .expect("idempotente"),
            0
        );

        database
            .update_content_source_state(
                &ContentSourceResult {
                    source_id: "source:rss:cvm-decisoes".to_owned(),
                    status: "completed".to_owned(),
                    stored_document_count: 1,
                    error_code: None,
                },
                "2026-11-01T00:02:00Z",
            )
            .expect("estado da fonte");
        let overview = database.content_overview().expect("visão geral");
        assert_eq!(overview.total_document_count, 1);
        assert_eq!(overview.unclassified_document_count, 1);
        let cvm = overview
            .sources
            .iter()
            .find(|source| source.id == "source:rss:cvm-decisoes")
            .expect("fonte CVM");
        assert_eq!(cvm.status.as_deref(), Some("completed"));
        assert_eq!(cvm.document_count, 1);
    }
}
