use tauri::State;

use crate::application::backtest_service::BacktestService;
use crate::domain::backtest::{BacktestReport, RunBacktestRequest};
use crate::interface::error::CommandError;
use crate::state::AppState;

#[tauri::command]
pub async fn run_backtest(
    state: State<'_, AppState>,
    request: RunBacktestRequest,
) -> Result<BacktestReport, CommandError> {
    let database = state.database.clone();
    tauri::async_runtime::spawn_blocking(move || BacktestService::run(&database, request))
        .await
        .map_err(CommandError::internal)?
        .map_err(Into::into)
}

#[tauri::command]
pub fn get_latest_backtest(
    state: State<'_, AppState>,
    asset_id: String,
) -> Result<Option<BacktestReport>, CommandError> {
    BacktestService::latest(&state.database, &asset_id).map_err(Into::into)
}
