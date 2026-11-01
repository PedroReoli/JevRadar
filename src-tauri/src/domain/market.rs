use serde::Serialize;

use crate::domain::assets::Asset;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketSnapshot {
    pub asset: Asset,
    pub close_value: Option<f64>,
    pub previous_close_value: Option<f64>,
    pub change_percent: Option<f64>,
    pub observed_at: Option<String>,
    pub source_name: Option<String>,
    pub interval: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LatestCollectionRun {
    pub run_id: String,
    pub status: String,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub stored_observation_count: usize,
    pub source_error_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketOverview {
    pub snapshots: Vec<MarketSnapshot>,
    pub latest_collection: Option<LatestCollectionRun>,
}
