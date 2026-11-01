use serde::{Deserialize, Serialize};
use std::collections::HashSet;

pub const DEFAULT_REDDIT_COMMUNITIES: &[&str] = &[
    "investimentos",
    "BogleheadsBrasil",
    "BrasilBitcoin",
    "farialimabets",
    "stocks",
    "SecurityAnalysis",
    "CryptoCurrency",
    "Bitcoin",
    "ethereum",
    "economics",
    "geopolitics",
];

pub fn default_reddit_communities() -> Vec<String> {
    DEFAULT_REDDIT_COMMUNITIES
        .iter()
        .map(|value| (*value).to_owned())
        .collect()
}

pub fn valid_reddit_communities(communities: &[String]) -> bool {
    if communities.is_empty() || communities.len() > 25 {
        return false;
    }
    let mut unique_communities = HashSet::new();
    communities.iter().all(|community| {
        (2..=21).contains(&community.len())
            && community
                .chars()
                .all(|character| character.is_ascii_alphanumeric() || character == '_')
            && unique_communities.insert(community.to_ascii_lowercase())
    })
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum CloseBehavior {
    Ask,
    Minimize,
    Quit,
}

impl CloseBehavior {
    pub fn as_storage_value(self) -> &'static str {
        match self {
            Self::Ask => "ask",
            Self::Minimize => "minimize",
            Self::Quit => "quit",
        }
    }

    pub fn from_storage_value(value: &str) -> Self {
        match value {
            "minimize" => Self::Minimize,
            "quit" => Self::Quit,
            _ => Self::Ask,
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub setup_completed: bool,
    pub language: String,
    pub background_collection_enabled: bool,
    pub launch_on_startup_enabled: bool,
    pub close_behavior: CloseBehavior,
    pub local_api_enabled: bool,
    pub alert_level: u8,
    pub alerts_enabled: bool,
    pub alert_window_hours: u16,
    pub alert_quiet_hours_enabled: bool,
    pub alert_quiet_start: String,
    pub alert_quiet_end: String,
    pub alert_asset_ids: Vec<String>,
    pub alert_source_ids: Vec<String>,
    pub reddit_communities: Vec<String>,
    pub watchlist_limit: u8,
    pub jev_batch_limit: u8,
    pub jev_daily_document_limit: u16,
    pub experience_level: String,
    pub investment_range: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAppSettings {
    pub setup_completed: bool,
    pub language: String,
    pub background_collection_enabled: bool,
    pub launch_on_startup_enabled: bool,
    pub close_behavior: CloseBehavior,
    pub local_api_enabled: bool,
    pub alert_level: u8,
    pub alerts_enabled: bool,
    pub alert_window_hours: u16,
    pub alert_quiet_hours_enabled: bool,
    pub alert_quiet_start: String,
    pub alert_quiet_end: String,
    pub alert_asset_ids: Vec<String>,
    pub alert_source_ids: Vec<String>,
    pub reddit_communities: Vec<String>,
    pub watchlist_limit: u8,
    pub jev_batch_limit: u8,
    pub jev_daily_document_limit: u16,
    pub experience_level: String,
    pub investment_range: String,
}

impl UpdateAppSettings {
    pub fn validate(&self) -> Result<(), &'static str> {
        if !matches!(self.language.as_str(), "pt-BR" | "en") {
            return Err("idioma não suportado");
        }
        if !(1..=4).contains(&self.alert_level) {
            return Err("nível de alerta deve estar entre 1 e 4");
        }
        if !(1..=720).contains(&self.alert_window_hours) {
            return Err("janela de alertas deve estar entre 1 e 720 horas");
        }
        if !valid_clock_time(&self.alert_quiet_start) || !valid_clock_time(&self.alert_quiet_end) {
            return Err("horário silencioso deve usar HH:MM");
        }
        if self.alert_asset_ids.len() > 50 || self.alert_source_ids.len() > 100 {
            return Err("filtros de alerta excedem o limite suportado");
        }
        if self
            .alert_asset_ids
            .iter()
            .any(|id| !id.starts_with("asset:"))
            || self
                .alert_source_ids
                .iter()
                .any(|id| !id.starts_with("source:"))
        {
            return Err("identificador de filtro de alerta inválido");
        }
        if self.reddit_communities.is_empty() || self.reddit_communities.len() > 25 {
            return Err("configure entre 1 e 25 comunidades do Reddit");
        }
        if !valid_reddit_communities(&self.reddit_communities) {
            return Err("comunidade do Reddit inválida ou duplicada");
        }
        if !(1..=50).contains(&self.watchlist_limit) {
            return Err("limite da watchlist deve estar entre 1 e 50");
        }
        if !(1..=100).contains(&self.jev_batch_limit) {
            return Err("limite por lote do Jev deve estar entre 1 e 100");
        }
        if !(1..=5000).contains(&self.jev_daily_document_limit) {
            return Err("limite diário do Jev deve estar entre 1 e 5000");
        }
        if !matches!(
            self.experience_level.as_str(),
            "beginner" | "intermediate" | "advanced"
        ) {
            return Err("nível de experiência inválido");
        }
        if !matches!(
            self.investment_range.as_str(),
            "undisclosed" | "upTo5k" | "from5kTo20k" | "from20kTo100k" | "above100k"
        ) {
            return Err("faixa investida inválida");
        }
        Ok(())
    }
}

fn valid_clock_time(value: &str) -> bool {
    let mut parts = value.split(':');
    let hour = parts.next().and_then(|part| part.parse::<u8>().ok());
    let minute = parts.next().and_then(|part| part.parse::<u8>().ok());
    parts.next().is_none()
        && hour.is_some_and(|value| value < 24)
        && minute.is_some_and(|value| value < 60)
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SecretKind {
    TypesafeApiKey,
    RedditClientId,
    RedditClientSecret,
    XBearerToken,
    BrapiToken,
    LocalApiToken,
}

impl SecretKind {
    pub fn account_name(self) -> &'static str {
        match self {
            Self::TypesafeApiKey => "typesafe-api-key",
            Self::RedditClientId => "reddit-client-id",
            Self::RedditClientSecret => "reddit-client-secret",
            Self::XBearerToken => "x-bearer-token",
            Self::BrapiToken => "brapi-token",
            Self::LocalApiToken => "local-api-token",
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretStatus {
    pub typesafe_api_key: bool,
    pub reddit_client_id: bool,
    pub reddit_client_secret: bool,
    pub x_bearer_token: bool,
    pub brapi_token: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalApiAccess {
    pub base_url: &'static str,
    pub docs_url: &'static str,
    pub token: String,
}

#[cfg(test)]
mod tests {
    use super::{CloseBehavior, UpdateAppSettings};

    fn valid_settings() -> UpdateAppSettings {
        UpdateAppSettings {
            setup_completed: true,
            language: "pt-BR".to_owned(),
            background_collection_enabled: true,
            launch_on_startup_enabled: false,
            close_behavior: CloseBehavior::Ask,
            local_api_enabled: false,
            alert_level: 2,
            alerts_enabled: true,
            alert_window_hours: 24,
            alert_quiet_hours_enabled: false,
            alert_quiet_start: "22:00".to_owned(),
            alert_quiet_end: "08:00".to_owned(),
            alert_asset_ids: Vec::new(),
            alert_source_ids: Vec::new(),
            reddit_communities: super::default_reddit_communities(),
            watchlist_limit: 50,
            jev_batch_limit: 25,
            jev_daily_document_limit: 250,
            experience_level: "intermediate".to_owned(),
            investment_range: "upTo5k".to_owned(),
        }
    }

    #[test]
    fn accepts_supported_settings_at_the_watchlist_limit() {
        assert!(valid_settings().validate().is_ok());
    }

    #[test]
    fn rejects_values_outside_product_limits() {
        let mut settings = valid_settings();
        settings.alert_level = 5;
        assert_eq!(
            settings.validate(),
            Err("nível de alerta deve estar entre 1 e 4")
        );

        settings.alert_level = 2;
        settings.watchlist_limit = 51;
        assert_eq!(
            settings.validate(),
            Err("limite da watchlist deve estar entre 1 e 50")
        );

        settings.watchlist_limit = 50;
        settings.jev_batch_limit = 0;
        assert_eq!(
            settings.validate(),
            Err("limite por lote do Jev deve estar entre 1 e 100")
        );

        settings.jev_batch_limit = 25;
        settings.jev_daily_document_limit = 5001;
        assert_eq!(
            settings.validate(),
            Err("limite diário do Jev deve estar entre 1 e 5000")
        );
    }

    #[test]
    fn rejects_unknown_profile_values() {
        let mut settings = valid_settings();
        settings.language = "es".to_owned();
        assert_eq!(settings.validate(), Err("idioma não suportado"));

        settings.language = "pt-BR".to_owned();
        settings.investment_range = "allAssets".to_owned();
        assert_eq!(settings.validate(), Err("faixa investida inválida"));
    }

    #[test]
    fn rejects_unsafe_or_duplicate_reddit_communities() {
        let mut settings = valid_settings();
        settings.reddit_communities = vec!["investimentos".to_owned(), "Investimentos".to_owned()];
        assert_eq!(
            settings.validate(),
            Err("comunidade do Reddit inválida ou duplicada")
        );

        settings.reddit_communities = vec!["../segredo".to_owned()];
        assert_eq!(
            settings.validate(),
            Err("comunidade do Reddit inválida ou duplicada")
        );
    }
}
