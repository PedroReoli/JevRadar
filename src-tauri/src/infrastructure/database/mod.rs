use std::fs;
use std::path::PathBuf;

use parking_lot::Mutex;
use rusqlite::backup::Backup;
use rusqlite::{Connection, OptionalExtension, params};
use thiserror::Error;

use crate::domain::alerts::AlertCandidate;
use crate::domain::assets::{Asset, AssetClass, Watchlist, WatchlistAsset};
use crate::domain::backtest::{
    BacktestDataset, BacktestHorizonResult, BacktestPricePoint, BacktestReport, BacktestSignalPoint,
};
use crate::domain::classification::{
    AnalysisCandidateAsset, DocumentAnalysisResult, PendingDocumentAnalysis,
};
use crate::domain::collection::{MarketObservationInput, SourceCollectionResult};
use crate::domain::content::{
    ContentOverview, ContentSource, ContentSourceResult, ContentSourceStatus, SourceDocumentInput,
};
use crate::domain::events::MarketEventSnapshot;
use crate::domain::insights::{AlertHistoryItem, CollectionRunSnapshot};
use crate::domain::market::{LatestCollectionRun, MarketSeries, MarketSeriesPoint, MarketSnapshot};
use crate::domain::signals::{
    CalculatedSignal, MarketSignalSnapshot, SignalEvidenceInput, SignalEvidenceSnapshot,
};

const INITIAL_SCHEMA: &str = include_str!("migrations/0001_initial.sql");
const SETTINGS_SCHEMA: &str = include_str!("migrations/0002_settings.sql");
const MARKET_CORE_SCHEMA: &str = include_str!("migrations/0003_market_core.sql");
const COLLECTION_SCHEMA: &str = include_str!("migrations/0004_collection_runs.sql");
const CONTENT_SOURCES_SCHEMA: &str = include_str!("migrations/0005_content_sources.sql");
const DOCUMENT_ANALYSIS_SCHEMA: &str = include_str!("migrations/0006_document_analysis.sql");
const BACKTEST_PARAMETERS_SCHEMA: &str = include_str!("migrations/0007_backtest_parameters.sql");
const ALERT_DELIVERIES_SCHEMA: &str = include_str!("migrations/0008_alert_deliveries.sql");
const JEV_USAGE_LIMITS_SCHEMA: &str = include_str!("migrations/0009_jev_usage_limits.sql");
const X_SOURCE_SCHEMA: &str = include_str!("migrations/0010_x_source.sql");
const ALERT_PREFERENCES_SCHEMA: &str = include_str!("migrations/0011_alert_preferences.sql");
const SIGNAL_WEIGHT_AUDIT_SCHEMA: &str = include_str!("migrations/0012_signal_weight_audit.sql");
const VERSIONED_SIGNALS_SCHEMA: &str = include_str!("migrations/0013_versioned_signals.sql");

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
        apply_migration(&connection, 6, DOCUMENT_ANALYSIS_SCHEMA)?;
        apply_migration(&connection, 7, BACKTEST_PARAMETERS_SCHEMA)?;
        apply_migration(&connection, 8, ALERT_DELIVERIES_SCHEMA)?;
        apply_migration(&connection, 9, JEV_USAGE_LIMITS_SCHEMA)?;
        apply_migration(&connection, 10, X_SOURCE_SCHEMA)?;
        apply_migration(&connection, 11, ALERT_PREFERENCES_SCHEMA)?;
        apply_migration(&connection, 12, SIGNAL_WEIGHT_AUDIT_SCHEMA)?;
        apply_migration(&connection, 13, VERSIONED_SIGNALS_SCHEMA)?;

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

    pub fn export_snapshot(&self, path: &std::path::Path) -> Result<(), DatabaseError> {
        let source = self.connection.lock();
        let mut destination = Connection::open(path)?;
        Backup::new(&source, &mut destination)?.run_to_completion(
            64,
            std::time::Duration::from_millis(10),
            None,
        )?;
        Ok(())
    }

    pub fn purge_collected_data(&self) -> Result<(), DatabaseError> {
        let mut connection = self.connection.lock();
        let transaction = connection.transaction()?;
        for table in [
            "alert_deliveries",
            "backtest_results",
            "backtest_runs",
            "event_asset_relations",
            "market_events",
            "signal_evidence",
            "market_signals",
            "document_classifications",
            "document_analysis_runs",
            "document_assets",
            "source_documents",
            "market_observations",
            "source_collection_state",
            "collection_run_sources",
            "collection_runs",
        ] {
            transaction.execute(&format!("DELETE FROM {table}"), [])?;
        }
        transaction.commit()?;
        Ok(())
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

    pub fn read_u16_setting(&self, key: &str, default: u16) -> Result<u16, DatabaseError> {
        Ok(self
            .read_setting(key)?
            .and_then(|value| value.parse::<u16>().ok())
            .unwrap_or(default))
    }

    pub fn analyses_completed_today(&self) -> Result<usize, DatabaseError> {
        let count = self.connection.lock().query_row(
            "SELECT COUNT(*) FROM document_analysis_runs
             WHERE date(analyzed_at) = date('now')",
            [],
            |row| row.get::<_, i64>(0),
        )?;
        Ok(usize::try_from(count).unwrap_or(usize::MAX))
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

    pub fn upsert_assets(&self, assets: &[Asset]) -> Result<usize, DatabaseError> {
        let mut connection = self.connection.lock();
        let transaction = connection.transaction()?;
        let mut changed = 0;
        for asset in assets {
            changed += transaction.execute(
                "INSERT INTO assets (
                    id, symbol, name, asset_class, exchange, currency, country_code, active
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1)
                 ON CONFLICT(id) DO UPDATE SET
                    symbol = excluded.symbol,
                    name = excluded.name,
                    asset_class = excluded.asset_class,
                    exchange = excluded.exchange,
                    currency = excluded.currency,
                    country_code = excluded.country_code,
                    active = 1,
                    updated_at = CURRENT_TIMESTAMP",
                params![
                    asset.id,
                    asset.symbol,
                    asset.name,
                    asset.asset_class.as_storage_value(),
                    asset.exchange,
                    asset.currency,
                    asset.country_code,
                ],
            )?;
            transaction.execute(
                "INSERT OR IGNORE INTO asset_aliases (asset_id, alias, normalized_alias)
                 VALUES (?1, ?2, lower(?2))",
                params![asset.id, asset.name],
            )?;
        }
        transaction.commit()?;
        Ok(changed)
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

    pub fn collection_history(
        &self,
        limit: usize,
    ) -> Result<Vec<CollectionRunSnapshot>, DatabaseError> {
        let connection = self.connection.lock();
        let mut statement = connection.prepare(
            "SELECT id, trigger_kind, status, started_at, completed_at,
                    stored_observation_count, source_error_count
             FROM collection_runs
             ORDER BY started_at DESC
             LIMIT ?1",
        )?;
        let mut runs = statement
            .query_map(params![i64::try_from(limit).unwrap_or(100)], |row| {
                Ok(CollectionRunSnapshot {
                    run_id: row.get(0)?,
                    trigger_kind: row.get(1)?,
                    status: row.get(2)?,
                    started_at: row.get(3)?,
                    completed_at: row.get(4)?,
                    stored_observation_count: row.get::<_, i64>(5)? as usize,
                    source_error_count: row.get::<_, i64>(6)? as usize,
                    sources: Vec::new(),
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        let mut source_statement = connection.prepare(
            "SELECT source_id, status, stored_observation_count, skipped_asset_count, error_code
             FROM collection_run_sources
             WHERE run_id = ?1
             ORDER BY source_id",
        )?;
        for run in &mut runs {
            run.sources = source_statement
                .query_map(params![run.run_id], |row| {
                    Ok(SourceCollectionResult {
                        source_id: row.get(0)?,
                        status: row.get(1)?,
                        stored_observation_count: row.get::<_, i64>(2)? as usize,
                        skipped_asset_count: row.get::<_, i64>(3)? as usize,
                        error_code: row.get(4)?,
                    })
                })?
                .collect::<Result<Vec<_>, _>>()?;
        }
        Ok(runs)
    }

    pub fn enabled_content_sources(&self) -> Result<Vec<ContentSource>, DatabaseError> {
        let connection = self.connection.lock();
        let mut statement = connection.prepare(
            "SELECT id, name, source_kind, base_url
             FROM sources
             WHERE enabled = 1 AND source_kind IN ('rss', 'reddit', 'x')
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

    pub fn watchlist_search_terms(&self) -> Result<Vec<String>, DatabaseError> {
        let connection = self.connection.lock();
        let mut statement = connection.prepare(
            "SELECT term FROM (
                 SELECT a.id AS asset_id, a.symbol AS term, 0 AS priority
                 FROM watchlist_assets wa
                 JOIN assets a ON a.id = wa.asset_id
                 WHERE wa.watchlist_id = 'watchlist:default' AND wa.enabled = 1
                 UNION ALL
                 SELECT a.id, a.name, 1
                 FROM watchlist_assets wa
                 JOIN assets a ON a.id = wa.asset_id
                 WHERE wa.watchlist_id = 'watchlist:default' AND wa.enabled = 1
                 UNION ALL
                 SELECT aa.asset_id, aa.alias, 2
                 FROM watchlist_assets wa
                 JOIN asset_aliases aa ON aa.asset_id = wa.asset_id
                 WHERE wa.watchlist_id = 'watchlist:default' AND wa.enabled = 1
             )
             GROUP BY asset_id, term
             ORDER BY priority, asset_id, term",
        )?;
        statement
            .query_map([], |row| row.get(0))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(Into::into)
    }

    pub fn set_content_source_enabled(
        &self,
        source_id: &str,
        enabled: bool,
    ) -> Result<bool, DatabaseError> {
        let changed = self.connection.lock().execute(
            "UPDATE sources SET enabled = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            params![source_id, enabled],
        )?;
        Ok(changed == 1)
    }

    pub fn upsert_custom_rss_source(
        &self,
        source_id: &str,
        name: &str,
        url: &str,
    ) -> Result<(), DatabaseError> {
        self.connection.lock().execute(
            "INSERT INTO sources (id, name, source_kind, collection_method, base_url, enabled)
             VALUES (?1, ?2, 'rss', 'rss', ?3, 1)
             ON CONFLICT(id) DO UPDATE SET
                 name = excluded.name,
                 base_url = excluded.base_url,
                 enabled = 1,
                 updated_at = CURRENT_TIMESTAMP",
            params![source_id, name, url],
        )?;
        Ok(())
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

    pub fn redact_expired_source_documents(&self, now: &str) -> Result<usize, DatabaseError> {
        self.connection
            .lock()
            .execute(
                "UPDATE source_documents
                 SET canonical_url = NULL,
                     title = NULL,
                     raw_text = '[conteúdo removido pela política de retenção]',
                     author_reference = NULL,
                     retention_expires_at = NULL
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
                    CASE WHEN s.id LIKE 'source:custom:rss:%' THEN 1 ELSE 0 END,
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
                    user_managed: row.get(5)?,
                    document_count: row.get::<_, i64>(6)? as usize,
                    status: row.get(7)?,
                    last_collected_at: row.get(8)?,
                    error_code: row.get(9)?,
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
                   SELECT 1 FROM document_analysis_runs dar WHERE dar.document_id = sd.id
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

    pub fn pending_document_analyses(
        &self,
        question_version: &str,
        limit: usize,
    ) -> Result<Vec<PendingDocumentAnalysis>, DatabaseError> {
        let connection = self.connection.lock();
        let mut asset_statement = connection.prepare(
            "SELECT a.id, a.symbol, a.name
             FROM watchlist_assets wa
             JOIN assets a ON a.id = wa.asset_id
             WHERE wa.watchlist_id = 'watchlist:default' AND wa.enabled = 1 AND a.active = 1
             ORDER BY a.symbol",
        )?;
        let mut candidates = asset_statement
            .query_map([], |row| {
                Ok(AnalysisCandidateAsset {
                    id: row.get(0)?,
                    symbol: row.get(1)?,
                    name: row.get(2)?,
                    aliases: Vec::new(),
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        let mut alias_statement = connection
            .prepare("SELECT alias FROM asset_aliases WHERE asset_id = ?1 ORDER BY alias")?;
        for candidate in &mut candidates {
            candidate.aliases = alias_statement
                .query_map(params![candidate.id], |row| row.get(0))?
                .collect::<Result<Vec<_>, _>>()?;
        }
        if candidates.is_empty() {
            return Ok(Vec::new());
        }

        let scan_limit = i64::try_from(limit).unwrap_or(i64::MAX);
        let mut document_statement = connection.prepare(
            "SELECT sd.id, sd.title, sd.raw_text, sd.language
             FROM source_documents sd
             WHERE sd.duplicate_of_id IS NULL
               AND NOT EXISTS (
                   SELECT 1 FROM document_analysis_runs dar
                   WHERE dar.document_id = sd.id AND dar.question_version = ?1
               )
               AND EXISTS (
                   SELECT 1
                   FROM watchlist_assets wa
                   JOIN assets a ON a.id = wa.asset_id
                   LEFT JOIN asset_aliases aa ON aa.asset_id = a.id
                   WHERE wa.watchlist_id = 'watchlist:default'
                     AND wa.enabled = 1
                     AND a.active = 1
                     AND (
                         instr(lower(COALESCE(sd.title, '') || ' ' || sd.raw_text), lower(a.symbol)) > 0
                         OR instr(lower(COALESCE(sd.title, '') || ' ' || sd.raw_text), lower(a.name)) > 0
                         OR (aa.alias IS NOT NULL AND instr(lower(COALESCE(sd.title, '') || ' ' || sd.raw_text), lower(aa.alias)) > 0)
                     )
               )
             ORDER BY sd.published_at DESC
             LIMIT ?2",
        )?;
        let documents = document_statement
            .query_map(params![question_version, scan_limit], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, Option<String>>(3)?,
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(documents
            .into_iter()
            .filter_map(|(id, title, raw_text, language)| {
                let searchable =
                    format!("{} {raw_text}", title.as_deref().unwrap_or_default()).to_lowercase();
                let matched_candidates = candidates
                    .iter()
                    .filter(|candidate| candidate_matches(candidate, &searchable))
                    .cloned()
                    .collect::<Vec<_>>();
                (!matched_candidates.is_empty()).then_some(PendingDocumentAnalysis {
                    id,
                    title,
                    raw_text,
                    language,
                    candidates: matched_candidates,
                })
            })
            .take(limit)
            .collect())
    }

    pub fn store_document_analysis(
        &self,
        analysis: &DocumentAnalysisResult,
    ) -> Result<bool, DatabaseError> {
        let mut connection = self.connection.lock();
        let transaction = connection.transaction()?;
        let status = if analysis.selected_asset_id.is_some() {
            "completed"
        } else {
            "no_asset"
        };
        let analysis_id = format!(
            "analysis:{}:{}:{}",
            analysis.document_id, analysis.model_version, analysis.question_version
        );
        transaction.execute(
            "INSERT OR IGNORE INTO document_analysis_runs (
                id, document_id, model_name, model_version, question_version, status,
                asset_present_probability, selected_asset_id, selected_asset_confidence, analyzed_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                analysis_id,
                analysis.document_id,
                analysis.model_name,
                analysis.model_version,
                analysis.question_version,
                status,
                analysis.asset_present_probability,
                analysis.selected_asset_id,
                analysis.selected_asset_confidence,
                analysis.analyzed_at,
            ],
        )?;
        let Some(asset_id) = &analysis.selected_asset_id else {
            transaction.commit()?;
            return Ok(false);
        };
        let document_asset_id = format!("document-asset:{}:{asset_id}", analysis.document_id);
        transaction.execute(
            "INSERT OR IGNORE INTO document_assets (
                id, document_id, asset_id, match_method, matched_at
             ) VALUES (?1, ?2, ?3, 'jev', ?4)",
            params![
                document_asset_id,
                analysis.document_id,
                asset_id,
                analysis.analyzed_at
            ],
        )?;
        let classification_id = format!(
            "classification:{}:{}:{}",
            document_asset_id, analysis.model_version, analysis.question_version
        );
        let inserted = transaction.execute(
            "INSERT OR IGNORE INTO document_classifications (
                id, document_asset_id, model_name, model_version, question_version,
                sentiment, sentiment_probability, relevance_score, content_type,
                hype_probability, factual_claim_probability, confidence, input_language,
                classified_at, relevance_expected
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            params![
                classification_id,
                document_asset_id,
                analysis.model_name,
                analysis.model_version,
                analysis.question_version,
                analysis.sentiment,
                analysis.sentiment_probability,
                analysis.relevance_score,
                analysis.content_type,
                analysis.hype_probability,
                analysis.factual_claim_probability,
                analysis.confidence,
                analysis.input_language,
                analysis.analyzed_at,
                analysis.relevance_expected,
            ],
        )?;
        if let Some(event) = &analysis.event {
            let event_id = format!("event:{}", analysis.document_id);
            transaction.execute(
                "INSERT INTO market_events (
                    id, event_type, title, observed_fact, country_codes, started_at,
                    source_document_id, created_at
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                 ON CONFLICT(id) DO UPDATE SET
                    event_type = excluded.event_type,
                    title = excluded.title,
                    observed_fact = excluded.observed_fact,
                    country_codes = excluded.country_codes",
                params![
                    event_id,
                    event.event_type,
                    event.title,
                    event.observed_fact,
                    event.country_code,
                    analysis.analyzed_at,
                    analysis.document_id,
                    analysis.analyzed_at,
                ],
            )?;
            transaction.execute(
                "INSERT INTO event_asset_relations (
                    event_id, asset_id, relation_type, confidence, rationale_template_key
                 ) VALUES (?1, ?2, ?3, ?4, ?5)
                 ON CONFLICT(event_id, asset_id) DO UPDATE SET
                    relation_type = excluded.relation_type,
                    confidence = excluded.confidence,
                    rationale_template_key = excluded.rationale_template_key",
                params![
                    event_id,
                    asset_id,
                    event.relation_type,
                    event.relation_confidence,
                    format!("event.{}.{}", event.event_type, event.relation_type),
                ],
            )?;
        }
        transaction.commit()?;
        Ok(inserted > 0)
    }

    pub fn signal_evidence_between(
        &self,
        window_started_at: &str,
        window_ended_at: &str,
    ) -> Result<Vec<SignalEvidenceInput>, DatabaseError> {
        let connection = self.connection.lock();
        let mut statement = connection.prepare(
            "WITH source_history AS (
                SELECT prior_sd.source_id,
                       (3.25 + SUM(
                           prior_dc.factual_claim_probability
                           * prior_dc.confidence
                           * (1.0 - 0.5 * prior_dc.hype_probability)
                       )) / (5.0 + COUNT(*)) AS credibility
                FROM document_classifications prior_dc
                JOIN document_assets prior_da ON prior_da.id = prior_dc.document_asset_id
                JOIN source_documents prior_sd ON prior_sd.id = prior_da.document_id
                WHERE prior_dc.classified_at < ?1
                  AND prior_sd.duplicate_of_id IS NULL
                GROUP BY prior_sd.source_id
             )
             SELECT dc.id, da.asset_id, sd.source_id, sd.published_at, dc.sentiment,
                    dc.sentiment_probability, COALESCE(dc.relevance_expected, dc.relevance_score),
                    dc.content_type, dc.hype_probability, dc.factual_claim_probability,
                    dc.confidence, COALESCE(source_history.credibility, 0.65),
                    dc.model_version, dc.question_version
             FROM document_classifications dc
             JOIN document_assets da ON da.id = dc.document_asset_id
             JOIN source_documents sd ON sd.id = da.document_id
             LEFT JOIN source_history ON source_history.source_id = sd.source_id
             WHERE sd.published_at >= ?1 AND sd.published_at <= ?2
               AND sd.duplicate_of_id IS NULL
               AND (dc.model_version, dc.question_version) = (
                   SELECT latest_dc.model_version, latest_dc.question_version
                   FROM document_classifications latest_dc
                   JOIN document_assets latest_da ON latest_da.id = latest_dc.document_asset_id
                   WHERE latest_da.asset_id = da.asset_id
                     AND latest_dc.classified_at <= ?2
                   ORDER BY latest_dc.classified_at DESC
                   LIMIT 1
               )
             ORDER BY da.asset_id, sd.published_at",
        )?;
        statement
            .query_map(params![window_started_at, window_ended_at], |row| {
                Ok(SignalEvidenceInput {
                    classification_id: row.get(0)?,
                    asset_id: row.get(1)?,
                    source_id: row.get(2)?,
                    published_at: row.get(3)?,
                    sentiment: row.get(4)?,
                    sentiment_probability: row.get(5)?,
                    relevance_expected: row.get(6)?,
                    content_type: row.get(7)?,
                    hype_probability: row.get(8)?,
                    factual_claim_probability: row.get(9)?,
                    confidence: row.get(10)?,
                    source_credibility: row.get(11)?,
                    model_version: row.get(12)?,
                    question_version: row.get(13)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()
            .map_err(Into::into)
    }

    pub fn store_market_signal(&self, signal: &CalculatedSignal) -> Result<(), DatabaseError> {
        let mut connection = self.connection.lock();
        let transaction = connection.transaction()?;
        transaction.execute(
            "INSERT INTO market_signals (
                id, asset_id, window_started_at, window_ended_at, signal_score, confidence,
                source_count, independent_source_count, evidence_count, hype_penalty,
                methodology_version, calculated_at, model_version, question_version
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
             ON CONFLICT(asset_id, window_started_at, window_ended_at, methodology_version)
             DO UPDATE SET
                signal_score = excluded.signal_score,
                confidence = excluded.confidence,
                source_count = excluded.source_count,
                independent_source_count = excluded.independent_source_count,
                evidence_count = excluded.evidence_count,
                hype_penalty = excluded.hype_penalty,
                calculated_at = excluded.calculated_at,
                model_version = excluded.model_version,
                question_version = excluded.question_version",
            params![
                signal.id,
                signal.asset_id,
                signal.window_started_at,
                signal.window_ended_at,
                signal.signal_score,
                signal.confidence,
                signal.source_count as i64,
                signal.independent_source_count as i64,
                signal.evidence_count as i64,
                signal.hype_penalty,
                signal.methodology_version,
                signal.calculated_at,
                signal.model_version,
                signal.question_version,
            ],
        )?;
        transaction.execute(
            "DELETE FROM signal_evidence WHERE signal_id = ?1",
            params![signal.id],
        )?;
        for evidence in &signal.evidence {
            transaction.execute(
                "INSERT INTO signal_evidence (
                    signal_id, classification_id, contribution_weight, relevance_weight,
                    content_type_weight, factual_weight, source_credibility, diversity_factor,
                    recency_factor, hype_factor, confidence_factor
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                params![
                    signal.id,
                    evidence.classification_id,
                    evidence.contribution_weight,
                    evidence.relevance_weight,
                    evidence.content_type_weight,
                    evidence.factual_weight,
                    evidence.source_credibility,
                    evidence.diversity_factor,
                    evidence.recency_factor,
                    evidence.hype_factor,
                    evidence.confidence_factor,
                ],
            )?;
        }
        transaction.commit()?;
        Ok(())
    }

    pub fn latest_market_signals(&self) -> Result<Vec<MarketSignalSnapshot>, DatabaseError> {
        let connection = self.connection.lock();
        let mut statement = connection.prepare(
            "SELECT ms.id, a.id, a.symbol, a.name, a.asset_class, a.exchange, a.currency, a.country_code,
                    ms.signal_score, ms.confidence, ms.source_count, ms.independent_source_count,
                    ms.evidence_count, ms.hype_penalty, ms.window_started_at, ms.window_ended_at,
                    ms.methodology_version, ms.model_version, ms.question_version
             FROM market_signals ms
             JOIN assets a ON a.id = ms.asset_id
             WHERE ms.id = (
                 SELECT latest.id FROM market_signals latest
                 WHERE latest.asset_id = ms.asset_id
                 ORDER BY latest.window_ended_at DESC, latest.calculated_at DESC
                 LIMIT 1
             )
             ORDER BY ABS(ms.signal_score) DESC, ms.confidence DESC, a.symbol",
        )?;
        statement
            .query_map([], |row| {
                Ok(MarketSignalSnapshot {
                    id: row.get(0)?,
                    asset: map_asset_offset(row, 1)?,
                    signal_score: row.get(8)?,
                    confidence: row.get(9)?,
                    source_count: row.get::<_, i64>(10)? as usize,
                    independent_source_count: row.get::<_, i64>(11)? as usize,
                    evidence_count: row.get::<_, i64>(12)? as usize,
                    hype_penalty: row.get(13)?,
                    window_started_at: row.get(14)?,
                    window_ended_at: row.get(15)?,
                    methodology_version: row.get(16)?,
                    model_version: row.get(17)?,
                    question_version: row.get(18)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()
            .map_err(Into::into)
    }

    pub fn market_signal(
        &self,
        signal_id: &str,
    ) -> Result<Option<MarketSignalSnapshot>, DatabaseError> {
        self.connection
            .lock()
            .query_row(
                "SELECT ms.id, a.id, a.symbol, a.name, a.asset_class, a.exchange, a.currency,
                        a.country_code, ms.signal_score, ms.confidence, ms.source_count,
                        ms.independent_source_count, ms.evidence_count, ms.hype_penalty,
                        ms.window_started_at, ms.window_ended_at, ms.methodology_version,
                        ms.model_version, ms.question_version
                 FROM market_signals ms
                 JOIN assets a ON a.id = ms.asset_id
                 WHERE ms.id = ?1",
                params![signal_id],
                |row| {
                    Ok(MarketSignalSnapshot {
                        id: row.get(0)?,
                        asset: map_asset_offset(row, 1)?,
                        signal_score: row.get(8)?,
                        confidence: row.get(9)?,
                        source_count: row.get::<_, i64>(10)? as usize,
                        independent_source_count: row.get::<_, i64>(11)? as usize,
                        evidence_count: row.get::<_, i64>(12)? as usize,
                        hype_penalty: row.get(13)?,
                        window_started_at: row.get(14)?,
                        window_ended_at: row.get(15)?,
                        methodology_version: row.get(16)?,
                        model_version: row.get(17)?,
                        question_version: row.get(18)?,
                    })
                },
            )
            .optional()
            .map_err(Into::into)
    }

    pub fn signal_evidence(
        &self,
        signal_id: &str,
    ) -> Result<Vec<SignalEvidenceSnapshot>, DatabaseError> {
        let connection = self.connection.lock();
        let mut statement = connection.prepare(
            "SELECT dc.id, s.name, sd.title, SUBSTR(sd.raw_text, 1, 400), sd.canonical_url,
                    sd.published_at, dc.sentiment, dc.sentiment_probability,
                    COALESCE(dc.relevance_expected, dc.relevance_score), dc.content_type,
                    dc.hype_probability, dc.factual_claim_probability, dc.confidence,
                    se.contribution_weight, se.relevance_weight, se.content_type_weight,
                    se.factual_weight, se.source_credibility, se.diversity_factor,
                    se.recency_factor, se.hype_factor, se.confidence_factor,
                    dc.model_version, dc.question_version
             FROM signal_evidence se
             JOIN document_classifications dc ON dc.id = se.classification_id
             JOIN document_assets da ON da.id = dc.document_asset_id
             JOIN source_documents sd ON sd.id = da.document_id
             JOIN sources s ON s.id = sd.source_id
             WHERE se.signal_id = ?1
             ORDER BY ABS(se.contribution_weight) DESC, dc.confidence DESC",
        )?;
        statement
            .query_map(params![signal_id], |row| {
                Ok(SignalEvidenceSnapshot {
                    classification_id: row.get(0)?,
                    source_name: row.get(1)?,
                    title: row.get(2)?,
                    excerpt: row.get(3)?,
                    canonical_url: row.get(4)?,
                    published_at: row.get(5)?,
                    sentiment: row.get(6)?,
                    sentiment_probability: row.get(7)?,
                    relevance_expected: row.get(8)?,
                    content_type: row.get(9)?,
                    hype_probability: row.get(10)?,
                    factual_claim_probability: row.get(11)?,
                    confidence: row.get(12)?,
                    contribution_weight: row.get(13)?,
                    relevance_weight: row.get(14)?,
                    content_type_weight: row.get(15)?,
                    factual_weight: row.get(16)?,
                    source_credibility: row.get(17)?,
                    diversity_factor: row.get(18)?,
                    recency_factor: row.get(19)?,
                    hype_factor: row.get(20)?,
                    confidence_factor: row.get(21)?,
                    model_version: row.get(22)?,
                    question_version: row.get(23)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()
            .map_err(Into::into)
    }

    pub fn latest_market_events(
        &self,
        limit: usize,
    ) -> Result<Vec<MarketEventSnapshot>, DatabaseError> {
        let connection = self.connection.lock();
        let mut statement = connection.prepare(
            "SELECT me.id, me.title, me.observed_fact, me.event_type, me.country_codes,
                    me.started_at, a.id, a.symbol, a.name, a.asset_class, a.exchange,
                    a.currency, a.country_code, ear.relation_type, ear.confidence,
                    ear.rationale_template_key, s.name, sd.canonical_url
             FROM market_events me
             JOIN event_asset_relations ear ON ear.event_id = me.id
             JOIN assets a ON a.id = ear.asset_id
             LEFT JOIN source_documents sd ON sd.id = me.source_document_id
             LEFT JOIN sources s ON s.id = sd.source_id
             ORDER BY me.started_at DESC
             LIMIT ?1",
        )?;
        statement
            .query_map(params![i64::try_from(limit).unwrap_or(i64::MAX)], |row| {
                Ok(MarketEventSnapshot {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    observed_fact: row.get(2)?,
                    event_type: row.get(3)?,
                    country_code: row.get(4)?,
                    started_at: row.get(5)?,
                    asset: Asset {
                        id: row.get(6)?,
                        symbol: row.get(7)?,
                        name: row.get(8)?,
                        asset_class: AssetClass::from_storage_value(
                            row.get::<_, String>(9)?.as_str(),
                        )
                        .ok_or_else(|| {
                            rusqlite::Error::InvalidColumnType(
                                9,
                                "asset_class".to_owned(),
                                rusqlite::types::Type::Text,
                            )
                        })?,
                        exchange: row.get(10)?,
                        currency: row.get(11)?,
                        country_code: row.get(12)?,
                    },
                    relation_type: row.get(13)?,
                    confidence: row.get(14)?,
                    rationale_template_key: row.get(15)?,
                    source_name: row
                        .get::<_, Option<String>>(16)?
                        .unwrap_or_else(|| "Fonte local".to_owned()),
                    source_url: row.get(17)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()
            .map_err(Into::into)
    }

    pub fn backtest_dataset(&self, asset_id: &str) -> Result<BacktestDataset, DatabaseError> {
        let connection = self.connection.lock();
        let asset = connection
            .query_row(
                "SELECT id, symbol, name, asset_class, exchange, currency, country_code
                 FROM assets WHERE id = ?1 AND active = 1",
                params![asset_id],
                map_asset,
            )
            .optional()?
            .ok_or(DatabaseError::AssetNotFound)?;
        let (signal_methodology_version, model_version, question_version) = connection
            .query_row(
                "SELECT methodology_version, model_version, question_version
                 FROM market_signals
                 WHERE asset_id = ?1
                   AND model_version != 'unavailable'
                   AND question_version != 'unavailable'
                 ORDER BY window_ended_at DESC, calculated_at DESC
                 LIMIT 1",
                params![asset_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .optional()?
            .unwrap_or_else(|| {
                (
                    "unavailable".to_owned(),
                    "unavailable".to_owned(),
                    "unavailable".to_owned(),
                )
            });
        let mut signal_statement = connection.prepare(
            "SELECT window_ended_at, signal_score, confidence
             FROM market_signals
             WHERE asset_id = ?1
               AND methodology_version = ?2
               AND model_version = ?3
               AND question_version = ?4
             ORDER BY window_ended_at",
        )?;
        let signals = signal_statement
            .query_map(
                params![
                    asset_id,
                    signal_methodology_version,
                    model_version,
                    question_version
                ],
                |row| {
                    Ok(BacktestSignalPoint {
                        ended_at: row.get(0)?,
                        signal_score: row.get(1)?,
                        confidence: row.get(2)?,
                    })
                },
            )?
            .collect::<Result<Vec<_>, _>>()?;
        let mut price_statement = connection.prepare(
            "SELECT observed_at, close_value
             FROM market_observations
             WHERE asset_id = ?1 AND interval = '1d'
             ORDER BY observed_at",
        )?;
        let prices = price_statement
            .query_map(params![asset_id], |row| {
                Ok(BacktestPricePoint {
                    observed_at: row.get(0)?,
                    close_value: row.get(1)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(BacktestDataset {
            asset,
            signals,
            prices,
            signal_methodology_version,
            model_version,
            question_version,
        })
    }

    pub fn market_series(
        &self,
        asset_id: &str,
        cutoff: &str,
    ) -> Result<MarketSeries, DatabaseError> {
        let connection = self.connection.lock();
        let exists = connection.query_row(
            "SELECT EXISTS(SELECT 1 FROM assets WHERE id = ?1 AND active = 1)",
            params![asset_id],
            |row| row.get::<_, bool>(0),
        )?;
        if !exists {
            return Err(DatabaseError::AssetNotFound);
        }
        let mut statement = connection.prepare(
            "SELECT observed_at, close_value, NULL, NULL
             FROM market_observations
             WHERE asset_id = ?1 AND observed_at >= ?2
             UNION ALL
             SELECT window_ended_at, NULL, signal_score, confidence
             FROM market_signals current_signal
             WHERE asset_id = ?1 AND window_ended_at >= ?2
               AND (methodology_version, model_version, question_version) = (
                   SELECT latest_signal.methodology_version, latest_signal.model_version,
                          latest_signal.question_version
                   FROM market_signals latest_signal
                   WHERE latest_signal.asset_id = current_signal.asset_id
                   ORDER BY latest_signal.window_ended_at DESC, latest_signal.calculated_at DESC
                   LIMIT 1
               )
             ORDER BY 1",
        )?;
        let points = statement
            .query_map(params![asset_id, cutoff], |row| {
                Ok(MarketSeriesPoint {
                    observed_at: row.get(0)?,
                    close_value: row.get(1)?,
                    signal_score: row.get(2)?,
                    confidence: row.get(3)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(MarketSeries {
            asset_id: asset_id.to_owned(),
            points,
        })
    }

    pub fn store_backtest_report(&self, report: &BacktestReport) -> Result<(), DatabaseError> {
        let mut connection = self.connection.lock();
        let transaction = connection.transaction()?;
        transaction.execute(
            "INSERT INTO backtest_runs (
                id, asset_id, methodology_version, signal_methodology_version,
                model_version, question_version,
                calibration_started_at, calibration_ended_at, evaluation_started_at,
                evaluation_ended_at, created_at, completed_at, status,
                signal_threshold, confidence_threshold
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            params![
                report.run_id,
                report.asset.id,
                report.methodology_version,
                report.signal_methodology_version,
                report.model_version,
                report.question_version,
                report.calibration_started_at,
                report.calibration_ended_at,
                report.evaluation_started_at,
                report.evaluation_ended_at,
                report.created_at,
                report.completed_at,
                report.status,
                report.signal_threshold,
                report.confidence_threshold,
            ],
        )?;
        for result in &report.results {
            transaction.execute(
                "INSERT INTO backtest_results (
                    run_id, horizon_days, sample_size, mean_return, median_return,
                    positive_rate, baseline_positive_rate, confidence_interval_low,
                    confidence_interval_high
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    report.run_id,
                    result.horizon_days,
                    result.sample_size as i64,
                    result.mean_return,
                    result.median_return,
                    result.positive_rate,
                    result.baseline_positive_rate,
                    result.confidence_interval_low,
                    result.confidence_interval_high,
                ],
            )?;
        }
        transaction.commit()?;
        Ok(())
    }

    pub fn latest_backtest_report(
        &self,
        asset_id: &str,
    ) -> Result<Option<BacktestReport>, DatabaseError> {
        let connection = self.connection.lock();
        let report = connection
            .query_row(
                "SELECT br.id, a.id, a.symbol, a.name, a.asset_class, a.exchange, a.currency,
                        a.country_code, br.methodology_version, br.signal_methodology_version,
                        br.model_version, br.question_version, br.signal_threshold, br.confidence_threshold,
                        br.calibration_started_at, br.calibration_ended_at,
                        br.evaluation_started_at, br.evaluation_ended_at, br.created_at,
                        br.completed_at, br.status
                 FROM backtest_runs br
                 JOIN assets a ON a.id = br.asset_id
                 WHERE br.asset_id = ?1
                 ORDER BY br.created_at DESC LIMIT 1",
                params![asset_id],
                |row| {
                    Ok(BacktestReport {
                        run_id: row.get(0)?,
                        asset: Asset {
                            id: row.get(1)?,
                            symbol: row.get(2)?,
                            name: row.get(3)?,
                            asset_class: AssetClass::from_storage_value(
                                row.get::<_, String>(4)?.as_str(),
                            )
                            .ok_or_else(|| {
                                rusqlite::Error::InvalidColumnType(
                                    4,
                                    "asset_class".to_owned(),
                                    rusqlite::types::Type::Text,
                                )
                            })?,
                            exchange: row.get(5)?,
                            currency: row.get(6)?,
                            country_code: row.get(7)?,
                        },
                        methodology_version: row.get(8)?,
                        signal_methodology_version: row.get(9)?,
                        model_version: row.get(10)?,
                        question_version: row.get(11)?,
                        signal_threshold: row.get(12)?,
                        confidence_threshold: row.get(13)?,
                        calibration_started_at: row.get(14)?,
                        calibration_ended_at: row.get(15)?,
                        evaluation_started_at: row.get(16)?,
                        evaluation_ended_at: row.get(17)?,
                        created_at: row.get(18)?,
                        completed_at: row.get(19)?,
                        status: row.get(20)?,
                        results: Vec::new(),
                    })
                },
            )
            .optional()?;
        let Some(mut report) = report else {
            return Ok(None);
        };
        let mut result_statement = connection.prepare(
            "SELECT horizon_days, sample_size, mean_return, median_return, positive_rate,
                    baseline_positive_rate, confidence_interval_low, confidence_interval_high
             FROM backtest_results WHERE run_id = ?1 ORDER BY horizon_days",
        )?;
        report.results = result_statement
            .query_map(params![report.run_id], |row| {
                Ok(BacktestHorizonResult {
                    horizon_days: row.get(0)?,
                    sample_size: row.get::<_, i64>(1)? as usize,
                    mean_return: row.get(2)?,
                    median_return: row.get(3)?,
                    positive_rate: row.get(4)?,
                    baseline_positive_rate: row.get(5)?,
                    confidence_interval_low: row.get(6)?,
                    confidence_interval_high: row.get(7)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(Some(report))
    }

    pub fn backtest_history(
        &self,
        asset_id: Option<&str>,
        limit: usize,
    ) -> Result<Vec<BacktestReport>, DatabaseError> {
        let connection = self.connection.lock();
        let mut statement = connection.prepare(
            "SELECT br.id, a.id, a.symbol, a.name, a.asset_class, a.exchange, a.currency,
                    a.country_code, br.methodology_version, br.signal_methodology_version,
                    br.model_version, br.question_version, br.signal_threshold,
                    br.confidence_threshold, br.calibration_started_at, br.calibration_ended_at,
                    br.evaluation_started_at, br.evaluation_ended_at, br.created_at,
                    br.completed_at, br.status
             FROM backtest_runs br
             JOIN assets a ON a.id = br.asset_id
             WHERE (?1 IS NULL OR br.asset_id = ?1)
             ORDER BY br.created_at DESC
             LIMIT ?2",
        )?;
        let mut reports = statement
            .query_map(
                params![asset_id, i64::try_from(limit).unwrap_or(100)],
                map_backtest_report,
            )?
            .collect::<Result<Vec<_>, _>>()?;
        let mut result_statement = connection.prepare(
            "SELECT horizon_days, sample_size, mean_return, median_return, positive_rate,
                    baseline_positive_rate, confidence_interval_low, confidence_interval_high
             FROM backtest_results WHERE run_id = ?1 ORDER BY horizon_days",
        )?;
        for report in &mut reports {
            report.results = result_statement
                .query_map(params![report.run_id], map_backtest_result)?
                .collect::<Result<Vec<_>, _>>()?;
        }
        Ok(reports)
    }

    pub fn alert_history(&self, limit: usize) -> Result<Vec<AlertHistoryItem>, DatabaseError> {
        let connection = self.connection.lock();
        let mut statement = connection.prepare(
            "SELECT ad.signal_id, ad.alert_level, ad.delivered_at,
                    a.id, a.symbol, a.name, a.asset_class, a.exchange, a.currency,
                    a.country_code, ms.signal_score, ms.confidence, ms.evidence_count,
                    ms.independent_source_count
             FROM alert_deliveries ad
             JOIN market_signals ms ON ms.id = ad.signal_id
             JOIN assets a ON a.id = ms.asset_id
             ORDER BY ad.delivered_at DESC
             LIMIT ?1",
        )?;
        statement
            .query_map(params![i64::try_from(limit).unwrap_or(100)], |row| {
                Ok(AlertHistoryItem {
                    signal_id: row.get(0)?,
                    alert_level: row.get(1)?,
                    delivered_at: row.get(2)?,
                    asset: map_asset_offset(row, 3)?,
                    signal_score: row.get(10)?,
                    confidence: row.get(11)?,
                    evidence_count: row.get::<_, i64>(12)? as usize,
                    independent_source_count: row.get::<_, i64>(13)? as usize,
                })
            })?
            .collect::<Result<Vec<_>, _>>()
            .map_err(Into::into)
    }

    pub fn pending_alert_candidates(
        &self,
        alert_level: u8,
        cutoff: &str,
    ) -> Result<Vec<AlertCandidate>, DatabaseError> {
        let connection = self.connection.lock();
        let mut statement = connection.prepare(
            "WITH signal_history AS (
                 SELECT ms.id, ms.asset_id, ms.signal_score, ms.confidence,
                        ms.independent_source_count, ms.evidence_count, ms.hype_penalty,
                        ms.window_ended_at, a.symbol,
                        LAG(ms.signal_score) OVER (
                            PARTITION BY ms.asset_id ORDER BY ms.window_ended_at, ms.calculated_at
                        ) AS previous_score,
                        ROW_NUMBER() OVER (
                            PARTITION BY ms.asset_id ORDER BY ms.window_ended_at DESC, ms.calculated_at DESC
                        ) AS newest
                 FROM market_signals ms
                 JOIN assets a ON a.id = ms.asset_id
                 WHERE (ms.methodology_version, ms.model_version, ms.question_version) = (
                     SELECT latest.methodology_version, latest.model_version, latest.question_version
                     FROM market_signals latest
                     WHERE latest.asset_id = ms.asset_id
                     ORDER BY latest.window_ended_at DESC, latest.calculated_at DESC
                     LIMIT 1
                 )
             )
             SELECT sh.id, sh.asset_id, sh.symbol, sh.signal_score, sh.confidence,
                    sh.independent_source_count, sh.evidence_count, sh.hype_penalty,
                    sh.previous_score,
                    (SELECT GROUP_CONCAT(DISTINCT sd.source_id)
                     FROM signal_evidence se
                     JOIN document_classifications dc ON dc.id = se.classification_id
                     JOIN document_assets da ON da.id = dc.document_asset_id
                     JOIN source_documents sd ON sd.id = da.document_id
                     WHERE se.signal_id = sh.id) AS source_ids
             FROM signal_history sh
             WHERE sh.newest = 1
               AND sh.window_ended_at >= ?2
               AND NOT EXISTS (
                   SELECT 1 FROM alert_deliveries ad
                   WHERE ad.signal_id = sh.id AND ad.alert_level = ?1
               )
             ORDER BY ABS(sh.signal_score) DESC",
        )?;
        statement
            .query_map(params![alert_level, cutoff], |row| {
                Ok(AlertCandidate {
                    signal_id: row.get(0)?,
                    asset_id: row.get(1)?,
                    asset_symbol: row.get(2)?,
                    signal_score: row.get(3)?,
                    confidence: row.get(4)?,
                    independent_source_count: row.get::<_, i64>(5)? as usize,
                    evidence_count: row.get::<_, i64>(6)? as usize,
                    hype_penalty: row.get(7)?,
                    previous_score: row.get(8)?,
                    source_ids: row
                        .get::<_, Option<String>>(9)?
                        .map(|value| value.split(',').map(str::to_owned).collect())
                        .unwrap_or_default(),
                })
            })?
            .collect::<Result<Vec<_>, _>>()
            .map_err(Into::into)
    }

    pub fn mark_alert_delivered(
        &self,
        signal_id: &str,
        alert_level: u8,
        delivered_at: &str,
    ) -> Result<(), DatabaseError> {
        self.connection.lock().execute(
            "INSERT OR IGNORE INTO alert_deliveries (signal_id, alert_level, delivered_at)
             VALUES (?1, ?2, ?3)",
            params![signal_id, alert_level, delivered_at],
        )?;
        Ok(())
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
    map_asset_offset(row, 0)
}

fn map_asset_offset(row: &rusqlite::Row<'_>, offset: usize) -> Result<Asset, rusqlite::Error> {
    let stored_class = row.get::<_, String>(offset + 3)?;
    let asset_class = AssetClass::from_storage_value(&stored_class).ok_or_else(|| {
        rusqlite::Error::FromSqlConversionFailure(
            offset + 3,
            rusqlite::types::Type::Text,
            format!("classe de ativo inválida: {stored_class}").into(),
        )
    })?;
    Ok(Asset {
        id: row.get(offset)?,
        symbol: row.get(offset + 1)?,
        name: row.get(offset + 2)?,
        asset_class,
        exchange: row.get(offset + 4)?,
        currency: row.get(offset + 5)?,
        country_code: row.get(offset + 6)?,
    })
}

fn map_backtest_report(row: &rusqlite::Row<'_>) -> Result<BacktestReport, rusqlite::Error> {
    Ok(BacktestReport {
        run_id: row.get(0)?,
        asset: map_asset_offset(row, 1)?,
        methodology_version: row.get(8)?,
        signal_methodology_version: row.get(9)?,
        model_version: row.get(10)?,
        question_version: row.get(11)?,
        signal_threshold: row.get(12)?,
        confidence_threshold: row.get(13)?,
        calibration_started_at: row.get(14)?,
        calibration_ended_at: row.get(15)?,
        evaluation_started_at: row.get(16)?,
        evaluation_ended_at: row.get(17)?,
        created_at: row.get(18)?,
        completed_at: row.get(19)?,
        status: row.get(20)?,
        results: Vec::new(),
    })
}

fn map_backtest_result(row: &rusqlite::Row<'_>) -> Result<BacktestHorizonResult, rusqlite::Error> {
    Ok(BacktestHorizonResult {
        horizon_days: row.get(0)?,
        sample_size: row.get::<_, i64>(1)? as usize,
        mean_return: row.get(2)?,
        median_return: row.get(3)?,
        positive_rate: row.get(4)?,
        baseline_positive_rate: row.get(5)?,
        confidence_interval_low: row.get(6)?,
        confidence_interval_high: row.get(7)?,
    })
}

fn candidate_matches(candidate: &AnalysisCandidateAsset, searchable: &str) -> bool {
    std::iter::once(candidate.symbol.as_str())
        .chain(std::iter::once(candidate.name.as_str()))
        .chain(candidate.aliases.iter().map(String::as_str))
        .any(|term| {
            let normalized = term.trim().to_lowercase();
            normalized.len() >= 3 && searchable.contains(&normalized)
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
    fn backtest_dataset_uses_one_signal_contract_version() {
        let directory = tempdir().expect("diretório temporário");
        let database =
            Database::open(directory.path().join("versioned-backtest.sqlite3")).expect("banco");
        let connection = database.connection.lock();
        for (id, ended_at, methodology, model, questions) in [
            (
                "signal:legacy",
                "2026-10-31T12:00:00Z",
                "weighted-sentiment-v1",
                "jev-old",
                "questions-old",
            ),
            (
                "signal:current",
                "2026-11-01T12:00:00Z",
                "weighted-sentiment-v2",
                "jev-latest",
                "document-market-signal-v1",
            ),
        ] {
            connection
                .execute(
                    "INSERT INTO market_signals (
                        id, asset_id, window_started_at, window_ended_at, signal_score,
                        confidence, source_count, independent_source_count, evidence_count,
                        hype_penalty, methodology_version, calculated_at, model_version,
                        question_version
                     ) VALUES (?1, 'asset:b3:PETR4', ?2, ?3, 0.5, 0.8, 1, 1, 1, 0.1, ?4, ?3, ?5, ?6)",
                    params![id, "2026-10-30T12:00:00Z", ended_at, methodology, model, questions],
                )
                .expect("sinal versionado");
        }
        drop(connection);

        let dataset = database
            .backtest_dataset("asset:b3:PETR4")
            .expect("dataset versionado");
        assert_eq!(dataset.signal_methodology_version, "weighted-sentiment-v2");
        assert_eq!(dataset.model_version, "jev-latest");
        assert_eq!(dataset.question_version, "document-market-signal-v1");
        assert_eq!(dataset.signals.len(), 1);
        assert_eq!(dataset.signals[0].ended_at, "2026-11-01T12:00:00Z");
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
        assert!(sources.iter().any(|source| source.id == "source:x"));
        assert!(
            sources
                .iter()
                .filter(|source| source.source_kind == "rss")
                .count()
                >= 4
        );
        assert!(
            database
                .set_content_source_enabled("source:x", false)
                .expect("desabilita")
        );
        assert!(
            !database
                .enabled_content_sources()
                .expect("fontes")
                .iter()
                .any(|source| source.id == "source:x")
        );
        database
            .upsert_custom_rss_source(
                "source:custom:rss:test",
                "Fórum com RSS",
                "https://example.com/feed.xml",
            )
            .expect("feed personalizado");
        assert!(
            database
                .content_overview()
                .expect("inventário")
                .sources
                .iter()
                .any(|source| source.id == "source:custom:rss:test" && source.user_managed)
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

    #[test]
    fn redacts_expired_content_without_removing_its_audit_record() {
        use crate::domain::content::SourceDocumentInput;

        let directory = tempdir().expect("diretório temporário");
        let database =
            Database::open(directory.path().join("retention.sqlite3")).expect("banco inicializado");
        database
            .store_source_documents(&[SourceDocumentInput {
                id: "document:expired".to_owned(),
                source_id: "source:reddit".to_owned(),
                external_id: "expired".to_owned(),
                canonical_url: Some("https://example.com/expired".to_owned()),
                title: Some("Conteúdo social".to_owned()),
                raw_text: "Texto que não deve permanecer após o prazo.".to_owned(),
                author_reference: Some("author".to_owned()),
                language: Some("pt-BR".to_owned()),
                published_at: "2026-09-01T00:00:00Z".to_owned(),
                collected_at: "2026-09-01T00:01:00Z".to_owned(),
                content_hash: "expired-hash".to_owned(),
                retention_expires_at: Some("2026-10-01T00:00:00Z".to_owned()),
            }])
            .expect("documento expirável");

        assert_eq!(
            database
                .redact_expired_source_documents("2026-11-01T00:00:00Z")
                .expect("redação"),
            1
        );
        let connection = database.connection.lock();
        let (count, raw_text, title, author, url, retention): (
            i64,
            String,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
        ) = connection
            .query_row(
                "SELECT COUNT(*), raw_text, title, author_reference, canonical_url,
                        retention_expires_at
                 FROM source_documents WHERE id = 'document:expired'",
                [],
                |row| {
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        row.get(4)?,
                        row.get(5)?,
                    ))
                },
            )
            .expect("registro preservado");
        assert_eq!(count, 1);
        assert_eq!(raw_text, "[conteúdo removido pela política de retenção]");
        assert!(title.is_none());
        assert!(author.is_none());
        assert!(url.is_none());
        assert!(retention.is_none());
    }

    #[test]
    fn finds_candidates_and_persists_a_typed_document_analysis() {
        use crate::domain::backtest::{BacktestHorizonResult, BacktestReport};
        use crate::domain::classification::{DetectedMarketEvent, DocumentAnalysisResult};
        use crate::domain::content::SourceDocumentInput;
        use crate::domain::signals::{CalculatedSignal, WeightedEvidence};

        let directory = tempdir().expect("diretório temporário");
        let database =
            Database::open(directory.path().join("analysis.sqlite3")).expect("banco inicializado");
        database
            .add_default_watchlist_asset("asset:b3:PETR4", 50)
            .expect("ativo monitorado");
        database
            .store_source_documents(&[SourceDocumentInput {
                id: "document:petrobras".to_owned(),
                source_id: "source:rss:cvm-decisoes".to_owned(),
                external_id: "entry:petrobras".to_owned(),
                canonical_url: None,
                title: Some("Petrobras divulga resultado".to_owned()),
                raw_text: "A Petrobras informou novo resultado trimestral.".to_owned(),
                author_reference: None,
                language: Some("pt-BR".to_owned()),
                published_at: "2026-11-01T00:00:00Z".to_owned(),
                collected_at: "2026-11-01T00:01:00Z".to_owned(),
                content_hash: "hash-petrobras".to_owned(),
                retention_expires_at: None,
            }])
            .expect("documento");
        let pending = database
            .pending_document_analyses("document-market-signal-v1", 25)
            .expect("documentos candidatos");
        assert_eq!(pending.len(), 1);
        assert_eq!(pending[0].candidates[0].id, "asset:b3:PETR4");

        let classified = database
            .store_document_analysis(&DocumentAnalysisResult {
                document_id: "document:petrobras".to_owned(),
                model_name: "TypeSafe System One".to_owned(),
                model_version: "jev-latest".to_owned(),
                question_version: "document-market-signal-v1".to_owned(),
                asset_present_probability: 0.95,
                selected_asset_id: Some("asset:b3:PETR4".to_owned()),
                selected_asset_confidence: Some(0.92),
                sentiment: "optimistic".to_owned(),
                sentiment_probability: 0.81,
                relevance_expected: 2.6,
                relevance_score: 3,
                content_type: "news".to_owned(),
                hype_probability: 0.08,
                factual_claim_probability: 0.96,
                confidence: 0.83,
                input_language: Some("pt-BR".to_owned()),
                analyzed_at: "2026-11-01T00:02:00Z".to_owned(),
                event: Some(DetectedMarketEvent {
                    title: "Decisão regulatória sobre a Petrobras".to_owned(),
                    observed_fact: "A autoridade publicou uma decisão.".to_owned(),
                    event_type: "regulatory".to_owned(),
                    country_code: "BR".to_owned(),
                    relation_type: "known".to_owned(),
                    relation_confidence: 0.88,
                }),
            })
            .expect("classificação persistida");
        assert!(classified);
        assert!(
            database
                .pending_document_analyses("document-market-signal-v1", 25)
                .expect("fila vazia")
                .is_empty()
        );
        let overview = database.content_overview().expect("visão geral");
        assert_eq!(overview.unclassified_document_count, 0);
        let events = database.latest_market_events(10).expect("eventos");
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].relation_type, "known");

        let evidence = database
            .signal_evidence_between("2026-11-01T00:00:00Z", "2026-11-02T00:00:00Z")
            .expect("evidências");
        assert_eq!(evidence.len(), 1);
        database
            .store_market_signal(&CalculatedSignal {
                id: "signal:test".to_owned(),
                asset_id: "asset:b3:PETR4".to_owned(),
                window_started_at: "2026-11-01T00:00:00Z".to_owned(),
                window_ended_at: "2026-11-02T00:00:00Z".to_owned(),
                signal_score: 0.72,
                confidence: 0.81,
                source_count: 1,
                independent_source_count: 1,
                evidence_count: 1,
                hype_penalty: 0.08,
                methodology_version: "weighted-sentiment-v2".to_owned(),
                model_version: "jev-latest".to_owned(),
                question_version: "document-market-signal-v1".to_owned(),
                calculated_at: "2026-11-02T00:01:00Z".to_owned(),
                evidence: vec![WeightedEvidence {
                    classification_id: evidence[0].classification_id.clone(),
                    contribution_weight: 0.72,
                    relevance_weight: 0.87,
                    content_type_weight: 1.0,
                    factual_weight: 0.99,
                    source_credibility: 0.65,
                    diversity_factor: 1.0,
                    recency_factor: 0.25,
                    hype_factor: 0.95,
                    confidence_factor: 0.83,
                }],
            })
            .expect("sinal persistido");
        let connection = database.connection.lock();
        let signal_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM market_signals", [], |row| row.get(0))
            .expect("contagem de sinais");
        let evidence_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM signal_evidence", [], |row| row.get(0))
            .expect("contagem de contribuições");
        assert_eq!((signal_count, evidence_count), (1, 1));
        drop(connection);
        let snapshots = database
            .signal_evidence("signal:test")
            .expect("rastreabilidade");
        assert_eq!(snapshots.len(), 1);
        assert_eq!(snapshots[0].model_version, "jev-latest");
        assert_eq!(snapshots[0].source_credibility, 0.65);
        let alert_candidates = database
            .pending_alert_candidates(2, "2026-01-01T00:00:00Z")
            .expect("candidatos de alerta");
        assert_eq!(alert_candidates.len(), 1);
        database
            .mark_alert_delivered("signal:test", 2, "2026-11-02T00:02:00Z")
            .expect("alerta registrado");
        let signal_report = database
            .market_signal("signal:test")
            .expect("sinal por id")
            .expect("sinal existente");
        assert_eq!(signal_report.asset.symbol, "PETR4");
        let alert_history = database.alert_history(10).expect("histórico de alertas");
        assert_eq!(alert_history.len(), 1);
        assert_eq!(alert_history[0].alert_level, 2);
        assert!(
            database
                .pending_alert_candidates(2, "2026-01-01T00:00:00Z")
                .expect("alerta deduplicado")
                .is_empty()
        );

        database
            .store_backtest_report(&BacktestReport {
                run_id: "backtest:test".to_owned(),
                asset: pending[0]
                    .candidates
                    .first()
                    .map(|_| {
                        database
                            .list_assets(Some("PETR4"), None)
                            .expect("ativo")
                            .remove(0)
                    })
                    .expect("candidato"),
                methodology_version: "positive-turn-forward-return-v1".to_owned(),
                signal_methodology_version: "weighted-sentiment-v2".to_owned(),
                model_version: "jev-latest".to_owned(),
                question_version: "document-market-signal-v1".to_owned(),
                signal_threshold: 0.15,
                confidence_threshold: 0.6,
                calibration_started_at: "2026-08-01T00:00:00Z".to_owned(),
                calibration_ended_at: "2026-09-01T00:00:00Z".to_owned(),
                evaluation_started_at: "2026-09-01T00:00:00Z".to_owned(),
                evaluation_ended_at: "2026-11-01T00:00:00Z".to_owned(),
                created_at: "2026-11-01T00:03:00Z".to_owned(),
                completed_at: Some("2026-11-01T00:03:01Z".to_owned()),
                status: "completed".to_owned(),
                results: vec![BacktestHorizonResult {
                    horizon_days: 1,
                    sample_size: 4,
                    mean_return: Some(0.01),
                    median_return: Some(0.008),
                    positive_rate: Some(0.75),
                    baseline_positive_rate: Some(0.5),
                    confidence_interval_low: Some(0.30),
                    confidence_interval_high: Some(0.95),
                }],
            })
            .expect("backtest persistido");
        let backtest = database
            .latest_backtest_report("asset:b3:PETR4")
            .expect("consulta backtest")
            .expect("relatório existente");
        assert_eq!(backtest.results[0].sample_size, 4);
        assert_eq!(backtest.signal_threshold, 0.15);
        let history = database
            .backtest_history(Some("asset:b3:PETR4"), 10)
            .expect("histórico de backtests");
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].results[0].horizon_days, 1);
    }

    #[test]
    fn lists_collection_runs_with_their_isolated_source_results() {
        use crate::domain::collection::SourceCollectionResult;

        let directory = tempdir().expect("diretório temporário");
        let database = Database::open(directory.path().join("operations.sqlite3")).expect("banco");
        database
            .start_collection_run("run:test", "manual", "2026-11-01T10:00:00Z")
            .expect("inicia coleta");
        database
            .finish_collection_run(
                "run:test",
                "partial",
                "2026-11-01T10:01:00Z",
                7,
                1,
                &[SourceCollectionResult {
                    source_id: "source:binance".to_owned(),
                    status: "completed".to_owned(),
                    stored_observation_count: 7,
                    skipped_asset_count: 0,
                    error_code: None,
                }],
            )
            .expect("finaliza coleta");

        let history = database.collection_history(10).expect("histórico");
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].status, "partial");
        assert_eq!(history[0].sources[0].source_id, "source:binance");
    }

    #[test]
    fn exports_a_consistent_copy_and_preserves_settings_when_purging_history() {
        let directory = tempdir().expect("diretório temporário");
        let database = Database::open(directory.path().join("source.sqlite3")).expect("banco");
        database
            .write_settings(&[("language", "en".to_owned())])
            .expect("preferência");
        let export_path = directory.path().join("export.sqlite3");
        database.export_snapshot(&export_path).expect("exportação");
        assert!(export_path.is_file());

        database.purge_collected_data().expect("limpeza");
        assert_eq!(
            database
                .read_setting_or("language", "pt-BR")
                .expect("idioma"),
            "en"
        );
    }
}
