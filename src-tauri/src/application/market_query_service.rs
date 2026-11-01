use chrono::{Duration, Utc};

use crate::domain::assets::AssetClass;
use crate::domain::events::{MarketEventPage, MarketRelationPage};
use crate::domain::market::{MarketOverview, MarketOverviewFilter, MarketSeries};
use crate::domain::signals::SignalEvidenceSnapshot;
use crate::infrastructure::database::{Database, DatabaseError};

pub struct MarketQueryService;

#[derive(Debug, thiserror::Error)]
pub enum MarketEventQueryError {
    #[error("filtro de eventos inválido")]
    InvalidFilter,
    #[error("paginação de eventos inválida")]
    InvalidPagination,
    #[error(transparent)]
    Database(#[from] DatabaseError),
}

impl MarketQueryService {
    pub fn overview(
        database: &Database,
        filter: MarketOverviewFilter,
    ) -> Result<MarketOverview, DatabaseError> {
        let mut snapshots = database.market_snapshots()?;
        let mut signals = database.latest_market_signals()?;
        let mut events = database.latest_market_events(200)?;
        if let Some(asset_class) = filter.asset_class {
            snapshots.retain(|item| item.asset.asset_class == asset_class);
            signals.retain(|item| item.asset.asset_class == asset_class);
            events.retain(|item| item.asset.asset_class == asset_class);
        }
        signals.retain(|item| item.confidence >= filter.minimum_confidence);
        let cutoff = Utc::now() - Duration::hours(i64::from(filter.period_hours));
        events.retain(|item| {
            item.confidence >= filter.minimum_confidence
                && chrono::DateTime::parse_from_rfc3339(&item.started_at)
                    .map(|time| time.with_timezone(&Utc) >= cutoff)
                    .unwrap_or(false)
        });
        Ok(MarketOverview {
            snapshots,
            signals,
            events,
            latest_collection: database.latest_collection_run()?,
        })
    }

    pub fn series(
        database: &Database,
        asset_id: &str,
        period_hours: u16,
    ) -> Result<MarketSeries, DatabaseError> {
        let cutoff = (Utc::now() - Duration::hours(i64::from(period_hours))).to_rfc3339();
        database.market_series(asset_id, &cutoff)
    }

    pub fn signal_evidence(
        database: &Database,
        signal_id: &str,
    ) -> Result<Vec<SignalEvidenceSnapshot>, DatabaseError> {
        database.signal_evidence(signal_id)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn events(
        database: &Database,
        event_type: Option<String>,
        country_code: Option<String>,
        asset_id: Option<String>,
        relation_type: Option<String>,
        minimum_confidence: f64,
        page: u32,
        page_size: u32,
    ) -> Result<MarketEventPage, MarketEventQueryError> {
        validate_optional_filter(
            event_type.as_deref(),
            &[
                "political",
                "economic",
                "regulatory",
                "climate",
                "health",
                "technology",
                "geopolitical",
                "other",
            ],
        )?;
        validate_optional_filter(
            relation_type.as_deref(),
            &["known", "correlation", "hypothesis", "unproven_causality"],
        )?;
        if !minimum_confidence.is_finite() || !(0.0..=1.0).contains(&minimum_confidence) {
            return Err(MarketEventQueryError::InvalidFilter);
        }
        if country_code.as_ref().is_some_and(|value| {
            value.is_empty()
                || value.len() > 16
                || !value
                    .chars()
                    .all(|character| character.is_ascii_uppercase())
        }) || asset_id
            .as_ref()
            .is_some_and(|value| value.is_empty() || value.len() > 120)
        {
            return Err(MarketEventQueryError::InvalidFilter);
        }
        if page == 0 || !(1..=50).contains(&page_size) {
            return Err(MarketEventQueryError::InvalidPagination);
        }
        let offset = page
            .checked_sub(1)
            .and_then(|value| value.checked_mul(page_size))
            .ok_or(MarketEventQueryError::InvalidPagination)?;
        let started_after = (Utc::now() - Duration::hours(720)).to_rfc3339();
        let (items, total_items) = database.list_market_event_page(
            event_type.as_deref(),
            country_code.as_deref(),
            asset_id.as_deref(),
            relation_type.as_deref(),
            minimum_confidence,
            &started_after,
            page_size,
            offset,
        )?;
        let (available_assets, available_countries) =
            database.market_event_filter_options(&started_after)?;
        Ok(MarketEventPage {
            items,
            available_assets,
            available_countries,
            page,
            page_size,
            total_items,
            total_pages: total_items.div_ceil(u64::from(page_size)).max(1) as u32,
        })
    }

    #[allow(clippy::too_many_arguments)]
    pub fn relations(
        database: &Database,
        period_hours: u16,
        country_code: Option<String>,
        asset_class: Option<AssetClass>,
        relation_type: Option<String>,
        minimum_confidence: f64,
        page: u32,
        page_size: u32,
    ) -> Result<MarketRelationPage, MarketEventQueryError> {
        validate_optional_filter(
            relation_type.as_deref(),
            &["known", "correlation", "hypothesis", "unproven_causality"],
        )?;
        if !(1..=720).contains(&period_hours)
            || !minimum_confidence.is_finite()
            || !(0.0..=1.0).contains(&minimum_confidence)
            || country_code.as_ref().is_some_and(|value| {
                value.is_empty()
                    || value.len() > 16
                    || !value
                        .chars()
                        .all(|character| character.is_ascii_uppercase())
            })
        {
            return Err(MarketEventQueryError::InvalidFilter);
        }
        if page == 0 || !(1..=50).contains(&page_size) {
            return Err(MarketEventQueryError::InvalidPagination);
        }
        let offset = page
            .checked_sub(1)
            .and_then(|value| value.checked_mul(page_size))
            .ok_or(MarketEventQueryError::InvalidPagination)?;
        let started_after = (Utc::now() - Duration::hours(i64::from(period_hours))).to_rfc3339();
        let (items, total_items, available_countries) = database.list_market_relation_page(
            country_code.as_deref(),
            asset_class.map(AssetClass::as_storage_value),
            relation_type.as_deref(),
            minimum_confidence,
            &started_after,
            page_size,
            offset,
        )?;
        Ok(MarketRelationPage {
            items,
            available_countries,
            page,
            page_size,
            total_items,
            total_pages: total_items.div_ceil(u64::from(page_size)).max(1) as u32,
            period_hours,
        })
    }
}

fn validate_optional_filter(
    value: Option<&str>,
    allowed: &[&str],
) -> Result<(), MarketEventQueryError> {
    if value.is_some_and(|candidate| !allowed.contains(&candidate)) {
        return Err(MarketEventQueryError::InvalidFilter);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::{MarketEventQueryError, MarketQueryService};
    use crate::infrastructure::database::Database;

    fn database() -> Database {
        let directory = tempdir().expect("diretório temporário");
        Database::open(directory.keep().join("event-query.sqlite3")).expect("banco inicializado")
    }

    #[test]
    fn rejects_unknown_event_filters_and_unbounded_pages() {
        let database = database();
        let invalid_filter = MarketQueryService::events(
            &database,
            Some("rumor".to_owned()),
            None,
            None,
            None,
            0.0,
            1,
            25,
        )
        .expect_err("tipo desconhecido deve falhar");
        assert!(matches!(
            invalid_filter,
            MarketEventQueryError::InvalidFilter
        ));

        let invalid_page =
            MarketQueryService::events(&database, None, None, None, None, 0.0, 0, 100)
                .expect_err("paginação sem limite deve falhar");
        assert!(matches!(
            invalid_page,
            MarketEventQueryError::InvalidPagination
        ));
    }

    #[test]
    fn rejects_invalid_relation_explorer_filters() {
        let database = database();
        let invalid_period =
            MarketQueryService::relations(&database, 0, None, None, None, 0.0, 1, 25)
                .expect_err("período vazio deve falhar");
        assert!(matches!(
            invalid_period,
            MarketEventQueryError::InvalidFilter
        ));

        let invalid_relation = MarketQueryService::relations(
            &database,
            24,
            Some("br".to_owned()),
            None,
            Some("causal".to_owned()),
            0.5,
            1,
            25,
        )
        .expect_err("relação e país inválidos devem falhar");
        assert!(matches!(
            invalid_relation,
            MarketEventQueryError::InvalidFilter
        ));
    }
}
