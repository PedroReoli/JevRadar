ALTER TABLE document_analysis_runs
    ADD COLUMN input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0);

ALTER TABLE document_analysis_runs
    ADD COLUMN output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0);

CREATE INDEX IF NOT EXISTS idx_document_analysis_usage_day
    ON document_analysis_runs(analyzed_at, input_tokens, output_tokens);
