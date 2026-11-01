use std::fs;
use std::path::PathBuf;

use parking_lot::Mutex;
use rusqlite::{Connection, OptionalExtension, params};
use thiserror::Error;

const INITIAL_SCHEMA: &str = include_str!("migrations/0001_initial.sql");

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
        let value = self
            .connection
            .lock()
            .query_row(
                "SELECT value FROM app_settings WHERE key = ?1",
                params![key],
                |row| row.get::<_, String>(0),
            )
            .optional()?;

        Ok(value.is_some_and(|stored| stored == "true"))
    }
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
    }
}
