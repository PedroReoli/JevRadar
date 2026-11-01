use tauri::State;

use crate::application::coverage_query_service::CoverageQueryService;
use crate::domain::assets::AssetClass;
use crate::domain::coverage::CoverageGapPage;
use crate::interface::error::CommandError;
use crate::state::AppState;

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn list_coverage_gaps(
    state: State<'_, AppState>,
    period_hours: u16,
    asset_class: Option<AssetClass>,
    minimum_movement_percent: f64,
    maximum_evidence_count: u8,
    page: u32,
    page_size: u32,
) -> Result<CoverageGapPage, CommandError> {
    CoverageQueryService::gaps(
        &state.database,
        period_hours,
        asset_class,
        minimum_movement_percent,
        maximum_evidence_count,
        page,
        page_size,
    )
    .map_err(CommandError::internal)
}
