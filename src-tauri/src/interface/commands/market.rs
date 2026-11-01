use tauri::State;

use crate::application::market_query_service::MarketQueryService;
use crate::domain::assets::AssetClass;
use crate::domain::events::{MarketContextOverview, MarketEventPage, MarketRelationPage};
use crate::domain::market::{
    AssetDetailOverview, MarketOverview, MarketOverviewFilter, MarketSeries,
};
use crate::domain::signals::{SignalEvidenceSnapshot, SignalExplorerOverview};
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
pub fn get_asset_detail(
    state: State<'_, AppState>,
    asset_id: String,
    period_hours: u16,
) -> Result<Option<AssetDetailOverview>, CommandError> {
    MarketQueryService::asset_detail(&state.database, &asset_id, period_hours)
        .map_err(CommandError::internal)
}

#[tauri::command]
pub fn get_signal_explorer(
    state: State<'_, AppState>,
    period_hours: u16,
    minimum_confidence: f64,
    direction: Option<String>,
    asset_id: Option<String>,
) -> Result<SignalExplorerOverview, CommandError> {
    MarketQueryService::signals(
        &state.database,
        period_hours,
        minimum_confidence,
        direction,
        asset_id,
    )
    .map_err(CommandError::internal)
}

#[tauri::command]
pub fn get_market_context_overview(
    state: State<'_, AppState>,
    period_hours: u16,
    minimum_confidence: f64,
) -> Result<MarketContextOverview, CommandError> {
    MarketQueryService::context(&state.database, period_hours, minimum_confidence)
        .map_err(CommandError::internal)
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

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn list_market_relations(
    state: State<'_, AppState>,
    period_hours: u16,
    country_code: Option<String>,
    asset_class: Option<AssetClass>,
    relation_type: Option<String>,
    minimum_confidence: f64,
    page: u32,
    page_size: u32,
) -> Result<MarketRelationPage, CommandError> {
    MarketQueryService::relations(
        &state.database,
        period_hours,
        country_code,
        asset_class,
        relation_type,
        minimum_confidence,
        page,
        page_size,
    )
    .map_err(CommandError::internal)
}
