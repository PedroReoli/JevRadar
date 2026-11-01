use tauri::AppHandle;
use tauri::State;

use crate::application::alert_service::AlertService;
use crate::domain::desktop::CloseResolution;
use crate::infrastructure::desktop;
use crate::interface::error::CommandError;
use crate::state::AppState;

#[tauri::command]
pub fn resolve_close_request(
    app: AppHandle,
    resolution: CloseResolution,
) -> Result<(), CommandError> {
    desktop::resolve_close_request(&app, resolution).map_err(CommandError::internal)
}

#[tauri::command]
pub fn send_test_notification(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), CommandError> {
    AlertService::send_test_notification(&state.database, &app).map_err(CommandError::internal)
}
