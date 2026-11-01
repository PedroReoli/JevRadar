use tauri::State;

use crate::application::catalog_service::CatalogService;
use crate::domain::assets::{Asset, AssetClass, Watchlist};
use crate::interface::error::CommandError;
use crate::state::AppState;

#[tauri::command]
pub fn list_assets(
    state: State<'_, AppState>,
    query: Option<String>,
    asset_class: Option<AssetClass>,
) -> Result<Vec<Asset>, CommandError> {
    CatalogService::list_assets(&state.database, query, asset_class).map_err(Into::into)
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
