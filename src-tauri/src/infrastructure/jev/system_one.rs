use std::collections::BTreeMap;
use std::time::Duration;

use reqwest::blocking::Client;
use serde::Deserialize;
use serde_json::{Value, json};
use thiserror::Error;

use crate::domain::classification::{DocumentAnalysisResult, PendingDocumentAnalysis};

const SYSTEM_ONE_URL: &str = "https://api.typesafe.ai/v1/systemone";
const REQUESTED_MODEL: &str = "jev-latest";
pub const QUESTION_VERSION: &str = "document-market-signal-v1";
const MIN_ASSET_PRESENT: f64 = 0.70;
const MIN_CHOICE_CONFIDENCE: f64 = 0.45;

pub struct JevClient {
    client: Client,
    api_key: String,
}

#[derive(Debug, Error)]
pub enum JevClientError {
    #[error("o Jev não concluiu a classificação")]
    Request,
    #[error("o Jev retornou um contrato inesperado")]
    InvalidPayload,
}

impl JevClientError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Request => "jev_request_failed",
            Self::InvalidPayload => "jev_invalid_payload",
        }
    }
}

impl JevClient {
    pub fn new(api_key: String) -> Result<Self, JevClientError> {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent(concat!("JevRadar/", env!("CARGO_PKG_VERSION")))
            .build()
            .map_err(|_| JevClientError::Request)?;
        Ok(Self { client, api_key })
    }

    pub fn analyze(
        &self,
        document: &PendingDocumentAnalysis,
    ) -> Result<DocumentAnalysisResult, JevClientError> {
        let criteria = document
            .candidates
            .iter()
            .map(|asset| {
                (
                    asset.id.clone(),
                    Value::String(format!("{} — {}", asset.symbol, asset.name)),
                )
            })
            .collect::<BTreeMap<_, _>>();
        let request = json!({
            "model": REQUESTED_MODEL,
            "state": {
                "title": document.title,
                "text": document.raw_text,
                "language": document.language,
                "candidate_assets": document.candidates.iter().map(|asset| json!({
                    "id": asset.id,
                    "symbol": asset.symbol,
                    "name": asset.name,
                })).collect::<Vec<_>>(),
            },
            "questions": {
                "asset_present": {
                    "type": "noul",
                    "instructions": "Does this document materially discuss at least one candidate asset? Mere navigation, boilerplate, or an unrelated incidental mention is false."
                },
                "asset": {
                    "type": "choice",
                    "instructions": "Select the candidate asset that is the primary subject of the market-relevant claim.",
                    "criteria": criteria,
                },
                "sentiment": {
                    "type": "choice",
                    "instructions": "Classify the market sentiment toward the primary candidate asset, using only the document.",
                    "criteria": {
                        "optimistic": "Supports a positive outlook or upward pressure.",
                        "pessimistic": "Supports a negative outlook or downward pressure.",
                        "neutral": "Factual, balanced, unclear, or without directional sentiment."
                    }
                },
                "relevance": {
                    "type": "score",
                    "instructions": "Score market relevance for the primary asset.",
                    "criteria": [
                        "Empty hype, spam, or no actionable market information.",
                        "Weak opinion or generic mention with little concrete support.",
                        "Specific analysis or event with plausible market impact.",
                        "Concrete verified fact with direct material market impact."
                    ]
                },
                "content_type": {
                    "type": "choice",
                    "instructions": "Classify the document's dominant content type.",
                    "criteria": {
                        "news": "Reporting or official factual communication.",
                        "opinion": "Personal interpretation or viewpoint.",
                        "technical_analysis": "Price, chart, indicator, or trading-pattern analysis.",
                        "meme": "Humor or cultural content with little literal analysis.",
                        "spam": "Promotion, repetition, manipulation, or irrelevant solicitation."
                    }
                },
                "hype": {
                    "type": "noul",
                    "instructions": "Does the document resemble coordinated hype, pump language, manipulation, or artificial urgency?"
                },
                "factual_claim": {
                    "type": "noul",
                    "instructions": "Does the document contain a concrete externally verifiable factual claim?"
                },
                "event_present": {
                    "type": "noul",
                    "instructions": "Does the document describe a concrete political, economic, regulatory, climate, health, technology, or geopolitical event that may relate to the primary asset?"
                },
                "event_type": {
                    "type": "choice",
                    "instructions": "Classify the dominant external event type.",
                    "criteria": {
                        "political": "Election, government decision, policy, or political institution.",
                        "economic": "Macroeconomic indicator, interest rate, currency, trade, or economic activity.",
                        "regulatory": "Law, regulation, enforcement, court, or regulator action.",
                        "climate": "Weather, climate, environmental disaster, or transition risk.",
                        "health": "Public health, medicine, epidemic, or health-system event.",
                        "technology": "Material technology, infrastructure, cybersecurity, or innovation event.",
                        "geopolitical": "War, sanctions, diplomatic conflict, border, or international security event.",
                        "other": "Concrete external event not covered by the other labels."
                    }
                },
                "event_country": {
                    "type": "choice",
                    "instructions": "Select the main country or region directly involved in the event.",
                    "criteria": {
                        "BR": "Brazil", "US": "United States", "CN": "China", "RU": "Russia",
                        "EU": "European Union", "GLOBAL": "Multiple regions or global", "OTHER": "Another country or region"
                    }
                },
                "relation_type": {
                    "type": "choice",
                    "instructions": "Classify the epistemic strength of the event-to-asset relationship without claiming unsupported causality.",
                    "criteria": {
                        "known": "A direct documented operational, legal, or contractual link.",
                        "correlation": "A historically associated relationship, without proof of causality here.",
                        "hypothesis": "A plausible mechanism that requires further evidence.",
                        "unproven_causality": "The document implies causality that is not established by the evidence."
                    }
                }
            }
        });
        let response = self
            .client
            .post(SYSTEM_ONE_URL)
            .bearer_auth(&self.api_key)
            .json(&request)
            .send()
            .and_then(reqwest::blocking::Response::error_for_status)
            .map_err(|_| JevClientError::Request)?
            .json::<SystemOneResponse>()
            .map_err(|_| JevClientError::InvalidPayload)?;
        parse_response(document, response)
    }
}

fn parse_response(
    document: &PendingDocumentAnalysis,
    response: SystemOneResponse,
) -> Result<DocumentAnalysisResult, JevClientError> {
    let answers = response.answers;
    let selected_asset_id = (answers.asset_present.noul >= MIN_ASSET_PRESENT
        && answers.asset.confidence >= MIN_CHOICE_CONFIDENCE
        && document
            .candidates
            .iter()
            .any(|candidate| candidate.id == answers.asset.choice))
    .then_some(answers.asset.choice.clone());
    let sentiment = if answers.sentiment.confidence >= MIN_CHOICE_CONFIDENCE
        && matches!(
            answers.sentiment.choice.as_str(),
            "optimistic" | "pessimistic" | "neutral"
        ) {
        answers.sentiment.choice.clone()
    } else {
        "uncertain".to_owned()
    };
    let content_type = if answers.content_type.confidence >= MIN_CHOICE_CONFIDENCE
        && matches!(
            answers.content_type.choice.as_str(),
            "news" | "opinion" | "technical_analysis" | "meme" | "spam"
        ) {
        answers.content_type.choice.clone()
    } else {
        "uncertain".to_owned()
    };
    let sentiment_probability = answers
        .sentiment
        .probabilities
        .get(&answers.sentiment.choice)
        .copied()
        .unwrap_or(answers.sentiment.confidence)
        .clamp(0.0, 1.0);
    let relevance_expected = answers.relevance.score.clamp(0.0, 3.0);
    let confidence = [
        answers.asset.confidence,
        answers.sentiment.confidence,
        answers.relevance.confidence,
        answers.content_type.confidence,
    ]
    .into_iter()
    .sum::<f64>()
        / 4.0;

    let valid_event_type = matches!(
        answers.event_type.choice.as_str(),
        "political"
            | "economic"
            | "regulatory"
            | "climate"
            | "health"
            | "technology"
            | "geopolitical"
            | "other"
    );
    let valid_relation_type = matches!(
        answers.relation_type.choice.as_str(),
        "known" | "correlation" | "hypothesis" | "unproven_causality"
    );
    let valid_country = matches!(
        answers.event_country.choice.as_str(),
        "BR" | "US" | "CN" | "RU" | "EU" | "GLOBAL" | "OTHER"
    );
    let event = (answers.event_present.noul >= 0.65
        && selected_asset_id.is_some()
        && valid_event_type
        && valid_relation_type
        && valid_country)
        .then(|| crate::domain::classification::DetectedMarketEvent {
            title: document
                .title
                .clone()
                .unwrap_or_else(|| "Evento de mercado observado".to_owned()),
            observed_fact: document.raw_text.chars().take(600).collect(),
            event_type: answers.event_type.choice.clone(),
            country_code: answers.event_country.choice.clone(),
            relation_type: answers.relation_type.choice.clone(),
            relation_confidence: ((answers.event_present.noul
                + answers.event_type.confidence
                + answers.relation_type.confidence)
                / 3.0)
                .clamp(0.0, 1.0),
        });
    Ok(DocumentAnalysisResult {
        document_id: document.id.clone(),
        model_name: "TypeSafe System One".to_owned(),
        model_version: response.model,
        question_version: QUESTION_VERSION.to_owned(),
        asset_present_probability: answers.asset_present.noul.clamp(0.0, 1.0),
        selected_asset_id,
        selected_asset_confidence: Some(answers.asset.confidence.clamp(0.0, 1.0)),
        sentiment,
        sentiment_probability,
        relevance_expected,
        relevance_score: relevance_expected.round() as i64,
        content_type,
        hype_probability: answers.hype.noul.clamp(0.0, 1.0),
        factual_claim_probability: answers.factual_claim.noul.clamp(0.0, 1.0),
        confidence: confidence.clamp(0.0, 1.0),
        input_language: document.language.clone(),
        analyzed_at: chrono::Utc::now().to_rfc3339(),
        event,
    })
}

#[derive(Debug, Deserialize)]
struct SystemOneResponse {
    model: String,
    answers: Answers,
}

#[derive(Debug, Deserialize)]
struct Answers {
    asset_present: NoulAnswer,
    asset: ChoiceAnswer,
    sentiment: ChoiceAnswer,
    relevance: ScoreAnswer,
    content_type: ChoiceAnswer,
    hype: NoulAnswer,
    factual_claim: NoulAnswer,
    event_present: NoulAnswer,
    event_type: ChoiceAnswer,
    event_country: ChoiceAnswer,
    relation_type: ChoiceAnswer,
}

#[derive(Debug, Deserialize)]
struct NoulAnswer {
    noul: f64,
}

#[derive(Debug, Deserialize)]
struct ChoiceAnswer {
    choice: String,
    confidence: f64,
    probabilities: BTreeMap<String, f64>,
}

#[derive(Debug, Deserialize)]
struct ScoreAnswer {
    score: f64,
    confidence: f64,
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{SystemOneResponse, parse_response};
    use crate::domain::classification::{AnalysisCandidateAsset, PendingDocumentAnalysis};

    fn document() -> PendingDocumentAnalysis {
        PendingDocumentAnalysis {
            id: "document:test".to_owned(),
            title: Some("Petrobras anuncia resultado".to_owned()),
            raw_text: "Petrobras reportou lucro acima do esperado.".to_owned(),
            language: Some("pt-BR".to_owned()),
            candidates: vec![AnalysisCandidateAsset {
                id: "asset:b3:PETR4".to_owned(),
                symbol: "PETR4".to_owned(),
                name: "Petrobras PN".to_owned(),
                aliases: vec!["Petrobras".to_owned()],
            }],
        }
    }

    #[test]
    fn preserves_expected_score_and_applies_confidence_gates() {
        let response = serde_json::from_value::<SystemOneResponse>(json!({
            "model": "jev-latest",
            "answers": {
                "asset_present": { "type": "noul", "noul": 0.94 },
                "asset": { "type": "choice", "choice": "asset:b3:PETR4", "confidence": 0.91, "probabilities": { "asset:b3:PETR4": 0.91 } },
                "sentiment": { "type": "choice", "choice": "optimistic", "confidence": 0.82, "probabilities": { "optimistic": 0.82, "pessimistic": 0.08, "neutral": 0.10 } },
                "relevance": { "type": "score", "score": 2.6, "confidence": 0.76, "legend": {}, "probabilities": {} },
                "content_type": { "type": "choice", "choice": "news", "confidence": 0.88, "probabilities": { "news": 0.88 } },
                "hype": { "type": "noul", "noul": 0.07 },
                "factual_claim": { "type": "noul", "noul": 0.97 },
                "event_present": { "type": "noul", "noul": 0.91 },
                "event_type": { "type": "choice", "choice": "economic", "confidence": 0.88, "probabilities": { "economic": 0.88 } },
                "event_country": { "type": "choice", "choice": "BR", "confidence": 0.93, "probabilities": { "BR": 0.93 } },
                "relation_type": { "type": "choice", "choice": "known", "confidence": 0.79, "probabilities": { "known": 0.79 } }
            },
            "usage": { "input_tokens": 100, "output_tokens": 0 }
        }))
        .expect("contrato de resposta");
        let analysis = parse_response(&document(), response).expect("análise");
        assert_eq!(
            analysis.selected_asset_id.as_deref(),
            Some("asset:b3:PETR4")
        );
        assert_eq!(analysis.sentiment, "optimistic");
        assert_eq!(analysis.relevance_expected, 2.6);
        assert_eq!(analysis.relevance_score, 3);
        assert_eq!(
            analysis
                .event
                .as_ref()
                .map(|event| event.event_type.as_str()),
            Some("economic")
        );
    }

    #[test]
    fn rejects_low_confidence_asset_instead_of_inventing_a_link() {
        let response = serde_json::from_value::<SystemOneResponse>(json!({
            "model": "jev-latest",
            "answers": {
                "asset_present": { "noul": 0.51 },
                "asset": { "choice": "asset:b3:PETR4", "confidence": 0.91, "probabilities": { "asset:b3:PETR4": 0.91 } },
                "sentiment": { "choice": "optimistic", "confidence": 0.2, "probabilities": { "optimistic": 0.4 } },
                "relevance": { "score": 1.2, "confidence": 0.5 },
                "content_type": { "choice": "opinion", "confidence": 0.2, "probabilities": { "opinion": 0.4 } },
                "hype": { "noul": 0.3 },
                "factual_claim": { "noul": 0.2 },
                "event_present": { "noul": 0.8 },
                "event_type": { "choice": "geopolitical", "confidence": 0.8, "probabilities": { "geopolitical": 0.8 } },
                "event_country": { "choice": "GLOBAL", "confidence": 0.8, "probabilities": { "GLOBAL": 0.8 } },
                "relation_type": { "choice": "hypothesis", "confidence": 0.8, "probabilities": { "hypothesis": 0.8 } }
            }
        }))
        .expect("contrato de resposta");
        let analysis = parse_response(&document(), response).expect("análise");
        assert!(analysis.selected_asset_id.is_none());
        assert_eq!(analysis.sentiment, "uncertain");
        assert_eq!(analysis.content_type, "uncertain");
        assert!(analysis.event.is_none());
    }
}
