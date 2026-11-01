use chrono::{Duration, Local, NaiveTime, Utc};
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

use crate::application::settings_service::SettingsService;
use crate::domain::alerts::AlertCandidate;
use crate::infrastructure::database::{Database, DatabaseError};

pub struct AlertService;

#[derive(Debug, thiserror::Error)]
pub enum AlertServiceError {
    #[error(transparent)]
    Database(#[from] DatabaseError),
    #[error("não foi possível ler as preferências de alerta")]
    Settings,
    #[error("a notificação local não pôde ser exibida")]
    Notification,
}

impl AlertService {
    pub fn send_test_notification(
        database: &Database,
        app: &AppHandle,
    ) -> Result<(), AlertServiceError> {
        let settings = SettingsService::read(database).map_err(|_| AlertServiceError::Settings)?;
        let (title, body) = test_message(settings.alert_level.clamp(1, 4), &settings.language);
        app.notification()
            .builder()
            .title(title)
            .body(body)
            .show()
            .map_err(|_| AlertServiceError::Notification)
    }

    pub fn notify_new_signals(
        database: &Database,
        app: &AppHandle,
    ) -> Result<usize, AlertServiceError> {
        let settings = SettingsService::read(database).map_err(|_| AlertServiceError::Settings)?;
        if !settings.alerts_enabled
            || (settings.alert_quiet_hours_enabled
                && is_quiet_time(
                    Local::now().time(),
                    &settings.alert_quiet_start,
                    &settings.alert_quiet_end,
                ))
        {
            return Ok(0);
        }
        let level = settings.alert_level.clamp(1, 4);
        let cutoff = Utc::now() - Duration::hours(i64::from(settings.alert_window_hours));
        let candidates = database.pending_alert_candidates(level, &cutoff.to_rfc3339())?;
        let mut delivered = 0;
        for candidate in candidates.into_iter().filter(|item| {
            qualifies(item, level)
                && matches_filters(item, &settings.alert_asset_ids, &settings.alert_source_ids)
        }) {
            let (title, body) = message(&candidate, level, &settings.language);
            app.notification()
                .builder()
                .title(title)
                .body(body)
                .show()
                .map_err(|_| AlertServiceError::Notification)?;
            database.mark_alert_delivered(&candidate.signal_id, level, &Utc::now().to_rfc3339())?;
            delivered += 1;
        }
        Ok(delivered)
    }
}

fn test_message(level: u8, language: &str) -> (String, String) {
    if language == "en" {
        return (
            format!("JevRadar · Level {level} test"),
            "Local notifications are working. This is a system test, not a market signal or investment recommendation.".to_owned(),
        );
    }
    (
        format!("JevRadar · Teste do nível {level}"),
        "As notificações locais estão funcionando. Este é um teste do sistema, não um sinal de mercado ou recomendação de investimento.".to_owned(),
    )
}

fn matches_filters(
    candidate: &AlertCandidate,
    asset_ids: &[String],
    source_ids: &[String],
) -> bool {
    let asset_matches = asset_ids.is_empty() || asset_ids.contains(&candidate.asset_id);
    let source_matches = source_ids.is_empty()
        || candidate
            .source_ids
            .iter()
            .any(|source_id| source_ids.contains(source_id));
    asset_matches && source_matches
}

fn is_quiet_time(now: NaiveTime, start: &str, end: &str) -> bool {
    let Ok(start) = NaiveTime::parse_from_str(start, "%H:%M") else {
        return false;
    };
    let Ok(end) = NaiveTime::parse_from_str(end, "%H:%M") else {
        return false;
    };
    if start == end {
        return true;
    }
    if start < end {
        now >= start && now < end
    } else {
        now >= start || now < end
    }
}

fn qualifies(candidate: &AlertCandidate, level: u8) -> bool {
    let (score, confidence, sources, evidence, max_hype, min_change) = match level {
        1 => (0.15, 0.45, 1, 1, 0.80, 0.10),
        2 => (0.30, 0.60, 2, 2, 0.65, 0.15),
        3 => (0.50, 0.72, 2, 3, 0.50, 0.20),
        _ => (0.70, 0.82, 3, 5, 0.35, 0.25),
    };
    let changed = candidate.previous_score.is_none_or(|previous| {
        (candidate.signal_score - previous).abs() >= min_change
            || tone(candidate.signal_score) != tone(previous)
    });
    candidate.signal_score.abs() >= score
        && candidate.confidence >= confidence
        && candidate.independent_source_count >= sources
        && candidate.evidence_count >= evidence
        && candidate.hype_penalty <= max_hype
        && changed
}

fn tone(score: f64) -> &'static str {
    if score > 0.15 {
        "positive"
    } else if score < -0.15 {
        "negative"
    } else {
        "neutral"
    }
}

fn message(candidate: &AlertCandidate, level: u8, language: &str) -> (String, String) {
    let percentage = (candidate.confidence * 100.0).round();
    if language == "en" {
        let direction = match tone(candidate.signal_score) {
            "positive" => "optimistic bias",
            "negative" => "pessimistic bias",
            _ => "mixed bias",
        };
        return (
            format!("JevRadar · Level {level}"),
            format!(
                "{}: {direction}, score {:+.2}, {:.0}% confidence, {} independent sources.",
                candidate.asset_symbol,
                candidate.signal_score,
                percentage,
                candidate.independent_source_count
            ),
        );
    }
    let direction = match tone(candidate.signal_score) {
        "positive" => "viés otimista",
        "negative" => "viés pessimista",
        _ => "viés misto",
    };
    (
        format!("JevRadar · Nível {level}"),
        format!(
            "{}: {direction}, score {:+.2}, confiança {:.0}%, {} fontes independentes.",
            candidate.asset_symbol,
            candidate.signal_score,
            percentage,
            candidate.independent_source_count
        ),
    )
}

#[cfg(test)]
mod tests {
    use chrono::NaiveTime;

    use super::{is_quiet_time, matches_filters, qualifies, test_message};
    use crate::domain::alerts::AlertCandidate;

    fn candidate() -> AlertCandidate {
        AlertCandidate {
            signal_id: "signal:test".to_owned(),
            asset_id: "asset:b3:PETR4".to_owned(),
            asset_symbol: "PETR4".to_owned(),
            signal_score: 0.56,
            confidence: 0.76,
            independent_source_count: 2,
            evidence_count: 4,
            hype_penalty: 0.12,
            previous_score: Some(0.20),
            source_ids: vec!["source:reddit".to_owned(), "source:x".to_owned()],
        }
    }

    #[test]
    fn alert_levels_become_progressively_stricter() {
        assert!(qualifies(&candidate(), 1));
        assert!(qualifies(&candidate(), 2));
        assert!(qualifies(&candidate(), 3));
        assert!(!qualifies(&candidate(), 4));
    }

    #[test]
    fn repeated_signal_without_material_change_is_silent() {
        let mut item = candidate();
        item.previous_score = Some(0.52);
        assert!(!qualifies(&item, 2));
    }

    #[test]
    fn filters_candidates_by_asset_and_source() {
        let item = candidate();
        assert!(matches_filters(&item, &[], &[]));
        assert!(matches_filters(
            &item,
            &["asset:b3:PETR4".to_owned()],
            &["source:x".to_owned()]
        ));
        assert!(!matches_filters(&item, &["asset:b3:VALE3".to_owned()], &[]));
    }

    #[test]
    fn quiet_hours_support_ranges_that_cross_midnight() {
        let late = NaiveTime::from_hms_opt(23, 30, 0).expect("horário");
        let early = NaiveTime::from_hms_opt(7, 30, 0).expect("horário");
        let daytime = NaiveTime::from_hms_opt(12, 0, 0).expect("horário");
        assert!(is_quiet_time(late, "22:00", "08:00"));
        assert!(is_quiet_time(early, "22:00", "08:00"));
        assert!(!is_quiet_time(daytime, "22:00", "08:00"));
    }

    #[test]
    fn test_notification_is_explicitly_not_a_market_signal() {
        let (_, portuguese) = test_message(2, "pt-BR");
        let (_, english) = test_message(2, "en");
        assert!(portuguese.contains("não um sinal de mercado"));
        assert!(english.contains("not a market signal"));
    }
}
