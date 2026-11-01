use tauri::{AppHandle, State};

use crate::application::settings_service::SettingsService;
use crate::domain::settings::{AppSettings, SecretKind, SecretStatus, UpdateAppSettings};
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
    SettingsService::update(&app, &state.database, settings).map_err(Into::into)
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
