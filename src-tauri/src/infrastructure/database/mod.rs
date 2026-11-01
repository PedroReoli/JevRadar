use std::fs;
use std::path::PathBuf;

use parking_lot::Mutex;
use rusqlite::{Connection, OptionalExtension, params};
use thiserror::Error;

use crate::domain::assets::{Asset, AssetClass, Watchlist, WatchlistAsset};

const INITIAL_SCHEMA: &str = include_str!("migrations/0001_initial.sql");
const SETTINGS_SCHEMA: &str = include_str!("migrations/0002_settings.sql");
const MARKET_CORE_SCHEMA: &str = include_str!("migrations/0003_market_core.sql");

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
}
