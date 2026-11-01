use serde::Serialize;

use crate::application::catalog_service::CatalogServiceError;
use crate::application::market_collection_service::MarketCollectionServiceError;
use crate::application::settings_service::SettingsServiceError;
use crate::infrastructure::database::DatabaseError;
use crate::infrastructure::secrets::SecretStoreError;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    pub code: &'static str,
    pub message: String,
}

impl CommandError {
    pub fn internal(error: impl std::fmt::Display) -> Self {
        Self {
            code: "desktop_error",
            message: error.to_string(),
        }
    }
}

impl From<SettingsServiceError> for CommandError {
    fn from(error: SettingsServiceError) -> Self {
        let code = match error {
            SettingsServiceError::Validation(_) => "validation_error",
            SettingsServiceError::Autostart => "autostart_error",
            SettingsServiceError::Database(_) => "database_error",
            SettingsServiceError::SecretStore(_) => "secret_store_error",
        };
        Self {
            code,
            message: error.to_string(),
        }
    }
}

impl From<SecretStoreError> for CommandError {
    fn from(error: SecretStoreError) -> Self {
        Self {
            code: "secret_store_error",
            message: error.to_string(),
        }
    }
}

impl From<CatalogServiceError> for CommandError {
    fn from(error: CatalogServiceError) -> Self {
        let code = match &error {
            CatalogServiceError::InvalidQuery => "validation_error",
            CatalogServiceError::Database(DatabaseError::AssetNotFound) => "asset_not_found",
            CatalogServiceError::Database(DatabaseError::WatchlistLimitExceeded) => {
                "watchlist_limit_exceeded"
            }
            CatalogServiceError::Database(_) => "database_error",
        };
        Self {
            code,
            message: error.to_string(),
        }
    }
}

impl From<MarketCollectionServiceError> for CommandError {
    fn from(error: MarketCollectionServiceError) -> Self {
        let code = match error {
            MarketCollectionServiceError::Database(_) => "database_error",
            MarketCollectionServiceError::HttpClient => "market_client_error",
        };
        Self {
            code,
            message: error.to_string(),
        }
    }
}
