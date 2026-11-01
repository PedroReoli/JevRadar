use tauri::State;

use crate::application::market_query_service::MarketQueryService;
use crate::domain::market::{MarketOverview, MarketOverviewFilter, MarketSeries};
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

#[tauri::command]
pub fn get_market_series(
    state: State<'_, AppState>,
    asset_id: String,
    period_hours: u16,
) -> Result<MarketSeries, CommandError> {
    if !(1..=720).contains(&period_hours) {
        return Err(CommandError::internal(
            "período deve estar entre 1 e 720 horas",
        ));
    }
    MarketQueryService::series(&state.database, &asset_id, period_hours)
        .map_err(CommandError::internal)
}
