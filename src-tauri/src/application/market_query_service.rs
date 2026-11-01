use chrono::{Duration, Utc};

use crate::domain::market::{MarketOverview, MarketOverviewFilter, MarketSeries};
use crate::infrastructure::database::{Database, DatabaseError};

pub struct MarketQueryService;

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
}
