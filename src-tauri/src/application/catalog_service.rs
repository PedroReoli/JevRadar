use std::time::Duration;

use chrono::Utc;
use reqwest::blocking::Client;

use crate::domain::assets::{
    AssetCatalogPage, AssetClass, CatalogRefreshSummary, CatalogSourceRefresh, Watchlist,
};
use crate::domain::settings::SecretKind;
use crate::infrastructure::catalog::{
    CatalogProviderError, discover_alpha_vantage_assets, discover_binance_assets,
    discover_brapi_assets,
};
use crate::infrastructure::database::{Database, DatabaseError};
use crate::infrastructure::secrets::KeyringSecretStore;

pub struct CatalogService;

#[derive(Debug, thiserror::Error)]
pub enum CatalogServiceError {
    #[error(transparent)]
    Database(#[from] DatabaseError),
    #[error("consulta inválida: use no máximo 80 caracteres")]
    InvalidQuery,
    #[error("paginação inválida")]
    InvalidPagination,
    #[error("não foi possível preparar o cliente do catálogo")]
    HttpClient,
}

impl CatalogService {
    pub fn list_assets_page(
        database: &Database,
        query: Option<String>,
        asset_class: Option<AssetClass>,
        page: u32,
        page_size: u32,
    ) -> Result<AssetCatalogPage, CatalogServiceError> {
        let query = query.map(|value| value.trim().to_owned());
        if query.as_ref().is_some_and(|value| value.len() > 80) {
            return Err(CatalogServiceError::InvalidQuery);
        }
        if page == 0 || !(1..=100).contains(&page_size) {
            return Err(CatalogServiceError::InvalidPagination);
        }

        let offset = page
            .checked_sub(1)
            .and_then(|value| value.checked_mul(page_size))
            .ok_or(CatalogServiceError::InvalidPagination)?;
        let (items, total_items) = database.list_assets_page(
            query.as_deref().filter(|value| !value.is_empty()),
            asset_class,
            page_size,
            offset,
        )?;
        let total_pages = total_items.div_ceil(u64::from(page_size)).max(1) as u32;

        Ok(AssetCatalogPage {
            items,
            page,
            page_size,
            total_items,
            total_pages,
        })
    }

    pub fn default_watchlist(database: &Database) -> Result<Watchlist, CatalogServiceError> {
        let limit = database.read_u8_setting("watchlist_limit", 50)?;
        database.default_watchlist(limit).map_err(Into::into)
    }

    pub fn refresh_assets(
        database: &Database,
        secrets: &KeyringSecretStore,
    ) -> Result<CatalogRefreshSummary, CatalogServiceError> {
        let client = Client::builder()
            .timeout(Duration::from_secs(20))
            .user_agent(concat!("JevRadar/", env!("CARGO_PKG_VERSION")))
            .build()
            .map_err(|_| CatalogServiceError::HttpClient)?;
        let provider_results = [
            ("source:brapi", discover_brapi_assets(&client)),
            ("source:binance", discover_binance_assets(&client)),
        ];
        let mut sources = Vec::new();
        let mut upserted_count = 0;

        for (source_id, result) in provider_results {
            match result {
                Ok(assets) => {
                    let discovered_count = assets.len();
                    upserted_count += database.upsert_assets(&assets)?;
                    sources.push(CatalogSourceRefresh {
                        source_id: source_id.to_owned(),
                        status: "completed".to_owned(),
                        discovered_count,
                        error_code: None,
                    });
                }
                Err(error) => sources.push(failed_catalog_source(source_id, error)),
            }
        }
        match secrets.read(SecretKind::AlphaVantageApiKey).unwrap_or(None) {
            Some(api_key) => match discover_alpha_vantage_assets(&client, &api_key) {
                Ok(assets) => {
                    let discovered_count = assets.len();
                    upserted_count += database.upsert_assets(&assets)?;
                    sources.push(CatalogSourceRefresh {
                        source_id: "source:alpha-vantage".to_owned(),
                        status: "completed".to_owned(),
                        discovered_count,
                        error_code: None,
                    });
                }
                Err(error) => sources.push(failed_catalog_source("source:alpha-vantage", error)),
            },
            None => sources.push(CatalogSourceRefresh {
                source_id: "source:alpha-vantage".to_owned(),
                status: "skipped".to_owned(),
                discovered_count: 0,
                error_code: Some("alpha_vantage_credentials_missing".to_owned()),
            }),
        }
        let failed_count = sources
            .iter()
            .filter(|source| source.status == "failed")
            .count();
        let status = match failed_count {
            0 => "completed",
            count if count == sources.len() => "failed",
            _ => "partial",
        };

        Ok(CatalogRefreshSummary {
            status: status.to_owned(),
            upserted_count,
            refreshed_at: Utc::now().to_rfc3339(),
            sources,
        })
    }

    pub fn add_to_default_watchlist(
        database: &Database,
        asset_id: &str,
    ) -> Result<Watchlist, CatalogServiceError> {
        let limit = database.read_u8_setting("watchlist_limit", 50)?;
        database.add_default_watchlist_asset(asset_id, limit)?;
        database.default_watchlist(limit).map_err(Into::into)
    }

    pub fn remove_from_default_watchlist(
        database: &Database,
        asset_id: &str,
    ) -> Result<Watchlist, CatalogServiceError> {
        let limit = database.read_u8_setting("watchlist_limit", 50)?;
        database.remove_default_watchlist_asset(asset_id)?;
        database.default_watchlist(limit).map_err(Into::into)
    }
}

fn failed_catalog_source(source_id: &str, error: CatalogProviderError) -> CatalogSourceRefresh {
    CatalogSourceRefresh {
        source_id: source_id.to_owned(),
        status: "failed".to_owned(),
        discovered_count: 0,
        error_code: Some(error.code().to_owned()),
    }
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::{CatalogService, CatalogServiceError};
    use crate::domain::assets::AssetClass;
    use crate::infrastructure::database::DatabaseError;

    fn database() -> crate::infrastructure::database::Database {
        let directory = tempdir().expect("diretório temporário");
        crate::infrastructure::database::Database::open(directory.keep().join("catalog.sqlite3"))
            .expect("banco inicializado")
    }

    #[test]
    fn filters_catalog_and_manages_default_watchlist() {
        let database = database();
        let crypto =
            CatalogService::list_assets_page(&database, None, Some(AssetClass::Crypto), 1, 50)
                .expect("catálogo");
        assert_eq!(crypto.items.len(), 3);

        let filtered =
            CatalogService::list_assets_page(&database, Some("petrobras".into()), None, 1, 50)
                .expect("busca por alias");
        assert_eq!(filtered.items[0].symbol, "PETR4");

        let watchlist = CatalogService::add_to_default_watchlist(&database, "asset:b3:PETR4")
            .expect("adiciona ativo");
        assert_eq!(watchlist.assets.len(), 1);

        let unchanged = CatalogService::add_to_default_watchlist(&database, "asset:b3:PETR4")
            .expect("adição idempotente");
        assert_eq!(unchanged.assets.len(), 1);

        let empty = CatalogService::remove_from_default_watchlist(&database, "asset:b3:PETR4")
            .expect("remove ativo");
        assert!(empty.assets.is_empty());
    }

    #[test]
    fn rejects_unknown_assets() {
        let database = database();
        let error = CatalogService::add_to_default_watchlist(&database, "asset:unknown")
            .expect_err("ativo inexistente deve falhar");
        assert!(matches!(
            error,
            CatalogServiceError::Database(DatabaseError::AssetNotFound)
        ));
    }

    #[test]
    fn paginates_catalog_with_a_bounded_page_size() {
        let database = database();
        let first_page =
            CatalogService::list_assets_page(&database, None, None, 1, 2).expect("primeira página");
        assert_eq!(first_page.items.len(), 2);
        assert_eq!(first_page.page, 1);
        assert_eq!(first_page.page_size, 2);
        assert!(first_page.total_items >= 2);
        assert!(first_page.total_pages >= 2);

        let error = CatalogService::list_assets_page(&database, None, None, 1, 101)
            .expect_err("limite deve ser validado");
        assert!(matches!(error, CatalogServiceError::InvalidPagination));
    }
}
