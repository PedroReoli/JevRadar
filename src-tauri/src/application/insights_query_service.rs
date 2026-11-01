use crate::domain::backtest::BacktestReport;
use crate::domain::insights::{AlertHistoryItem, CollectionRunSnapshot, JevUsageSnapshot};
use crate::domain::signals::MarketSignalSnapshot;
use crate::infrastructure::database::{Database, DatabaseError};

pub struct InsightsQueryService;

impl InsightsQueryService {
    pub fn signal(
        database: &Database,
        signal_id: &str,
    ) -> Result<Option<MarketSignalSnapshot>, DatabaseError> {
        database.market_signal(signal_id)
    }

    pub fn alerts(
        database: &Database,
        limit: usize,
    ) -> Result<Vec<AlertHistoryItem>, DatabaseError> {
        database.alert_history(limit)
    }

    pub fn collections(
        database: &Database,
        limit: usize,
    ) -> Result<Vec<CollectionRunSnapshot>, DatabaseError> {
        database.collection_history(limit)
    }

    pub fn backtests(
        database: &Database,
        asset_id: Option<&str>,
        limit: usize,
    ) -> Result<Vec<BacktestReport>, DatabaseError> {
        database.backtest_history(asset_id, limit)
    }

    pub fn jev_usage(database: &Database) -> Result<JevUsageSnapshot, DatabaseError> {
        let overview = database.content_overview()?;
        let (input_tokens_today, output_tokens_today) = database.jev_token_usage_today()?;
        Ok(JevUsageSnapshot {
            analyzed_today: database.analyses_completed_today()?,
            daily_limit: usize::from(database.read_u16_setting("jev_daily_document_limit", 250)?),
            batch_limit: usize::from(database.read_u8_setting("jev_batch_limit", 25)?),
            pending_document_count: overview.unclassified_document_count,
            input_tokens_today,
            output_tokens_today,
        })
    }
}
