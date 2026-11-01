use serde::Serialize;

use crate::domain::assets::Asset;
use crate::domain::collection::SourceCollectionResult;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AlertHistoryItem {
    pub signal_id: String,
    pub alert_level: u8,
    pub delivered_at: String,
    pub asset: Asset,
    pub signal_score: f64,
    pub confidence: f64,
    pub evidence_count: usize,
    pub independent_source_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionRunSnapshot {
    pub run_id: String,
    pub trigger_kind: String,
    pub status: String,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub stored_observation_count: usize,
    pub source_error_count: usize,
    pub sources: Vec<SourceCollectionResult>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JevUsageSnapshot {
    pub analyzed_today: usize,
    pub daily_limit: usize,
    pub batch_limit: usize,
    pub pending_document_count: usize,
}
