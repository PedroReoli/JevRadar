ALTER TABLE backtest_runs
    ADD COLUMN signal_threshold REAL NOT NULL DEFAULT 0.15 CHECK (signal_threshold BETWEEN 0 AND 1);

ALTER TABLE backtest_runs
    ADD COLUMN confidence_threshold REAL NOT NULL DEFAULT 0.60 CHECK (confidence_threshold BETWEEN 0 AND 1);
