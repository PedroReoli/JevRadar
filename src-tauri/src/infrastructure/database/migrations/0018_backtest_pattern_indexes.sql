CREATE INDEX IF NOT EXISTS idx_backtest_runs_asset_status_created
    ON backtest_runs(asset_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_backtest_results_horizon_sample
    ON backtest_results(horizon_days, sample_size);
