use chrono::{DateTime, Duration, Utc};

use crate::domain::backtest::{
    BacktestDataset, BacktestHorizonResult, BacktestReport, RunBacktestRequest,
};
use crate::infrastructure::database::{Database, DatabaseError};

const METHODOLOGY_VERSION: &str = "positive-turn-forward-return-v1";
const HORIZONS: &[i64] = &[1, 7, 30];

pub struct BacktestService;

#[derive(Debug, thiserror::Error)]
pub enum BacktestServiceError {
    #[error("parâmetros de backtest inválidos: {0}")]
    InvalidRequest(&'static str),
    #[error("não há histórico suficiente para separar calibração e avaliação")]
    InsufficientHistory,
    #[error(transparent)]
    Database(#[from] DatabaseError),
}

impl BacktestService {
    pub fn run(
        database: &Database,
        request: RunBacktestRequest,
    ) -> Result<BacktestReport, BacktestServiceError> {
        request
            .validate()
            .map_err(BacktestServiceError::InvalidRequest)?;
        let dataset = database.backtest_dataset(&request.asset_id)?;
        let report = calculate_report(dataset, &request)?;
        database.store_backtest_report(&report)?;
        Ok(report)
    }

    pub fn latest(
        database: &Database,
        asset_id: &str,
    ) -> Result<Option<BacktestReport>, BacktestServiceError> {
        database
            .latest_backtest_report(asset_id)
            .map_err(Into::into)
    }
}

fn calculate_report(
    dataset: BacktestDataset,
    request: &RunBacktestRequest,
) -> Result<BacktestReport, BacktestServiceError> {
    let parsed_prices = dataset
        .prices
        .iter()
        .filter_map(|point| parse_time(&point.observed_at).map(|time| (time, point.close_value)))
        .collect::<Vec<_>>();
    let Some((first_time, _)) = parsed_prices.first().copied() else {
        return Err(BacktestServiceError::InsufficientHistory);
    };
    let Some((last_time, _)) = parsed_prices.last().copied() else {
        return Err(BacktestServiceError::InsufficientHistory);
    };
    let total_seconds = (last_time - first_time).num_seconds();
    if total_seconds < Duration::days(2).num_seconds() {
        return Err(BacktestServiceError::InsufficientHistory);
    }
    let evaluation_start = first_time + Duration::seconds((total_seconds as f64 * 0.30) as i64);
    let mut prior_above = false;
    let events = dataset
        .signals
        .iter()
        .filter_map(|signal| {
            let ended_at = parse_time(&signal.ended_at)?;
            let above = signal.signal_score >= request.signal_threshold
                && signal.confidence >= request.confidence_threshold;
            let is_turn = above && !prior_above && ended_at >= evaluation_start;
            prior_above = above;
            is_turn.then_some(ended_at)
        })
        .collect::<Vec<_>>();
    let results = HORIZONS
        .iter()
        .map(|horizon| calculate_horizon(*horizon, &events, &parsed_prices, evaluation_start))
        .collect();
    let created_at = Utc::now();
    Ok(BacktestReport {
        run_id: format!(
            "backtest:{}:{}",
            dataset.asset.id,
            created_at.timestamp_millis()
        ),
        asset: dataset.asset,
        methodology_version: METHODOLOGY_VERSION.to_owned(),
        model_version: dataset.model_version,
        question_version: dataset.question_version,
        signal_threshold: request.signal_threshold,
        confidence_threshold: request.confidence_threshold,
        calibration_started_at: first_time.to_rfc3339(),
        calibration_ended_at: evaluation_start.to_rfc3339(),
        evaluation_started_at: evaluation_start.to_rfc3339(),
        evaluation_ended_at: last_time.to_rfc3339(),
        created_at: created_at.to_rfc3339(),
        completed_at: Some(created_at.to_rfc3339()),
        status: "completed".to_owned(),
        results,
    })
}

fn calculate_horizon(
    horizon_days: i64,
    events: &[DateTime<Utc>],
    prices: &[(DateTime<Utc>, f64)],
    evaluation_start: DateTime<Utc>,
) -> BacktestHorizonResult {
    let returns = events
        .iter()
        .filter_map(|event| forward_return(*event, horizon_days, prices))
        .collect::<Vec<_>>();
    let baseline = prices
        .iter()
        .filter(|(time, _)| *time >= evaluation_start)
        .filter_map(|(time, _)| forward_return(*time, horizon_days, prices))
        .collect::<Vec<_>>();
    let sample_size = returns.len();
    let positive_count = returns.iter().filter(|value| **value > 0.0).count();
    let positive_rate = (sample_size > 0).then_some(positive_count as f64 / sample_size as f64);
    let (confidence_interval_low, confidence_interval_high) = positive_rate
        .map(|rate| wilson_interval(rate, sample_size))
        .map_or((None, None), |(low, high)| (Some(low), Some(high)));
    BacktestHorizonResult {
        horizon_days,
        sample_size,
        mean_return: mean(&returns),
        median_return: median(&returns),
        positive_rate,
        baseline_positive_rate: (!baseline.is_empty()).then_some(
            baseline.iter().filter(|value| **value > 0.0).count() as f64 / baseline.len() as f64,
        ),
        confidence_interval_low,
        confidence_interval_high,
    }
}

fn forward_return(
    event: DateTime<Utc>,
    horizon_days: i64,
    prices: &[(DateTime<Utc>, f64)],
) -> Option<f64> {
    let entry = prices.iter().rev().find(|(time, _)| *time <= event)?.1;
    let target = event + Duration::days(horizon_days);
    let exit = prices.iter().find(|(time, _)| *time >= target)?.1;
    (entry > 0.0).then_some((exit / entry) - 1.0)
}

fn mean(values: &[f64]) -> Option<f64> {
    (!values.is_empty()).then_some(values.iter().sum::<f64>() / values.len() as f64)
}

fn median(values: &[f64]) -> Option<f64> {
    if values.is_empty() {
        return None;
    }
    let mut sorted = values.to_vec();
    sorted.sort_by(f64::total_cmp);
    let middle = sorted.len() / 2;
    Some(if sorted.len().is_multiple_of(2) {
        (sorted[middle - 1] + sorted[middle]) / 2.0
    } else {
        sorted[middle]
    })
}

fn wilson_interval(rate: f64, sample_size: usize) -> (f64, f64) {
    let n = sample_size as f64;
    let z = 1.96;
    let denominator = 1.0 + z * z / n;
    let center = (rate + z * z / (2.0 * n)) / denominator;
    let margin = z * ((rate * (1.0 - rate) / n + z * z / (4.0 * n * n)).sqrt()) / denominator;
    ((center - margin).max(0.0), (center + margin).min(1.0))
}

fn parse_time(value: &str) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(value)
        .ok()
        .map(|time| time.with_timezone(&Utc))
}

#[cfg(test)]
mod tests {
    use chrono::{Duration, TimeZone, Utc};

    use super::calculate_report;
    use crate::domain::assets::{Asset, AssetClass};
    use crate::domain::backtest::{
        BacktestDataset, BacktestPricePoint, BacktestSignalPoint, RunBacktestRequest,
    };

    #[test]
    fn uses_only_forward_prices_after_a_positive_turn() {
        let start = Utc.with_ymd_and_hms(2026, 1, 1, 0, 0, 0).unwrap();
        let prices = (0..70)
            .map(|day| BacktestPricePoint {
                observed_at: (start + Duration::days(day)).to_rfc3339(),
                close_value: 100.0 + day as f64,
            })
            .collect();
        let signals = vec![
            BacktestSignalPoint {
                ended_at: (start + Duration::days(25)).to_rfc3339(),
                signal_score: 0.0,
                confidence: 0.9,
            },
            BacktestSignalPoint {
                ended_at: (start + Duration::days(26)).to_rfc3339(),
                signal_score: 0.5,
                confidence: 0.9,
            },
            BacktestSignalPoint {
                ended_at: (start + Duration::days(27)).to_rfc3339(),
                signal_score: 0.6,
                confidence: 0.9,
            },
        ];
        let report = calculate_report(
            BacktestDataset {
                asset: Asset {
                    id: "asset:test".to_owned(),
                    symbol: "TEST".to_owned(),
                    name: "Test".to_owned(),
                    asset_class: AssetClass::B3Equity,
                    exchange: "B3".to_owned(),
                    currency: "BRL".to_owned(),
                    country_code: Some("BR".to_owned()),
                },
                signals,
                prices,
                model_version: "jev-latest".to_owned(),
                question_version: "v1".to_owned(),
            },
            &RunBacktestRequest {
                asset_id: "asset:test".to_owned(),
                signal_threshold: 0.15,
                confidence_threshold: 0.6,
            },
        )
        .expect("relatório");
        assert_eq!(report.results[0].sample_size, 1);
        assert!(report.results[0].mean_return.unwrap() > 0.0);
    }
}
