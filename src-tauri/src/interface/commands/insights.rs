use tauri::State;

use crate::application::insights_query_service::InsightsQueryService;
use crate::domain::backtest::{BacktestHistoryPage, BacktestReport, CalibrationReadinessOverview};
use crate::domain::insights::{
    AlertHistoryItem, CollectionHistoryPage, CollectionRunSnapshot, JevUsageSnapshot,
};
use crate::domain::signals::MarketSignalSnapshot;
use crate::interface::error::CommandError;
use crate::state::AppState;

const MAX_LIST_LIMIT: usize = 100;
const MAX_ID_LENGTH: usize = 240;

fn bounded_limit(limit: Option<usize>, default: usize) -> Result<usize, CommandError> {
    let limit = limit.unwrap_or(default);
    if !(1..=MAX_LIST_LIMIT).contains(&limit) {
        return Err(CommandError::internal("limite deve estar entre 1 e 100"));
    }
    Ok(limit)
}

fn validate_id(value: &str) -> Result<(), CommandError> {
    if value.is_empty() || value.len() > MAX_ID_LENGTH {
        return Err(CommandError::internal("identificador inválido"));
    }
    Ok(())
}

#[tauri::command]
pub fn get_signal_report(
    state: State<'_, AppState>,
    signal_id: String,
) -> Result<Option<MarketSignalSnapshot>, CommandError> {
    validate_id(&signal_id)?;
    InsightsQueryService::signal(&state.database, &signal_id).map_err(CommandError::internal)
}

#[tauri::command]
pub fn list_alert_history(
    state: State<'_, AppState>,
    limit: Option<usize>,
) -> Result<Vec<AlertHistoryItem>, CommandError> {
    InsightsQueryService::alerts(&state.database, bounded_limit(limit, 50)?)
        .map_err(CommandError::internal)
}

#[tauri::command]
pub fn list_collection_history(
    state: State<'_, AppState>,
    limit: Option<usize>,
) -> Result<Vec<CollectionRunSnapshot>, CommandError> {
    InsightsQueryService::collections(&state.database, bounded_limit(limit, 50)?)
        .map_err(CommandError::internal)
}

#[tauri::command]
pub fn list_collection_history_page(
    state: State<'_, AppState>,
    status: Option<String>,
    source_id: Option<String>,
    page: Option<u32>,
    page_size: Option<u32>,
) -> Result<CollectionHistoryPage, CommandError> {
    if let Some(status) = status.as_deref()
        && !["running", "completed", "partial", "failed"].contains(&status)
    {
        return Err(CommandError::internal("status de coleta inválido"));
    }
    if let Some(source_id) = source_id.as_deref() {
        validate_id(source_id)?;
    }
    let page = page.unwrap_or(1);
    let page_size = page_size.unwrap_or(10);
    if page == 0 || !(1..=50).contains(&page_size) {
        return Err(CommandError::internal("paginação inválida"));
    }
    InsightsQueryService::collection_page(
        &state.database,
        status.as_deref(),
        source_id.as_deref(),
        page,
        page_size,
    )
    .map_err(CommandError::internal)
}

#[tauri::command]
pub fn list_backtest_history(
    state: State<'_, AppState>,
    asset_id: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<BacktestReport>, CommandError> {
    if let Some(asset_id) = asset_id.as_deref() {
        validate_id(asset_id)?;
    }
    InsightsQueryService::backtests(
        &state.database,
        asset_id.as_deref(),
        bounded_limit(limit, 25)?,
    )
    .map_err(CommandError::internal)
}

#[tauri::command]
pub fn get_calibration_readiness(
    state: State<'_, AppState>,
) -> Result<CalibrationReadinessOverview, CommandError> {
    InsightsQueryService::calibration_readiness(&state.database).map_err(CommandError::internal)
}

#[tauri::command]
pub fn list_backtest_history_page(
    state: State<'_, AppState>,
    asset_id: Option<String>,
    page: Option<u32>,
    page_size: Option<u32>,
) -> Result<BacktestHistoryPage, CommandError> {
    if let Some(asset_id) = asset_id.as_deref() {
        validate_id(asset_id)?;
    }
    let page = page.unwrap_or(1);
    let page_size = page_size.unwrap_or(10);
    if page == 0 || !(1..=50).contains(&page_size) {
        return Err(CommandError::internal("paginação inválida"));
    }
    InsightsQueryService::backtest_page(&state.database, asset_id.as_deref(), page, page_size)
        .map_err(CommandError::internal)
}

#[tauri::command]
pub fn get_jev_usage(state: State<'_, AppState>) -> Result<JevUsageSnapshot, CommandError> {
    InsightsQueryService::jev_usage(&state.database).map_err(CommandError::internal)
}
