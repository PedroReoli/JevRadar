#[derive(Debug, Clone)]
pub struct AlertCandidate {
    pub signal_id: String,
    pub asset_symbol: String,
    pub signal_score: f64,
    pub confidence: f64,
    pub independent_source_count: usize,
    pub evidence_count: usize,
    pub hype_penalty: f64,
    pub previous_score: Option<f64>,
}
