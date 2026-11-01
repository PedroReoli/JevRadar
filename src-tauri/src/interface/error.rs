use serde::Serialize;

use crate::application::catalog_service::CatalogServiceError;
use crate::application::classification_service::ClassificationServiceError;
use crate::application::content_collection_service::ContentCollectionServiceError;
use crate::application::content_query_service::ContentSourceManagementError;
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
            CatalogServiceError::InvalidQuery | CatalogServiceError::InvalidPagination => {
                "validation_error"
            }
            CatalogServiceError::HttpClient => "catalog_client_error",
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

impl From<ContentCollectionServiceError> for CommandError {
    fn from(error: ContentCollectionServiceError) -> Self {
        let code = match error {
            ContentCollectionServiceError::Database(_) => "database_error",
            ContentCollectionServiceError::HttpClient => "content_client_error",
        };
        Self {
            code,
            message: error.to_string(),
        }
    }
}

impl From<ContentSourceManagementError> for CommandError {
    fn from(error: ContentSourceManagementError) -> Self {
        let code = match error {
            ContentSourceManagementError::InvalidName
            | ContentSourceManagementError::InvalidUrl
            | ContentSourceManagementError::InvalidSourceKind
            | ContentSourceManagementError::InvalidFeedQuery
            | ContentSourceManagementError::InvalidFeedFilter
            | ContentSourceManagementError::InvalidFeedPagination => "validation_error",
            ContentSourceManagementError::Database(_) => "database_error",
        };
        Self {
            code,
            message: error.to_string(),
        }
    }
}

impl From<ClassificationServiceError> for CommandError {
    fn from(error: ClassificationServiceError) -> Self {
        match error {
            ClassificationServiceError::Database(error) => Self {
                code: "database_error",
                message: error.to_string(),
            },
        }
    }
}
use crate::application::backtest_service::BacktestServiceError;

impl From<BacktestServiceError> for CommandError {
    fn from(error: BacktestServiceError) -> Self {
        let code = match error {
            BacktestServiceError::InvalidRequest(_) => "backtest_invalid_request",
            BacktestServiceError::InsufficientHistory => "backtest_insufficient_history",
            BacktestServiceError::Database(_) => "database_error",
        };
        Self {
            code,
            message: error.to_string(),
        }
    }
}
