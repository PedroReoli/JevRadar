use std::sync::Arc;

use tauri::AppHandle;

use crate::infrastructure::background::BackgroundRuntime;
use crate::infrastructure::database::Database;
use crate::infrastructure::local_api::LocalApiRuntime;
use crate::infrastructure::secrets::KeyringSecretStore;

pub struct AppState {
    pub background: BackgroundRuntime,
    pub database: Arc<Database>,
    pub local_api: LocalApiRuntime,
    pub secrets: KeyringSecretStore,
}

impl AppState {
    pub fn new(database: Database, secrets: KeyringSecretStore, app_handle: AppHandle) -> Self {
        let database = Arc::new(database);
        let background_enabled = database
            .read_bool_setting("background_collection_enabled")
            .unwrap_or(false);
        let local_api_enabled = database
            .read_bool_setting("local_api_enabled")
            .unwrap_or(false);
        Self {
            background: BackgroundRuntime::start(
                Arc::clone(&database),
                secrets,
                app_handle,
                background_enabled,
            ),
            local_api: LocalApiRuntime::start(Arc::clone(&database), secrets, local_api_enabled),
            database,
            secrets,
        }
    }
}
