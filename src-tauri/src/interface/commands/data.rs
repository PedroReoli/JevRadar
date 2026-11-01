use chrono::Utc;
use tauri::{Manager, State};

use crate::application::data_management_service::DataManagementService;
use crate::application::report_export_service::ReportExportService;
use crate::application::report_query_service::ReportQueryService;
use crate::domain::report::{ExportMarketReportRequest, MarketReportExport, ReportOverview};
use crate::interface::error::CommandError;
use crate::state::AppState;

#[tauri::command]
pub fn export_local_data(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<String, CommandError> {
    let export_directory = app.path().download_dir().map_err(CommandError::internal)?;
    let filename = format!(
        "JevRadar-export-{}.sqlite3",
        Utc::now().format("%Y%m%d-%H%M%S")
    );
    let path = export_directory.join(filename);
    DataManagementService::export(&state.database, &path).map_err(CommandError::internal)?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn purge_local_data(state: State<'_, AppState>) -> Result<(), CommandError> {
    DataManagementService::purge(&state.database).map_err(CommandError::internal)
}

#[tauri::command]
pub fn export_market_report(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    request: ExportMarketReportRequest,
) -> Result<MarketReportExport, CommandError> {
    let export_directory = app.path().download_dir().map_err(CommandError::internal)?;
    ReportExportService::export(&state.database, &export_directory, request)
        .map_err(CommandError::from)
}

#[tauri::command]
pub fn get_report_overview(state: State<'_, AppState>) -> Result<ReportOverview, CommandError> {
    ReportQueryService::overview(&state.database).map_err(CommandError::internal)
}
