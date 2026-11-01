use crate::domain::assets::{Asset, AssetClass, Watchlist};
use crate::infrastructure::database::{Database, DatabaseError};

pub struct CatalogService;

#[derive(Debug, thiserror::Error)]
pub enum CatalogServiceError {
    #[error(transparent)]
    Database(#[from] DatabaseError),
    #[error("consulta inválida: use no máximo 80 caracteres")]
    InvalidQuery,
}

impl CatalogService {
    pub fn list_assets(
        database: &Database,
        query: Option<String>,
        asset_class: Option<AssetClass>,
    ) -> Result<Vec<Asset>, CatalogServiceError> {
        let query = query.map(|value| value.trim().to_owned());
        if query.as_ref().is_some_and(|value| value.len() > 80) {
            return Err(CatalogServiceError::InvalidQuery);
        }

        database
            .list_assets(
                query.as_deref().filter(|value| !value.is_empty()),
                asset_class,
            )
            .map_err(Into::into)
    }

    pub fn default_watchlist(database: &Database) -> Result<Watchlist, CatalogServiceError> {
        let limit = database.read_u8_setting("watchlist_limit", 50)?;
        database.default_watchlist(limit).map_err(Into::into)
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
        let crypto = CatalogService::list_assets(&database, None, Some(AssetClass::Crypto))
            .expect("catálogo");
        assert_eq!(crypto.len(), 3);

        let filtered = CatalogService::list_assets(&database, Some("petrobras".into()), None)
            .expect("busca por alias");
        assert_eq!(filtered[0].symbol, "PETR4");

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
}
