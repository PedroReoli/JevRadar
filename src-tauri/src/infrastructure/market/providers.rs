use std::collections::BTreeMap;

use chrono::{DateTime, NaiveDate, Utc};
use reqwest::blocking::Client;
use serde::Deserialize;
use serde_json::Value;
use thiserror::Error;

use crate::domain::assets::{Asset, AssetClass};
use crate::domain::collection::MarketObservationInput;
use crate::infrastructure::http::{RetryPolicy, send_with_retry};

const BINANCE_SOURCE_ID: &str = "source:binance";
const BRAPI_SOURCE_ID: &str = "source:brapi";
const BCB_SOURCE_ID: &str = "source:bcb";
const ALPHA_VANTAGE_SOURCE_ID: &str = "source:alpha-vantage";
const ALPHA_VANTAGE_ASSET_LIMIT_PER_RUN: usize = 5;
const BRAPI_FREE_SYMBOLS: &[&str] = &["PETR4", "VALE3", "ITUB4", "MGLU3"];

#[derive(Debug)]
pub struct ProviderCollection {
    pub source_id: &'static str,
    pub observations: Vec<MarketObservationInput>,
    pub skipped_asset_count: usize,
}

#[derive(Debug, Error)]
pub enum MarketProviderError {
    #[error("a fonte recusou ou não concluiu a requisição")]
    Request,
    #[error("a fonte retornou um contrato de dados inválido")]
    InvalidPayload,
    #[error("a fonte informou limite temporário de uso")]
    RateLimited,
    #[error("a fonte rejeitou a chave de API")]
    Authentication,
}

impl MarketProviderError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Request => "provider_request_failed",
            Self::InvalidPayload => "provider_invalid_payload",
            Self::RateLimited => "provider_rate_limited",
            Self::Authentication => "provider_authentication_failed",
        }
    }
}

pub fn collect_binance(
    client: &Client,
    assets: &[Asset],
) -> Result<ProviderCollection, MarketProviderError> {
    let selected = assets
        .iter()
        .filter(|asset| asset.asset_class == AssetClass::Crypto);
    let mut observations = Vec::new();

    for asset in selected {
        let symbol = format!("{}USDT", asset.symbol);
        let payload = send_with_retry(
            || {
                client
                    .get("https://data-api.binance.vision/api/v3/klines")
                    .query(&[
                        ("symbol", symbol.as_str()),
                        ("interval", "1d"),
                        ("limit", "100"),
                    ])
            },
            RetryPolicy::Idempotent,
        )
        .and_then(reqwest::blocking::Response::error_for_status)
        .map_err(|_| MarketProviderError::Request)?
        .json::<Vec<Vec<Value>>>()
        .map_err(|_| MarketProviderError::InvalidPayload)?;
        observations.extend(parse_binance_klines(asset, payload)?);
    }

    Ok(ProviderCollection {
        source_id: BINANCE_SOURCE_ID,
        observations,
        skipped_asset_count: 0,
    })
}

pub fn collect_brapi(
    client: &Client,
    assets: &[Asset],
    token: Option<&str>,
) -> Result<ProviderCollection, MarketProviderError> {
    let b3_assets = assets
        .iter()
        .filter(|asset| matches!(asset.asset_class, AssetClass::B3Equity | AssetClass::B3Fund))
        .collect::<Vec<_>>();
    let allowed_assets = b3_assets
        .iter()
        .copied()
        .filter(|asset| token.is_some() || BRAPI_FREE_SYMBOLS.contains(&asset.symbol.as_str()))
        .collect::<Vec<_>>();
    let skipped_asset_count = b3_assets.len().saturating_sub(allowed_assets.len());
    if allowed_assets.is_empty() {
        return Ok(ProviderCollection {
            source_id: BRAPI_SOURCE_ID,
            observations: Vec::new(),
            skipped_asset_count,
        });
    }

    let symbols = allowed_assets
        .iter()
        .map(|asset| asset.symbol.as_str())
        .collect::<Vec<_>>()
        .join(",");
    let payload = send_with_retry(
        || {
            let request = client
                .get("https://brapi.dev/api/v2/stocks/historical")
                .query(&[
                    ("symbols", symbols.as_str()),
                    ("range", "3mo"),
                    ("interval", "1d"),
                    ("sortOrder", "asc"),
                ]);
            match token {
                Some(token) => request.bearer_auth(token),
                None => request,
            }
        },
        RetryPolicy::Idempotent,
    )
    .and_then(reqwest::blocking::Response::error_for_status)
    .map_err(|_| MarketProviderError::Request)?
    .json::<BrapiResponse>()
    .map_err(|_| MarketProviderError::InvalidPayload)?;

    Ok(ProviderCollection {
        source_id: BRAPI_SOURCE_ID,
        observations: parse_brapi_history(&allowed_assets, payload)?,
        skipped_asset_count,
    })
}

pub fn collect_bcb(
    client: &Client,
    assets: &[Asset],
) -> Result<ProviderCollection, MarketProviderError> {
    let mut observations = Vec::new();
    let mut skipped_asset_count = 0;
    for asset in assets
        .iter()
        .filter(|asset| asset.asset_class == AssetClass::Macro)
    {
        let series_code = match asset.symbol.as_str() {
            "SELIC" => 1178,
            "CDI" => 4389,
            _ => {
                skipped_asset_count += 1;
                continue;
            }
        };
        let url = format!(
            "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{series_code}/dados/ultimos/100"
        );
        let payload = send_with_retry(
            || client.get(&url).query(&[("formato", "json")]),
            RetryPolicy::Idempotent,
        )
        .and_then(reqwest::blocking::Response::error_for_status)
        .map_err(|_| MarketProviderError::Request)?
        .json::<Vec<BcbPoint>>()
        .map_err(|_| MarketProviderError::InvalidPayload)?;
        observations.extend(parse_bcb_points(asset, payload)?);
    }

    Ok(ProviderCollection {
        source_id: BCB_SOURCE_ID,
        observations,
        skipped_asset_count,
    })
}

pub fn collect_alpha_vantage(
    client: &Client,
    assets: &[Asset],
    api_key: Option<&str>,
    rotation_offset: usize,
) -> Result<ProviderCollection, MarketProviderError> {
    let us_assets = assets
        .iter()
        .filter(|asset| matches!(asset.asset_class, AssetClass::UsEquity | AssetClass::UsFund))
        .collect::<Vec<_>>();
    let Some(api_key) = api_key.filter(|value| !value.trim().is_empty()) else {
        return Ok(ProviderCollection {
            source_id: ALPHA_VANTAGE_SOURCE_ID,
            observations: Vec::new(),
            skipped_asset_count: us_assets.len(),
        });
    };
    if us_assets.is_empty() {
        return Ok(ProviderCollection {
            source_id: ALPHA_VANTAGE_SOURCE_ID,
            observations: Vec::new(),
            skipped_asset_count: 0,
        });
    }

    let selected = select_alpha_vantage_assets(&us_assets, rotation_offset);
    let selected_count = selected.len();
    let mut observations = Vec::new();
    let mut skipped_asset_count = us_assets.len().saturating_sub(selected_count);
    let mut last_error = None;

    for (index, asset) in selected.into_iter().enumerate() {
        let response = send_with_retry(
            || {
                client.get("https://www.alphavantage.co/query").query(&[
                    ("function", "TIME_SERIES_DAILY"),
                    ("symbol", asset.symbol.as_str()),
                    ("outputsize", "compact"),
                    ("apikey", api_key),
                ])
            },
            RetryPolicy::Idempotent,
        )
        .and_then(reqwest::blocking::Response::error_for_status)
        .map_err(|_| MarketProviderError::Request)
        .and_then(|response| {
            response
                .json::<AlphaVantageDailyResponse>()
                .map_err(|_| MarketProviderError::InvalidPayload)
        })
        .and_then(|payload| parse_alpha_vantage_daily(asset, payload));
        match response {
            Ok(points) => observations.extend(points),
            Err(error) => {
                let rate_limited = matches!(error, MarketProviderError::RateLimited);
                skipped_asset_count += 1;
                last_error = Some(error);
                if rate_limited {
                    skipped_asset_count += selected_count.saturating_sub(index + 1);
                    break;
                }
            }
        }
    }

    if observations.is_empty() {
        if let Some(error) = last_error {
            return Err(error);
        }
    }
    Ok(ProviderCollection {
        source_id: ALPHA_VANTAGE_SOURCE_ID,
        observations,
        skipped_asset_count,
    })
}

fn select_alpha_vantage_assets<'a>(assets: &[&'a Asset], rotation_offset: usize) -> Vec<&'a Asset> {
    if assets.is_empty() {
        return Vec::new();
    }
    let selected_count = assets.len().min(ALPHA_VANTAGE_ASSET_LIMIT_PER_RUN);
    let offset = rotation_offset % assets.len();
    assets
        .iter()
        .cycle()
        .skip(offset)
        .take(selected_count)
        .copied()
        .collect()
}

fn parse_binance_klines(
    asset: &Asset,
    payload: Vec<Vec<Value>>,
) -> Result<Vec<MarketObservationInput>, MarketProviderError> {
    payload
        .into_iter()
        .map(|row| {
            let timestamp = row
                .first()
                .and_then(Value::as_i64)
                .ok_or(MarketProviderError::InvalidPayload)?;
            let observed_at = DateTime::from_timestamp_millis(timestamp)
                .ok_or(MarketProviderError::InvalidPayload)?
                .to_rfc3339();
            Ok(MarketObservationInput {
                id: observation_id(BINANCE_SOURCE_ID, &asset.id, "1d", &observed_at),
                asset_id: asset.id.clone(),
                source_id: BINANCE_SOURCE_ID.to_owned(),
                interval: "1d".to_owned(),
                observed_at,
                open_value: parse_json_number(row.get(1))?,
                high_value: parse_json_number(row.get(2))?,
                low_value: parse_json_number(row.get(3))?,
                close_value: parse_json_number(row.get(4))?
                    .ok_or(MarketProviderError::InvalidPayload)?,
                volume_value: parse_json_number(row.get(5))?,
                collected_at: Utc::now().to_rfc3339(),
            })
        })
        .collect()
}

fn parse_json_number(value: Option<&Value>) -> Result<Option<f64>, MarketProviderError> {
    match value {
        Some(Value::String(value)) => value
            .parse::<f64>()
            .map(Some)
            .map_err(|_| MarketProviderError::InvalidPayload),
        Some(Value::Number(value)) => value
            .as_f64()
            .map(Some)
            .ok_or(MarketProviderError::InvalidPayload),
        Some(Value::Null) | None => Ok(None),
        _ => Err(MarketProviderError::InvalidPayload),
    }
}

#[derive(Debug, Deserialize)]
struct BrapiResponse {
    results: Vec<BrapiResult>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BrapiResult {
    symbol: String,
    data: BrapiData,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BrapiData {
    historical_data_price: Vec<BrapiPoint>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BrapiPoint {
    date: i64,
    open: Option<f64>,
    high: Option<f64>,
    low: Option<f64>,
    close: f64,
    volume: Option<f64>,
    adjusted_close: Option<f64>,
}

fn parse_brapi_history(
    assets: &[&Asset],
    payload: BrapiResponse,
) -> Result<Vec<MarketObservationInput>, MarketProviderError> {
    let mut observations = Vec::new();
    for result in payload.results {
        let asset = assets
            .iter()
            .find(|asset| asset.symbol.eq_ignore_ascii_case(&result.symbol))
            .ok_or(MarketProviderError::InvalidPayload)?;
        for point in result.data.historical_data_price {
            let observed_at = DateTime::from_timestamp(point.date, 0)
                .ok_or(MarketProviderError::InvalidPayload)?
                .to_rfc3339();
            observations.push(MarketObservationInput {
                id: observation_id(BRAPI_SOURCE_ID, &asset.id, "1d", &observed_at),
                asset_id: asset.id.clone(),
                source_id: BRAPI_SOURCE_ID.to_owned(),
                interval: "1d".to_owned(),
                observed_at,
                open_value: point.open,
                high_value: point.high,
                low_value: point.low,
                close_value: point.adjusted_close.unwrap_or(point.close),
                volume_value: point.volume,
                collected_at: Utc::now().to_rfc3339(),
            });
        }
    }
    Ok(observations)
}

#[derive(Debug, Deserialize)]
struct BcbPoint {
    data: String,
    valor: String,
}

#[derive(Debug, Deserialize)]
struct AlphaVantageDailyResponse {
    #[serde(rename = "Time Series (Daily)")]
    time_series: Option<BTreeMap<String, AlphaVantageDailyPoint>>,
    #[serde(rename = "Note")]
    note: Option<String>,
    #[serde(rename = "Information")]
    information: Option<String>,
    #[serde(rename = "Error Message")]
    error_message: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AlphaVantageDailyPoint {
    #[serde(rename = "1. open")]
    open: String,
    #[serde(rename = "2. high")]
    high: String,
    #[serde(rename = "3. low")]
    low: String,
    #[serde(rename = "4. close")]
    close: String,
    #[serde(rename = "5. volume")]
    volume: String,
}

fn parse_alpha_vantage_daily(
    asset: &Asset,
    payload: AlphaVantageDailyResponse,
) -> Result<Vec<MarketObservationInput>, MarketProviderError> {
    if payload.note.is_some() {
        return Err(MarketProviderError::RateLimited);
    }
    if let Some(information) = payload.information {
        let normalized = information.to_ascii_lowercase();
        return Err(
            if normalized.contains("api key")
                && (normalized.contains("demo") || normalized.contains("invalid"))
            {
                MarketProviderError::Authentication
            } else {
                MarketProviderError::RateLimited
            },
        );
    }
    if payload.error_message.is_some() {
        return Err(MarketProviderError::InvalidPayload);
    }
    let series = payload
        .time_series
        .ok_or(MarketProviderError::InvalidPayload)?;
    series
        .into_iter()
        .map(|(date, point)| {
            let date = NaiveDate::parse_from_str(&date, "%Y-%m-%d")
                .map_err(|_| MarketProviderError::InvalidPayload)?;
            let observed_at = format!("{}T00:00:00Z", date.format("%Y-%m-%d"));
            Ok(MarketObservationInput {
                id: observation_id(ALPHA_VANTAGE_SOURCE_ID, &asset.id, "1d", &observed_at),
                asset_id: asset.id.clone(),
                source_id: ALPHA_VANTAGE_SOURCE_ID.to_owned(),
                interval: "1d".to_owned(),
                observed_at,
                open_value: Some(parse_alpha_number(&point.open)?),
                high_value: Some(parse_alpha_number(&point.high)?),
                low_value: Some(parse_alpha_number(&point.low)?),
                close_value: parse_alpha_number(&point.close)?,
                volume_value: Some(parse_alpha_number(&point.volume)?),
                collected_at: Utc::now().to_rfc3339(),
            })
        })
        .collect()
}

fn parse_alpha_number(value: &str) -> Result<f64, MarketProviderError> {
    value
        .parse::<f64>()
        .ok()
        .filter(|number| number.is_finite())
        .ok_or(MarketProviderError::InvalidPayload)
}

fn parse_bcb_points(
    asset: &Asset,
    payload: Vec<BcbPoint>,
) -> Result<Vec<MarketObservationInput>, MarketProviderError> {
    payload
        .into_iter()
        .map(|point| {
            let date = NaiveDate::parse_from_str(&point.data, "%d/%m/%Y")
                .map_err(|_| MarketProviderError::InvalidPayload)?;
            let observed_at = format!("{}T00:00:00-03:00", date.format("%Y-%m-%d"));
            let value = point
                .valor
                .replace(',', ".")
                .parse::<f64>()
                .map_err(|_| MarketProviderError::InvalidPayload)?;
            Ok(MarketObservationInput {
                id: observation_id(BCB_SOURCE_ID, &asset.id, "1d", &observed_at),
                asset_id: asset.id.clone(),
                source_id: BCB_SOURCE_ID.to_owned(),
                interval: "1d".to_owned(),
                observed_at,
                open_value: None,
                high_value: None,
                low_value: None,
                close_value: value,
                volume_value: None,
                collected_at: Utc::now().to_rfc3339(),
            })
        })
        .collect()
}

fn observation_id(source_id: &str, asset_id: &str, interval: &str, observed_at: &str) -> String {
    format!("observation:{source_id}:{asset_id}:{interval}:{observed_at}")
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{
        AlphaVantageDailyResponse, BcbPoint, BrapiResponse, parse_alpha_vantage_daily,
        parse_bcb_points, parse_binance_klines, parse_brapi_history, select_alpha_vantage_assets,
    };
    use crate::domain::assets::{Asset, AssetClass};

    fn asset(id: &str, symbol: &str, asset_class: AssetClass) -> Asset {
        Asset {
            id: id.to_owned(),
            symbol: symbol.to_owned(),
            name: symbol.to_owned(),
            asset_class,
            exchange: "TEST".to_owned(),
            currency: "USD".to_owned(),
            country_code: None,
        }
    }

    #[test]
    fn parses_binance_klines_without_losing_precision_contract() {
        let asset = asset("asset:crypto:BTC", "BTC", AssetClass::Crypto);
        let rows = vec![vec![
            json!(1_793_491_200_000_i64),
            json!("77582.02"),
            json!("78285.00"),
            json!("77517.20"),
            json!("77918.01"),
            json!("3506.74212"),
        ]];
        let parsed = parse_binance_klines(&asset, rows).expect("candles válidos");
        assert_eq!(parsed[0].close_value, 77_918.01);
        assert_eq!(parsed[0].source_id, "source:binance");
    }

    #[test]
    fn prefers_adjusted_close_for_b3_returns() {
        let asset = asset("asset:b3:PETR4", "PETR4", AssetClass::B3Equity);
        let payload: BrapiResponse = serde_json::from_value(json!({
            "results": [{
                "symbol": "PETR4",
                "data": {"historicalDataPrice": [{
                    "date": 1793070000_i64,
                    "open": 53.6,
                    "high": 53.7,
                    "low": 52.66,
                    "close": 52.79,
                    "volume": 80592800,
                    "adjustedClose": 51.25
                }]}
            }]
        }))
        .expect("fixture");
        let parsed = parse_brapi_history(&[&asset], payload).expect("histórico válido");
        assert_eq!(parsed[0].close_value, 51.25);
    }

    #[test]
    fn parses_bcb_decimal_and_br_date() {
        let asset = asset("asset:macro:SELIC", "SELIC", AssetClass::Macro);
        let parsed = parse_bcb_points(
            &asset,
            vec![BcbPoint {
                data: "30/10/2026".to_owned(),
                valor: "13,65".to_owned(),
            }],
        )
        .expect("série válida");
        assert_eq!(parsed[0].close_value, 13.65);
        assert_eq!(parsed[0].observed_at, "2026-10-30T00:00:00-03:00");
    }

    #[test]
    fn parses_alpha_vantage_daily_history_and_rejects_usage_notices() {
        let asset = asset("asset:us:AAPL", "AAPL", AssetClass::UsEquity);
        let payload: AlphaVantageDailyResponse = serde_json::from_value(json!({
            "Time Series (Daily)": {
                "2026-10-30": {
                    "1. open": "270.10",
                    "2. high": "274.20",
                    "3. low": "268.40",
                    "4. close": "272.75",
                    "5. volume": "23800000"
                }
            }
        }))
        .expect("fixture diária");
        let parsed = parse_alpha_vantage_daily(&asset, payload).expect("histórico válido");
        assert_eq!(parsed[0].close_value, 272.75);
        assert_eq!(parsed[0].source_id, "source:alpha-vantage");

        let limited: AlphaVantageDailyResponse = serde_json::from_value(json!({
            "Note": "API call frequency"
        }))
        .expect("fixture de limite");
        assert!(matches!(
            parse_alpha_vantage_daily(&asset, limited),
            Err(super::MarketProviderError::RateLimited)
        ));

        let rejected_demo: AlphaVantageDailyResponse = serde_json::from_value(json!({
            "Information": "The demo API key is for demo purposes only."
        }))
        .expect("fixture de autenticação");
        assert!(matches!(
            parse_alpha_vantage_daily(&asset, rejected_demo),
            Err(super::MarketProviderError::Authentication)
        ));
    }

    #[test]
    fn rotates_alpha_vantage_assets_with_a_bounded_batch() {
        let assets = (0..7)
            .map(|index| {
                asset(
                    &format!("asset:us:T{index}"),
                    &format!("T{index}"),
                    AssetClass::UsEquity,
                )
            })
            .collect::<Vec<_>>();
        let references = assets.iter().collect::<Vec<_>>();
        let selected = select_alpha_vantage_assets(&references, 5);
        assert_eq!(selected.len(), 5);
        assert_eq!(
            selected
                .iter()
                .map(|asset| asset.symbol.as_str())
                .collect::<Vec<_>>(),
            vec!["T5", "T6", "T0", "T1", "T2"]
        );
    }
}
