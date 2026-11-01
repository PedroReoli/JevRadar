use std::sync::Arc;
use std::sync::atomic::AtomicU8;

use axum::Router;
use axum::extract::{Path, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::Json;
use axum::routing::get;
use serde::Serialize;
use serde_json::Value;
use tokio::sync::oneshot;
use utoipa::openapi::security::{Http, HttpAuthScheme, SecurityScheme};
use utoipa::{Modify, OpenApi, ToSchema};
use utoipa_swagger_ui::SwaggerUi;

use crate::application::backtest_service::BacktestService;
use crate::application::content_query_service::ContentQueryService;
use crate::application::market_query_service::MarketQueryService;
use crate::domain::market::MarketOverviewFilter;
use crate::infrastructure::database::Database;
use crate::infrastructure::local_api::runtime::mark_ready;

const ADDRESS: &str = "127.0.0.1:47831";

#[derive(Clone)]
struct ApiState {
    database: Arc<Database>,
    token: Arc<str>,
}

#[derive(Serialize, ToSchema)]
struct HealthResponse {
    status: &'static str,
    version: &'static str,
}

#[derive(OpenApi)]
#[openapi(
    paths(health, market_overview, content_overview, latest_backtest),
    components(schemas(HealthResponse)),
    modifiers(&SecurityAddon),
    tags((name = "JevRadar", description = "API local somente leitura"))
)]
struct ApiDoc;

struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "bearerAuth",
                SecurityScheme::Http(Http::new(HttpAuthScheme::Bearer)),
            );
        }
    }
}

pub async fn serve(
    database: Arc<Database>,
    token: String,
    shutdown: oneshot::Receiver<()>,
    status: Arc<AtomicU8>,
) -> Result<(), std::io::Error> {
    let state = ApiState {
        database,
        token: Arc::from(token),
    };
    let app = Router::new()
        .route("/health", get(health))
        .route("/v1/market", get(market_overview))
        .route("/v1/sources", get(content_overview))
        .route("/v1/backtests/{asset_id}", get(latest_backtest))
        .merge(SwaggerUi::new("/docs").url("/openapi.json", ApiDoc::openapi()))
        .with_state(state);
    let listener = tokio::net::TcpListener::bind(ADDRESS).await?;
    mark_ready(&status);
    axum::serve(listener, app)
        .with_graceful_shutdown(async move {
            let _ = shutdown.await;
        })
        .await
}

#[utoipa::path(get, path = "/health", responses((status = 200, body = HealthResponse)))]
async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ready",
        version: env!("CARGO_PKG_VERSION"),
    })
}

#[utoipa::path(
    get,
    path = "/v1/market",
    security(("bearerAuth" = [])),
    responses((status = 200, description = "Radar e mercado", body = Object), (status = 401))
)]
async fn market_overview(
    State(state): State<ApiState>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    authorize(&headers, &state.token)?;
    let overview = MarketQueryService::overview(&state.database, MarketOverviewFilter::default())
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    serde_json::to_value(overview)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

#[utoipa::path(
    get,
    path = "/v1/sources",
    security(("bearerAuth" = [])),
    responses((status = 200, description = "Fontes e documentos", body = Object), (status = 401))
)]
async fn content_overview(
    State(state): State<ApiState>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    authorize(&headers, &state.token)?;
    let overview = ContentQueryService::overview(&state.database)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    serde_json::to_value(overview)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

#[utoipa::path(
    get,
    path = "/v1/backtests/{asset_id}",
    params(("asset_id" = String, Path, description = "ID local do ativo")),
    security(("bearerAuth" = [])),
    responses((status = 200, description = "Último backtest", body = Object), (status = 401))
)]
async fn latest_backtest(
    State(state): State<ApiState>,
    Path(asset_id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    authorize(&headers, &state.token)?;
    let report = BacktestService::latest(&state.database, &asset_id)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    serde_json::to_value(report)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

fn authorize(headers: &HeaderMap, expected_token: &str) -> Result<(), StatusCode> {
    let supplied = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "));
    if supplied == Some(expected_token) {
        Ok(())
    } else {
        Err(StatusCode::UNAUTHORIZED)
    }
}

#[cfg(test)]
mod tests {
    use axum::http::{HeaderMap, HeaderValue, header};

    use super::authorize;

    #[test]
    fn requires_an_exact_bearer_token() {
        let mut headers = HeaderMap::new();
        assert!(authorize(&headers, "secret").is_err());
        headers.insert(
            header::AUTHORIZATION,
            HeaderValue::from_static("Bearer wrong"),
        );
        assert!(authorize(&headers, "secret").is_err());
        headers.insert(
            header::AUTHORIZATION,
            HeaderValue::from_static("Bearer secret"),
        );
        assert!(authorize(&headers, "secret").is_ok());
    }
}
