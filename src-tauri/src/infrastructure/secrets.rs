use keyring::v1::Entry;
use thiserror::Error;

use crate::domain::settings::SecretKind;

const SERVICE_NAME: &str = "com.pedrolucas.jevradar";

#[derive(Clone, Copy)]
pub struct KeyringSecretStore;

#[derive(Debug, Error)]
pub enum SecretStoreError {
    #[error("não foi possível acessar o armazenamento seguro do sistema")]
    Unavailable,
    #[error("o segredo não pode ficar vazio")]
    Empty,
}

impl KeyringSecretStore {
    pub fn new() -> Self {
        Self
    }

    pub fn save(&self, kind: SecretKind, value: &str) -> Result<(), SecretStoreError> {
        let normalized = value.trim();
        if normalized.is_empty() {
            return Err(SecretStoreError::Empty);
        }
        entry(kind)?
            .set_password(normalized)
            .map_err(|_| SecretStoreError::Unavailable)
    }

    pub fn delete(&self, kind: SecretKind) -> Result<(), SecretStoreError> {
        match entry(kind)?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(_) => Err(SecretStoreError::Unavailable),
        }
    }

    pub fn exists(&self, kind: SecretKind) -> bool {
        entry(kind)
            .and_then(|credential| {
                credential
                    .get_password()
                    .map_err(|_| SecretStoreError::Unavailable)
            })
            .is_ok()
    }

    pub fn read(&self, kind: SecretKind) -> Result<Option<String>, SecretStoreError> {
        match entry(kind)?.get_password() {
            Ok(value) => Ok(Some(value)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(_) => Err(SecretStoreError::Unavailable),
        }
    }
}

fn entry(kind: SecretKind) -> Result<Entry, SecretStoreError> {
    Entry::new(SERVICE_NAME, kind.account_name()).map_err(|_| SecretStoreError::Unavailable)
}
