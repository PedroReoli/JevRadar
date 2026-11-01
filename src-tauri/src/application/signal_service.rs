use std::collections::{BTreeMap, BTreeSet};

use chrono::{DateTime, Duration, Utc};

use crate::domain::signals::{CalculatedSignal, SignalEvidenceInput, WeightedEvidence};
use crate::infrastructure::database::{Database, DatabaseError};

const METHODOLOGY_VERSION: &str = "weighted-sentiment-v1";
const SIGNAL_WINDOW_HOURS: i64 = 24;
const SIGNAL_BUCKET_SECONDS: i64 = 15 * 60;

pub struct SignalService;

impl SignalService {
    pub fn calculate_latest(database: &Database) -> Result<usize, DatabaseError> {
        let now = Utc::now();
        let bucket_timestamp = (now.timestamp() / SIGNAL_BUCKET_SECONDS) * SIGNAL_BUCKET_SECONDS;
        let window_end = DateTime::<Utc>::from_timestamp(bucket_timestamp, 0).unwrap_or(now);
        let window_start = window_end - Duration::hours(SIGNAL_WINDOW_HOURS);
        let evidence = database
            .signal_evidence_between(&window_start.to_rfc3339(), &window_end.to_rfc3339())?;
        let signals = calculate_signals(evidence, window_start, window_end);
        for signal in &signals {
            database.store_market_signal(signal)?;
        }
        Ok(signals.len())
    }
}

fn calculate_signals(
    evidence: Vec<SignalEvidenceInput>,
    window_start: DateTime<Utc>,
    window_end: DateTime<Utc>,
) -> Vec<CalculatedSignal> {
    let mut by_asset = BTreeMap::<String, Vec<SignalEvidenceInput>>::new();
    for item in evidence {
        by_asset
            .entry(item.asset_id.clone())
            .or_default()
            .push(item);
    }
    by_asset
        .into_iter()
        .filter_map(|(asset_id, items)| {
            calculate_asset_signal(asset_id, items, window_start, window_end)
        })
        .collect()
}

fn calculate_asset_signal(
    asset_id: String,
    items: Vec<SignalEvidenceInput>,
    window_start: DateTime<Utc>,
    window_end: DateTime<Utc>,
) -> Option<CalculatedSignal> {
    let mut signed_total = 0.0;
    let mut weight_total = 0.0;
    let mut confidence_total = 0.0;
    let mut hype_total = 0.0;
    let mut sources = BTreeSet::new();
    let mut weighted_evidence = Vec::new();

    for item in &items {
        let direction = match item.sentiment.as_str() {
            "optimistic" => 1.0,
            "pessimistic" => -1.0,
            _ => 0.0,
        };
        let type_weight = match item.content_type.as_str() {
            "news" => 1.0,
            "technical_analysis" => 0.85,
            "opinion" => 0.65,
            "meme" => 0.25,
            "spam" => 0.05,
            _ => 0.40,
        };
        let relevance_weight = (item.relevance_expected / 3.0).clamp(0.05, 1.0);
        let factual_weight = 0.70 + (0.30 * item.factual_claim_probability.clamp(0.0, 1.0));
        let hype_factor = 1.0 - (0.65 * item.hype_probability.clamp(0.0, 1.0));
        let weight = relevance_weight
            * type_weight
            * factual_weight
            * hype_factor
            * item.confidence.clamp(0.0, 1.0);
        let directional_probability = if direction == 0.0 {
            1.0
        } else {
            item.sentiment_probability.clamp(0.0, 1.0)
        };
        signed_total += direction * directional_probability * weight;
        weight_total += weight;
        confidence_total += item.confidence.clamp(0.0, 1.0) * weight;
        hype_total += item.hype_probability.clamp(0.0, 1.0) * weight;
        sources.insert(item.source_id.clone());
        weighted_evidence.push(WeightedEvidence {
            classification_id: item.classification_id.clone(),
            contribution_weight: direction * directional_probability * weight,
        });
    }
    if weight_total <= f64::EPSILON {
        return None;
    }
    let source_count = sources.len();
    let diversity_factor = (source_count as f64 / 3.0).clamp(0.0, 1.0);
    let sample_factor = (items.len() as f64 / 5.0).sqrt().clamp(0.0, 1.0);
    let evidence_confidence = confidence_total / weight_total;
    let confidence = (evidence_confidence
        * (0.55 + 0.25 * diversity_factor + 0.20 * sample_factor))
        .clamp(0.0, 1.0);
    let window_started_at = window_start.to_rfc3339();
    let window_ended_at = window_end.to_rfc3339();
    Some(CalculatedSignal {
        id: format!("signal:{asset_id}:{window_ended_at}:{METHODOLOGY_VERSION}"),
        asset_id,
        window_started_at,
        window_ended_at,
        signal_score: (signed_total / weight_total).clamp(-1.0, 1.0),
        confidence,
        source_count,
        independent_source_count: source_count,
        evidence_count: items.len(),
        hype_penalty: (hype_total / weight_total).clamp(0.0, 1.0),
        methodology_version: METHODOLOGY_VERSION.to_owned(),
        calculated_at: Utc::now().to_rfc3339(),
        evidence: weighted_evidence,
    })
}

#[cfg(test)]
mod tests {
    use chrono::{TimeZone, Utc};

    use super::calculate_signals;
    use crate::domain::signals::SignalEvidenceInput;

    fn evidence(sentiment: &str, source_id: &str, hype: f64) -> SignalEvidenceInput {
        SignalEvidenceInput {
            classification_id: format!("classification:{source_id}:{sentiment}"),
            asset_id: "asset:b3:PETR4".to_owned(),
            source_id: source_id.to_owned(),
            sentiment: sentiment.to_owned(),
            sentiment_probability: 0.9,
            relevance_expected: 3.0,
            content_type: "news".to_owned(),
            hype_probability: hype,
            factual_claim_probability: 0.95,
            confidence: 0.9,
        }
    }

    #[test]
    fn aggregates_direction_and_rewards_source_diversity() {
        let start = Utc.with_ymd_and_hms(2026, 11, 1, 0, 0, 0).unwrap();
        let end = Utc.with_ymd_and_hms(2026, 11, 2, 0, 0, 0).unwrap();
        let one_source =
            calculate_signals(vec![evidence("optimistic", "source:a", 0.0)], start, end);
        let diverse = calculate_signals(
            vec![
                evidence("optimistic", "source:a", 0.0),
                evidence("optimistic", "source:b", 0.0),
                evidence("pessimistic", "source:c", 0.0),
            ],
            start,
            end,
        );
        assert!(one_source[0].signal_score > 0.8);
        assert!(diverse[0].signal_score > 0.0);
        assert!(diverse[0].confidence > one_source[0].confidence);
        assert_eq!(diverse[0].independent_source_count, 3);
    }

    #[test]
    fn hype_reduces_the_evidence_weight() {
        let start = Utc.with_ymd_and_hms(2026, 11, 1, 0, 0, 0).unwrap();
        let end = Utc.with_ymd_and_hms(2026, 11, 2, 0, 0, 0).unwrap();
        let signals = calculate_signals(
            vec![
                evidence("optimistic", "source:a", 1.0),
                evidence("pessimistic", "source:b", 0.0),
            ],
            start,
            end,
        );
        assert!(signals[0].signal_score < 0.0);
        assert!(signals[0].hype_penalty > 0.0);
    }
}
