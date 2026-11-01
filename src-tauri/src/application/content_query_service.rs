use crate::domain::content::{ContentOverview, DocumentFeedPage};
use crate::infrastructure::database::{Database, DatabaseError};
use reqwest::Url;
use sha2::{Digest, Sha256};

#[derive(Debug, thiserror::Error)]
pub enum ContentSourceManagementError {
    #[error("nome da fonte inválido")]
    InvalidName,
    #[error("a URL precisa usar HTTPS")]
    InvalidUrl,
    #[error("tipo de fonte personalizada inválido")]
    InvalidSourceKind,
    #[error("identificador da fonte inválido")]
    InvalidSourceId,
    #[error("consulta do feed inválida")]
    InvalidFeedQuery,
    #[error("filtro do feed inválido")]
    InvalidFeedFilter,
    #[error("paginação do feed inválida")]
    InvalidFeedPagination,
    #[error(transparent)]
    Database(#[from] DatabaseError),
}

pub struct ContentQueryService;

impl ContentQueryService {
    pub fn overview(database: &Database) -> Result<ContentOverview, DatabaseError> {
        database.content_overview()
    }

    pub fn source_detail(
        database: &Database,
        source_id: &str,
    ) -> Result<Option<crate::domain::content::ContentSourceStatus>, ContentSourceManagementError>
    {
        if !valid_source_id(source_id) {
            return Err(ContentSourceManagementError::InvalidSourceId);
        }
        database
            .content_source_detail(source_id)
            .map_err(Into::into)
    }

    pub fn set_source_enabled(
        database: &Database,
        source_id: &str,
        enabled: bool,
    ) -> Result<ContentOverview, DatabaseError> {
        database.set_content_source_enabled(source_id, enabled)?;
        database.content_overview()
    }

    pub fn add_feed_source(
        database: &Database,
        name: &str,
        url: &str,
        source_kind: &str,
    ) -> Result<ContentOverview, ContentSourceManagementError> {
        let name = name.trim();
        if !(2..=80).contains(&name.chars().count()) {
            return Err(ContentSourceManagementError::InvalidName);
        }
        if !["rss", "forum"].contains(&source_kind) {
            return Err(ContentSourceManagementError::InvalidSourceKind);
        }
        let parsed =
            Url::parse(url.trim()).map_err(|_| ContentSourceManagementError::InvalidUrl)?;
        if parsed.scheme() != "https" || parsed.host_str().is_none() {
            return Err(ContentSourceManagementError::InvalidUrl);
        }
        let digest = format!("{:x}", Sha256::digest(parsed.as_str().as_bytes()));
        let id = format!("source:custom:{source_kind}:{}", &digest[..16]);
        database.upsert_custom_feed_source(&id, name, parsed.as_str(), source_kind)?;
        database.content_overview().map_err(Into::into)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn document_feed(
        database: &Database,
        query: Option<String>,
        source_kind: Option<String>,
        content_type: Option<String>,
        sentiment: Option<String>,
        analysis_status: Option<String>,
        asset_id: Option<String>,
        minimum_confidence: f64,
        page: u32,
        page_size: u32,
    ) -> Result<DocumentFeedPage, ContentSourceManagementError> {
        let query = query.map(|value| value.trim().to_owned());
        if query
            .as_ref()
            .is_some_and(|value| value.chars().count() > 100)
        {
            return Err(ContentSourceManagementError::InvalidFeedQuery);
        }
        if !minimum_confidence.is_finite() || !(0.0..=1.0).contains(&minimum_confidence) {
            return Err(ContentSourceManagementError::InvalidFeedFilter);
        }
        validate_optional_filter(source_kind.as_deref(), &["rss", "reddit", "forum", "x"])?;
        validate_optional_filter(
            content_type.as_deref(),
            &[
                "news",
                "opinion",
                "technical_analysis",
                "meme",
                "spam",
                "uncertain",
            ],
        )?;
        validate_optional_filter(
            sentiment.as_deref(),
            &["optimistic", "pessimistic", "neutral", "uncertain"],
        )?;
        validate_optional_filter(
            analysis_status.as_deref(),
            &["pending", "classified", "no_asset"],
        )?;
        if asset_id.as_ref().is_some_and(|value| value.len() > 120) {
            return Err(ContentSourceManagementError::InvalidFeedFilter);
        }
        if page == 0 || !(1..=50).contains(&page_size) {
            return Err(ContentSourceManagementError::InvalidFeedPagination);
        }
        let offset = page
            .checked_sub(1)
            .and_then(|value| value.checked_mul(page_size))
            .ok_or(ContentSourceManagementError::InvalidFeedPagination)?;
        let (items, total_items) = database.list_document_feed_page(
            query.as_deref().filter(|value| !value.is_empty()),
            source_kind.as_deref(),
            content_type.as_deref(),
            sentiment.as_deref(),
            analysis_status.as_deref(),
            asset_id.as_deref().filter(|value| !value.is_empty()),
            minimum_confidence,
            page_size,
            offset,
        )?;

        Ok(DocumentFeedPage {
            items,
            page,
            page_size,
            total_items,
            total_pages: total_items.div_ceil(u64::from(page_size)).max(1) as u32,
        })
    }
}

fn validate_optional_filter(
    value: Option<&str>,
    allowed: &[&str],
) -> Result<(), ContentSourceManagementError> {
    if value.is_some_and(|candidate| !allowed.contains(&candidate)) {
        return Err(ContentSourceManagementError::InvalidFeedFilter);
    }
    Ok(())
}

fn valid_source_id(value: &str) -> bool {
    value.starts_with("source:")
        && value.len() <= 120
        && value
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || ":+-_.".contains(character))
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::{ContentQueryService, ContentSourceManagementError};
    use crate::domain::classification::DocumentAnalysisResult;
    use crate::domain::content::SourceDocumentInput;
    use crate::infrastructure::database::Database;

    fn database() -> Database {
        let directory = tempdir().expect("diretório temporário");
        Database::open(directory.keep().join("content-feed.sqlite3")).expect("banco inicializado")
    }

    fn document(id: &str, title: &str, text: &str, published_at: &str) -> SourceDocumentInput {
        SourceDocumentInput {
            id: id.to_owned(),
            source_id: "source:rss:agencia-brasil-economia".to_owned(),
            external_id: id.to_owned(),
            canonical_url: Some(format!("https://example.com/{id}")),
            title: Some(title.to_owned()),
            raw_text: text.to_owned(),
            author_reference: Some("identificador-que-nao-deve-sair".to_owned()),
            language: Some("pt-BR".to_owned()),
            published_at: published_at.to_owned(),
            collected_at: published_at.to_owned(),
            content_hash: format!("hash-{id}"),
            retention_expires_at: None,
        }
    }

    #[test]
    fn paginates_and_filters_the_local_document_feed() {
        let database = database();
        database
            .store_source_documents(&[
                document(
                    "document:classified",
                    "Petrobras divulga produção",
                    "A companhia publicou dados operacionais.",
                    "2026-11-01T12:00:00Z",
                ),
                document(
                    "document:pending",
                    "Vale aguarda classificação",
                    "Documento ainda não enviado ao Jev.",
                    "2026-11-01T11:00:00Z",
                ),
            ])
            .expect("documentos armazenados");
        database
            .store_document_analysis(&DocumentAnalysisResult {
                document_id: "document:classified".to_owned(),
                model_name: "system-one".to_owned(),
                model_version: "jev-test".to_owned(),
                question_version: "questions-test".to_owned(),
                asset_present_probability: 0.98,
                selected_asset_id: Some("asset:b3:PETR4".to_owned()),
                selected_asset_confidence: Some(0.96),
                sentiment: "optimistic".to_owned(),
                sentiment_probability: 0.88,
                relevance_expected: 2.7,
                relevance_score: 3,
                content_type: "news".to_owned(),
                hype_probability: 0.05,
                factual_claim_probability: 0.94,
                confidence: 0.91,
                input_language: Some("pt-BR".to_owned()),
                analyzed_at: "2026-11-01T12:01:00Z".to_owned(),
                input_tokens: 120,
                output_tokens: 24,
                event: None,
            })
            .expect("análise armazenada");

        let page = ContentQueryService::document_feed(
            &database, None, None, None, None, None, None, 0.0, 1, 25,
        )
        .expect("feed completo");
        assert_eq!(page.total_items, 2);
        assert_eq!(page.items[0].analysis_status, "classified");
        assert_eq!(
            page.items[0]
                .asset
                .as_ref()
                .map(|asset| asset.symbol.as_str()),
            Some("PETR4")
        );
        assert_eq!(page.items[1].analysis_status, "pending");

        let filtered = ContentQueryService::document_feed(
            &database,
            Some("Petrobras".to_owned()),
            Some("rss".to_owned()),
            Some("news".to_owned()),
            Some("optimistic".to_owned()),
            Some("classified".to_owned()),
            Some("asset:b3:PETR4".to_owned()),
            0.9,
            1,
            25,
        )
        .expect("feed filtrado");
        assert_eq!(filtered.total_items, 1);
        assert_eq!(filtered.items[0].content_type.as_deref(), Some("news"));
        assert!(
            !filtered.items[0]
                .excerpt
                .contains("identificador-que-nao-deve-sair")
        );
    }

    #[test]
    fn rejects_unknown_filters_and_unbounded_pages() {
        let database = database();
        let invalid_filter = ContentQueryService::document_feed(
            &database,
            None,
            Some("scraper_desconhecido".to_owned()),
            None,
            None,
            None,
            None,
            0.0,
            1,
            25,
        )
        .expect_err("filtro desconhecido deve falhar");
        assert!(matches!(
            invalid_filter,
            ContentSourceManagementError::InvalidFeedFilter
        ));

        let invalid_page = ContentQueryService::document_feed(
            &database, None, None, None, None, None, None, 0.0, 0, 100,
        )
        .expect_err("paginação sem limite deve falhar");
        assert!(matches!(
            invalid_page,
            ContentSourceManagementError::InvalidFeedPagination
        ));
    }

    #[test]
    fn registers_public_forum_feeds_without_enabling_generic_scraping() {
        let database = database();
        let overview = ContentQueryService::add_feed_source(
            &database,
            "Fórum de investidores",
            "https://forum.example.com/latest.rss",
            "forum",
        )
        .expect("fórum com feed público");
        let source = overview
            .sources
            .iter()
            .find(|source| source.name == "Fórum de investidores")
            .expect("fonte cadastrada");
        assert_eq!(source.source_kind, "forum");
        assert_eq!(source.collection_method, "rss");
        assert!(source.user_managed);

        let invalid = ContentQueryService::add_feed_source(
            &database,
            "Scraper genérico",
            "https://example.com/page",
            "scraper",
        )
        .expect_err("scraper genérico não deve ser aceito");
        assert!(matches!(
            invalid,
            ContentSourceManagementError::InvalidSourceKind
        ));
    }

    #[test]
    fn returns_one_source_without_loading_the_full_overview() {
        let database = database();
        let source =
            ContentQueryService::source_detail(&database, "source:rss:agencia-brasil-economia")
                .expect("consulta válida")
                .expect("fonte inicial existente");
        assert_eq!(source.source_kind, "rss");
        assert_eq!(source.document_count, 0);

        let missing = ContentQueryService::source_detail(&database, "source:rss:inexistente")
            .expect("ausência não é falha");
        assert!(missing.is_none());

        let invalid = ContentQueryService::source_detail(&database, "source:<script>")
            .expect_err("identificador inseguro deve falhar");
        assert!(matches!(
            invalid,
            ContentSourceManagementError::InvalidSourceId
        ));
    }
}
