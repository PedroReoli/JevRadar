use std::sync::Arc;
use std::sync::atomic::{AtomicU8, Ordering};
use std::sync::mpsc::{self, RecvTimeoutError, Sender};
use std::thread;
use std::time::Duration;

const DISABLED: u8 = 0;
const IDLE: u8 = 1;
const UNAVAILABLE: u8 = 2;
const SCHEDULER_INTERVAL: Duration = Duration::from_secs(30);

enum BackgroundCommand {
    Reconfigure(bool),
    Shutdown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BackgroundRuntimeStatus {
    Disabled,
    Idle,
    Unavailable,
}

pub struct BackgroundRuntime {
    command_sender: Sender<BackgroundCommand>,
    status: Arc<AtomicU8>,
}

impl BackgroundRuntime {
    pub fn start(enabled: bool) -> Self {
        let (command_sender, command_receiver) = mpsc::channel();
        let status = Arc::new(AtomicU8::new(if enabled { IDLE } else { DISABLED }));
        let worker_status = Arc::clone(&status);

        let spawn_result = thread::Builder::new()
            .name("jevradar-background".to_owned())
            .spawn(move || {
                let mut enabled = enabled;
                loop {
                    match command_receiver.recv_timeout(SCHEDULER_INTERVAL) {
                        Ok(BackgroundCommand::Reconfigure(next_enabled)) => {
                            enabled = next_enabled;
                            worker_status
                                .store(if enabled { IDLE } else { DISABLED }, Ordering::Release);
                        }
                        Ok(BackgroundCommand::Shutdown) => break,
                        Err(RecvTimeoutError::Timeout) if enabled => {
                            tracing::trace!("ciclo do scheduler em background");
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
    use super::{BackgroundRuntime, BackgroundRuntimeStatus};

    #[test]
    fn reconfigures_the_worker_without_restarting_the_process() {
        let runtime = BackgroundRuntime::start(false);
        assert_eq!(runtime.status(), BackgroundRuntimeStatus::Disabled);

        runtime.reconfigure(true);
        assert_eq!(runtime.status(), BackgroundRuntimeStatus::Idle);
    }
}
