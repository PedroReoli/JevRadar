use serde::Serialize;

use crate::domain::assets::Asset;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ContentSource {
    pub id: String,
    pub name: String,
    pub source_kind: String,
    pub base_url: Option<String>,
}

#[derive(Debug, Clone)]
pub struct SourceDocumentInput {
    pub id: String,
    pub source_id: String,
    pub external_id: String,
    pub canonical_url: Option<String>,
    pub title: Option<String>,
    pub raw_text: String,
    pub author_reference: Option<String>,
    pub language: Option<String>,
    pub published_at: String,
    pub collected_at: String,
    pub content_hash: String,
    pub retention_expires_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentSourceResult {
    pub source_id: String,
    pub status: String,
    pub stored_document_count: usize,
    pub error_code: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentCollectionSummary {
    pub stored_document_count: usize,
    pub source_error_count: usize,
    pub sources: Vec<ContentSourceResult>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentSourceStatus {
    pub id: String,
    pub name: String,
    pub source_kind: String,
    pub collection_method: String,
    pub enabled: bool,
    pub user_managed: bool,
    pub document_count: usize,
    pub status: Option<String>,
    pub last_collected_at: Option<String>,
    pub error_code: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentOverview {
    pub sources: Vec<ContentSourceStatus>,
    pub total_document_count: usize,
    pub unclassified_document_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentFeedItem {
    pub id: String,
    pub source_id: String,
    pub source_name: String,
    pub source_kind: String,
    pub title: Option<String>,
    pub excerpt: String,
    pub canonical_url: Option<String>,
    pub language: Option<String>,
    pub published_at: String,
    pub analysis_status: String,
    pub asset: Option<Asset>,
    pub sentiment: Option<String>,
    pub sentiment_probability: Option<f64>,
    pub relevance_expected: Option<f64>,
    pub content_type: Option<String>,
    pub hype_probability: Option<f64>,
    pub factual_claim_probability: Option<f64>,
    pub confidence: Option<f64>,
    pub model_version: Option<String>,
    pub question_version: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentFeedPage {
    pub items: Vec<DocumentFeedItem>,
    pub page: u32,
    pub page_size: u32,
    pub total_items: u64,
    pub total_pages: u32,
}
