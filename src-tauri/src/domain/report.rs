use serde::{Deserialize, Serialize};

use crate::domain::backtest::BacktestReport;
use crate::domain::events::{MarketEventSnapshot, MarketRelationSummary};
use crate::domain::insights::JevUsageSnapshot;
use crate::domain::signals::MarketSignalSnapshot;

pub const MARKET_REPORT_CONTRACT_VERSION: &str = "market-report-v1";
pub const MARKET_REPORT_ITEM_LIMIT: u32 = 50;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportMarketReportRequest {
    pub period_hours: u16,
    pub minimum_confidence: f64,
    pub language: String,
}

impl ExportMarketReportRequest {
    pub fn validate(&self) -> Result<(), &'static str> {
        if !(1..=720).contains(&self.period_hours) {
            return Err("período deve estar entre 1 e 720 horas");
        }
        if !self.minimum_confidence.is_finite() || !(0.0..=1.0).contains(&self.minimum_confidence) {
            return Err("confiança mínima deve estar entre 0 e 1");
        }
        if !matches!(self.language.as_str(), "pt-BR" | "en") {
            return Err("idioma do relatório não suportado");
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportCollection<T> {
    pub items: Vec<T>,
    pub total_items: u64,
    pub truncated: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketReportSnapshot {
    pub contract_version: String,
    pub generated_at: String,
    pub language: String,
    pub disclosure: String,
    pub period_hours: u16,
    pub minimum_confidence: f64,
    pub signals: ReportCollection<MarketSignalSnapshot>,
    pub events: ReportCollection<MarketEventSnapshot>,
    pub relations: ReportCollection<MarketRelationSummary>,
    pub backtests: ReportCollection<BacktestReport>,
    pub jev_usage: JevUsageSnapshot,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketReportExport {
    pub contract_version: String,
    pub generated_at: String,
    pub directory_path: String,
    pub markdown_path: String,
    pub json_path: String,
    pub signal_count: usize,
    pub event_count: usize,
    pub relation_count: usize,
    pub backtest_count: usize,
}

#[cfg(test)]
mod tests {
    use super::ExportMarketReportRequest;

    #[test]
    fn validates_bounded_report_filters_and_supported_languages() {
        let valid = ExportMarketReportRequest {
            period_hours: 168,
            minimum_confidence: 0.65,
            language: "pt-BR".to_owned(),
        };
        assert!(valid.validate().is_ok());

        let mut invalid = valid.clone();
        invalid.period_hours = 0;
        assert!(invalid.validate().is_err());
        invalid.period_hours = 168;
        invalid.minimum_confidence = f64::NAN;
        assert!(invalid.validate().is_err());
        invalid.minimum_confidence = 0.5;
        invalid.language = "es".to_owned();
        assert!(invalid.validate().is_err());
    }
}
