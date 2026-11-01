use crate::domain::content::ContentOverview;
use crate::infrastructure::database::{Database, DatabaseError};
use reqwest::Url;
use sha2::{Digest, Sha256};

#[derive(Debug, thiserror::Error)]
pub enum ContentSourceManagementError {
    #[error("nome da fonte inválido")]
    InvalidName,
    #[error("a URL precisa usar HTTPS")]
    InvalidUrl,
    #[error(transparent)]
    Database(#[from] DatabaseError),
}

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

    pub fn add_rss_source(
        database: &Database,
        name: &str,
        url: &str,
    ) -> Result<ContentOverview, ContentSourceManagementError> {
        let name = name.trim();
        if !(2..=80).contains(&name.chars().count()) {
            return Err(ContentSourceManagementError::InvalidName);
        }
        let parsed =
            Url::parse(url.trim()).map_err(|_| ContentSourceManagementError::InvalidUrl)?;
        if parsed.scheme() != "https" || parsed.host_str().is_none() {
            return Err(ContentSourceManagementError::InvalidUrl);
        }
        let digest = format!("{:x}", Sha256::digest(parsed.as_str().as_bytes()));
        let id = format!("source:custom:rss:{}", &digest[..16]);
        database.upsert_custom_rss_source(&id, name, parsed.as_str())?;
        database.content_overview().map_err(Into::into)
    }
}
