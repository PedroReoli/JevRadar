use std::sync::Arc;
use std::sync::atomic::{AtomicU8, Ordering};
use std::thread;

use parking_lot::Mutex;
use tokio::sync::oneshot;
use uuid::Uuid;

use crate::domain::settings::SecretKind;
use crate::infrastructure::database::Database;
use crate::infrastructure::local_api::server;
use crate::infrastructure::secrets::KeyringSecretStore;

const DISABLED: u8 = 0;
const STARTING: u8 = 1;
const READY: u8 = 2;
const UNAVAILABLE: u8 = 3;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LocalApiRuntimeStatus {
    Disabled,
    Starting,
    Ready,
    Unavailable,
}

pub struct LocalApiRuntime {
    database: Arc<Database>,
    secrets: KeyringSecretStore,
    status: Arc<AtomicU8>,
    shutdown: Mutex<Option<oneshot::Sender<()>>>,
}

impl LocalApiRuntime {
    pub fn start(database: Arc<Database>, secrets: KeyringSecretStore, enabled: bool) -> Self {
        let runtime = Self {
            database,
            secrets,
            status: Arc::new(AtomicU8::new(DISABLED)),
            shutdown: Mutex::new(None),
        };
        runtime.reconfigure(enabled);
        runtime
    }

    pub fn reconfigure(&self, enabled: bool) {
        if !enabled {
            if let Some(shutdown) = self.shutdown.lock().take() {
                let _ = shutdown.send(());
            }
            self.status.store(DISABLED, Ordering::Release);
            return;
        }
        if matches!(
            self.status(),
            LocalApiRuntimeStatus::Starting | LocalApiRuntimeStatus::Ready
        ) {
            return;
        }
        let token = match self.ensure_token() {
            Ok(token) => token,
            Err(()) => {
                self.status.store(UNAVAILABLE, Ordering::Release);
                return;
            }
        };
        let (shutdown_sender, shutdown_receiver) = oneshot::channel();
        *self.shutdown.lock() = Some(shutdown_sender);
        self.status.store(STARTING, Ordering::Release);
        let database = Arc::clone(&self.database);
        let status = Arc::clone(&self.status);
        let spawn_result = thread::Builder::new()
            .name("jevradar-local-api".to_owned())
            .spawn(move || {
                let runtime = tokio::runtime::Builder::new_multi_thread()
                    .enable_all()
                    .worker_threads(1)
                    .build();
                let result = runtime.map_err(|_| ()).and_then(|runtime| {
                    runtime
                        .block_on(server::serve(
                            database,
                            token,
                            shutdown_receiver,
                            Arc::clone(&status),
                        ))
                        .map_err(|_| ())
                });
                if result.is_err() && status.load(Ordering::Acquire) != DISABLED {
                    status.store(UNAVAILABLE, Ordering::Release);
                }
            });
        if spawn_result.is_err() {
            self.shutdown.lock().take();
            self.status.store(UNAVAILABLE, Ordering::Release);
        }
    }

    pub fn status(&self) -> LocalApiRuntimeStatus {
        match self.status.load(Ordering::Acquire) {
            DISABLED => LocalApiRuntimeStatus::Disabled,
            STARTING => LocalApiRuntimeStatus::Starting,
            READY => LocalApiRuntimeStatus::Ready,
            _ => LocalApiRuntimeStatus::Unavailable,
        }
    }

    fn ensure_token(&self) -> Result<String, ()> {
        match self.secrets.read(SecretKind::LocalApiToken) {
            Ok(Some(token)) => Ok(token),
            Ok(None) => {
                let token = format!("jvr_{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple());
                self.secrets
                    .save(SecretKind::LocalApiToken, &token)
                    .map_err(|_| ())?;
                Ok(token)
            }
            Err(_) => Err(()),
        }
    }
}

impl Drop for LocalApiRuntime {
    fn drop(&mut self) {
        if let Some(shutdown) = self.shutdown.get_mut().take() {
            let _ = shutdown.send(());
        }
    }
}

pub(crate) fn mark_ready(status: &AtomicU8) {
    status.store(READY, Ordering::Release);
}
