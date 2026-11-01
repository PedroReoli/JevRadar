use std::sync::Arc;
use std::sync::atomic::{AtomicU8, Ordering};
use std::sync::mpsc::{self, RecvTimeoutError, Sender};
use std::thread;
use std::time::Duration;

use crate::application::classification_service::ClassificationService;
use crate::application::content_collection_service::ContentCollectionService;
use crate::application::market_collection_service::MarketCollectionService;
use crate::domain::collection::CollectionTrigger;
use crate::infrastructure::database::Database;
use crate::infrastructure::secrets::KeyringSecretStore;

const DISABLED: u8 = 0;
const IDLE: u8 = 1;
const RUNNING: u8 = 2;
const UNAVAILABLE: u8 = 3;
const SCHEDULER_INTERVAL: Duration = Duration::from_secs(15 * 60);

enum BackgroundCommand {
    Reconfigure(bool),
    Shutdown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BackgroundRuntimeStatus {
    Disabled,
    Idle,
    Running,
    Unavailable,
}

pub struct BackgroundRuntime {
    command_sender: Sender<BackgroundCommand>,
    status: Arc<AtomicU8>,
}

impl BackgroundRuntime {
    pub fn start(database: Arc<Database>, secrets: KeyringSecretStore, enabled: bool) -> Self {
        Self::start_with_task(
            enabled,
            Arc::new(move || {
                if let Err(error) = MarketCollectionService::collect(
                    &database,
                    &secrets,
                    CollectionTrigger::Background,
                ) {
                    tracing::warn!(error = %error, "ciclo de coleta em background falhou");
                }
                if let Err(error) = ContentCollectionService::collect(&database, &secrets) {
                    tracing::warn!(error = %error, "coleta de conteúdo em background falhou");
                }
                if let Err(error) = ClassificationService::classify_pending(&database, &secrets) {
                    tracing::warn!(error = %error, "classificação Jev em background falhou");
                }
            }),
        )
    }

    fn start_with_task(enabled: bool, collection_task: Arc<dyn Fn() + Send + Sync>) -> Self {
        let (command_sender, command_receiver) = mpsc::channel();
        let status = Arc::new(AtomicU8::new(if enabled { IDLE } else { DISABLED }));
        let worker_status = Arc::clone(&status);

        let spawn_result = thread::Builder::new()
            .name("jevradar-background".to_owned())
            .spawn(move || {
                let mut enabled = enabled;
                let mut collect_now = enabled;
                loop {
                    if enabled && collect_now {
                        worker_status.store(RUNNING, Ordering::Release);
                        collection_task();
                        worker_status.store(IDLE, Ordering::Release);
                        collect_now = false;
                    }
                    match command_receiver.recv_timeout(SCHEDULER_INTERVAL) {
                        Ok(BackgroundCommand::Reconfigure(next_enabled)) => {
                            enabled = next_enabled;
                            collect_now = next_enabled;
                            worker_status
                                .store(if enabled { IDLE } else { DISABLED }, Ordering::Release);
                        }
                        Ok(BackgroundCommand::Shutdown) => break,
                        Err(RecvTimeoutError::Timeout) if enabled => {
                            collect_now = true;
                        }
                        Err(RecvTimeoutError::Timeout) => {}
                        Err(RecvTimeoutError::Disconnected) => break,
                    }
                }
            });

        if spawn_result.is_err() {
            status.store(UNAVAILABLE, Ordering::Release);
        }

        Self {
            command_sender,
            status,
        }
    }

    pub fn reconfigure(&self, enabled: bool) {
        if self
            .command_sender
            .send(BackgroundCommand::Reconfigure(enabled))
            .is_err()
        {
            self.status.store(UNAVAILABLE, Ordering::Release);
        } else {
            self.status
                .store(if enabled { IDLE } else { DISABLED }, Ordering::Release);
        }
    }

    pub fn status(&self) -> BackgroundRuntimeStatus {
        match self.status.load(Ordering::Acquire) {
            DISABLED => BackgroundRuntimeStatus::Disabled,
            IDLE => BackgroundRuntimeStatus::Idle,
            RUNNING => BackgroundRuntimeStatus::Running,
            _ => BackgroundRuntimeStatus::Unavailable,
        }
    }
}

impl Drop for BackgroundRuntime {
    fn drop(&mut self) {
        let _ = self.command_sender.send(BackgroundCommand::Shutdown);
    }
}

#[cfg(test)]
mod tests {
    use std::sync::{Arc, mpsc};
    use std::time::Duration;

    use super::{BackgroundRuntime, BackgroundRuntimeStatus};

    #[test]
    fn reconfigures_the_worker_without_restarting_the_process() {
        let (cycle_sender, cycle_receiver) = mpsc::channel();
        let runtime = BackgroundRuntime::start_with_task(
            false,
            Arc::new(move || {
                cycle_sender.send(()).expect("notifica ciclo");
            }),
        );
        assert_eq!(runtime.status(), BackgroundRuntimeStatus::Disabled);

        runtime.reconfigure(true);
        cycle_receiver
            .recv_timeout(Duration::from_secs(1))
            .expect("ciclo executado");
        assert!(matches!(
            runtime.status(),
            BackgroundRuntimeStatus::Idle | BackgroundRuntimeStatus::Running
        ));
    }
}
