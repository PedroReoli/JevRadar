use std::time::Duration;

use chrono::Utc;
use reqwest::blocking::Client;

use crate::domain::content::{ContentCollectionSummary, ContentSourceResult};
use crate::domain::settings::{SecretKind, default_reddit_communities, valid_reddit_communities};
use crate::infrastructure::content::{
    ContentProviderError, collect_reddit, collect_rss, collect_x,
};
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
        database.redact_expired_source_documents(&Utc::now().to_rfc3339())?;
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
        let reddit_communities = read_reddit_communities(database)?;
        let x_bearer_token = read_x_bearer_token(secrets);
        let x_query = build_x_query(database)?;
        let mut results = Vec::new();

        for source in sources {
            let provider_result = match source.source_kind.as_str() {
                "rss" | "forum" => collect_rss(&client, &source),
                "reddit" => match &reddit_credentials {
                    Ok((client_id, client_secret)) => {
                        collect_reddit(&client, client_id, client_secret, &reddit_communities)
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
                "x" => match (&x_bearer_token, &x_query) {
                    (Ok(token), Some(query)) => collect_x(&client, token, query),
                    (_, None) => {
                        let result = ContentSourceResult {
                            source_id: source.id,
                            status: "skipped".to_owned(),
                            stored_document_count: 0,
                            error_code: Some("x_watchlist_empty".to_owned()),
                        };
                        database.update_content_source_state(&result, &Utc::now().to_rfc3339())?;
                        results.push(result);
                        continue;
                    }
                    (Err(error_code), Some(_)) => {
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

fn read_x_bearer_token(secrets: &KeyringSecretStore) -> Result<String, String> {
    secrets
        .read(SecretKind::XBearerToken)
        .map_err(|_| "x_credential_store_unavailable".to_owned())?
        .ok_or_else(|| "x_bearer_token_missing".to_owned())
}

fn build_x_query(database: &Database) -> Result<Option<String>, DatabaseError> {
    let mut terms = Vec::new();
    for candidate in database.watchlist_search_terms()? {
        let escaped = candidate.replace('"', "");
        let term = format!("\"{escaped}\"");
        let projected = terms.join(" OR ").len() + term.len() + 19;
        if projected > 500 {
            break;
        }
        terms.push(term);
    }
    if terms.is_empty() {
        Ok(None)
    } else {
        Ok(Some(format!("({}) -is:retweet", terms.join(" OR "))))
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

fn read_reddit_communities(database: &Database) -> Result<Vec<String>, DatabaseError> {
    let stored = database.read_setting_or("reddit_communities", "[]")?;
    let communities =
        serde_json::from_str(&stored).unwrap_or_else(|_| default_reddit_communities());
    Ok(if valid_reddit_communities(&communities) {
        communities
    } else {
        default_reddit_communities()
    })
}

fn failed_source(source_id: &str, error: ContentProviderError) -> ContentSourceResult {
    ContentSourceResult {
        source_id: source_id.to_owned(),
        status: "failed".to_owned(),
        stored_document_count: 0,
        error_code: Some(error.code().to_owned()),
    }
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::{build_x_query, read_reddit_communities};
    use crate::infrastructure::database::Database;

    #[test]
    fn builds_a_bounded_x_query_from_the_local_watchlist() {
        let directory = tempdir().expect("diretório");
        let database = Database::open(directory.path().join("x-query.sqlite3")).expect("banco");
        assert_eq!(build_x_query(&database).expect("consulta"), None);

        database
            .add_default_watchlist_asset("asset:b3:PETR4", 50)
            .expect("watchlist");
        let query = build_x_query(&database).expect("consulta").expect("query");
        assert!(query.contains("\"PETR4\""));
        assert!(query.contains("\"Petrobras\""));
        assert!(query.ends_with("-is:retweet"));
        assert!(query.len() <= 512);
    }

    #[test]
    fn falls_back_when_reddit_communities_are_tampered_with() {
        let directory = tempdir().expect("diretório");
        let database =
            Database::open(directory.path().join("reddit-query.sqlite3")).expect("banco");
        database
            .write_settings(&[("reddit_communities", "[\"../unsafe\"]".to_owned())])
            .expect("altera configuração");
        let communities = read_reddit_communities(&database).expect("comunidades");
        assert!(communities.iter().any(|value| value == "investimentos"));
        assert!(!communities.iter().any(|value| value.contains("..")));
    }
}
