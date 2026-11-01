use tauri::State;

use crate::application::content_collection_service::ContentCollectionService;
use crate::application::content_query_service::ContentQueryService;
use crate::domain::content::{ContentCollectionSummary, ContentOverview};
use crate::interface::error::CommandError;
use crate::state::AppState;

#[tauri::command]
pub async fn refresh_content_sources(
    state: State<'_, AppState>,
) -> Result<ContentCollectionSummary, CommandError> {
    let database = state.database.clone();
    let secrets = state.secrets;
    tauri::async_runtime::spawn_blocking(move || {
        ContentCollectionService::collect(&database, &secrets)
    })
    .await
    .map_err(CommandError::internal)?
    .map_err(Into::into)
}

#[tauri::command]
pub fn get_content_overview(state: State<'_, AppState>) -> Result<ContentOverview, CommandError> {
    ContentQueryService::overview(&state.database).map_err(CommandError::internal)
}
