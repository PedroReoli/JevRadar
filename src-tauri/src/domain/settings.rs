use serde::{Deserialize, Serialize};

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
    pub telemetry_enabled: bool,
    pub alert_level: u8,
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
    pub telemetry_enabled: bool,
    pub alert_level: u8,
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
            telemetry_enabled: false,
            alert_level: 2,
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
}
