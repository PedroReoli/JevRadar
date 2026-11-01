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
use crate::domain::signals::SignalEvidenceSnapshot;
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

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
struct SignalEvidenceResponse {
    classification_id: String,
    source_name: String,
    title: Option<String>,
    excerpt: String,
    canonical_url: Option<String>,
    published_at: String,
    sentiment: String,
    sentiment_probability: f64,
    relevance_expected: f64,
    content_type: String,
    hype_probability: f64,
    factual_claim_probability: f64,
    confidence: f64,
    contribution_weight: f64,
    relevance_weight: f64,
    content_type_weight: f64,
    factual_weight: f64,
    source_credibility: f64,
    diversity_factor: f64,
    recency_factor: f64,
    hype_factor: f64,
    confidence_factor: f64,
    model_version: String,
    question_version: String,
}

impl From<SignalEvidenceSnapshot> for SignalEvidenceResponse {
    fn from(value: SignalEvidenceSnapshot) -> Self {
        Self {
            classification_id: value.classification_id,
            source_name: value.source_name,
            title: value.title,
            excerpt: value.excerpt,
            canonical_url: value.canonical_url,
            published_at: value.published_at,
            sentiment: value.sentiment,
            sentiment_probability: value.sentiment_probability,
            relevance_expected: value.relevance_expected,
            content_type: value.content_type,
            hype_probability: value.hype_probability,
            factual_claim_probability: value.factual_claim_probability,
            confidence: value.confidence,
            contribution_weight: value.contribution_weight,
            relevance_weight: value.relevance_weight,
            content_type_weight: value.content_type_weight,
            factual_weight: value.factual_weight,
            source_credibility: value.source_credibility,
            diversity_factor: value.diversity_factor,
            recency_factor: value.recency_factor,
            hype_factor: value.hype_factor,
            confidence_factor: value.confidence_factor,
            model_version: value.model_version,
            question_version: value.question_version,
        }
    }
}

#[derive(OpenApi)]
#[openapi(
    paths(health, market_overview, content_overview, signal_evidence, latest_backtest),
    components(schemas(HealthResponse, SignalEvidenceResponse)),
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
        .route("/v1/signals/{signal_id}/evidence", get(signal_evidence))
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
    path = "/v1/signals/{signal_id}/evidence",
    params(("signal_id" = String, Path, description = "ID versionado do sinal")),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Documentos e fatores que compõem o sinal", body = [SignalEvidenceResponse]),
        (status = 400, description = "ID de sinal inválido"),
        (status = 401, description = "Token local ausente ou inválido"),
        (status = 404, description = "Sinal não encontrado"),
        (status = 500, description = "Falha ao consultar o banco local")
    )
)]
async fn signal_evidence(
    State(state): State<ApiState>,
    Path(signal_id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<Vec<SignalEvidenceResponse>>, StatusCode> {
    authorize(&headers, &state.token)?;
    if !valid_signal_id(&signal_id) {
        return Err(StatusCode::BAD_REQUEST);
    }
    let evidence = MarketQueryService::signal_evidence(&state.database, &signal_id)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    if evidence.is_empty() {
        return Err(StatusCode::NOT_FOUND);
    }
    Ok(Json(evidence.into_iter().map(Into::into).collect()))
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

fn valid_signal_id(value: &str) -> bool {
    value.starts_with("signal:")
        && value.len() <= 256
        && value
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || ":+-_.".contains(character))
}

#[cfg(test)]
mod tests {
    use axum::http::{HeaderMap, HeaderValue, header};

    use utoipa::OpenApi;

    use super::{ApiDoc, authorize, valid_signal_id};

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

    #[test]
    fn bounds_signal_ids_and_documents_the_evidence_route() {
        assert!(valid_signal_id(
            "signal:asset:b3:PETR4:2026-11-01T12:00:00Z:weighted-sentiment-v2"
        ));
        assert!(!valid_signal_id("asset:b3:PETR4"));
        assert!(!valid_signal_id(&format!("signal:{}", "a".repeat(257))));
        assert!(!valid_signal_id("signal:PETR4?<script>"));

        let document = ApiDoc::openapi();
        assert!(
            document
                .paths
                .paths
                .contains_key("/v1/signals/{signal_id}/evidence")
        );
    }
}
