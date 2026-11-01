use crate::domain::assets::AssetClass;
use crate::domain::backtest::HistoricalPatternPage;
use crate::infrastructure::database::{Database, DatabaseError};

const METHODOLOGY_VERSION: &str = "latest-comparable-backtests-v1";

pub struct HistoricalPatternQueryService;

#[derive(Debug, thiserror::Error)]
pub enum HistoricalPatternQueryError {
    #[error("filtro de padrões históricos inválido")]
    InvalidFilter,
    #[error("paginação de padrões históricos inválida")]
    InvalidPagination,
    #[error(transparent)]
    Database(#[from] DatabaseError),
}

impl HistoricalPatternQueryService {
    #[allow(clippy::too_many_arguments)]
    pub fn list(
        database: &Database,
        asset_class: Option<AssetClass>,
        horizon_days: i64,
        outcome: String,
        minimum_sample_size: u32,
        page: u32,
        page_size: u32,
    ) -> Result<HistoricalPatternPage, HistoricalPatternQueryError> {
        if ![1, 7, 30].contains(&horizon_days)
            || !["all", "outperformed", "underperformed", "insufficient"]
                .contains(&outcome.as_str())
            || minimum_sample_size > 10_000
        {
            return Err(HistoricalPatternQueryError::InvalidFilter);
        }
        if page == 0 || !(1..=50).contains(&page_size) {
            return Err(HistoricalPatternQueryError::InvalidPagination);
        }
        let offset = page
            .checked_sub(1)
            .and_then(|value| value.checked_mul(page_size))
            .ok_or(HistoricalPatternQueryError::InvalidPagination)?;
        let (items, total_items) = database.historical_pattern_page(
            asset_class.map(AssetClass::as_storage_value),
            horizon_days,
            &outcome,
            minimum_sample_size,
            page_size,
            offset,
        )?;
        Ok(HistoricalPatternPage {
            items,
            page,
            page_size,
            total_items,
            total_pages: total_items.div_ceil(u64::from(page_size)).max(1) as u32,
            methodology_version: METHODOLOGY_VERSION.to_owned(),
        })
    }
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::{HistoricalPatternQueryError, HistoricalPatternQueryService};
    use crate::infrastructure::database::Database;

    fn database() -> Database {
        let directory = tempdir().expect("diretório temporário");
        Database::open(directory.keep().join("historical-patterns.sqlite3"))
            .expect("banco inicializado")
    }

    #[test]
    fn rejects_incompatible_filters_and_unbounded_pages() {
        let database = database();
        let invalid_horizon =
            HistoricalPatternQueryService::list(&database, None, 5, "all".to_owned(), 0, 1, 25)
                .expect_err("horizonte desconhecido deve falhar");
        assert!(matches!(
            invalid_horizon,
            HistoricalPatternQueryError::InvalidFilter
        ));

        let invalid_page =
            HistoricalPatternQueryService::list(&database, None, 7, "all".to_owned(), 0, 0, 100)
                .expect_err("paginação sem limite deve falhar");
        assert!(matches!(
            invalid_page,
            HistoricalPatternQueryError::InvalidPagination
        ));
    }
}
