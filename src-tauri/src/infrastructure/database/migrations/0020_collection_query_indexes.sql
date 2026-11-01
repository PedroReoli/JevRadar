CREATE INDEX IF NOT EXISTS idx_collection_runs_status_started
    ON collection_runs(status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_collection_run_sources_source_run
    ON collection_run_sources(source_id, run_id);
