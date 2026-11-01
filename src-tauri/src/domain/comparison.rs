use serde::Serialize;

use crate::domain::assets::Asset;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetComparisonRow {
    pub asset: Asset,
    pub change_percent: Option<f64>,
    pub signal_score: Option<f64>,
    pub confidence: Option<f64>,
    pub evidence_count: Option<usize>,
    pub independent_source_count: Option<usize>,
    pub hype_penalty: Option<f64>,
    pub event_count: usize,
    pub observed_at: Option<String>,
    pub market_source_name: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetComparisonOverview {
    pub available_assets: Vec<Asset>,
    pub rows: Vec<AssetComparisonRow>,
}
