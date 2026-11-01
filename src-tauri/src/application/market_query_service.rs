use chrono::{Duration, Utc};

use crate::domain::assets::AssetClass;
use crate::domain::events::{MarketContextOverview, MarketEventPage, MarketRelationPage};
use crate::domain::market::{
    AssetDetailOverview, MarketOverview, MarketOverviewFilter, MarketSeries,
};
use crate::domain::signals::{
    SignalDirectionSummary, SignalEvidenceSnapshot, SignalExplorerOverview,
};
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

#[derive(Debug, thiserror::Error)]
pub enum SignalExplorerQueryError {
    #[error("filtro de sinais inválido")]
    InvalidFilter,
    #[error(transparent)]
    Database(#[from] DatabaseError),
}

#[derive(Debug, thiserror::Error)]
pub enum AssetDetailQueryError {
    #[error("filtro do ativo inválido")]
    InvalidFilter,
    #[error(transparent)]
    Database(#[from] DatabaseError),
}

impl MarketQueryService {
    pub fn asset_detail(
        database: &Database,
        asset_id: &str,
        period_hours: u16,
    ) -> Result<Option<AssetDetailOverview>, AssetDetailQueryError> {
        if !(1..=720).contains(&period_hours) || !valid_asset_id(asset_id) {
            return Err(AssetDetailQueryError::InvalidFilter);
        }
        let watchlist = database.default_watchlist(50)?;
        let Some(asset) = watchlist
            .assets
            .into_iter()
            .find(|item| item.asset.id == asset_id)
            .map(|item| item.asset)
        else {
            return Ok(None);
        };
        let cutoff = (Utc::now() - Duration::hours(i64::from(period_hours))).to_rfc3339();
        let snapshot = database.market_snapshot(asset_id)?;
        let signal = database.latest_market_signal_for_asset(asset_id, &cutoff)?;
        let (events, _) = database.list_market_event_page(
            None,
            None,
            Some(asset_id),
            None,
            0.0,
            &cutoff,
            200,
            0,
        )?;
        Ok(Some(AssetDetailOverview {
            asset,
            snapshot,
            signal,
            events,
        }))
    }

    pub fn signals(
        database: &Database,
        period_hours: u16,
        minimum_confidence: f64,
        direction: Option<String>,
        asset_id: Option<String>,
    ) -> Result<SignalExplorerOverview, SignalExplorerQueryError> {
        if !(1..=720).contains(&period_hours)
            || !minimum_confidence.is_finite()
            || !(0.0..=1.0).contains(&minimum_confidence)
            || direction
                .as_deref()
                .is_some_and(|value| !["positive", "neutral", "negative"].contains(&value))
            || asset_id
                .as_deref()
                .is_some_and(|value| !value.starts_with("asset:") || value.len() > 240)
        {
            return Err(SignalExplorerQueryError::InvalidFilter);
        }
        let cutoff = (Utc::now() - Duration::hours(i64::from(period_hours))).to_rfc3339();
        let (signals, assets) = database.signal_explorer(
            &cutoff,
            minimum_confidence,
            direction.as_deref(),
            asset_id.as_deref(),
        )?;
        let mut summary = SignalDirectionSummary {
            total: signals.len(),
            positive: 0,
            neutral: 0,
            negative: 0,
        };
        for signal in &signals {
            if signal.signal_score >= 0.15 {
                summary.positive += 1;
            } else if signal.signal_score <= -0.15 {
                summary.negative += 1;
            } else {
                summary.neutral += 1;
            }
        }
        Ok(SignalExplorerOverview {
            signals,
            assets,
            summary,
        })
    }

    pub fn context(
        database: &Database,
        period_hours: u16,
        minimum_confidence: f64,
    ) -> Result<MarketContextOverview, MarketEventQueryError> {
        if !(1..=720).contains(&period_hours)
            || !minimum_confidence.is_finite()
            || !(0.0..=1.0).contains(&minimum_confidence)
        {
            return Err(MarketEventQueryError::InvalidFilter);
        }
        let started_after = (Utc::now() - Duration::hours(i64::from(period_hours))).to_rfc3339();
        database
            .market_context_overview(period_hours, minimum_confidence, &started_after)
            .map_err(Into::into)
    }

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
        signals.retain(|item| {
            chrono::DateTime::parse_from_rfc3339(&item.window_ended_at)
                .map(|time| time.with_timezone(&Utc) >= cutoff)
                .unwrap_or(false)
        });
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
        Self::events_for_period(
            database,
            720,
            event_type,
            country_code,
            asset_id,
            relation_type,
            minimum_confidence,
            page,
            page_size,
        )
    }

    #[allow(clippy::too_many_arguments)]
    pub fn events_for_period(
        database: &Database,
        period_hours: u16,
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
        if !(1..=720).contains(&period_hours)
            || !minimum_confidence.is_finite()
            || !(0.0..=1.0).contains(&minimum_confidence)
        {
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
        let started_after = (Utc::now() - Duration::hours(i64::from(period_hours))).to_rfc3339();
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

fn valid_asset_id(value: &str) -> bool {
    value.starts_with("asset:")
        && value.len() > "asset:".len()
        && value.len() <= 240
        && value
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || ":+-_.".contains(character))
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::{
        AssetDetailQueryError, MarketEventQueryError, MarketQueryService, SignalExplorerQueryError,
    };
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

        let invalid_period =
            MarketQueryService::events_for_period(&database, 0, None, None, None, None, 0.0, 1, 25)
                .expect_err("período vazio deve falhar");
        assert!(matches!(
            invalid_period,
            MarketEventQueryError::InvalidFilter
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

        let invalid_context = MarketQueryService::context(&database, 721, f64::NAN)
            .expect_err("contexto sem limite deve falhar");
        assert!(matches!(
            invalid_context,
            MarketEventQueryError::InvalidFilter
        ));
    }

    #[test]
    fn rejects_invalid_signal_explorer_filters() {
        let database = database();
        for result in [
            MarketQueryService::signals(&database, 0, 0.0, None, None),
            MarketQueryService::signals(&database, 24, f64::NAN, None, None),
            MarketQueryService::signals(&database, 24, 0.0, Some("bullish".to_owned()), None),
            MarketQueryService::signals(&database, 24, 0.0, None, Some("PETR4".to_owned())),
        ] {
            assert!(matches!(
                result,
                Err(SignalExplorerQueryError::InvalidFilter)
            ));
        }
    }

    #[test]
    fn rejects_invalid_asset_detail_filters() {
        let database = database();
        for result in [
            MarketQueryService::asset_detail(&database, "asset:b3:PETR4", 0),
            MarketQueryService::asset_detail(&database, "PETR4", 720),
            MarketQueryService::asset_detail(&database, "asset:", 720),
            MarketQueryService::asset_detail(&database, "asset:<script>", 720),
        ] {
            assert!(matches!(result, Err(AssetDetailQueryError::InvalidFilter)));
        }
    }

    #[test]
    fn returns_only_assets_from_the_local_watchlist() {
        let database = database();
        assert!(
            MarketQueryService::asset_detail(&database, "asset:b3:PETR4", 720)
                .expect("consulta vazia")
                .is_none()
        );
        database
            .add_default_watchlist_asset("asset:b3:PETR4", 50)
            .expect("ativo monitorado");
        let detail = MarketQueryService::asset_detail(&database, "asset:b3:PETR4", 720)
            .expect("detalhe")
            .expect("ativo encontrado");
        assert_eq!(detail.asset.symbol, "PETR4");
        assert!(detail.signal.is_none());
        assert!(detail.events.is_empty());
    }
}
