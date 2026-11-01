use tauri::AppHandle;

use crate::domain::desktop::CloseResolution;
use crate::infrastructure::desktop;
use crate::interface::error::CommandError;

#[tauri::command]
pub fn resolve_close_request(
    app: AppHandle,
    resolution: CloseResolution,
) -> Result<(), CommandError> {
    desktop::resolve_close_request(&app, resolution).map_err(CommandError::internal)
}
