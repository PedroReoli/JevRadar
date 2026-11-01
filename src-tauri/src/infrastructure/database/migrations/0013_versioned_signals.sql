ALTER TABLE market_signals ADD COLUMN model_version TEXT NOT NULL DEFAULT 'unavailable';
ALTER TABLE market_signals ADD COLUMN question_version TEXT NOT NULL DEFAULT 'unavailable';
ALTER TABLE backtest_runs ADD COLUMN signal_methodology_version TEXT NOT NULL DEFAULT 'unavailable';

CREATE INDEX IF NOT EXISTS idx_market_signals_versioned
    ON market_signals(asset_id, methodology_version, model_version, question_version, window_ended_at DESC);
