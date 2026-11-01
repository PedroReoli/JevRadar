use crate::domain::system_status::{ComponentStatus, SystemStatus};
use crate::infrastructure::background::{BackgroundRuntime, BackgroundRuntimeStatus};
use crate::infrastructure::database::Database;
use crate::infrastructure::local_api::{LocalApiRuntime, LocalApiRuntimeStatus};

pub struct SystemStatusService;

impl SystemStatusService {
    pub fn read(
        database: &Database,
        background: &BackgroundRuntime,
        local_api_runtime: &LocalApiRuntime,
    ) -> SystemStatus {
        let database_status = if database.is_healthy() {
            ComponentStatus::Ready
        } else {
            ComponentStatus::Unavailable
        };

        let background_collection = match background.status() {
            BackgroundRuntimeStatus::Disabled => ComponentStatus::Disabled,
            BackgroundRuntimeStatus::Idle | BackgroundRuntimeStatus::Running => {
                ComponentStatus::Ready
            }
            BackgroundRuntimeStatus::Unavailable => ComponentStatus::Unavailable,
        };
        let local_api = match local_api_runtime.status() {
            LocalApiRuntimeStatus::Disabled => ComponentStatus::Disabled,
            LocalApiRuntimeStatus::Starting => ComponentStatus::Pending,
            LocalApiRuntimeStatus::Ready => ComponentStatus::Ready,
            LocalApiRuntimeStatus::Unavailable => ComponentStatus::Unavailable,
        };

        SystemStatus {
            runtime: "tauri",
            version: env!("CARGO_PKG_VERSION"),
            database: database_status,
            background_collection,
            local_api,
        }
    }
}
