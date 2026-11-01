use tauri::State;

use crate::application::market_query_service::MarketQueryService;
use crate::domain::market::MarketOverview;
use crate::interface::error::CommandError;
use crate::state::AppState;

#[tauri::command]
pub fn get_market_overview(state: State<'_, AppState>) -> Result<MarketOverview, CommandError> {
    MarketQueryService::overview(&state.database).map_err(CommandError::internal)
}
