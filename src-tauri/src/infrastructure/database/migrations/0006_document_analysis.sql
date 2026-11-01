CREATE TABLE IF NOT EXISTS document_analysis_runs (
    id TEXT PRIMARY KEY NOT NULL,
    document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    question_version TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('completed', 'no_asset')),
    asset_present_probability REAL NOT NULL CHECK (asset_present_probability BETWEEN 0 AND 1),
    selected_asset_id TEXT REFERENCES assets(id) ON DELETE RESTRICT,
    selected_asset_confidence REAL CHECK (selected_asset_confidence BETWEEN 0 AND 1),
    analyzed_at TEXT NOT NULL,
    UNIQUE(document_id, model_version, question_version)
);

CREATE INDEX IF NOT EXISTS idx_document_analysis_status
    ON document_analysis_runs(status, analyzed_at DESC);

ALTER TABLE document_classifications
    ADD COLUMN relevance_expected REAL CHECK (relevance_expected BETWEEN 0 AND 3);
