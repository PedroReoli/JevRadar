use std::path::Path;

use crate::infrastructure::database::{Database, DatabaseError};

pub struct DataManagementService;

impl DataManagementService {
    pub fn export(database: &Database, path: &Path) -> Result<(), DatabaseError> {
        database.export_snapshot(path)
    }

    pub fn purge(database: &Database) -> Result<(), DatabaseError> {
        database.purge_collected_data()
    }
}
