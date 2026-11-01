use serde::Serialize;

#[derive(Debug, Clone, Copy)]
pub enum CollectionTrigger {
    Manual,
    Background,
}

impl CollectionTrigger {
    pub fn as_storage_value(self) -> &'static str {
        match self {
            Self::Manual => "manual",
            Self::Background => "background",
        }
    }
}

#[derive(Debug, Clone)]
pub struct MarketObservationInput {
    pub id: String,
    pub asset_id: String,
    pub source_id: String,
    pub interval: String,
    pub observed_at: String,
    pub open_value: Option<f64>,
    pub high_value: Option<f64>,
    pub low_value: Option<f64>,
    pub close_value: f64,
    pub volume_value: Option<f64>,
    pub collected_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceCollectionResult {
    pub source_id: String,
    pub status: String,
    pub stored_observation_count: usize,
    pub skipped_asset_count: usize,
    pub error_code: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionSummary {
    pub run_id: String,
    pub status: String,
    pub stored_observation_count: usize,
    pub source_error_count: usize,
    pub sources: Vec<SourceCollectionResult>,
}
