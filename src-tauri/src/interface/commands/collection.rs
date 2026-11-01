use tauri::State;

use crate::application::market_collection_service::MarketCollectionService;
use crate::domain::collection::{CollectionSummary, CollectionTrigger};
use crate::interface::error::CommandError;
use crate::state::AppState;

#[tauri::command]
pub async fn refresh_market_data(
    state: State<'_, AppState>,
) -> Result<CollectionSummary, CommandError> {
    let database = state.database.clone();
    let secrets = state.secrets;
    tauri::async_runtime::spawn_blocking(move || {
        MarketCollectionService::collect(&database, &secrets, CollectionTrigger::Manual)
    })
    .await
    .map_err(CommandError::internal)?
    .map_err(Into::into)
}
