use serde::Serialize;

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ComponentStatus {
    Ready,
    Disabled,
    Unavailable,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemStatus {
    pub runtime: &'static str,
    pub version: &'static str,
    pub database: ComponentStatus,
    pub background_collection: ComponentStatus,
    pub local_api: ComponentStatus,
}
