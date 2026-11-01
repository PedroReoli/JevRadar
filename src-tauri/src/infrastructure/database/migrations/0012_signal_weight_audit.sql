ALTER TABLE signal_evidence ADD COLUMN relevance_weight REAL NOT NULL DEFAULT 1.0 CHECK (relevance_weight BETWEEN 0 AND 1);
ALTER TABLE signal_evidence ADD COLUMN content_type_weight REAL NOT NULL DEFAULT 1.0 CHECK (content_type_weight BETWEEN 0 AND 1);
ALTER TABLE signal_evidence ADD COLUMN factual_weight REAL NOT NULL DEFAULT 1.0 CHECK (factual_weight BETWEEN 0 AND 1);
ALTER TABLE signal_evidence ADD COLUMN source_credibility REAL NOT NULL DEFAULT 0.65 CHECK (source_credibility BETWEEN 0 AND 1);
ALTER TABLE signal_evidence ADD COLUMN diversity_factor REAL NOT NULL DEFAULT 1.0 CHECK (diversity_factor BETWEEN 0 AND 1);
ALTER TABLE signal_evidence ADD COLUMN recency_factor REAL NOT NULL DEFAULT 1.0 CHECK (recency_factor BETWEEN 0 AND 1);
ALTER TABLE signal_evidence ADD COLUMN hype_factor REAL NOT NULL DEFAULT 1.0 CHECK (hype_factor BETWEEN 0 AND 1);
ALTER TABLE signal_evidence ADD COLUMN confidence_factor REAL NOT NULL DEFAULT 1.0 CHECK (confidence_factor BETWEEN 0 AND 1);
