use crate::domain::report::ReportOverview;
use crate::infrastructure::database::{Database, DatabaseError};

pub struct ReportQueryService;

impl ReportQueryService {
    pub fn overview(database: &Database) -> Result<ReportOverview, DatabaseError> {
        let (signal_count, alert_count, collection_count, backtest_count) =
            database.report_overview_counts()?;
        Ok(ReportOverview {
            signal_count,
            alert_count,
            collection_count,
            backtest_count,
            versions: database.report_version_inventory()?,
            recent_backtests: database.backtest_history(None, 5)?,
        })
    }
}
