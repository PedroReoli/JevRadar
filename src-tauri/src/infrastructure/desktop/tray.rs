use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{App, Manager, Runtime};

const SHOW_ITEM_ID: &str = "show-main-window";
const QUIT_ITEM_ID: &str = "quit-jevradar";

pub fn create_system_tray<R: Runtime>(app: &App<R>) -> Result<(), tauri::Error> {
    let show_item = MenuItem::with_id(app, SHOW_ITEM_ID, "Abrir JevRadar", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, QUIT_ITEM_ID, "Encerrar JevRadar", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    let mut builder = TrayIconBuilder::with_id("jevradar-tray")
        .tooltip("JevRadar")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            SHOW_ITEM_ID => show_main_window(app),
            QUIT_ITEM_ID => app.exit(0),
            _ => {}
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }

    builder.build(app)?;
    Ok(())
}

fn show_main_window<R: Runtime>(app: &tauri::AppHandle<R>) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    if let Err(error) = window
        .show()
        .and_then(|_| window.unminimize())
        .and_then(|_| window.set_focus())
    {
        tracing::error!(%error, "falha ao restaurar a janela principal");
    }
}
