use crate::domain::system_status::{ComponentStatus, SystemStatus};
use crate::infrastructure::database::Database;

pub struct SystemStatusService;

impl SystemStatusService {
    pub fn read(database: &Database) -> SystemStatus {
        let database_status = if database.is_healthy() {
            ComponentStatus::Ready
        } else {
            ComponentStatus::Unavailable
        };

        let background_collection = setting_status(database, "background_collection_enabled");
        let local_api = setting_status(database, "local_api_enabled");

        SystemStatus {
            runtime: "tauri",
            version: env!("CARGO_PKG_VERSION"),
            database: database_status,
            background_collection,
            local_api,
        }
    }
}

fn setting_status(database: &Database, key: &str) -> ComponentStatus {
    match database.read_bool_setting(key) {
        Ok(true) => ComponentStatus::Ready,
        Ok(false) => ComponentStatus::Disabled,
        Err(_) => ComponentStatus::Unavailable,
    }
}
