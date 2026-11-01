use crate::domain::backtest::{BacktestHistoryPage, BacktestReport, CalibrationReadinessOverview};
use crate::domain::insights::{
    AlertHistoryItem, AlertHistoryPage, CollectionHistoryPage, CollectionRunSnapshot,
    JevUsageSnapshot,
};
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

    pub fn alert_page(
        database: &Database,
        alert_level: Option<u8>,
        asset_id: Option<&str>,
        page: u32,
        page_size: u32,
    ) -> Result<AlertHistoryPage, DatabaseError> {
        let offset = page.saturating_sub(1).saturating_mul(page_size);
        let (items, assets, total_items) =
            database.alert_history_page(alert_level, asset_id, page_size, offset)?;
        Ok(AlertHistoryPage {
            items,
            assets,
            page,
            page_size,
            total_items,
            total_pages: total_items.div_ceil(u64::from(page_size)).max(1) as u32,
        })
    }

    pub fn collections(
        database: &Database,
        limit: usize,
    ) -> Result<Vec<CollectionRunSnapshot>, DatabaseError> {
        database.collection_history(limit)
    }

    pub fn collection_page(
        database: &Database,
        status: Option<&str>,
        source_id: Option<&str>,
        page: u32,
        page_size: u32,
    ) -> Result<CollectionHistoryPage, DatabaseError> {
        let offset = page.saturating_sub(1).saturating_mul(page_size);
        let (items, source_ids, total_items) =
            database.collection_history_page(status, source_id, page_size, offset)?;
        Ok(CollectionHistoryPage {
            items,
            source_ids,
            page,
            page_size,
            total_items,
            total_pages: total_items.div_ceil(u64::from(page_size)).max(1) as u32,
        })
    }

    pub fn backtests(
        database: &Database,
        asset_id: Option<&str>,
        limit: usize,
    ) -> Result<Vec<BacktestReport>, DatabaseError> {
        database.backtest_history(asset_id, limit)
    }

    pub fn calibration_readiness(
        database: &Database,
    ) -> Result<CalibrationReadinessOverview, DatabaseError> {
        database.calibration_readiness()
    }

    pub fn backtest_page(
        database: &Database,
        asset_id: Option<&str>,
        page: u32,
        page_size: u32,
    ) -> Result<BacktestHistoryPage, DatabaseError> {
        let offset = page.saturating_sub(1).saturating_mul(page_size);
        let (items, total_items) = database.backtest_history_page(asset_id, page_size, offset)?;
        Ok(BacktestHistoryPage {
            items,
            page,
            page_size,
            total_items,
            total_pages: total_items.div_ceil(u64::from(page_size)).max(1) as u32,
        })
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
