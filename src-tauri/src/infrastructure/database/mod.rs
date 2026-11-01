use std::fs;
use std::path::PathBuf;

use parking_lot::Mutex;
use rusqlite::{Connection, OptionalExtension, params};
use thiserror::Error;

const INITIAL_SCHEMA: &str = include_str!("migrations/0001_initial.sql");
const SETTINGS_SCHEMA: &str = include_str!("migrations/0002_settings.sql");

pub struct Database {
    connection: Mutex<Connection>,
}

#[derive(Debug, Error)]
pub enum DatabaseError {
    #[error("não foi possível preparar o diretório do banco local")]
    CreateDirectory(#[from] std::io::Error),
    #[error("falha ao acessar o banco local")]
    Sqlite(#[from] rusqlite::Error),
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
}
