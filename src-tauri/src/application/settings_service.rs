use tauri_plugin_autostart::ManagerExt;

use crate::domain::settings::{
    AppSettings, CloseBehavior, SecretKind, SecretStatus, UpdateAppSettings,
};
use crate::infrastructure::background::BackgroundRuntime;
use crate::infrastructure::database::{Database, DatabaseError};
use crate::infrastructure::secrets::{KeyringSecretStore, SecretStoreError};

pub struct SettingsService;

#[derive(Debug, thiserror::Error)]
pub enum SettingsServiceError {
    #[error(transparent)]
    Database(#[from] DatabaseError),
    #[error(transparent)]
    SecretStore(#[from] SecretStoreError),
    #[error("configuração inválida: {0}")]
    Validation(&'static str),
    #[error("não foi possível atualizar a inicialização com o sistema")]
    Autostart,
}

impl SettingsService {
    pub fn read(database: &Database) -> Result<AppSettings, SettingsServiceError> {
        Ok(AppSettings {
            setup_completed: database.read_bool_setting("setup_completed")?,
            language: database.read_setting_or("language", "pt-BR")?,
            background_collection_enabled: database
                .read_bool_setting("background_collection_enabled")?,
            launch_on_startup_enabled: database.read_bool_setting("launch_on_startup_enabled")?,
            close_behavior: CloseBehavior::from_storage_value(
                &database.read_setting_or("close_behavior", "ask")?,
            ),
            local_api_enabled: database.read_bool_setting("local_api_enabled")?,
            telemetry_enabled: database.read_bool_setting("telemetry_enabled")?,
            alert_level: database.read_u8_setting("alert_level", 2)?,
            watchlist_limit: database.read_u8_setting("watchlist_limit", 50)?,
            experience_level: database.read_setting_or("experience_level", "beginner")?,
            investment_range: database.read_setting_or("investment_range", "undisclosed")?,
        })
    }

    pub fn update<R: tauri::Runtime>(
        app: &tauri::AppHandle<R>,
        database: &Database,
        background: &BackgroundRuntime,
        update: UpdateAppSettings,
    ) -> Result<AppSettings, SettingsServiceError> {
        update
            .validate()
            .map_err(SettingsServiceError::Validation)?;

        let autostart = app.autolaunch();
        let autostart_result = if update.launch_on_startup_enabled {
            autostart.enable()
        } else {
            autostart.disable()
        };
        autostart_result.map_err(|_| SettingsServiceError::Autostart)?;

        let background_collection_enabled = update.background_collection_enabled;
        database.write_settings(&[
            ("setup_completed", update.setup_completed.to_string()),
            ("language", update.language),
            (
                "background_collection_enabled",
                update.background_collection_enabled.to_string(),
            ),
            (
                "launch_on_startup_enabled",
                update.launch_on_startup_enabled.to_string(),
            ),
            (
                "close_behavior",
                update.close_behavior.as_storage_value().to_owned(),
            ),
            ("local_api_enabled", update.local_api_enabled.to_string()),
            ("telemetry_enabled", update.telemetry_enabled.to_string()),
            ("alert_level", update.alert_level.to_string()),
            ("watchlist_limit", update.watchlist_limit.to_string()),
            ("experience_level", update.experience_level),
            ("investment_range", update.investment_range),
        ])?;
        background.reconfigure(background_collection_enabled);

        Self::read(database)
    }

    pub fn secret_status(secrets: &KeyringSecretStore) -> SecretStatus {
        SecretStatus {
            typesafe_api_key: secrets.exists(SecretKind::TypesafeApiKey),
            reddit_client_id: secrets.exists(SecretKind::RedditClientId),
            reddit_client_secret: secrets.exists(SecretKind::RedditClientSecret),
            x_bearer_token: secrets.exists(SecretKind::XBearerToken),
            brapi_token: secrets.exists(SecretKind::BrapiToken),
        }
    }
}
