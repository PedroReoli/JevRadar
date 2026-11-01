use tauri::State;

use crate::application::catalog_service::CatalogService;
use crate::domain::assets::{AssetCatalogPage, AssetClass, CatalogRefreshSummary, Watchlist};
use crate::interface::error::CommandError;
use crate::state::AppState;

#[tauri::command]
pub fn list_assets(
    state: State<'_, AppState>,
    query: Option<String>,
    asset_class: Option<AssetClass>,
    page: u32,
    page_size: u32,
) -> Result<AssetCatalogPage, CommandError> {
    CatalogService::list_assets_page(&state.database, query, asset_class, page, page_size)
        .map_err(Into::into)
}

#[tauri::command]
pub async fn refresh_asset_catalog(
    state: State<'_, AppState>,
) -> Result<CatalogRefreshSummary, CommandError> {
    let database = std::sync::Arc::clone(&state.database);
    tauri::async_runtime::spawn_blocking(move || CatalogService::refresh_assets(&database))
        .await
        .map_err(|_| CommandError::internal("catalog_task_failed"))?
        .map_err(Into::into)
}

#[tauri::command]
pub fn get_default_watchlist(state: State<'_, AppState>) -> Result<Watchlist, CommandError> {
    CatalogService::default_watchlist(&state.database).map_err(Into::into)
}

#[tauri::command]
pub fn add_watchlist_asset(
    state: State<'_, AppState>,
    asset_id: String,
) -> Result<Watchlist, CommandError> {
    CatalogService::add_to_default_watchlist(&state.database, &asset_id).map_err(Into::into)
}

#[tauri::command]
pub fn remove_watchlist_asset(
    state: State<'_, AppState>,
    asset_id: String,
) -> Result<Watchlist, CommandError> {
    CatalogService::remove_from_default_watchlist(&state.database, &asset_id).map_err(Into::into)
}
