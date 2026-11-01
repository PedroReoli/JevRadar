use serde::Deserialize;

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CloseResolution {
    Cancel,
    Minimize,
    Quit,
}
