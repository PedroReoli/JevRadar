use tauri::State;

use crate::application::insights_query_service::InsightsQueryService;
use crate::domain::backtest::BacktestReport;
use crate::domain::insights::{AlertHistoryItem, CollectionRunSnapshot, JevUsageSnapshot};
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
pub fn get_jev_usage(state: State<'_, AppState>) -> Result<JevUsageSnapshot, CommandError> {
    InsightsQueryService::jev_usage(&state.database).map_err(CommandError::internal)
}
