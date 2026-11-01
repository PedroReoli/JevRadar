use serde::{Deserialize, Serialize};

use crate::domain::assets::Asset;

#[derive(Debug, Clone)]
pub struct BacktestSignalPoint {
    pub ended_at: String,
    pub signal_score: f64,
    pub confidence: f64,
}

#[derive(Debug, Clone)]
pub struct BacktestPricePoint {
    pub observed_at: String,
    pub close_value: f64,
}

#[derive(Debug, Clone)]
pub struct BacktestDataset {
    pub asset: Asset,
    pub signals: Vec<BacktestSignalPoint>,
    pub prices: Vec<BacktestPricePoint>,
    pub signal_methodology_version: String,
    pub model_version: String,
    pub question_version: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunBacktestRequest {
    pub asset_id: String,
    pub signal_threshold: f64,
    pub confidence_threshold: f64,
}

impl RunBacktestRequest {
    pub fn validate(&self) -> Result<(), &'static str> {
        if !(0.0..=1.0).contains(&self.signal_threshold) {
            return Err("limiar de sinal deve estar entre 0 e 1");
        }
        if !(0.0..=1.0).contains(&self.confidence_threshold) {
            return Err("limiar de confiança deve estar entre 0 e 1");
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BacktestHorizonResult {
    pub horizon_days: i64,
    pub sample_size: usize,
    pub mean_return: Option<f64>,
    pub median_return: Option<f64>,
    pub positive_rate: Option<f64>,
    pub baseline_positive_rate: Option<f64>,
    pub confidence_interval_low: Option<f64>,
    pub confidence_interval_high: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BacktestReport {
    pub run_id: String,
    pub asset: Asset,
    pub methodology_version: String,
    pub signal_methodology_version: String,
    pub model_version: String,
    pub question_version: String,
    pub signal_threshold: f64,
    pub confidence_threshold: f64,
    pub calibration_started_at: String,
    pub calibration_ended_at: String,
    pub evaluation_started_at: String,
    pub evaluation_ended_at: String,
    pub created_at: String,
    pub completed_at: Option<String>,
    pub status: String,
    pub results: Vec<BacktestHorizonResult>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoricalPatternItem {
    pub run_id: String,
    pub asset: Asset,
    pub horizon_days: i64,
    pub sample_size: usize,
    pub mean_return: Option<f64>,
    pub median_return: Option<f64>,
    pub positive_rate: Option<f64>,
    pub baseline_positive_rate: Option<f64>,
    pub baseline_difference: Option<f64>,
    pub confidence_interval_low: Option<f64>,
    pub confidence_interval_high: Option<f64>,
    pub signal_threshold: f64,
    pub confidence_threshold: f64,
    pub methodology_version: String,
    pub signal_methodology_version: String,
    pub model_version: String,
    pub question_version: String,
    pub evaluation_started_at: String,
    pub evaluation_ended_at: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoricalPatternPage {
    pub items: Vec<HistoricalPatternItem>,
    pub page: u32,
    pub page_size: u32,
    pub total_items: u64,
    pub total_pages: u32,
    pub methodology_version: String,
}
