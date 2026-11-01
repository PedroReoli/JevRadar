#[derive(Debug, Clone)]
pub struct SignalEvidenceInput {
    pub classification_id: String,
    pub asset_id: String,
    pub source_id: String,
    pub sentiment: String,
    pub sentiment_probability: f64,
    pub relevance_expected: f64,
    pub content_type: String,
    pub hype_probability: f64,
    pub factual_claim_probability: f64,
    pub confidence: f64,
}

#[derive(Debug, Clone)]
pub struct WeightedEvidence {
    pub classification_id: String,
    pub contribution_weight: f64,
}

#[derive(Debug, Clone)]
pub struct CalculatedSignal {
    pub id: String,
    pub asset_id: String,
    pub window_started_at: String,
    pub window_ended_at: String,
    pub signal_score: f64,
    pub confidence: f64,
    pub source_count: usize,
    pub independent_source_count: usize,
    pub evidence_count: usize,
    pub hype_penalty: f64,
    pub methodology_version: String,
    pub calculated_at: String,
    pub evidence: Vec<WeightedEvidence>,
}
use serde::Serialize;

use crate::domain::assets::Asset;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketSignalSnapshot {
    pub id: String,
    pub asset: Asset,
    pub signal_score: f64,
    pub confidence: f64,
    pub source_count: usize,
    pub independent_source_count: usize,
    pub evidence_count: usize,
    pub hype_penalty: f64,
    pub window_started_at: String,
    pub window_ended_at: String,
    pub methodology_version: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SignalEvidenceSnapshot {
    pub classification_id: String,
    pub source_name: String,
    pub title: Option<String>,
    pub excerpt: String,
    pub canonical_url: Option<String>,
    pub published_at: String,
    pub sentiment: String,
    pub sentiment_probability: f64,
    pub relevance_expected: f64,
    pub content_type: String,
    pub hype_probability: f64,
    pub factual_claim_probability: f64,
    pub confidence: f64,
    pub contribution_weight: f64,
    pub model_version: String,
    pub question_version: String,
}
