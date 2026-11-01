use std::sync::Arc;
use std::sync::atomic::AtomicU8;

use axum::Router;
use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::Json;
use axum::routing::get;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::sync::oneshot;
use utoipa::openapi::security::{Http, HttpAuthScheme, SecurityScheme};
use utoipa::{Modify, OpenApi, ToSchema};
use utoipa_swagger_ui::SwaggerUi;

use crate::application::backtest_service::BacktestService;
use crate::application::comparison_query_service::{ComparisonQueryError, ComparisonQueryService};
use crate::application::content_query_service::{
    ContentQueryService, ContentSourceManagementError,
};
use crate::application::coverage_query_service::{CoverageGapQueryError, CoverageQueryService};
use crate::application::historical_pattern_query_service::{
    HistoricalPatternQueryError, HistoricalPatternQueryService,
};
use crate::application::insights_query_service::InsightsQueryService;
use crate::application::market_query_service::{
    AssetDetailQueryError, MarketEventQueryError, MarketQueryService, SignalExplorerQueryError,
};
use crate::application::report_query_service::ReportQueryService;
use crate::domain::assets::AssetClass;
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

#[derive(Debug, Deserialize)]
struct ListQuery {
    limit: Option<usize>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AlertHistoryPageQuery {
    alert_level: Option<u8>,
    asset_id: Option<String>,
    page: Option<u32>,
    page_size: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CollectionHistoryPageQuery {
    status: Option<String>,
    source_id: Option<String>,
    page: Option<u32>,
    page_size: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BacktestHistoryQuery {
    asset_id: Option<String>,
    limit: Option<usize>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BacktestHistoryPageQuery {
    asset_id: Option<String>,
    page: Option<u32>,
    page_size: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SignalExplorerQuery {
    period_hours: Option<u16>,
    minimum_confidence: Option<f64>,
    direction: Option<String>,
    asset_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AssetDetailQuery {
    period_hours: Option<u16>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AssetComparisonQuery {
    asset_ids: Option<String>,
    period_hours: Option<u16>,
    minimum_confidence: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DocumentFeedQuery {
    query: Option<String>,
    source_kind: Option<String>,
    content_type: Option<String>,
    sentiment: Option<String>,
    analysis_status: Option<String>,
    asset_id: Option<String>,
    minimum_confidence: Option<f64>,
    page: Option<u32>,
    page_size: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MarketEventQuery {
    event_type: Option<String>,
    country_code: Option<String>,
    asset_id: Option<String>,
    relation_type: Option<String>,
    minimum_confidence: Option<f64>,
    page: Option<u32>,
    page_size: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MarketRelationQuery {
    period_hours: Option<u16>,
    country_code: Option<String>,
    asset_class: Option<String>,
    relation_type: Option<String>,
    minimum_confidence: Option<f64>,
    page: Option<u32>,
    page_size: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CoverageGapQuery {
    period_hours: Option<u16>,
    asset_class: Option<String>,
    minimum_movement_percent: Option<f64>,
    maximum_evidence_count: Option<u8>,
    page: Option<u32>,
    page_size: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HistoricalPatternQuery {
    asset_class: Option<String>,
    horizon_days: Option<i64>,
    outcome: Option<String>,
    minimum_sample_size: Option<u32>,
    page: Option<u32>,
    page_size: Option<u32>,
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
    paths(
        health,
        market_overview,
        asset_detail,
        asset_comparison,
        signal_explorer,
        content_overview,
        content_source_detail,
        document_feed,
        market_events,
        market_relations,
        coverage_gaps,
        historical_patterns,
        signal_report,
        signal_evidence,
        alert_history,
        alert_history_page,
        collection_history,
        collection_history_page,
        backtest_history,
        backtest_history_page,
        latest_backtest,
        calibration_readiness,
        report_overview,
        jev_usage
    ),
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
    let app = build_router(database, token);
    let listener = tokio::net::TcpListener::bind(ADDRESS).await?;
    mark_ready(&status);
    axum::serve(listener, app)
        .with_graceful_shutdown(async move {
            let _ = shutdown.await;
        })
        .await
}

fn build_router(database: Arc<Database>, token: String) -> Router {
    let state = ApiState {
        database,
        token: Arc::from(token),
    };
    Router::new()
        .route("/health", get(health))
        .route("/v1/market", get(market_overview))
        .route("/v1/assets/{asset_id}/overview", get(asset_detail))
        .route("/v1/comparison", get(asset_comparison))
        .route("/v1/signal-explorer", get(signal_explorer))
        .route("/v1/sources", get(content_overview))
        .route("/v1/sources/{source_id}", get(content_source_detail))
        .route("/v1/documents", get(document_feed))
        .route("/v1/events", get(market_events))
        .route("/v1/relations", get(market_relations))
        .route("/v1/coverage-gaps", get(coverage_gaps))
        .route("/v1/historical-patterns", get(historical_patterns))
        .route("/v1/signals/{signal_id}", get(signal_report))
        .route("/v1/signals/{signal_id}/evidence", get(signal_evidence))
        .route("/v1/alerts", get(alert_history))
        .route("/v1/alert-history", get(alert_history_page))
        .route("/v1/collections", get(collection_history))
        .route("/v1/collection-history", get(collection_history_page))
        .route("/v1/backtests", get(backtest_history))
        .route("/v1/backtest-history", get(backtest_history_page))
        .route("/v1/backtests/{asset_id}", get(latest_backtest))
        .route("/v1/calibration-readiness", get(calibration_readiness))
        .route("/v1/report-overview", get(report_overview))
        .route("/v1/jev/usage", get(jev_usage))
        .merge(SwaggerUi::new("/docs").url("/openapi.json", ApiDoc::openapi()))
        .with_state(state)
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
    path = "/v1/assets/{asset_id}/overview",
    params(
        ("asset_id" = String, Path, description = "ID local de um ativo da watchlist"),
        ("periodHours" = Option<u16>, Query, description = "Período entre 1 e 720 horas; padrão 720")
    ),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Detalhe agregado do ativo ou null quando ausente", body = Object),
        (status = 400, description = "ID ou período inválido"),
        (status = 401, description = "Token local ausente ou inválido"),
        (status = 500, description = "Falha ao consultar o banco local")
    )
)]
async fn asset_detail(
    State(state): State<ApiState>,
    Path(asset_id): Path<String>,
    Query(query): Query<AssetDetailQuery>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    authorize(&headers, &state.token)?;
    let overview = MarketQueryService::asset_detail(
        &state.database,
        &asset_id,
        query.period_hours.unwrap_or(720),
    )
    .map_err(asset_detail_query_status)?;
    serialize_json(overview)
}

#[utoipa::path(
    get,
    path = "/v1/comparison",
    params(
        ("assetIds" = Option<String>, Query, description = "Até quatro IDs locais separados por vírgula"),
        ("periodHours" = Option<u16>, Query, description = "Período entre 1 e 720 horas; padrão 168"),
        ("minimumConfidence" = Option<f64>, Query, description = "Confiança mínima entre 0 e 1; padrão 0,5")
    ),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Ativos disponíveis e linhas comparativas", body = Object),
        (status = 400, description = "Filtros inválidos"),
        (status = 401, description = "Token local ausente ou inválido"),
        (status = 500, description = "Falha ao consultar o banco local")
    )
)]
async fn asset_comparison(
    State(state): State<ApiState>,
    Query(query): Query<AssetComparisonQuery>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    authorize(&headers, &state.token)?;
    let asset_ids = query
        .asset_ids
        .filter(|value| !value.is_empty())
        .map(|value| value.split(',').map(str::to_owned).collect())
        .unwrap_or_default();
    let overview = ComparisonQueryService::overview(
        &state.database,
        asset_ids,
        query.period_hours.unwrap_or(168),
        query.minimum_confidence.unwrap_or(0.5),
    )
    .map_err(comparison_query_status)?;
    serialize_json(overview)
}

#[utoipa::path(
    get,
    path = "/v1/signal-explorer",
    params(
        ("periodHours" = Option<u16>, Query, description = "Período entre 1 e 720 horas; padrão 24"),
        ("minimumConfidence" = Option<f64>, Query, description = "Confiança mínima entre 0 e 1; padrão 0"),
        ("direction" = Option<String>, Query, description = "positive, neutral ou negative"),
        ("assetId" = Option<String>, Query, description = "ID local de um ativo da watchlist")
    ),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Últimos sinais filtrados da watchlist local", body = Object),
        (status = 400, description = "Filtro inválido"),
        (status = 401, description = "Token local ausente ou inválido"),
        (status = 500, description = "Falha ao consultar o banco local")
    )
)]
async fn signal_explorer(
    State(state): State<ApiState>,
    Query(query): Query<SignalExplorerQuery>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    authorize(&headers, &state.token)?;
    let overview = MarketQueryService::signals(
        &state.database,
        query.period_hours.unwrap_or(24),
        query.minimum_confidence.unwrap_or(0.0),
        query.direction,
        query.asset_id,
    )
    .map_err(signal_explorer_query_status)?;
    serialize_json(overview)
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
    path = "/v1/sources/{source_id}",
    params(("source_id" = String, Path, description = "Identificador local da fonte")),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Detalhe e contagem local da fonte", body = Object),
        (status = 400, description = "Identificador inválido"),
        (status = 401, description = "Token local ausente ou inválido"),
        (status = 404, description = "Fonte não encontrada"),
        (status = 500, description = "Falha ao consultar o banco local")
    )
)]
async fn content_source_detail(
    State(state): State<ApiState>,
    Path(source_id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    authorize(&headers, &state.token)?;
    let source = ContentQueryService::source_detail(&state.database, &source_id)
        .map_err(content_query_status)?
        .ok_or(StatusCode::NOT_FOUND)?;
    serialize_json(source)
}

#[utoipa::path(
    get,
    path = "/v1/documents",
    params(
        ("query" = Option<String>, Query, description = "Busca em título, trecho, fonte ou ticker; até 100 caracteres"),
        ("sourceKind" = Option<String>, Query, description = "rss, reddit, forum ou x"),
        ("contentType" = Option<String>, Query, description = "news, opinion, technical_analysis, meme, spam ou uncertain"),
        ("sentiment" = Option<String>, Query, description = "optimistic, pessimistic, neutral ou uncertain"),
        ("analysisStatus" = Option<String>, Query, description = "pending, classified ou no_asset"),
        ("assetId" = Option<String>, Query, description = "ID local do ativo"),
        ("minimumConfidence" = Option<f64>, Query, description = "0 a 1"),
        ("page" = Option<u32>, Query, description = "Página a partir de 1"),
        ("pageSize" = Option<u32>, Query, description = "1 a 50; padrão 25")
    ),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Feed local e paginado de documentos", body = Object),
        (status = 400, description = "Filtro ou paginação inválidos"),
        (status = 401, description = "Token local ausente ou inválido"),
        (status = 500, description = "Falha ao consultar o banco local")
    )
)]
async fn document_feed(
    State(state): State<ApiState>,
    Query(query): Query<DocumentFeedQuery>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    authorize(&headers, &state.token)?;
    let page = ContentQueryService::document_feed(
        &state.database,
        query.query,
        query.source_kind,
        query.content_type,
        query.sentiment,
        query.analysis_status,
        query.asset_id,
        query.minimum_confidence.unwrap_or(0.0),
        query.page.unwrap_or(1),
        query.page_size.unwrap_or(25),
    )
    .map_err(content_query_status)?;
    serialize_json(page)
}

#[utoipa::path(
    get,
    path = "/v1/events",
    params(
        ("eventType" = Option<String>, Query, description = "political, economic, regulatory, climate, health, technology, geopolitical ou other"),
        ("countryCode" = Option<String>, Query, description = "Código de país ou região em maiúsculas"),
        ("assetId" = Option<String>, Query, description = "ID local do ativo"),
        ("relationType" = Option<String>, Query, description = "known, correlation, hypothesis ou unproven_causality"),
        ("minimumConfidence" = Option<f64>, Query, description = "0 a 1"),
        ("page" = Option<u32>, Query, description = "Página a partir de 1"),
        ("pageSize" = Option<u32>, Query, description = "1 a 50; padrão 25")
    ),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Eventos e relações locais paginados", body = Object),
        (status = 400, description = "Filtro ou paginação inválidos"),
        (status = 401, description = "Token local ausente ou inválido"),
        (status = 500, description = "Falha ao consultar o banco local")
    )
)]
async fn market_events(
    State(state): State<ApiState>,
    Query(query): Query<MarketEventQuery>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    authorize(&headers, &state.token)?;
    let page = MarketQueryService::events(
        &state.database,
        query.event_type,
        query.country_code,
        query.asset_id,
        query.relation_type,
        query.minimum_confidence.unwrap_or(0.0),
        query.page.unwrap_or(1),
        query.page_size.unwrap_or(25),
    )
    .map_err(event_query_status)?;
    serialize_json(page)
}

#[utoipa::path(
    get,
    path = "/v1/relations",
    params(
        ("periodHours" = Option<u16>, Query, description = "1 a 720; padrão 168"),
        ("countryCode" = Option<String>, Query, description = "Código de país ou região em maiúsculas"),
        ("assetClass" = Option<String>, Query, description = "b3Equity, b3Fund, usEquity, usFund, crypto ou macro"),
        ("relationType" = Option<String>, Query, description = "known, correlation, hypothesis ou unproven_causality"),
        ("minimumConfidence" = Option<f64>, Query, description = "0 a 1"),
        ("page" = Option<u32>, Query, description = "Página a partir de 1"),
        ("pageSize" = Option<u32>, Query, description = "1 a 50; padrão 25")
    ),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Relações agregadas entre países, eventos e ativos", body = Object),
        (status = 400, description = "Filtro ou paginação inválidos"),
        (status = 401, description = "Token local ausente ou inválido"),
        (status = 500, description = "Falha ao consultar o banco local")
    )
)]
async fn market_relations(
    State(state): State<ApiState>,
    Query(query): Query<MarketRelationQuery>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    authorize(&headers, &state.token)?;
    let asset_class = query
        .asset_class
        .as_deref()
        .map(parse_asset_class)
        .transpose()?;
    let page = MarketQueryService::relations(
        &state.database,
        query.period_hours.unwrap_or(168),
        query.country_code,
        asset_class,
        query.relation_type,
        query.minimum_confidence.unwrap_or(0.5),
        query.page.unwrap_or(1),
        query.page_size.unwrap_or(25),
    )
    .map_err(event_query_status)?;
    serialize_json(page)
}

#[utoipa::path(
    get,
    path = "/v1/coverage-gaps",
    params(
        ("periodHours" = Option<u16>, Query, description = "1 a 720; padrão 24"),
        ("assetClass" = Option<String>, Query, description = "b3Equity, b3Fund, usEquity, usFund, crypto ou macro"),
        ("minimumMovementPercent" = Option<f64>, Query, description = "0.5 a 25; padrão 2"),
        ("maximumEvidenceCount" = Option<u8>, Query, description = "0 a 10; padrão 0"),
        ("page" = Option<u32>, Query, description = "Página a partir de 1"),
        ("pageSize" = Option<u32>, Query, description = "1 a 50; padrão 25")
    ),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Movimentos com baixa cobertura editorial", body = Object),
        (status = 400, description = "Filtro ou paginação inválidos"),
        (status = 401, description = "Token local ausente ou inválido"),
        (status = 500, description = "Falha ao consultar o banco local")
    )
)]
async fn coverage_gaps(
    State(state): State<ApiState>,
    Query(query): Query<CoverageGapQuery>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    authorize(&headers, &state.token)?;
    let asset_class = query
        .asset_class
        .as_deref()
        .map(parse_asset_class)
        .transpose()?;
    let page = CoverageQueryService::gaps(
        &state.database,
        query.period_hours.unwrap_or(24),
        asset_class,
        query.minimum_movement_percent.unwrap_or(2.0),
        query.maximum_evidence_count.unwrap_or(0),
        query.page.unwrap_or(1),
        query.page_size.unwrap_or(25),
    )
    .map_err(coverage_query_status)?;
    serialize_json(page)
}

#[utoipa::path(
    get,
    path = "/v1/historical-patterns",
    params(
        ("assetClass" = Option<String>, Query, description = "b3Equity, b3Fund, usEquity, usFund, crypto ou macro"),
        ("horizonDays" = Option<i64>, Query, description = "1, 7 ou 30; padrão 7"),
        ("outcome" = Option<String>, Query, description = "all, outperformed, underperformed ou insufficient"),
        ("minimumSampleSize" = Option<u32>, Query, description = "0 a 10000; padrão 0"),
        ("page" = Option<u32>, Query, description = "Página a partir de 1"),
        ("pageSize" = Option<u32>, Query, description = "1 a 50; padrão 25")
    ),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Resultados históricos comparáveis por ativo", body = Object),
        (status = 400, description = "Filtro ou paginação inválidos"),
        (status = 401, description = "Token local ausente ou inválido"),
        (status = 500, description = "Falha ao consultar o banco local")
    )
)]
async fn historical_patterns(
    State(state): State<ApiState>,
    Query(query): Query<HistoricalPatternQuery>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    authorize(&headers, &state.token)?;
    let asset_class = query
        .asset_class
        .as_deref()
        .map(parse_asset_class)
        .transpose()?;
    let page = HistoricalPatternQueryService::list(
        &state.database,
        asset_class,
        query.horizon_days.unwrap_or(7),
        query.outcome.unwrap_or_else(|| "all".to_owned()),
        query.minimum_sample_size.unwrap_or(0),
        query.page.unwrap_or(1),
        query.page_size.unwrap_or(25),
    )
    .map_err(historical_pattern_query_status)?;
    serialize_json(page)
}

#[utoipa::path(
    get,
    path = "/v1/signals/{signal_id}",
    params(("signal_id" = String, Path, description = "ID versionado do sinal")),
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Relatório auditável do sinal", body = Object),
        (status = 400, description = "ID de sinal inválido"),
        (status = 401),
        (status = 404)
    )
)]
async fn signal_report(
    State(state): State<ApiState>,
    Path(signal_id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    authorize(&headers, &state.token)?;
    if !valid_signal_id(&signal_id) {
        return Err(StatusCode::BAD_REQUEST);
    }
    let signal = InsightsQueryService::signal(&state.database, &signal_id)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    serde_json::to_value(signal)
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
    path = "/v1/alerts",
    params(("limit" = Option<usize>, Query, description = "1 a 200; padrão 50")),
    security(("bearerAuth" = [])),
    responses((status = 200, description = "Histórico local de alertas", body = [Object]), (status = 401))
)]
async fn alert_history(
    State(state): State<ApiState>,
    Query(query): Query<ListQuery>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    authorize(&headers, &state.token)?;
    let alerts = InsightsQueryService::alerts(&state.database, bounded_limit(query.limit, 50))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    serialize_json(alerts)
}

#[utoipa::path(
    get,
    path = "/v1/alert-history",
    params(
        ("alertLevel" = Option<u8>, Query, description = "Nível entre 1 e 4"),
        ("assetId" = Option<String>, Query, description = "ID local do ativo"),
        ("page" = Option<u32>, Query, description = "Página a partir de 1"),
        ("pageSize" = Option<u32>, Query, description = "1 a 50; padrão 10")
    ),
    security(("bearerAuth" = [])),
    responses((status = 200, description = "Histórico paginado de alertas", body = Object), (status = 400), (status = 401))
)]
async fn alert_history_page(
    State(state): State<ApiState>,
    Query(query): Query<AlertHistoryPageQuery>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    authorize(&headers, &state.token)?;
    if query
        .alert_level
        .is_some_and(|level| !(1..=4).contains(&level))
        || query
            .asset_id
            .as_deref()
            .is_some_and(|value| value.is_empty() || value.len() > 240)
    {
        return Err(StatusCode::BAD_REQUEST);
    }
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    if page == 0 || !(1..=50).contains(&page_size) {
        return Err(StatusCode::BAD_REQUEST);
    }
    let history = InsightsQueryService::alert_page(
        &state.database,
        query.alert_level,
        query.asset_id.as_deref(),
        page,
        page_size,
    )
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    serialize_json(history)
}

#[utoipa::path(
    get,
    path = "/v1/collections",
    params(("limit" = Option<usize>, Query, description = "1 a 200; padrão 50")),
    security(("bearerAuth" = [])),
    responses((status = 200, description = "Execuções de coleta e falhas por fonte", body = [Object]), (status = 401))
)]
async fn collection_history(
    State(state): State<ApiState>,
    Query(query): Query<ListQuery>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    authorize(&headers, &state.token)?;
    let collections =
        InsightsQueryService::collections(&state.database, bounded_limit(query.limit, 50))
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    serialize_json(collections)
}

#[utoipa::path(
    get,
    path = "/v1/collection-history",
    params(
        ("status" = Option<String>, Query, description = "running, completed, partial ou failed"),
        ("sourceId" = Option<String>, Query, description = "ID local da fonte"),
        ("page" = Option<u32>, Query, description = "Página a partir de 1"),
        ("pageSize" = Option<u32>, Query, description = "1 a 50; padrão 10")
    ),
    security(("bearerAuth" = [])),
    responses((status = 200, description = "Histórico operacional paginado", body = Object), (status = 400), (status = 401))
)]
async fn collection_history_page(
    State(state): State<ApiState>,
    Query(query): Query<CollectionHistoryPageQuery>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    authorize(&headers, &state.token)?;
    if query
        .status
        .as_deref()
        .is_some_and(|status| !["running", "completed", "partial", "failed"].contains(&status))
    {
        return Err(StatusCode::BAD_REQUEST);
    }
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    if page == 0 || !(1..=50).contains(&page_size) {
        return Err(StatusCode::BAD_REQUEST);
    }
    let history = InsightsQueryService::collection_page(
        &state.database,
        query.status.as_deref(),
        query.source_id.as_deref(),
        page,
        page_size,
    )
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    serialize_json(history)
}

#[utoipa::path(
    get,
    path = "/v1/backtests",
    params(
        ("assetId" = Option<String>, Query, description = "ID local do ativo"),
        ("limit" = Option<usize>, Query, description = "1 a 200; padrão 25")
    ),
    security(("bearerAuth" = [])),
    responses((status = 200, description = "Histórico de backtests", body = [Object]), (status = 401))
)]
async fn backtest_history(
    State(state): State<ApiState>,
    Query(query): Query<BacktestHistoryQuery>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    authorize(&headers, &state.token)?;
    let reports = InsightsQueryService::backtests(
        &state.database,
        query.asset_id.as_deref(),
        bounded_limit(query.limit, 25),
    )
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    serialize_json(reports)
}

#[utoipa::path(
    get,
    path = "/v1/backtest-history",
    params(
        ("assetId" = Option<String>, Query, description = "ID local do ativo"),
        ("page" = Option<u32>, Query, description = "Página a partir de 1"),
        ("pageSize" = Option<u32>, Query, description = "1 a 50; padrão 10")
    ),
    security(("bearerAuth" = [])),
    responses((status = 200, description = "Histórico paginado de backtests", body = Object), (status = 400), (status = 401))
)]
async fn backtest_history_page(
    State(state): State<ApiState>,
    Query(query): Query<BacktestHistoryPageQuery>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    authorize(&headers, &state.token)?;
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    if page == 0 || !(1..=50).contains(&page_size) {
        return Err(StatusCode::BAD_REQUEST);
    }
    let reports = InsightsQueryService::backtest_page(
        &state.database,
        query.asset_id.as_deref(),
        page,
        page_size,
    )
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    serialize_json(reports)
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

#[utoipa::path(
    get,
    path = "/v1/calibration-readiness",
    security(("bearerAuth" = [])),
    responses(
        (status = 200, description = "Prontidão operacional dos ativos monitorados", body = Object),
        (status = 401)
    )
)]
async fn calibration_readiness(
    State(state): State<ApiState>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    authorize(&headers, &state.token)?;
    let overview = InsightsQueryService::calibration_readiness(&state.database)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    serialize_json(overview)
}

#[utoipa::path(
    get,
    path = "/v1/report-overview",
    security(("bearerAuth" = [])),
    responses((status = 200, description = "Totais e versões do histórico local", body = Object), (status = 401))
)]
async fn report_overview(
    State(state): State<ApiState>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    authorize(&headers, &state.token)?;
    let overview = ReportQueryService::overview(&state.database)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    serialize_json(overview)
}

#[utoipa::path(
    get,
    path = "/v1/jev/usage",
    security(("bearerAuth" = [])),
    responses((status = 200, description = "Limites e uso local do Jev", body = Object), (status = 401))
)]
async fn jev_usage(
    State(state): State<ApiState>,
    headers: HeaderMap,
) -> Result<Json<Value>, StatusCode> {
    authorize(&headers, &state.token)?;
    let usage = InsightsQueryService::jev_usage(&state.database)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    serialize_json(usage)
}

fn serialize_json(value: impl Serialize) -> Result<Json<Value>, StatusCode> {
    serde_json::to_value(value)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

fn content_query_status(error: ContentSourceManagementError) -> StatusCode {
    match error {
        ContentSourceManagementError::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
        _ => StatusCode::BAD_REQUEST,
    }
}

fn event_query_status(error: MarketEventQueryError) -> StatusCode {
    match error {
        MarketEventQueryError::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
        _ => StatusCode::BAD_REQUEST,
    }
}

fn signal_explorer_query_status(error: SignalExplorerQueryError) -> StatusCode {
    match error {
        SignalExplorerQueryError::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
        SignalExplorerQueryError::InvalidFilter => StatusCode::BAD_REQUEST,
    }
}

fn asset_detail_query_status(error: AssetDetailQueryError) -> StatusCode {
    match error {
        AssetDetailQueryError::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
        AssetDetailQueryError::InvalidFilter => StatusCode::BAD_REQUEST,
    }
}

fn comparison_query_status(error: ComparisonQueryError) -> StatusCode {
    match error {
        ComparisonQueryError::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
        ComparisonQueryError::InvalidFilter => StatusCode::BAD_REQUEST,
    }
}

fn coverage_query_status(error: CoverageGapQueryError) -> StatusCode {
    match error {
        CoverageGapQueryError::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
        _ => StatusCode::BAD_REQUEST,
    }
}

fn historical_pattern_query_status(error: HistoricalPatternQueryError) -> StatusCode {
    match error {
        HistoricalPatternQueryError::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
        _ => StatusCode::BAD_REQUEST,
    }
}

fn parse_asset_class(value: &str) -> Result<AssetClass, StatusCode> {
    match value {
        "b3Equity" => Ok(AssetClass::B3Equity),
        "b3Fund" => Ok(AssetClass::B3Fund),
        "usEquity" => Ok(AssetClass::UsEquity),
        "usFund" => Ok(AssetClass::UsFund),
        "crypto" => Ok(AssetClass::Crypto),
        "macro" => Ok(AssetClass::Macro),
        _ => Err(StatusCode::BAD_REQUEST),
    }
}

fn bounded_limit(value: Option<usize>, default: usize) -> usize {
    value.unwrap_or(default).clamp(1, 200)
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
    use std::sync::Arc;

    use axum::http::{HeaderMap, HeaderValue, header};
    use tempfile::tempdir;
    use utoipa::OpenApi;

    use super::{
        ApiDoc, asset_detail_query_status, authorize, bounded_limit, build_router,
        comparison_query_status, content_query_status, valid_signal_id,
    };
    use crate::application::comparison_query_service::ComparisonQueryError;
    use crate::application::content_query_service::ContentSourceManagementError;
    use crate::application::market_query_service::AssetDetailQueryError;
    use crate::infrastructure::database::DatabaseError;

    #[test]
    fn serves_swagger_and_protects_read_models_over_real_http() {
        let temporary_directory = tempdir().expect("diretório temporário");
        let database = Arc::new(
            crate::infrastructure::database::Database::open(
                temporary_directory.path().join("local-api.sqlite3"),
            )
            .expect("banco da API local"),
        );
        let runtime = tokio::runtime::Runtime::new().expect("runtime Tokio");
        let listener = runtime
            .block_on(tokio::net::TcpListener::bind("127.0.0.1:0"))
            .expect("porta local efêmera");
        let address = listener.local_addr().expect("endereço local");
        let server = runtime.spawn(async move {
            axum::serve(
                listener,
                build_router(database, "integration-token".to_owned()),
            )
            .await
            .expect("servidor da API local");
        });
        let client = reqwest::blocking::Client::builder()
            .redirect(reqwest::redirect::Policy::limited(2))
            .build()
            .expect("cliente HTTP");
        let base_url = format!("http://{address}");

        let health = client
            .get(format!("{base_url}/health"))
            .send()
            .expect("health da API local");
        assert_eq!(health.status(), reqwest::StatusCode::OK);
        assert_eq!(
            health.json::<serde_json::Value>().expect("health JSON")["status"],
            "ready"
        );

        let docs = client
            .get(format!("{base_url}/docs/"))
            .send()
            .expect("Swagger UI");
        assert_eq!(docs.status(), reqwest::StatusCode::OK);
        assert!(
            docs.headers()
                .get(reqwest::header::CONTENT_TYPE)
                .and_then(|value| value.to_str().ok())
                .is_some_and(|value| value.starts_with("text/html"))
        );
        assert!(docs.text().expect("HTML do Swagger").contains("<html"));

        let openapi = client
            .get(format!("{base_url}/openapi.json"))
            .send()
            .expect("OpenAPI JSON");
        assert_eq!(openapi.status(), reqwest::StatusCode::OK);
        let openapi = openapi.json::<serde_json::Value>().expect("OpenAPI válido");
        assert_eq!(openapi["info"]["title"], "jevradar");
        assert!(openapi["components"]["securitySchemes"]["bearerAuth"].is_object());

        let unauthorized = client
            .get(format!("{base_url}/v1/market"))
            .send()
            .expect("requisição sem token");
        assert_eq!(unauthorized.status(), reqwest::StatusCode::UNAUTHORIZED);

        let authorized = client
            .get(format!("{base_url}/v1/market"))
            .bearer_auth("integration-token")
            .send()
            .expect("requisição autenticada");
        assert_eq!(authorized.status(), reqwest::StatusCode::OK);

        server.abort();
        runtime.block_on(async {
            let _ = server.await;
        });
    }

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
        for path in [
            "/v1/assets/{asset_id}/overview",
            "/v1/comparison",
            "/v1/signal-explorer",
            "/v1/sources/{source_id}",
            "/v1/signals/{signal_id}",
            "/v1/documents",
            "/v1/events",
            "/v1/relations",
            "/v1/coverage-gaps",
            "/v1/historical-patterns",
            "/v1/alerts",
            "/v1/alert-history",
            "/v1/collections",
            "/v1/collection-history",
            "/v1/backtests",
            "/v1/backtest-history",
            "/v1/calibration-readiness",
            "/v1/report-overview",
            "/v1/jev/usage",
        ] {
            assert!(
                document.paths.paths.contains_key(path),
                "rota ausente: {path}"
            );
        }
        assert_eq!(bounded_limit(None, 25), 25);
        assert_eq!(bounded_limit(Some(0), 25), 1);
        assert_eq!(bounded_limit(Some(999), 25), 200);
    }

    #[test]
    fn maps_asset_detail_input_and_database_failures_without_leaking_details() {
        assert_eq!(
            asset_detail_query_status(AssetDetailQueryError::InvalidFilter),
            axum::http::StatusCode::BAD_REQUEST
        );
        assert_eq!(
            asset_detail_query_status(AssetDetailQueryError::Database(DatabaseError::Sqlite(
                rusqlite::Error::InvalidQuery,
            ))),
            axum::http::StatusCode::INTERNAL_SERVER_ERROR
        );
    }

    #[test]
    fn maps_comparison_input_and_database_failures_without_leaking_details() {
        assert_eq!(
            comparison_query_status(ComparisonQueryError::InvalidFilter),
            axum::http::StatusCode::BAD_REQUEST
        );
        assert_eq!(
            comparison_query_status(ComparisonQueryError::Database(DatabaseError::Sqlite(
                rusqlite::Error::InvalidQuery,
            ))),
            axum::http::StatusCode::INTERNAL_SERVER_ERROR
        );
    }

    #[test]
    fn maps_source_detail_input_and_database_failures_without_leaking_details() {
        assert_eq!(
            content_query_status(ContentSourceManagementError::InvalidSourceId),
            axum::http::StatusCode::BAD_REQUEST
        );
        assert_eq!(
            content_query_status(ContentSourceManagementError::Database(
                DatabaseError::Sqlite(rusqlite::Error::InvalidQuery),
            )),
            axum::http::StatusCode::INTERNAL_SERVER_ERROR
        );
    }
}
