use chrono::{Duration, TimeZone, Utc};
use feed_rs::parser;
use reqwest::blocking::Client;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use thiserror::Error;

use crate::domain::content::{ContentSource, SourceDocumentInput};

const MAX_DOCUMENT_CHARS: usize = 8_000;
const REDDIT_SOURCE_ID: &str = "source:reddit";
const X_SOURCE_ID: &str = "source:x";
const REDDIT_COMMUNITIES: &str = "investimentos+farialimabets+stocks+SecurityAnalysis+CryptoCurrency+Bitcoin+ethereum+economics+geopolitics";

#[derive(Debug, Error)]
pub enum ContentProviderError {
    #[error("a fonte não concluiu a requisição")]
    Request,
    #[error("a fonte retornou conteúdo inválido")]
    InvalidPayload,
    #[error("a fonte não possui endereço configurado")]
    MissingUrl,
}

impl ContentProviderError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Request => "content_request_failed",
            Self::InvalidPayload => "content_invalid_payload",
            Self::MissingUrl => "content_source_url_missing",
        }
    }
}

pub fn collect_rss(
    client: &Client,
    source: &ContentSource,
) -> Result<Vec<SourceDocumentInput>, ContentProviderError> {
    let url = source
        .base_url
        .as_deref()
        .ok_or(ContentProviderError::MissingUrl)?;
    let bytes = client
        .get(url)
        .send()
        .and_then(reqwest::blocking::Response::error_for_status)
        .map_err(|_| ContentProviderError::Request)?
        .bytes()
        .map_err(|_| ContentProviderError::Request)?;
    let feed = parser::parse(bytes.as_ref()).map_err(|_| ContentProviderError::InvalidPayload)?;
    let collected_at = Utc::now().to_rfc3339();

    Ok(feed
        .entries
        .into_iter()
        .take(50)
        .filter_map(|entry| {
            let title = entry.title.map(|value| normalize_text(&value.content));
            let body = entry
                .summary
                .map(|value| value.content)
                .or_else(|| entry.content.and_then(|value| value.body))
                .unwrap_or_default();
            let raw_text = truncate_text(
                &normalize_text(&format!(
                    "{}\n{}",
                    title.as_deref().unwrap_or_default(),
                    body
                )),
                MAX_DOCUMENT_CHARS,
            );
            if raw_text.is_empty() {
                return None;
            }
            let published_at = entry
                .published
                .or(entry.updated)
                .unwrap_or_else(Utc::now)
                .to_rfc3339();
            let canonical_url = entry
                .links
                .iter()
                .find(|link| link.rel.as_deref() == Some("alternate"))
                .or_else(|| entry.links.first())
                .map(|link| link.href.clone());
            let external_id = if entry.id.trim().is_empty() {
                canonical_url
                    .clone()
                    .unwrap_or_else(|| content_hash(&raw_text))
            } else {
                entry.id
            };
            let author_reference = entry.authors.first().and_then(|author| author.name.clone());
            Some(SourceDocumentInput {
                id: document_id(&source.id, &external_id),
                source_id: source.id.clone(),
                external_id,
                canonical_url,
                title,
                raw_text: raw_text.clone(),
                author_reference,
                language: None,
                published_at,
                collected_at: collected_at.clone(),
                content_hash: content_hash(&raw_text),
                retention_expires_at: None,
            })
        })
        .collect())
}

pub fn collect_reddit(
    client: &Client,
    client_id: &str,
    client_secret: &str,
) -> Result<Vec<SourceDocumentInput>, ContentProviderError> {
    let token = client
        .post("https://www.reddit.com/api/v1/access_token")
        .basic_auth(client_id, Some(client_secret))
        .form(&[("grant_type", "client_credentials")])
        .send()
        .and_then(reqwest::blocking::Response::error_for_status)
        .map_err(|_| ContentProviderError::Request)?
        .json::<RedditToken>()
        .map_err(|_| ContentProviderError::InvalidPayload)?;
    let url = format!("https://oauth.reddit.com/r/{REDDIT_COMMUNITIES}/new");
    let listing = client
        .get(url)
        .bearer_auth(token.access_token)
        .query(&[("limit", "100"), ("raw_json", "1")])
        .send()
        .and_then(reqwest::blocking::Response::error_for_status)
        .map_err(|_| ContentProviderError::Request)?
        .json::<RedditListing>()
        .map_err(|_| ContentProviderError::InvalidPayload)?;
    let collected_at = Utc::now();
    let retention_expires_at = (collected_at + Duration::days(30)).to_rfc3339();

    listing
        .data
        .children
        .into_iter()
        .map(|child| {
            let post = child.data;
            let raw_text = truncate_text(
                &normalize_text(&format!("{}\n{}", post.title, post.selftext)),
                MAX_DOCUMENT_CHARS,
            );
            let published_at = Utc
                .timestamp_opt(post.created_utc as i64, 0)
                .single()
                .ok_or(ContentProviderError::InvalidPayload)?
                .to_rfc3339();
            let canonical_url = Some(format!("https://www.reddit.com{}", post.permalink));
            Ok(SourceDocumentInput {
                id: document_id(REDDIT_SOURCE_ID, &post.name),
                source_id: REDDIT_SOURCE_ID.to_owned(),
                external_id: post.name,
                canonical_url,
                title: Some(post.title),
                raw_text: raw_text.clone(),
                author_reference: Some(post.author),
                language: None,
                published_at,
                collected_at: collected_at.to_rfc3339(),
                content_hash: content_hash(&raw_text),
                retention_expires_at: Some(retention_expires_at.clone()),
            })
        })
        .collect()
}

pub fn collect_x(
    client: &Client,
    bearer_token: &str,
    query: &str,
) -> Result<Vec<SourceDocumentInput>, ContentProviderError> {
    let response = client
        .get("https://api.x.com/2/tweets/search/recent")
        .bearer_auth(bearer_token)
        .query(&[
            ("query", query),
            ("tweet.fields", "created_at,author_id,lang"),
            ("max_results", "100"),
        ])
        .send()
        .and_then(reqwest::blocking::Response::error_for_status)
        .map_err(|_| ContentProviderError::Request)?
        .json::<XSearchResponse>()
        .map_err(|_| ContentProviderError::InvalidPayload)?;
    let collected_at = Utc::now();
    let retention_expires_at = (collected_at + Duration::days(30)).to_rfc3339();

    Ok(response
        .data
        .unwrap_or_default()
        .into_iter()
        .filter_map(|post| {
            let raw_text = truncate_text(&normalize_text(&post.text), MAX_DOCUMENT_CHARS);
            if raw_text.is_empty() {
                return None;
            }
            Some(SourceDocumentInput {
                id: document_id(X_SOURCE_ID, &post.id),
                source_id: X_SOURCE_ID.to_owned(),
                external_id: post.id.clone(),
                canonical_url: Some(format!("https://x.com/i/web/status/{}", post.id)),
                title: None,
                raw_text: raw_text.clone(),
                author_reference: post.author_id,
                language: post.lang,
                published_at: post.created_at.unwrap_or_else(|| collected_at.to_rfc3339()),
                collected_at: collected_at.to_rfc3339(),
                content_hash: content_hash(&raw_text),
                retention_expires_at: Some(retention_expires_at.clone()),
            })
        })
        .collect())
}

fn normalize_text(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn truncate_text(value: &str, max_chars: usize) -> String {
    value.chars().take(max_chars).collect()
}

fn content_hash(value: &str) -> String {
    format!("{:x}", Sha256::digest(value.as_bytes()))
}

fn document_id(source_id: &str, external_id: &str) -> String {
    let digest = Sha256::digest(format!("{source_id}:{external_id}").as_bytes());
    format!("document:{digest:x}")
}

#[derive(Debug, Deserialize)]
struct RedditToken {
    access_token: String,
}

#[derive(Debug, Deserialize)]
struct RedditListing {
    data: RedditListingData,
}

#[derive(Debug, Deserialize)]
struct RedditListingData {
    children: Vec<RedditChild>,
}

#[derive(Debug, Deserialize)]
struct RedditChild {
    data: RedditPost,
}

#[derive(Debug, Deserialize)]
struct RedditPost {
    name: String,
    title: String,
    #[serde(default)]
    selftext: String,
    author: String,
    permalink: String,
    created_utc: f64,
}

#[derive(Debug, Deserialize)]
struct XSearchResponse {
    data: Option<Vec<XPost>>,
}

#[derive(Debug, Deserialize)]
struct XPost {
    id: String,
    text: String,
    created_at: Option<String>,
    author_id: Option<String>,
    lang: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::{content_hash, normalize_text, truncate_text};

    #[test]
    fn normalizes_and_bounds_untrusted_content() {
        assert_eq!(normalize_text("  Petrobras\n\t sobe  "), "Petrobras sobe");
        assert_eq!(truncate_text("abcdef", 4), "abcd");
        assert_eq!(content_hash("same"), content_hash("same"));
        assert_ne!(content_hash("same"), content_hash("different"));
    }
}
