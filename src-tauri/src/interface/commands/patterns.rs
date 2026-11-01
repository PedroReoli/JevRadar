use tauri::State;

use crate::application::historical_pattern_query_service::HistoricalPatternQueryService;
use crate::domain::assets::AssetClass;
use crate::domain::backtest::HistoricalPatternPage;
use crate::interface::error::CommandError;
use crate::state::AppState;

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn list_historical_patterns(
    state: State<'_, AppState>,
    asset_class: Option<AssetClass>,
    horizon_days: i64,
    outcome: String,
    minimum_sample_size: u32,
    page: u32,
    page_size: u32,
) -> Result<HistoricalPatternPage, CommandError> {
    HistoricalPatternQueryService::list(
        &state.database,
        asset_class,
        horizon_days,
        outcome,
        minimum_sample_size,
        page,
        page_size,
    )
    .map_err(CommandError::internal)
}
