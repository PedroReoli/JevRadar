mod lifecycle;
mod tray;

pub use lifecycle::{register_main_window_lifecycle, resolve_close_request};
pub use tray::create_system_tray;
