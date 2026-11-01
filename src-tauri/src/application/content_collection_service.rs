use std::time::Duration;

use chrono::Utc;
use reqwest::blocking::Client;

use crate::domain::content::{ContentCollectionSummary, ContentSourceResult};
use crate::domain::settings::SecretKind;
use crate::infrastructure::content::{ContentProviderError, collect_reddit, collect_rss};
use crate::infrastructure::database::{Database, DatabaseError};
use crate::infrastructure::secrets::KeyringSecretStore;

pub struct ContentCollectionService;

#[derive(Debug, thiserror::Error)]
pub enum ContentCollectionServiceError {
    #[error(transparent)]
    Database(#[from] DatabaseError),
    #[error("não foi possível preparar o cliente das fontes de conteúdo")]
    HttpClient,
}

impl ContentCollectionService {
    pub fn collect(
        database: &Database,
        secrets: &KeyringSecretStore,
    ) -> Result<ContentCollectionSummary, ContentCollectionServiceError> {
        database.purge_expired_source_documents(&Utc::now().to_rfc3339())?;
        let client = Client::builder()
            .timeout(Duration::from_secs(15))
            .user_agent(concat!(
                "windows:com.pedrolucas.jevradar:v",
                env!("CARGO_PKG_VERSION"),
                " (local open-source market radar)"
            ))
            .build()
            .map_err(|_| ContentCollectionServiceError::HttpClient)?;
        let sources = database.enabled_content_sources()?;
        let reddit_credentials = read_reddit_credentials(secrets);
        let mut results = Vec::new();

        for source in sources {
            let provider_result = match source.source_kind.as_str() {
                "rss" => collect_rss(&client, &source),
                "reddit" => match &reddit_credentials {
                    Ok((client_id, client_secret)) => {
                        collect_reddit(&client, client_id, client_secret)
                    }
                    Err(error_code) => {
                        let result = ContentSourceResult {
                            source_id: source.id,
                            status: "skipped".to_owned(),
                            stored_document_count: 0,
                            error_code: Some(error_code.clone()),
                        };
                        database.update_content_source_state(&result, &Utc::now().to_rfc3339())?;
                        results.push(result);
                        continue;
                    }
                },
                _ => continue,
            };

            let result = match provider_result {
                Ok(documents) => ContentSourceResult {
                    source_id: source.id,
                    status: "completed".to_owned(),
                    stored_document_count: database.store_source_documents(&documents)?,
                    error_code: None,
                },
                Err(error) => failed_source(&source.id, error),
            };
            database.update_content_source_state(&result, &Utc::now().to_rfc3339())?;
            results.push(result);
        }

        let stored_document_count = results
            .iter()
            .map(|result| result.stored_document_count)
            .sum();
        let source_error_count = results
            .iter()
            .filter(|result| result.status == "failed")
            .count();
        Ok(ContentCollectionSummary {
            stored_document_count,
            source_error_count,
            sources: results,
        })
    }
}

fn read_reddit_credentials(secrets: &KeyringSecretStore) -> Result<(String, String), String> {
    let client_id = secrets
        .read(SecretKind::RedditClientId)
        .map_err(|_| "reddit_credential_store_unavailable".to_owned())?;
    let client_secret = secrets
        .read(SecretKind::RedditClientSecret)
        .map_err(|_| "reddit_credential_store_unavailable".to_owned())?;
    match (client_id, client_secret) {
        (Some(client_id), Some(client_secret)) => Ok((client_id, client_secret)),
        _ => Err("reddit_credentials_missing".to_owned()),
    }
}

fn failed_source(source_id: &str, error: ContentProviderError) -> ContentSourceResult {
    ContentSourceResult {
        source_id: source_id.to_owned(),
        status: "failed".to_owned(),
        stored_document_count: 0,
        error_code: Some(error.code().to_owned()),
    }
}
