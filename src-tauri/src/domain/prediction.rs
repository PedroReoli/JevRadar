use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

pub const PREDICTIVE_ENGINE_CONTRACT_VERSION: &str = "jev-radar-predictive-v1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PredictiveEngineRequest {
    pub contract_version: String,
    pub asset_id: String,
    pub as_of: String,
    pub signal_methodology_version: String,
    pub signal_score: f64,
    pub signal_confidence: f64,
    pub independent_source_count: usize,
    pub evidence_count: usize,
    pub hype_penalty: f64,
    pub historical_outcomes: Vec<HistoricalOutcomeInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HistoricalOutcomeInput {
    pub signal_observed_at: String,
    pub signal_score: f64,
    pub confidence: f64,
    pub horizon_days: u16,
    pub forward_return: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PredictiveEngineReport {
    pub contract_version: String,
    pub engine_version: String,
    pub asset_id: String,
    pub generated_at: String,
    pub status: PredictiveEngineStatus,
    pub similar_case_count: usize,
    pub horizons: Vec<PredictiveHorizonAssessment>,
    pub limitations: Vec<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PredictiveEngineStatus {
    Available,
    InsufficientData,
    Unavailable,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PredictiveHorizonAssessment {
    pub horizon_days: u16,
    pub historical_positive_rate: f64,
    pub baseline_positive_rate: f64,
    pub confidence_interval_low: f64,
    pub confidence_interval_high: f64,
    pub reliability: f64,
}

#[derive(Debug, thiserror::Error)]
pub enum PredictiveEngineError {
    #[error("versão do contrato preditivo incompatível")]
    IncompatibleContract,
    #[error("motor preditivo indisponível")]
    Unavailable,
    #[error("resposta do motor preditivo inválida")]
    InvalidResponse,
}

pub trait PredictiveEngine: Send + Sync {
    fn evaluate(
        &self,
        request: &PredictiveEngineRequest,
    ) -> Result<PredictiveEngineReport, PredictiveEngineError>;
}

pub fn validate_predictive_request(
    request: &PredictiveEngineRequest,
) -> Result<(), PredictiveEngineError> {
    if request.contract_version != PREDICTIVE_ENGINE_CONTRACT_VERSION {
        return Err(PredictiveEngineError::IncompatibleContract);
    }
    if !request.asset_id.starts_with("asset:")
        || request.asset_id.len() > 128
        || request.as_of.is_empty()
        || request.signal_methodology_version.is_empty()
        || !(-1.0..=1.0).contains(&request.signal_score)
        || !(0.0..=1.0).contains(&request.signal_confidence)
        || !(0.0..=1.0).contains(&request.hype_penalty)
        || request.historical_outcomes.len() > 50_000
        || request.historical_outcomes.iter().any(|outcome| {
            outcome.signal_observed_at.is_empty()
                || ![1, 7, 30].contains(&outcome.horizon_days)
                || !(-1.0..=1.0).contains(&outcome.signal_score)
                || !(0.0..=1.0).contains(&outcome.confidence)
                || !outcome.forward_return.is_finite()
        })
    {
        return Err(PredictiveEngineError::InvalidResponse);
    }
    Ok(())
}

pub fn validate_predictive_report(
    request: &PredictiveEngineRequest,
    report: &PredictiveEngineReport,
) -> Result<(), PredictiveEngineError> {
    validate_predictive_request(request)?;
    if request.contract_version != PREDICTIVE_ENGINE_CONTRACT_VERSION
        || report.contract_version != PREDICTIVE_ENGINE_CONTRACT_VERSION
    {
        return Err(PredictiveEngineError::IncompatibleContract);
    }
    let mut horizons = BTreeSet::new();
    if request.asset_id != report.asset_id
        || report.engine_version.is_empty()
        || report.engine_version.len() > 128
        || report.generated_at.is_empty()
        || report.limitations.len() > 50
        || report.limitations.iter().any(|item| item.len() > 500)
        || report.horizons.iter().any(|horizon| {
            !horizons.insert(horizon.horizon_days)
                || ![1, 7, 30].contains(&horizon.horizon_days)
                || !(0.0..=1.0).contains(&horizon.historical_positive_rate)
                || !(0.0..=1.0).contains(&horizon.baseline_positive_rate)
                || !(0.0..=1.0).contains(&horizon.reliability)
                || horizon.confidence_interval_low > horizon.confidence_interval_high
        })
    {
        return Err(PredictiveEngineError::InvalidResponse);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{
        PREDICTIVE_ENGINE_CONTRACT_VERSION, PredictiveEngineError, PredictiveEngineReport,
        PredictiveEngineRequest, PredictiveEngineStatus, PredictiveHorizonAssessment,
        validate_predictive_report, validate_predictive_request,
    };

    fn request() -> PredictiveEngineRequest {
        PredictiveEngineRequest {
            contract_version: PREDICTIVE_ENGINE_CONTRACT_VERSION.to_owned(),
            asset_id: "asset:b3:PETR4".to_owned(),
            as_of: "2026-11-01T12:00:00Z".to_owned(),
            signal_methodology_version: "weighted-sentiment-v2".to_owned(),
            signal_score: 0.42,
            signal_confidence: 0.78,
            independent_source_count: 4,
            evidence_count: 12,
            hype_penalty: 0.08,
            historical_outcomes: Vec::new(),
        }
    }

    #[test]
    fn accepts_only_the_versioned_non_recommendation_contract() {
        let request = request();
        let report = PredictiveEngineReport {
            contract_version: PREDICTIVE_ENGINE_CONTRACT_VERSION.to_owned(),
            engine_version: "private-engine-test".to_owned(),
            asset_id: request.asset_id.clone(),
            generated_at: request.as_of.clone(),
            status: PredictiveEngineStatus::InsufficientData,
            similar_case_count: 0,
            horizons: vec![PredictiveHorizonAssessment {
                horizon_days: 7,
                historical_positive_rate: 0.5,
                baseline_positive_rate: 0.48,
                confidence_interval_low: 0.31,
                confidence_interval_high: 0.69,
                reliability: 0.2,
            }],
            limitations: vec!["amostra insuficiente".to_owned()],
        };
        assert!(validate_predictive_report(&request, &report).is_ok());

        let mut incompatible = report;
        incompatible.contract_version = "unknown".to_owned();
        assert!(matches!(
            validate_predictive_report(&request, &incompatible),
            Err(PredictiveEngineError::IncompatibleContract)
        ));
    }

    #[test]
    fn rejects_unbounded_or_unknown_horizons() {
        let request = request();
        let report = PredictiveEngineReport {
            contract_version: PREDICTIVE_ENGINE_CONTRACT_VERSION.to_owned(),
            engine_version: "private-engine-test".to_owned(),
            asset_id: request.asset_id.clone(),
            generated_at: request.as_of.clone(),
            status: PredictiveEngineStatus::Available,
            similar_case_count: 10,
            horizons: vec![PredictiveHorizonAssessment {
                horizon_days: 365,
                historical_positive_rate: 1.2,
                baseline_positive_rate: 0.5,
                confidence_interval_low: 0.8,
                confidence_interval_high: 0.4,
                reliability: 1.5,
            }],
            limitations: Vec::new(),
        };
        assert!(matches!(
            validate_predictive_report(&request, &report),
            Err(PredictiveEngineError::InvalidResponse)
        ));
    }

    #[test]
    fn rejects_invalid_or_unbounded_public_inputs() {
        let mut invalid = request();
        invalid.signal_confidence = 1.1;
        assert!(matches!(
            validate_predictive_request(&invalid),
            Err(PredictiveEngineError::InvalidResponse)
        ));

        invalid = request();
        invalid.asset_id = "PETR4".to_owned();
        assert!(matches!(
            validate_predictive_request(&invalid),
            Err(PredictiveEngineError::InvalidResponse)
        ));
    }
}
