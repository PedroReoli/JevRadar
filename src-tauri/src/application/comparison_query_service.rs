use std::collections::HashSet;

use chrono::{Duration, Utc};

use crate::domain::comparison::AssetComparisonOverview;
use crate::infrastructure::database::{Database, DatabaseError};

pub struct ComparisonQueryService;

#[derive(Debug, thiserror::Error)]
pub enum ComparisonQueryError {
    #[error("filtros da comparação inválidos")]
    InvalidFilter,
    #[error(transparent)]
    Database(#[from] DatabaseError),
}

impl ComparisonQueryService {
    pub fn overview(
        database: &Database,
        asset_ids: Vec<String>,
        period_hours: u16,
        minimum_confidence: f64,
    ) -> Result<AssetComparisonOverview, ComparisonQueryError> {
        let unique_ids = asset_ids.iter().collect::<HashSet<_>>();
        if asset_ids.len() > 4
            || unique_ids.len() != asset_ids.len()
            || asset_ids.iter().any(|value| !valid_asset_id(value))
            || !(1..=720).contains(&period_hours)
            || !minimum_confidence.is_finite()
            || !(0.0..=1.0).contains(&minimum_confidence)
        {
            return Err(ComparisonQueryError::InvalidFilter);
        }
        let available_assets = database
            .default_watchlist(50)?
            .assets
            .into_iter()
            .filter(|item| item.enabled)
            .map(|item| item.asset)
            .collect();
        let cutoff = (Utc::now() - Duration::hours(i64::from(period_hours))).to_rfc3339();
        let rows = database.asset_comparison_rows(&asset_ids, &cutoff, minimum_confidence)?;
        Ok(AssetComparisonOverview {
            available_assets,
            rows,
        })
    }
}

fn valid_asset_id(value: &str) -> bool {
    value.starts_with("asset:")
        && value.len() > "asset:".len()
        && value.len() <= 120
        && value
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || ":+-_.".contains(character))
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::{ComparisonQueryError, ComparisonQueryService};
    use crate::infrastructure::database::Database;

    fn database() -> Database {
        let directory = tempdir().expect("diretório temporário");
        Database::open(directory.keep().join("comparison-query.sqlite3"))
            .expect("banco inicializado")
    }

    #[test]
    fn rejects_unbounded_or_unsafe_filters() {
        let database = database();
        for result in [
            ComparisonQueryService::overview(&database, vec!["asset:b3:PETR4".to_owned()], 0, 0.5),
            ComparisonQueryService::overview(
                &database,
                vec!["asset:<script>".to_owned()],
                168,
                0.5,
            ),
            ComparisonQueryService::overview(
                &database,
                vec!["asset:b3:PETR4".to_owned(), "asset:b3:PETR4".to_owned()],
                168,
                0.5,
            ),
            ComparisonQueryService::overview(
                &database,
                (0..5).map(|index| format!("asset:test:{index}")).collect(),
                168,
                0.5,
            ),
            ComparisonQueryService::overview(&database, Vec::new(), 168, f64::NAN),
        ] {
            assert!(matches!(result, Err(ComparisonQueryError::InvalidFilter)));
        }
    }

    #[test]
    fn returns_enabled_watchlist_assets_even_without_a_selection() {
        let database = database();
        database
            .add_default_watchlist_asset("asset:b3:PETR4", 50)
            .expect("ativo monitorado");

        let overview = ComparisonQueryService::overview(&database, Vec::new(), 168, 0.5)
            .expect("comparação vazia");

        assert_eq!(overview.available_assets.len(), 1);
        assert_eq!(overview.available_assets[0].symbol, "PETR4");
        assert!(overview.rows.is_empty());
    }
}
