mod application;
mod domain;
mod infrastructure;
mod interface;
mod state;

pub use domain::prediction::*;

use tauri::Manager;
use tracing_subscriber::EnvFilter;

use crate::infrastructure::database::Database;
use crate::infrastructure::desktop::{create_system_tray, register_main_window_lifecycle};
use crate::infrastructure::secrets::KeyringSecretStore;
use crate::interface::commands::backtest::{get_latest_backtest, run_backtest};
use crate::interface::commands::catalog::{
    add_watchlist_asset, get_default_watchlist, list_assets, refresh_asset_catalog,
    remove_watchlist_asset,
};
use crate::interface::commands::classification::classify_pending_documents;
use crate::interface::commands::collection::refresh_market_data;
use crate::interface::commands::content::{
    add_rss_source, get_content_overview, list_document_feed, refresh_content_sources,
    set_content_source_enabled,
};
use crate::interface::commands::coverage::list_coverage_gaps;
use crate::interface::commands::data::{export_local_data, export_market_report, purge_local_data};
use crate::interface::commands::desktop::{resolve_close_request, send_test_notification};
use crate::interface::commands::insights::{
    get_jev_usage, get_signal_report, list_alert_history, list_backtest_history,
    list_collection_history,
};
use crate::interface::commands::market::{
    get_market_overview, get_market_series, get_signal_evidence, list_market_events,
    list_market_relations,
};
use crate::interface::commands::patterns::list_historical_patterns;
use crate::interface::commands::settings::{
    delete_secret, get_app_settings, get_local_api_access, get_secret_status,
    regenerate_local_api_token, save_secret, update_app_settings,
};
use crate::interface::commands::system::get_system_status;
use crate::state::AppState;

pub fn run() {
    init_tracing();

    let builder = tauri::Builder::default()
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .app_name("JevRadar")
                .build(),
        )
        .plugin(tauri_plugin_notification::init());
    let builder = if option_env!("JEVRADAR_UPDATER_ENABLED") == Some("1") {
        builder.plugin(tauri_plugin_updater::Builder::new().build())
    } else {
        builder
    };

    builder
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            let database = Database::open(app_data_dir.join("jevradar.sqlite3"))?;
            app.manage(AppState::new(
                database,
                KeyringSecretStore::new(),
                app.handle().clone(),
            ));
            create_system_tray(app)?;
            register_main_window_lifecycle(app);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_assets,
            refresh_asset_catalog,
            get_default_watchlist,
            add_watchlist_asset,
            remove_watchlist_asset,
            refresh_market_data,
            refresh_content_sources,
            classify_pending_documents,
            get_content_overview,
            set_content_source_enabled,
            add_rss_source,
            list_document_feed,
            list_coverage_gaps,
            get_market_overview,
            get_market_series,
            get_signal_evidence,
            list_market_events,
            list_market_relations,
            list_historical_patterns,
            get_signal_report,
            list_alert_history,
            list_collection_history,
            list_backtest_history,
            get_jev_usage,
            get_system_status,
            get_app_settings,
            update_app_settings,
            get_secret_status,
            save_secret,
            delete_secret,
            get_local_api_access,
            regenerate_local_api_token,
            resolve_close_request,
            send_test_notification,
            export_local_data,
            export_market_report,
            purge_local_data,
            run_backtest,
            get_latest_backtest
        ])
        .run(tauri::generate_context!())
        .expect("falha ao executar o JevRadar");
}

fn init_tracing() {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    let _ = tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(false)
        .compact()
        .try_init();
}
