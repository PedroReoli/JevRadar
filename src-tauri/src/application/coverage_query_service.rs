use chrono::{Duration, Utc};

use crate::domain::assets::AssetClass;
use crate::domain::coverage::CoverageGapPage;
use crate::infrastructure::database::{Database, DatabaseError};

pub const COVERAGE_GAP_METHODOLOGY_VERSION: &str = "coverage-gap-v1";

#[derive(Debug, thiserror::Error)]
pub enum CoverageGapQueryError {
    #[error("filtros de cobertura inválidos")]
    InvalidFilter,
    #[error("paginação de cobertura inválida")]
    InvalidPagination,
    #[error(transparent)]
    Database(#[from] DatabaseError),
}

pub struct CoverageQueryService;

impl CoverageQueryService {
    #[allow(clippy::too_many_arguments)]
    pub fn gaps(
        database: &Database,
        period_hours: u16,
        asset_class: Option<AssetClass>,
        minimum_movement_percent: f64,
        maximum_evidence_count: u8,
        page: u32,
        page_size: u32,
    ) -> Result<CoverageGapPage, CoverageGapQueryError> {
        if !(1..=720).contains(&period_hours)
            || !minimum_movement_percent.is_finite()
            || !(0.5..=25.0).contains(&minimum_movement_percent)
            || maximum_evidence_count > 10
        {
            return Err(CoverageGapQueryError::InvalidFilter);
        }
        if page == 0 || !(1..=50).contains(&page_size) {
            return Err(CoverageGapQueryError::InvalidPagination);
        }
        let offset = page
            .checked_sub(1)
            .and_then(|value| value.checked_mul(page_size))
            .ok_or(CoverageGapQueryError::InvalidPagination)?;
        let cutoff = (Utc::now() - Duration::hours(i64::from(period_hours))).to_rfc3339();
        let (items, total_items) = database.list_coverage_gap_page(
            &cutoff,
            asset_class.map(AssetClass::as_storage_value),
            minimum_movement_percent,
            maximum_evidence_count,
            page_size,
            offset,
        )?;
        Ok(CoverageGapPage {
            items,
            page,
            page_size,
            total_items,
            total_pages: total_items.div_ceil(u64::from(page_size)).max(1) as u32,
            period_hours,
            minimum_movement_percent,
            maximum_evidence_count,
            methodology_version: COVERAGE_GAP_METHODOLOGY_VERSION,
        })
    }
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::{CoverageGapQueryError, CoverageQueryService};
    use crate::domain::collection::MarketObservationInput;
    use crate::infrastructure::database::Database;

    #[test]
    fn rejects_unbounded_coverage_queries() {
        let directory = tempdir().expect("diretório temporário");
        let database =
            Database::open(directory.path().join("coverage.sqlite3")).expect("banco inicializado");
        let invalid = CoverageQueryService::gaps(&database, 0, None, 0.1, 20, 0, 100)
            .expect_err("filtros sem limite devem falhar");
        assert!(matches!(invalid, CoverageGapQueryError::InvalidFilter));
    }

    #[test]
    fn lists_material_price_movements_without_enough_editorial_evidence() {
        let directory = tempdir().expect("diretório temporário");
        let database = Database::open(directory.path().join("coverage-gaps.sqlite3"))
            .expect("banco inicializado");
        database
            .add_default_watchlist_asset("asset:b3:PETR4", 50)
            .expect("ativo monitorado");
        let observation = |id: &str, observed_at: &str, close_value: f64| MarketObservationInput {
            id: id.to_owned(),
            asset_id: "asset:b3:PETR4".to_owned(),
            source_id: "source:brapi".to_owned(),
            interval: "1d".to_owned(),
            observed_at: observed_at.to_owned(),
            open_value: None,
            high_value: None,
            low_value: None,
            close_value,
            volume_value: None,
            collected_at: observed_at.to_owned(),
        };
        database
            .store_market_observations(&[
                observation("observation:old", "2026-10-31T00:00:00Z", 100.0),
                observation("observation:new", "2026-11-01T00:00:00Z", 104.0),
            ])
            .expect("observações armazenadas");

        let page = CoverageQueryService::gaps(&database, 24, None, 2.0, 0, 1, 25)
            .expect("lacunas consultadas");
        assert_eq!(page.total_items, 1);
        assert_eq!(page.items[0].asset.symbol, "PETR4");
        assert!((page.items[0].change_percent - 4.0).abs() < 1e-9);
        assert_eq!(page.items[0].evidence_count, 0);
    }
}
