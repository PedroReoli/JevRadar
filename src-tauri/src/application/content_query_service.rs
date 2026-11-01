use crate::domain::content::ContentOverview;
use crate::infrastructure::database::{Database, DatabaseError};

pub struct ContentQueryService;

impl ContentQueryService {
    pub fn overview(database: &Database) -> Result<ContentOverview, DatabaseError> {
        database.content_overview()
    }

    pub fn set_source_enabled(
        database: &Database,
        source_id: &str,
        enabled: bool,
    ) -> Result<ContentOverview, DatabaseError> {
        database.set_content_source_enabled(source_id, enabled)?;
        database.content_overview()
    }
}
