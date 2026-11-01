use crate::domain::market::MarketOverview;
use crate::infrastructure::database::{Database, DatabaseError};

pub struct MarketQueryService;

impl MarketQueryService {
    pub fn overview(database: &Database) -> Result<MarketOverview, DatabaseError> {
        Ok(MarketOverview {
            snapshots: database.market_snapshots()?,
            signals: database.latest_market_signals()?,
            events: database.latest_market_events(50)?,
            latest_collection: database.latest_collection_run()?,
        })
    }
}
