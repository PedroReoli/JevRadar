use crate::domain::content::ContentOverview;
use crate::infrastructure::database::{Database, DatabaseError};

pub struct ContentQueryService;

impl ContentQueryService {
    pub fn overview(database: &Database) -> Result<ContentOverview, DatabaseError> {
        database.content_overview()
    }
}
