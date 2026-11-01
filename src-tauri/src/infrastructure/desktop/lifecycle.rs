use tauri::{App, AppHandle, Emitter, Manager, Runtime, WindowEvent};

use crate::application::settings_service::SettingsService;
use crate::domain::desktop::CloseResolution;
use crate::domain::settings::CloseBehavior;
use crate::state::AppState;

const CLOSE_REQUESTED_EVENT: &str = "jevradar://close-requested";

pub fn register_main_window_lifecycle<R: Runtime>(app: &App<R>) {
    let Some(window) = app.get_webview_window("main") else {
        tracing::error!("janela principal não encontrada durante a inicialização");
        return;
    };

    let window_for_event = window.clone();
    window.on_window_event(move |event| {
        let WindowEvent::CloseRequested { api, .. } = event else {
            return;
        };

        let app_handle = window_for_event.app_handle();
        let state = app_handle.state::<AppState>();
        let behavior = SettingsService::read(&state.database)
            .map(|settings| settings.close_behavior)
            .unwrap_or(CloseBehavior::Ask);

        match behavior {
            CloseBehavior::Ask => {
                api.prevent_close();
                if let Err(error) = window_for_event.emit(CLOSE_REQUESTED_EVENT, ()) {
                    tracing::error!(%error, "falha ao solicitar confirmação de fechamento");
                }
            }
            CloseBehavior::Minimize => {
                api.prevent_close();
                if let Err(error) = window_for_event.hide() {
                    tracing::error!(%error, "falha ao ocultar a janela principal");
                }
            }
            CloseBehavior::Quit => {
                api.prevent_close();
                app_handle.exit(0);
            }
        }
    });
}

pub fn resolve_close_request<R: Runtime>(
    app: &AppHandle<R>,
    resolution: CloseResolution,
) -> Result<(), tauri::Error> {
    match resolution {
        CloseResolution::Cancel => Ok(()),
        CloseResolution::Minimize => {
            if let Some(window) = app.get_webview_window("main") {
                window.hide()?;
            }
            Ok(())
        }
        CloseResolution::Quit => {
            app.exit(0);
            Ok(())
        }
    }
}
