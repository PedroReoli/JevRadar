use tauri::State;

use crate::application::system_status_service::SystemStatusService;
use crate::domain::system_status::SystemStatus;
use crate::state::AppState;

#[tauri::command]
pub fn get_system_status(state: State<'_, AppState>) -> SystemStatus {
    SystemStatusService::read(&state.database, &state.background, &state.local_api)
}
