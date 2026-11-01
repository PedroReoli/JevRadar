use tauri_plugin_autostart::ManagerExt;

use crate::domain::settings::{
    AppSettings, CloseBehavior, SecretKind, SecretStatus, UpdateAppSettings,
};
use crate::infrastructure::background::BackgroundRuntime;
use crate::infrastructure::database::{Database, DatabaseError};
use crate::infrastructure::local_api::LocalApiRuntime;
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
            alerts_enabled: database.read_bool_setting("alerts_enabled")?,
            alert_window_hours: database.read_u16_setting("alert_window_hours", 24)?,
            alert_quiet_hours_enabled: database.read_bool_setting("alert_quiet_hours_enabled")?,
            alert_quiet_start: database.read_setting_or("alert_quiet_start", "22:00")?,
            alert_quiet_end: database.read_setting_or("alert_quiet_end", "08:00")?,
            alert_asset_ids: read_string_list(database, "alert_asset_ids")?,
            alert_source_ids: read_string_list(database, "alert_source_ids")?,
            watchlist_limit: database.read_u8_setting("watchlist_limit", 50)?,
            jev_batch_limit: database.read_u8_setting("jev_batch_limit", 25)?,
            jev_daily_document_limit: database.read_u16_setting("jev_daily_document_limit", 250)?,
            experience_level: database.read_setting_or("experience_level", "beginner")?,
            investment_range: database.read_setting_or("investment_range", "undisclosed")?,
        })
    }

    pub fn update<R: tauri::Runtime>(
        app: &tauri::AppHandle<R>,
        database: &Database,
        background: &BackgroundRuntime,
        local_api: &LocalApiRuntime,
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
        let local_api_enabled = update.local_api_enabled;
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
            ("alerts_enabled", update.alerts_enabled.to_string()),
            ("alert_window_hours", update.alert_window_hours.to_string()),
            (
                "alert_quiet_hours_enabled",
                update.alert_quiet_hours_enabled.to_string(),
            ),
            ("alert_quiet_start", update.alert_quiet_start),
            ("alert_quiet_end", update.alert_quiet_end),
            (
                "alert_asset_ids",
                serde_json::to_string(&update.alert_asset_ids).unwrap_or_else(|_| "[]".to_owned()),
            ),
            (
                "alert_source_ids",
                serde_json::to_string(&update.alert_source_ids).unwrap_or_else(|_| "[]".to_owned()),
            ),
            ("watchlist_limit", update.watchlist_limit.to_string()),
            ("jev_batch_limit", update.jev_batch_limit.to_string()),
            (
                "jev_daily_document_limit",
                update.jev_daily_document_limit.to_string(),
            ),
            ("experience_level", update.experience_level),
            ("investment_range", update.investment_range),
        ])?;
        background.reconfigure(background_collection_enabled);
        local_api.reconfigure(local_api_enabled);

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

fn read_string_list(database: &Database, key: &str) -> Result<Vec<String>, DatabaseError> {
    let stored = database.read_setting_or(key, "[]")?;
    Ok(serde_json::from_str(&stored).unwrap_or_default())
}
