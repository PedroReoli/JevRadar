use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use chrono::Utc;
use reqwest::blocking::Client;

use crate::domain::collection::{CollectionSummary, CollectionTrigger, SourceCollectionResult};
use crate::domain::settings::SecretKind;
use crate::infrastructure::database::{Database, DatabaseError};
use crate::infrastructure::market::{
    MarketProviderError, ProviderCollection, collect_alpha_vantage, collect_bcb, collect_binance,
    collect_brapi,
};
use crate::infrastructure::secrets::KeyringSecretStore;

static RUN_SEQUENCE: AtomicU64 = AtomicU64::new(1);

pub struct MarketCollectionService;

#[derive(Debug, thiserror::Error)]
pub enum MarketCollectionServiceError {
    #[error(transparent)]
    Database(#[from] DatabaseError),
    #[error("não foi possível preparar o cliente das fontes de mercado")]
    HttpClient,
}

impl MarketCollectionService {
    pub fn collect(
        database: &Database,
        secrets: &KeyringSecretStore,
        trigger: CollectionTrigger,
    ) -> Result<CollectionSummary, MarketCollectionServiceError> {
        let started_at = Utc::now();
        let run_sequence = RUN_SEQUENCE.fetch_add(1, Ordering::Relaxed);
        let run_id = format!(
            "collection:{}:{}",
            started_at.timestamp_millis(),
            run_sequence
        );
        database.start_collection_run(
            &run_id,
            trigger.as_storage_value(),
            &started_at.to_rfc3339(),
        )?;

        let client = Client::builder()
            .timeout(Duration::from_secs(15))
            .user_agent(concat!("JevRadar/", env!("CARGO_PKG_VERSION")))
            .build()
            .map_err(|_| MarketCollectionServiceError::HttpClient)?;
        let watchlist_limit = database.read_u8_setting("watchlist_limit", 50)?;
        let assets = database
            .default_watchlist(watchlist_limit)?
            .assets
            .into_iter()
            .filter(|item| item.enabled)
            .map(|item| item.asset)
            .collect::<Vec<_>>();
        let brapi_token = secrets.read(SecretKind::BrapiToken).unwrap_or(None);
        let alpha_vantage_api_key = secrets.read(SecretKind::AlphaVantageApiKey).unwrap_or(None);

        let provider_results = [
            ("source:binance", collect_binance(&client, &assets)),
            (
                "source:brapi",
                collect_brapi(&client, &assets, brapi_token.as_deref()),
            ),
            ("source:bcb", collect_bcb(&client, &assets)),
            (
                "source:alpha-vantage",
                collect_alpha_vantage(
                    &client,
                    &assets,
                    alpha_vantage_api_key.as_deref(),
                    run_sequence as usize,
                ),
            ),
        ];
        let mut sources = Vec::new();
        let mut stored_observation_count = 0;
        let mut source_error_count = 0;

        for (source_id, provider_result) in provider_results {
            match provider_result {
                Ok(collection) => {
                    let source_result = store_provider_collection(database, collection)?;
                    stored_observation_count += source_result.stored_observation_count;
                    sources.push(source_result);
                }
                Err(error) => {
                    source_error_count += 1;
                    sources.push(failed_source_result(source_id, error));
                }
            }
        }

        let status = collection_status(&sources, source_error_count);
        database.finish_collection_run(
            &run_id,
            status,
            &Utc::now().to_rfc3339(),
            stored_observation_count,
            source_error_count,
            &sources,
        )?;

        Ok(CollectionSummary {
            run_id,
            status: status.to_owned(),
            stored_observation_count,
            source_error_count,
            sources,
        })
    }
}

fn store_provider_collection(
    database: &Database,
    collection: ProviderCollection,
) -> Result<SourceCollectionResult, DatabaseError> {
    let stored_observation_count = database.store_market_observations(&collection.observations)?;
    let status = if stored_observation_count > 0 && collection.skipped_asset_count > 0 {
        "partial"
    } else if stored_observation_count == 0 {
        "skipped"
    } else {
        "completed"
    };
    Ok(SourceCollectionResult {
        source_id: collection.source_id.to_owned(),
        status: status.to_owned(),
        stored_observation_count,
        skipped_asset_count: collection.skipped_asset_count,
        error_code: None,
    })
}

fn failed_source_result(source_id: &str, error: MarketProviderError) -> SourceCollectionResult {
    SourceCollectionResult {
        source_id: source_id.to_owned(),
        status: "failed".to_owned(),
        stored_observation_count: 0,
        skipped_asset_count: 0,
        error_code: Some(error.code().to_owned()),
    }
}

fn collection_status(
    sources: &[SourceCollectionResult],
    source_error_count: usize,
) -> &'static str {
    let has_data = sources
        .iter()
        .any(|source| source.stored_observation_count > 0);
    if source_error_count == 0 {
        "completed"
    } else if has_data {
        "partial"
    } else {
        "failed"
    }
}

#[cfg(test)]
mod tests {
    use super::collection_status;
    use crate::domain::collection::SourceCollectionResult;

    fn source(count: usize) -> SourceCollectionResult {
        SourceCollectionResult {
            source_id: "source:test".to_owned(),
            status: "completed".to_owned(),
            stored_observation_count: count,
            skipped_asset_count: 0,
            error_code: None,
        }
    }

    #[test]
    fn marks_partial_runs_when_one_source_fails_after_data_was_stored() {
        assert_eq!(collection_status(&[source(10)], 1), "partial");
        assert_eq!(collection_status(&[source(0)], 1), "failed");
        assert_eq!(collection_status(&[source(0)], 0), "completed");
    }
}
