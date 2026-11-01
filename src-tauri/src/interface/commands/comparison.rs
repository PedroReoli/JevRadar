use tauri::State;

use crate::application::comparison_query_service::ComparisonQueryService;
use crate::domain::comparison::AssetComparisonOverview;
use crate::interface::error::CommandError;
use crate::state::AppState;

#[tauri::command]
pub fn get_asset_comparison(
    state: State<'_, AppState>,
    asset_ids: Vec<String>,
    period_hours: u16,
    minimum_confidence: f64,
) -> Result<AssetComparisonOverview, CommandError> {
    ComparisonQueryService::overview(&state.database, asset_ids, period_hours, minimum_confidence)
        .map_err(CommandError::internal)
}
