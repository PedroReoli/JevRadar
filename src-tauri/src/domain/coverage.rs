use serde::Serialize;

use crate::domain::assets::Asset;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoverageGapItem {
    pub asset: Asset,
    pub close_value: f64,
    pub previous_close_value: f64,
    pub change_percent: f64,
    pub observed_at: String,
    pub market_source_name: String,
    pub evidence_count: u64,
    pub independent_source_count: u64,
    pub last_evidence_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoverageGapPage {
    pub items: Vec<CoverageGapItem>,
    pub page: u32,
    pub page_size: u32,
    pub total_items: u64,
    pub total_pages: u32,
    pub period_hours: u16,
    pub minimum_movement_percent: f64,
    pub maximum_evidence_count: u8,
    pub methodology_version: &'static str,
}
