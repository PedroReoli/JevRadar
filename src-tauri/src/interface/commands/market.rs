use tauri::State;

use crate::application::market_query_service::MarketQueryService;
use crate::domain::events::MarketEventPage;
use crate::domain::market::{MarketOverview, MarketOverviewFilter, MarketSeries};
use crate::domain::signals::SignalEvidenceSnapshot;
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
pub fn get_signal_evidence(
    state: State<'_, AppState>,
    signal_id: String,
) -> Result<Vec<SignalEvidenceSnapshot>, CommandError> {
    MarketQueryService::signal_evidence(&state.database, &signal_id).map_err(CommandError::internal)
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

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn list_market_events(
    state: State<'_, AppState>,
    event_type: Option<String>,
    country_code: Option<String>,
    asset_id: Option<String>,
    relation_type: Option<String>,
    minimum_confidence: f64,
    page: u32,
    page_size: u32,
) -> Result<MarketEventPage, CommandError> {
    MarketQueryService::events(
        &state.database,
        event_type,
        country_code,
        asset_id,
        relation_type,
        minimum_confidence,
        page,
        page_size,
    )
    .map_err(CommandError::internal)
}
