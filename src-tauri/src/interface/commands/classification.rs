use tauri::State;

use crate::application::classification_service::ClassificationService;
use crate::application::signal_service::SignalService;
use crate::domain::classification::ClassificationSummary;
use crate::interface::error::CommandError;
use crate::state::AppState;

#[tauri::command]
pub async fn classify_pending_documents(
    state: State<'_, AppState>,
) -> Result<ClassificationSummary, CommandError> {
    let database = state.database.clone();
    let secrets = state.secrets;
    tauri::async_runtime::spawn_blocking(move || -> Result<_, CommandError> {
        let summary = ClassificationService::classify_pending(&database, &secrets)?;
        SignalService::calculate_latest(&database).map_err(CommandError::internal)?;
        Ok(summary)
    })
    .await
    .map_err(CommandError::internal)?
}
