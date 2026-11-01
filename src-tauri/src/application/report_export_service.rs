use std::fmt::Write as _;
use std::fs;
use std::path::Path;

use chrono::Utc;

use crate::application::insights_query_service::InsightsQueryService;
use crate::application::market_query_service::{MarketEventQueryError, MarketQueryService};
use crate::domain::market::MarketOverviewFilter;
use crate::domain::report::{
    ExportMarketReportRequest, MARKET_REPORT_CONTRACT_VERSION, MARKET_REPORT_ITEM_LIMIT,
    MarketReportExport, MarketReportSnapshot, ReportCollection,
};
use crate::infrastructure::database::{Database, DatabaseError};

pub struct ReportExportService;

#[derive(Debug, thiserror::Error)]
pub enum ReportExportError {
    #[error("filtros do relatório inválidos: {0}")]
    InvalidRequest(&'static str),
    #[error(transparent)]
    Database(#[from] DatabaseError),
    #[error(transparent)]
    Query(#[from] MarketEventQueryError),
    #[error("não foi possível gravar o relatório: {0}")]
    Io(#[from] std::io::Error),
    #[error("não foi possível serializar o relatório: {0}")]
    Serialization(#[from] serde_json::Error),
}

impl ReportExportService {
    pub fn export(
        database: &Database,
        base_directory: &Path,
        request: ExportMarketReportRequest,
    ) -> Result<MarketReportExport, ReportExportError> {
        request
            .validate()
            .map_err(ReportExportError::InvalidRequest)?;
        let generated_at = Utc::now();
        let overview = MarketQueryService::overview(
            database,
            MarketOverviewFilter {
                period_hours: request.period_hours,
                asset_class: None,
                minimum_confidence: request.minimum_confidence,
            },
        )?;
        let event_page = MarketQueryService::events_for_period(
            database,
            request.period_hours,
            None,
            None,
            None,
            None,
            request.minimum_confidence,
            1,
            MARKET_REPORT_ITEM_LIMIT,
        )?;
        let relation_page = MarketQueryService::relations(
            database,
            request.period_hours,
            None,
            None,
            None,
            request.minimum_confidence,
            1,
            MARKET_REPORT_ITEM_LIMIT,
        )?;
        let backtests =
            InsightsQueryService::backtests(database, None, MARKET_REPORT_ITEM_LIMIT as usize)?;
        let jev_usage = InsightsQueryService::jev_usage(database)?;
        let signal_total = overview.signals.len() as u64;
        let backtest_total = database.backtest_report_count()?;
        let snapshot = MarketReportSnapshot {
            contract_version: MARKET_REPORT_CONTRACT_VERSION.to_owned(),
            generated_at: generated_at.to_rfc3339(),
            language: request.language.clone(),
            disclosure: disclosure(&request.language).to_owned(),
            period_hours: request.period_hours,
            minimum_confidence: request.minimum_confidence,
            signals: ReportCollection {
                items: overview.signals,
                total_items: signal_total,
                truncated: false,
            },
            events: ReportCollection {
                truncated: event_page.total_items > u64::from(MARKET_REPORT_ITEM_LIMIT),
                total_items: event_page.total_items,
                items: event_page.items,
            },
            relations: ReportCollection {
                truncated: relation_page.total_items > u64::from(MARKET_REPORT_ITEM_LIMIT),
                total_items: relation_page.total_items,
                items: relation_page.items,
            },
            backtests: ReportCollection {
                items: backtests,
                total_items: backtest_total,
                truncated: backtest_total > u64::from(MARKET_REPORT_ITEM_LIMIT),
            },
            jev_usage,
        };

        let directory = base_directory.join(format!(
            "JevRadar-report-{}",
            generated_at.format("%Y%m%d-%H%M%S-%3f")
        ));
        fs::create_dir_all(&directory)?;
        let markdown_path = directory.join("report.md");
        let json_path = directory.join("evidence.json");
        fs::write(&json_path, serde_json::to_vec_pretty(&snapshot)?)?;
        fs::write(&markdown_path, render_markdown(&snapshot))?;

        Ok(MarketReportExport {
            contract_version: MARKET_REPORT_CONTRACT_VERSION.to_owned(),
            generated_at: snapshot.generated_at.clone(),
            directory_path: directory.to_string_lossy().into_owned(),
            markdown_path: markdown_path.to_string_lossy().into_owned(),
            json_path: json_path.to_string_lossy().into_owned(),
            signal_count: snapshot.signals.items.len(),
            event_count: snapshot.events.items.len(),
            relation_count: snapshot.relations.items.len(),
            backtest_count: snapshot.backtests.items.len(),
        })
    }
}

fn disclosure(language: &str) -> &'static str {
    if language == "en" {
        "This report presents observed data and historical associations. It does not recommend buying or selling, prove causality, or guarantee future results."
    } else {
        "Este relatório apresenta dados observados e associações históricas. Não recomenda compra ou venda, não prova causalidade e não garante resultados futuros."
    }
}

fn render_markdown(snapshot: &MarketReportSnapshot) -> String {
    let english = snapshot.language == "en";
    let mut output = String::new();
    let title = if english {
        "JevRadar market report"
    } else {
        "Relatório de mercado JevRadar"
    };
    let _ = writeln!(output, "# {title}\n");
    let _ = writeln!(output, "> {}\n", snapshot.disclosure);
    let generated = if english { "Generated at" } else { "Gerado em" };
    let period = if english { "Period" } else { "Período" };
    let confidence = if english {
        "Minimum confidence"
    } else {
        "Confiança mínima"
    };
    let _ = writeln!(output, "- {generated}: `{}`", snapshot.generated_at);
    let _ = writeln!(output, "- {period}: {} h", snapshot.period_hours);
    let _ = writeln!(
        output,
        "- {confidence}: {:.0}%",
        snapshot.minimum_confidence * 100.0
    );
    let _ = writeln!(output, "- Contract: `{}`\n", snapshot.contract_version);

    render_signals(&mut output, snapshot, english);
    render_events(&mut output, snapshot, english);
    render_relations(&mut output, snapshot, english);
    render_backtests(&mut output, snapshot, english);
    let evidence_note = if english {
        "The complete versioned evidence for this export is stored in `evidence.json`."
    } else {
        "As evidências versionadas completas deste recorte estão em `evidence.json`."
    };
    let _ = writeln!(output, "\n---\n\n{evidence_note}");
    output
}

fn render_signals(output: &mut String, snapshot: &MarketReportSnapshot, english: bool) {
    let _ = writeln!(
        output,
        "\n## {}\n",
        if english { "Signals" } else { "Sinais" }
    );
    if snapshot.signals.items.is_empty() {
        let _ = writeln!(
            output,
            "{}",
            if english {
                "No signal matched the filters."
            } else {
                "Nenhum sinal correspondeu aos filtros."
            }
        );
        return;
    }
    for signal in &snapshot.signals.items {
        let _ = writeln!(
            output,
            "- **{}** — score {:+.2}; {} {:.0}%; {} {}; `{}`",
            markdown_text(&signal.asset.symbol),
            signal.signal_score,
            if english { "confidence" } else { "confiança" },
            signal.confidence * 100.0,
            signal.independent_source_count,
            if english {
                "independent sources"
            } else {
                "fontes independentes"
            },
            markdown_text(&signal.methodology_version),
        );
    }
}

fn render_events(output: &mut String, snapshot: &MarketReportSnapshot, english: bool) {
    let _ = writeln!(
        output,
        "\n## {}\n",
        if english {
            "Observed facts and events"
        } else {
            "Fatos e eventos observados"
        }
    );
    if snapshot.events.items.is_empty() {
        let _ = writeln!(
            output,
            "{}",
            if english {
                "No event matched the filters."
            } else {
                "Nenhum evento correspondeu aos filtros."
            }
        );
        return;
    }
    for event in &snapshot.events.items {
        let _ = writeln!(
            output,
            "- **{} · {}** — {} ({}, {:.0}%)",
            markdown_text(&event.asset.symbol),
            markdown_text(&event.title),
            markdown_text(&event.observed_fact),
            markdown_text(&event.relation_type),
            event.confidence * 100.0,
        );
    }
    render_truncation(
        output,
        snapshot.events.total_items,
        snapshot.events.truncated,
        english,
    );
}

fn render_relations(output: &mut String, snapshot: &MarketReportSnapshot, english: bool) {
    let _ = writeln!(
        output,
        "\n## {}\n",
        if english {
            "Market relationships"
        } else {
            "Relações de mercado"
        }
    );
    if snapshot.relations.items.is_empty() {
        let _ = writeln!(
            output,
            "{}",
            if english {
                "No relationship matched the filters."
            } else {
                "Nenhuma relação correspondeu aos filtros."
            }
        );
        return;
    }
    for relation in &snapshot.relations.items {
        let country = relation.country_code.as_deref().unwrap_or("global");
        let _ = writeln!(
            output,
            "- **{} · {}** — {} {}; {} {}, {} {}, {} {}, {} {}; {} {:.0}%",
            markdown_text(country),
            markdown_text(&relation.asset.symbol),
            relation.event_count,
            if english { "events" } else { "eventos" },
            if english { "known" } else { "confirmadas" },
            relation.known_count,
            if english {
                "correlation"
            } else {
                "correlações"
            },
            relation.correlation_count,
            if english { "hypothesis" } else { "hipóteses" },
            relation.hypothesis_count,
            if english {
                "unproven causality"
            } else {
                "causalidade não comprovada"
            },
            relation.unproven_causality_count,
            if english {
                "average confidence"
            } else {
                "confiança média"
            },
            relation.average_confidence * 100.0,
        );
    }
    render_truncation(
        output,
        snapshot.relations.total_items,
        snapshot.relations.truncated,
        english,
    );
}

fn render_backtests(output: &mut String, snapshot: &MarketReportSnapshot, english: bool) {
    let _ = writeln!(output, "\n## Backtests\n");
    if snapshot.backtests.items.is_empty() {
        let _ = writeln!(
            output,
            "{}",
            if english {
                "No backtest is available."
            } else {
                "Nenhum backtest está disponível."
            }
        );
        return;
    }
    for report in &snapshot.backtests.items {
        let _ = writeln!(
            output,
            "- **{}** — `{}`; {} `{}`; {}",
            markdown_text(&report.asset.symbol),
            markdown_text(&report.methodology_version),
            if english {
                "signal contract"
            } else {
                "contrato do sinal"
            },
            markdown_text(&report.signal_methodology_version),
            markdown_text(&report.evaluation_ended_at),
        );
    }
    render_truncation(
        output,
        snapshot.backtests.total_items,
        snapshot.backtests.truncated,
        english,
    );
}

fn render_truncation(output: &mut String, total: u64, truncated: bool, english: bool) {
    if truncated {
        let _ = writeln!(
            output,
            "\n_{} {}._",
            if english {
                "Export limited; total records"
            } else {
                "Exportação limitada; total de registros"
            },
            total,
        );
    }
}

fn markdown_text(value: &str) -> String {
    value
        .chars()
        .filter(|character| !character.is_control() || *character == ' ')
        .collect::<String>()
        .replace('\\', "\\\\")
        .replace('`', "\\`")
        .replace('*', "\\*")
        .replace('_', "\\_")
        .replace('[', "\\[")
        .replace(']', "\\]")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('|', "\\|")
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::{ReportExportService, markdown_text};
    use crate::domain::report::{ExportMarketReportRequest, MARKET_REPORT_CONTRACT_VERSION};
    use crate::infrastructure::database::Database;

    #[test]
    fn exports_versioned_markdown_and_json_without_credentials_or_raw_content() {
        let database_directory = tempdir().expect("diretório do banco");
        let export_directory = tempdir().expect("diretório de exportação");
        let database = Database::open(database_directory.path().join("report.sqlite3"))
            .expect("banco inicializado");
        let result = ReportExportService::export(
            &database,
            export_directory.path(),
            ExportMarketReportRequest {
                period_hours: 168,
                minimum_confidence: 0.6,
                language: "pt-BR".to_owned(),
            },
        )
        .expect("relatório exportado");

        assert_eq!(result.contract_version, MARKET_REPORT_CONTRACT_VERSION);
        let markdown = std::fs::read_to_string(result.markdown_path).expect("markdown");
        let json = std::fs::read_to_string(result.json_path).expect("json");
        assert!(markdown.contains("Não recomenda compra ou venda"));
        assert!(json.contains(MARKET_REPORT_CONTRACT_VERSION));
        assert!(json.contains("minimumConfidence"));
        assert!(!json.contains("apiKey"));
        assert!(!json.contains("rawText"));
    }

    #[test]
    fn neutralizes_untrusted_markdown_and_html_fragments() {
        let escaped = markdown_text("<script>alert(`x`)</script> | **boom** [link]");
        assert!(!escaped.contains("<script>"));
        assert!(escaped.contains("&lt;script&gt;"));
        assert!(escaped.contains("\\|"));
        assert!(escaped.contains("\\*\\*boom\\*\\*"));
        assert!(escaped.contains("\\[link\\]"));
    }
}
