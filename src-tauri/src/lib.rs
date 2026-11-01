mod application;
mod domain;
mod infrastructure;
mod interface;
mod state;

use tauri::Manager;
use tracing_subscriber::EnvFilter;

use crate::infrastructure::database::Database;
use crate::infrastructure::secrets::KeyringSecretStore;
use crate::interface::commands::settings::{
    delete_secret, get_app_settings, get_secret_status, save_secret, update_app_settings,
};
use crate::interface::commands::system::get_system_status;
use crate::state::AppState;

pub fn run() {
    init_tracing();

    tauri::Builder::default()
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .app_name("JevRadar")
                .build(),
        )
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            let database = Database::open(app_data_dir.join("jevradar.sqlite3"))?;
            app.manage(AppState::new(database, KeyringSecretStore::new()));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_system_status,
            get_app_settings,
            update_app_settings,
            get_secret_status,
            save_secret,
            delete_secret
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
