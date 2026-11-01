use serde::Serialize;

#[derive(Debug, Clone)]
pub struct AnalysisCandidateAsset {
    pub id: String,
    pub symbol: String,
    pub name: String,
    pub aliases: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct PendingDocumentAnalysis {
    pub id: String,
    pub title: Option<String>,
    pub raw_text: String,
    pub language: Option<String>,
    pub candidates: Vec<AnalysisCandidateAsset>,
}

#[derive(Debug, Clone)]
pub struct DocumentAnalysisResult {
    pub document_id: String,
    pub model_name: String,
    pub model_version: String,
    pub question_version: String,
    pub asset_present_probability: f64,
    pub selected_asset_id: Option<String>,
    pub selected_asset_confidence: Option<f64>,
    pub sentiment: String,
    pub sentiment_probability: f64,
    pub relevance_expected: f64,
    pub relevance_score: i64,
    pub content_type: String,
    pub hype_probability: f64,
    pub factual_claim_probability: f64,
    pub confidence: f64,
    pub input_language: Option<String>,
    pub analyzed_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClassificationSummary {
    pub status: String,
    pub analyzed_document_count: usize,
    pub classified_document_count: usize,
    pub no_asset_document_count: usize,
    pub failed_document_count: usize,
    pub error_code: Option<String>,
}
