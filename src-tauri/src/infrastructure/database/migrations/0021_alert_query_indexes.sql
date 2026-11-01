CREATE INDEX IF NOT EXISTS idx_alert_deliveries_time
    ON alert_deliveries(delivered_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_deliveries_level_time
    ON alert_deliveries(alert_level, delivered_at DESC);
