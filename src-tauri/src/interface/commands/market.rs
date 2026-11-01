use tauri::State;

use crate::application::market_query_service::MarketQueryService;
use crate::domain::market::{MarketOverview, MarketOverviewFilter};
use crate::interface::error::CommandError;
use crate::state::AppState;

#[tauri::command]
pub fn get_market_overview(
    state: State<'_, AppState>,
    filter: Option<MarketOverviewFilter>,
) -> Result<MarketOverview, CommandError> {
    let filter = filter.unwrap_or_default();
    filter.validate().map_err(CommandError::internal)?;
    MarketQueryService::overview(&state.database, filter).map_err(CommandError::internal)
}
