use chrono::Utc;
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

use crate::domain::alerts::AlertCandidate;
use crate::infrastructure::database::{Database, DatabaseError};

pub struct AlertService;

#[derive(Debug, thiserror::Error)]
pub enum AlertServiceError {
    #[error(transparent)]
    Database(#[from] DatabaseError),
    #[error("a notificação local não pôde ser exibida")]
    Notification,
}

impl AlertService {
    pub fn notify_new_signals(
        database: &Database,
        app: &AppHandle,
    ) -> Result<usize, AlertServiceError> {
        let level = database.read_u8_setting("alert_level", 2)?.clamp(1, 4);
        let language = database.read_setting_or("language", "pt-BR")?;
        let candidates = database.pending_alert_candidates(level)?;
        let mut delivered = 0;
        for candidate in candidates.into_iter().filter(|item| qualifies(item, level)) {
            let (title, body) = message(&candidate, level, &language);
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
    use super::qualifies;
    use crate::domain::alerts::AlertCandidate;

    fn candidate() -> AlertCandidate {
        AlertCandidate {
            signal_id: "signal:test".to_owned(),
            asset_symbol: "PETR4".to_owned(),
            signal_score: 0.56,
            confidence: 0.76,
            independent_source_count: 2,
            evidence_count: 4,
            hype_penalty: 0.12,
            previous_score: Some(0.20),
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
}
