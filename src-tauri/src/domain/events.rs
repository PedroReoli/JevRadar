use serde::Serialize;

use crate::domain::assets::Asset;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketEventSnapshot {
    pub id: String,
    pub title: String,
    pub observed_fact: String,
    pub event_type: String,
    pub country_code: Option<String>,
    pub started_at: String,
    pub asset: Asset,
    pub relation_type: String,
    pub confidence: f64,
    pub rationale_template_key: String,
    pub source_name: String,
    pub source_url: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketEventPage {
    pub items: Vec<MarketEventSnapshot>,
    pub available_assets: Vec<Asset>,
    pub available_countries: Vec<String>,
    pub page: u32,
    pub page_size: u32,
    pub total_items: u64,
    pub total_pages: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketRelationSummary {
    pub country_code: Option<String>,
    pub asset: Asset,
    pub event_count: u64,
    pub known_count: u64,
    pub correlation_count: u64,
    pub hypothesis_count: u64,
    pub unproven_causality_count: u64,
    pub average_confidence: f64,
    pub latest_event_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketRelationPage {
    pub items: Vec<MarketRelationSummary>,
    pub available_countries: Vec<String>,
    pub page: u32,
    pub page_size: u32,
    pub total_items: u64,
    pub total_pages: u32,
    pub period_hours: u16,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextEventTypeSummary {
    pub event_type: String,
    pub event_count: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextCountrySummary {
    pub country_code: Option<String>,
    pub relation_count: u64,
    pub asset_count: u64,
    pub average_confidence: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextAssetSummary {
    pub asset: Asset,
    pub relation_count: u64,
    pub country_count: u64,
    pub average_confidence: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketContextOverview {
    pub period_hours: u16,
    pub minimum_confidence: f64,
    pub unique_event_count: u64,
    pub relation_count: u64,
    pub country_count: u64,
    pub asset_count: u64,
    pub average_confidence: f64,
    pub event_types: Vec<ContextEventTypeSummary>,
    pub countries: Vec<ContextCountrySummary>,
    pub assets: Vec<ContextAssetSummary>,
}
