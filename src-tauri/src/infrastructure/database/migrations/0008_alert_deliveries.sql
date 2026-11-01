CREATE TABLE IF NOT EXISTS alert_deliveries (
    signal_id TEXT NOT NULL REFERENCES market_signals(id) ON DELETE CASCADE,
    alert_level INTEGER NOT NULL CHECK (alert_level BETWEEN 1 AND 4),
    delivered_at TEXT NOT NULL,
    PRIMARY KEY (signal_id, alert_level)
);
