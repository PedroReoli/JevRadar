use tauri::{AppHandle, State};

use crate::application::settings_service::SettingsService;
use crate::domain::settings::{
    AppSettings, LocalApiAccess, SecretKind, SecretStatus, UpdateAppSettings,
};
use crate::interface::error::CommandError;
use crate::state::AppState;

#[tauri::command]
pub fn get_app_settings(state: State<'_, AppState>) -> Result<AppSettings, CommandError> {
    SettingsService::read(&state.database).map_err(Into::into)
}

#[tauri::command]
pub fn update_app_settings(
    app: AppHandle,
    state: State<'_, AppState>,
    settings: UpdateAppSettings,
) -> Result<AppSettings, CommandError> {
    SettingsService::update(
        &app,
        &state.database,
        &state.background,
        &state.local_api,
        settings,
    )
    .map_err(Into::into)
}

#[tauri::command]
pub fn get_secret_status(state: State<'_, AppState>) -> SecretStatus {
    SettingsService::secret_status(&state.secrets)
}

#[tauri::command]
pub fn save_secret(
    state: State<'_, AppState>,
    kind: SecretKind,
    value: String,
) -> Result<(), CommandError> {
    state.secrets.save(kind, &value).map_err(Into::into)
}

#[tauri::command]
pub fn delete_secret(state: State<'_, AppState>, kind: SecretKind) -> Result<(), CommandError> {
    state.secrets.delete(kind).map_err(Into::into)
}

#[tauri::command]
pub fn get_local_api_access(
    state: State<'_, AppState>,
) -> Result<Option<LocalApiAccess>, CommandError> {
    state
        .secrets
        .read(SecretKind::LocalApiToken)
        .map(|token| {
            token.map(|token| LocalApiAccess {
                base_url: "http://127.0.0.1:47831",
                docs_url: "http://127.0.0.1:47831/docs/",
                token,
            })
        })
        .map_err(Into::into)
}

#[tauri::command]
pub fn regenerate_local_api_token(
    state: State<'_, AppState>,
) -> Result<LocalApiAccess, CommandError> {
    let token = format!(
        "jvr_{}{}",
        uuid::Uuid::new_v4().simple(),
        uuid::Uuid::new_v4().simple()
    );
    state.secrets.save(SecretKind::LocalApiToken, &token)?;
    if state
        .database
        .read_bool_setting("local_api_enabled")
        .map_err(CommandError::internal)?
    {
        state.local_api.reconfigure(false);
        state.local_api.reconfigure(true);
    }
    Ok(LocalApiAccess {
        base_url: "http://127.0.0.1:47831",
        docs_url: "http://127.0.0.1:47831/docs/",
        token,
    })
}
