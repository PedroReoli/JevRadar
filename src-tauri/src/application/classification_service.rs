use crate::domain::classification::ClassificationSummary;
use crate::domain::settings::SecretKind;
use crate::infrastructure::database::{Database, DatabaseError};
use crate::infrastructure::jev::{JevClient, JevClientError};
use crate::infrastructure::secrets::KeyringSecretStore;

const QUESTION_VERSION: &str = "document-market-signal-v1";

pub struct ClassificationService;

#[derive(Debug, thiserror::Error)]
pub enum ClassificationServiceError {
    #[error(transparent)]
    Database(#[from] DatabaseError),
}

impl ClassificationService {
    pub fn classify_pending(
        database: &Database,
        secrets: &KeyringSecretStore,
    ) -> Result<ClassificationSummary, ClassificationServiceError> {
        let api_key = match secrets.read(SecretKind::TypesafeApiKey) {
            Ok(Some(api_key)) => api_key,
            Ok(None) => return Ok(skipped("typesafe_api_key_missing")),
            Err(_) => return Ok(skipped("typesafe_credential_store_unavailable")),
        };
        let batch_limit = usize::from(database.read_u8_setting("jev_batch_limit", 25)?);
        let daily_limit = usize::from(database.read_u16_setting("jev_daily_document_limit", 250)?);
        let used_today = database.analyses_completed_today()?;
        let remaining_today = daily_limit.saturating_sub(used_today);
        if remaining_today == 0 {
            return Ok(skipped("jev_daily_document_limit_reached"));
        }
        let documents = database
            .pending_document_analyses(QUESTION_VERSION, batch_limit.min(remaining_today))?;
        if documents.is_empty() {
            return Ok(ClassificationSummary {
                status: "completed".to_owned(),
                analyzed_document_count: 0,
                classified_document_count: 0,
                no_asset_document_count: 0,
                failed_document_count: 0,
                error_code: None,
            });
        }
        let client = match JevClient::new(api_key) {
            Ok(client) => client,
            Err(error) => return Ok(failed_summary(error)),
        };
        let mut analyzed_document_count = 0;
        let mut classified_document_count = 0;
        let mut no_asset_document_count = 0;
        let mut failed_document_count = 0;
        let mut error_code = None;

        for document in documents {
            match client.analyze(&document) {
                Ok(analysis) => {
                    analyzed_document_count += 1;
                    if database.store_document_analysis(&analysis)? {
                        classified_document_count += 1;
                    } else {
                        no_asset_document_count += 1;
                    }
                }
                Err(error) => {
                    failed_document_count += 1;
                    error_code = Some(error.code().to_owned());
                    break;
                }
            }
        }
        let status = if failed_document_count == 0 {
            "completed"
        } else if analyzed_document_count == 0 {
            "failed"
        } else {
            "partial"
        };
        Ok(ClassificationSummary {
            status: status.to_owned(),
            analyzed_document_count,
            classified_document_count,
            no_asset_document_count,
            failed_document_count,
            error_code,
        })
    }
}

fn skipped(error_code: &str) -> ClassificationSummary {
    ClassificationSummary {
        status: "skipped".to_owned(),
        analyzed_document_count: 0,
        classified_document_count: 0,
        no_asset_document_count: 0,
        failed_document_count: 0,
        error_code: Some(error_code.to_owned()),
    }
}

fn failed_summary(error: JevClientError) -> ClassificationSummary {
    ClassificationSummary {
        status: "failed".to_owned(),
        analyzed_document_count: 0,
        classified_document_count: 0,
        no_asset_document_count: 0,
        failed_document_count: 1,
        error_code: Some(error.code().to_owned()),
    }
}
