use serde::{Deserialize, Serialize};

use crate::domain::assets::{Asset, AssetClass};
use crate::domain::events::MarketEventSnapshot;
use crate::domain::signals::MarketSignalSnapshot;

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
    pub signals: Vec<MarketSignalSnapshot>,
    pub events: Vec<MarketEventSnapshot>,
    pub latest_collection: Option<LatestCollectionRun>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetDetailOverview {
    pub asset: Asset,
    pub snapshot: Option<MarketSnapshot>,
    pub signal: Option<MarketSignalSnapshot>,
    pub events: Vec<MarketEventSnapshot>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketSeriesPoint {
    pub observed_at: String,
    pub close_value: Option<f64>,
    pub signal_score: Option<f64>,
    pub confidence: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketSeries {
    pub asset_id: String,
    pub points: Vec<MarketSeriesPoint>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketOverviewFilter {
    pub period_hours: u16,
    pub asset_class: Option<AssetClass>,
    pub minimum_confidence: f64,
}

impl Default for MarketOverviewFilter {
    fn default() -> Self {
        Self {
            period_hours: 24,
            asset_class: None,
            minimum_confidence: 0.0,
        }
    }
}

impl MarketOverviewFilter {
    pub fn validate(&self) -> Result<(), &'static str> {
        if !(1..=720).contains(&self.period_hours) {
            return Err("período deve estar entre 1 e 720 horas");
        }
        if !(0.0..=1.0).contains(&self.minimum_confidence) {
            return Err("confiança mínima deve estar entre 0 e 1");
        }
        Ok(())
    }
}
