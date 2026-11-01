use crate::domain::system_status::{ComponentStatus, SystemStatus};
use crate::infrastructure::background::{BackgroundRuntime, BackgroundRuntimeStatus};
use crate::infrastructure::database::Database;

pub struct SystemStatusService;

impl SystemStatusService {
    pub fn read(database: &Database, background: &BackgroundRuntime) -> SystemStatus {
        let database_status = if database.is_healthy() {
            ComponentStatus::Ready
        } else {
            ComponentStatus::Unavailable
        };

        let background_collection = match background.status() {
            BackgroundRuntimeStatus::Disabled => ComponentStatus::Disabled,
            BackgroundRuntimeStatus::Idle => ComponentStatus::Pending,
            BackgroundRuntimeStatus::Unavailable => ComponentStatus::Unavailable,
        };
        let local_api = configured_but_not_started_status(database, "local_api_enabled");

        SystemStatus {
            runtime: "tauri",
            version: env!("CARGO_PKG_VERSION"),
            database: database_status,
            background_collection,
            local_api,
        }
    }
}

fn configured_but_not_started_status(database: &Database, key: &str) -> ComponentStatus {
    match database.read_bool_setting(key) {
        Ok(true) => ComponentStatus::Pending,
        Ok(false) => ComponentStatus::Disabled,
        Err(_) => ComponentStatus::Unavailable,
    }
}
