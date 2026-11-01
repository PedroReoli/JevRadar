mod application;
mod domain;
mod infrastructure;
mod interface;
mod state;

use tauri::Manager;
use tracing_subscriber::EnvFilter;

use crate::infrastructure::database::Database;
use crate::interface::commands::system::get_system_status;
use crate::state::AppState;

pub fn run() {
    init_tracing();

    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            let database = Database::open(app_data_dir.join("jevradar.sqlite3"))?;
            app.manage(AppState::new(database));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_system_status])
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
