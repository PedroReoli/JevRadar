use serde::Serialize;

use crate::application::settings_service::SettingsServiceError;
use crate::infrastructure::secrets::SecretStoreError;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    pub code: &'static str,
    pub message: String,
}

impl From<SettingsServiceError> for CommandError {
    fn from(error: SettingsServiceError) -> Self {
        let code = match error {
            SettingsServiceError::Validation(_) => "validation_error",
            SettingsServiceError::Autostart => "autostart_error",
            SettingsServiceError::Database(_) => "database_error",
            SettingsServiceError::SecretStore(_) => "secret_store_error",
        };
        Self {
            code,
            message: error.to_string(),
        }
    }
}

impl From<SecretStoreError> for CommandError {
    fn from(error: SecretStoreError) -> Self {
        Self {
            code: "secret_store_error",
            message: error.to_string(),
        }
    }
}
