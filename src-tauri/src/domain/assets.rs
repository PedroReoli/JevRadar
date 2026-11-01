use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum AssetClass {
    B3Equity,
    B3Fund,
    Crypto,
    Macro,
}

impl AssetClass {
    pub fn as_storage_value(self) -> &'static str {
        match self {
            Self::B3Equity => "b3_equity",
            Self::B3Fund => "b3_fund",
            Self::Crypto => "crypto",
            Self::Macro => "macro",
        }
    }

    pub fn from_storage_value(value: &str) -> Option<Self> {
        match value {
            "b3_equity" => Some(Self::B3Equity),
            "b3_fund" => Some(Self::B3Fund),
            "crypto" => Some(Self::Crypto),
            "macro" => Some(Self::Macro),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Asset {
    pub id: String,
    pub symbol: String,
    pub name: String,
    pub asset_class: AssetClass,
    pub exchange: String,
    pub currency: String,
    pub country_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WatchlistAsset {
    pub asset: Asset,
    pub enabled: bool,
    pub added_at: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Watchlist {
    pub id: String,
    pub name: String,
    pub limit: u8,
    pub assets: Vec<WatchlistAsset>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CatalogSourceRefresh {
    pub source_id: String,
    pub status: String,
    pub discovered_count: usize,
    pub error_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CatalogRefreshSummary {
    pub status: String,
    pub upserted_count: usize,
    pub refreshed_at: String,
    pub sources: Vec<CatalogSourceRefresh>,
}
