use serde::Serialize;

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
