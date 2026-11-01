use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use chrono::{DateTime, Utc};
use reqwest::StatusCode;
use reqwest::blocking::{RequestBuilder, Response};
use reqwest::header::RETRY_AFTER;

const MAX_ATTEMPTS: u8 = 3;
const MAX_RETRY_DELAY: Duration = Duration::from_secs(10);
const BASE_RETRY_DELAY: Duration = Duration::from_millis(250);

#[derive(Clone, Copy)]
pub enum RetryPolicy {
    Idempotent,
    RateLimitOnly,
}

pub fn send_with_retry(
    mut build_request: impl FnMut() -> RequestBuilder,
    policy: RetryPolicy,
) -> Result<Response, reqwest::Error> {
    let mut attempt = 1;
    loop {
        match build_request().send() {
            Ok(response) => {
                if attempt >= MAX_ATTEMPTS || !retryable_status(response.status(), policy) {
                    return Ok(response);
                }
                let delay = response
                    .headers()
                    .get(RETRY_AFTER)
                    .and_then(|value| value.to_str().ok())
                    .and_then(|value| parse_retry_after(value, Utc::now()))
                    .unwrap_or_else(|| retry_delay(attempt, jitter_millis()));
                thread::sleep(delay.min(MAX_RETRY_DELAY));
            }
            Err(error) => {
                if attempt >= MAX_ATTEMPTS || !matches!(policy, RetryPolicy::Idempotent) {
                    return Err(error);
                }
                thread::sleep(retry_delay(attempt, jitter_millis()));
            }
        }
        attempt += 1;
    }
}

fn retryable_status(status: StatusCode, policy: RetryPolicy) -> bool {
    status == StatusCode::TOO_MANY_REQUESTS
        || (matches!(policy, RetryPolicy::Idempotent)
            && matches!(
                status,
                StatusCode::BAD_GATEWAY
                    | StatusCode::SERVICE_UNAVAILABLE
                    | StatusCode::GATEWAY_TIMEOUT
            ))
}

fn parse_retry_after(value: &str, now: DateTime<Utc>) -> Option<Duration> {
    if let Ok(seconds) = value.trim().parse::<u64>() {
        return Some(Duration::from_secs(seconds).min(MAX_RETRY_DELAY));
    }
    let retry_at = DateTime::parse_from_rfc2822(value)
        .ok()?
        .with_timezone(&Utc);
    let milliseconds = (retry_at - now).num_milliseconds().max(0) as u64;
    Some(Duration::from_millis(milliseconds).min(MAX_RETRY_DELAY))
}

fn retry_delay(attempt: u8, jitter: u64) -> Duration {
    let multiplier = 1_u64 << attempt.saturating_sub(1).min(4);
    (BASE_RETRY_DELAY * multiplier as u32 + Duration::from_millis(jitter.min(100)))
        .min(MAX_RETRY_DELAY)
}

fn jitter_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.subsec_nanos() as u64 % 101)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use chrono::{TimeZone, Utc};
    use reqwest::StatusCode;

    use super::{RetryPolicy, parse_retry_after, retry_delay, retryable_status};

    #[test]
    fn retries_only_transient_statuses_according_to_the_operation_policy() {
        assert!(retryable_status(
            StatusCode::SERVICE_UNAVAILABLE,
            RetryPolicy::Idempotent
        ));
        assert!(retryable_status(
            StatusCode::TOO_MANY_REQUESTS,
            RetryPolicy::RateLimitOnly
        ));
        assert!(!retryable_status(
            StatusCode::INTERNAL_SERVER_ERROR,
            RetryPolicy::Idempotent
        ));
        assert!(!retryable_status(
            StatusCode::SERVICE_UNAVAILABLE,
            RetryPolicy::RateLimitOnly
        ));
    }

    #[test]
    fn honors_bounded_retry_after_seconds_and_http_dates() {
        let now = Utc
            .with_ymd_and_hms(2026, 11, 1, 12, 0, 0)
            .single()
            .expect("data");
        assert_eq!(parse_retry_after("3", now).expect("segundos").as_secs(), 3);
        assert_eq!(
            parse_retry_after("Sun, 01 Nov 2026 12:00:04 +0000", now)
                .expect("data HTTP")
                .as_secs(),
            4
        );
        assert_eq!(parse_retry_after("60", now).expect("limite").as_secs(), 10);
    }

    #[test]
    fn adds_bounded_jitter_to_exponential_backoff() {
        assert_eq!(retry_delay(1, 0).as_millis(), 250);
        assert_eq!(retry_delay(2, 100).as_millis(), 600);
        assert_eq!(retry_delay(3, 500).as_millis(), 1_100);
    }
}
