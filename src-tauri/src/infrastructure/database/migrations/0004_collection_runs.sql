CREATE TABLE IF NOT EXISTS collection_runs (
    id TEXT PRIMARY KEY NOT NULL,
    trigger_kind TEXT NOT NULL CHECK (trigger_kind IN ('manual', 'background')),
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'partial', 'failed')),
    started_at TEXT NOT NULL,
    completed_at TEXT,
    stored_observation_count INTEGER NOT NULL DEFAULT 0 CHECK (stored_observation_count >= 0),
    source_error_count INTEGER NOT NULL DEFAULT 0 CHECK (source_error_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_collection_runs_started
    ON collection_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS collection_run_sources (
    run_id TEXT NOT NULL REFERENCES collection_runs(id) ON DELETE CASCADE,
    source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
    status TEXT NOT NULL CHECK (status IN ('completed', 'partial', 'failed', 'skipped')),
    stored_observation_count INTEGER NOT NULL DEFAULT 0 CHECK (stored_observation_count >= 0),
    skipped_asset_count INTEGER NOT NULL DEFAULT 0 CHECK (skipped_asset_count >= 0),
    error_code TEXT,
    PRIMARY KEY (run_id, source_id)
);
