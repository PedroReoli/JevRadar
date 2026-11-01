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
