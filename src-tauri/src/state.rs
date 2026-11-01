use crate::infrastructure::database::Database;
use crate::infrastructure::secrets::KeyringSecretStore;

pub struct AppState {
    pub database: Database,
    pub secrets: KeyringSecretStore,
}

impl AppState {
    pub fn new(database: Database, secrets: KeyringSecretStore) -> Self {
        Self { database, secrets }
    }
}
