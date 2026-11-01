use std::collections::HashSet;

use reqwest::blocking::Client;
use serde::Deserialize;
use thiserror::Error;

use crate::domain::assets::{Asset, AssetClass};
use crate::infrastructure::http::{RetryPolicy, send_with_retry};

#[derive(Debug, Error)]
pub enum CatalogProviderError {
    #[error("a fonte recusou ou não concluiu a requisição")]
    Request,
    #[error("a fonte retornou um contrato de catálogo inválido")]
    InvalidPayload,
}

impl CatalogProviderError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Request => "catalog_request_failed",
            Self::InvalidPayload => "catalog_invalid_payload",
        }
    }
}

#[derive(Debug, Deserialize)]
struct BrapiCatalogResponse {
    stocks: Vec<BrapiAsset>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BrapiAsset {
    stock: String,
    name: String,
    #[serde(rename = "type")]
    asset_type: Option<String>,
    sub_type: Option<String>,
}

#[derive(Debug, Deserialize)]
struct BinanceExchangeInfo {
    symbols: Vec<BinanceSymbol>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BinanceSymbol {
    status: String,
    base_asset: String,
    quote_asset: String,
    #[serde(default)]
    is_spot_trading_allowed: bool,
}

pub fn discover_brapi_assets(client: &Client) -> Result<Vec<Asset>, CatalogProviderError> {
    let payload = send_with_retry(
        || {
            client
                .get("https://brapi.dev/api/quote/list")
                .query(&[("limit", "2000")])
        },
        RetryPolicy::Idempotent,
    )
    .and_then(reqwest::blocking::Response::error_for_status)
    .map_err(|_| CatalogProviderError::Request)?
    .json::<BrapiCatalogResponse>()
    .map_err(|_| CatalogProviderError::InvalidPayload)?;

    Ok(parse_brapi_assets(payload.stocks))
}

pub fn discover_binance_assets(client: &Client) -> Result<Vec<Asset>, CatalogProviderError> {
    let payload = send_with_retry(
        || client.get("https://data-api.binance.vision/api/v3/exchangeInfo"),
        RetryPolicy::Idempotent,
    )
    .and_then(reqwest::blocking::Response::error_for_status)
    .map_err(|_| CatalogProviderError::Request)?
    .json::<BinanceExchangeInfo>()
    .map_err(|_| CatalogProviderError::InvalidPayload)?;

    Ok(parse_binance_assets(payload.symbols))
}

fn parse_brapi_assets(items: Vec<BrapiAsset>) -> Vec<Asset> {
    items
        .into_iter()
        .filter_map(|item| {
            let symbol = normalize_symbol(&item.stock)?;
            let asset_class = if item.asset_type.as_deref() == Some("fund")
                || matches!(
                    item.sub_type.as_deref(),
                    Some("fii" | "etf" | "fi-infra" | "fi-agro" | "fip" | "fidc")
                ) {
                AssetClass::B3Fund
            } else {
                AssetClass::B3Equity
            };
            Some(Asset {
                id: format!("asset:b3:{symbol}"),
                name: normalized_name(&item.name, &symbol),
                symbol,
                asset_class,
                exchange: "B3".to_owned(),
                currency: "BRL".to_owned(),
                country_code: Some("BR".to_owned()),
            })
        })
        .collect()
}

fn parse_binance_assets(items: Vec<BinanceSymbol>) -> Vec<Asset> {
    let mut seen = HashSet::new();
    items
        .into_iter()
        .filter(|item| {
            item.status == "TRADING"
                && item.quote_asset == "USDT"
                && item.is_spot_trading_allowed
                && !is_leveraged_token(&item.base_asset)
        })
        .filter_map(|item| {
            let symbol = normalize_symbol(&item.base_asset)?;
            if !seen.insert(symbol.clone()) {
                return None;
            }
            Some(Asset {
                id: format!("asset:crypto:{symbol}"),
                name: symbol.clone(),
                symbol,
                asset_class: AssetClass::Crypto,
                exchange: "BINANCE".to_owned(),
                currency: "USDT".to_owned(),
                country_code: None,
            })
        })
        .collect()
}

fn normalize_symbol(value: &str) -> Option<String> {
    let normalized = value.trim().to_ascii_uppercase();
    (!normalized.is_empty()
        && normalized.len() <= 24
        && normalized
            .chars()
            .all(|character| character.is_ascii_alphanumeric()))
    .then_some(normalized)
}

fn normalized_name(value: &str, fallback: &str) -> String {
    let value = value.trim();
    if value.is_empty() || value.eq_ignore_ascii_case(fallback) {
        fallback.to_owned()
    } else {
        value.chars().take(160).collect()
    }
}

fn is_leveraged_token(symbol: &str) -> bool {
    ["UP", "DOWN", "BULL", "BEAR"]
        .iter()
        .any(|suffix| symbol.ends_with(suffix))
}

#[cfg(test)]
mod tests {
    use super::{
        BinanceSymbol, BrapiAsset, is_leveraged_token, parse_binance_assets, parse_brapi_assets,
    };
    use crate::domain::assets::AssetClass;

    #[test]
    fn maps_brapi_funds_and_equities_without_trusting_empty_names() {
        let assets = parse_brapi_assets(vec![
            BrapiAsset {
                stock: "PETR4".into(),
                name: "Petrobras PN".into(),
                asset_type: Some("stock".into()),
                sub_type: Some("stock".into()),
            },
            BrapiAsset {
                stock: "HGLG11".into(),
                name: "HGLG11".into(),
                asset_type: Some("fund".into()),
                sub_type: Some("fii".into()),
            },
        ]);
        assert_eq!(assets[0].asset_class, AssetClass::B3Equity);
        assert_eq!(assets[1].asset_class, AssetClass::B3Fund);
        assert_eq!(assets[1].name, "HGLG11");
    }

    #[test]
    fn keeps_only_unique_tradable_usdt_spot_assets() {
        let assets = parse_binance_assets(vec![
            BinanceSymbol {
                status: "TRADING".into(),
                base_asset: "BTC".into(),
                quote_asset: "USDT".into(),
                is_spot_trading_allowed: true,
            },
            BinanceSymbol {
                status: "TRADING".into(),
                base_asset: "BTC".into(),
                quote_asset: "FDUSD".into(),
                is_spot_trading_allowed: true,
            },
            BinanceSymbol {
                status: "BREAK".into(),
                base_asset: "ETH".into(),
                quote_asset: "USDT".into(),
                is_spot_trading_allowed: true,
            },
        ]);
        assert_eq!(assets.len(), 1);
        assert_eq!(assets[0].symbol, "BTC");
        assert!(is_leveraged_token("BTCUP"));
    }
}
