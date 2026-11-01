CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    asset_class TEXT NOT NULL CHECK (asset_class IN ('b3_equity', 'b3_fund', 'crypto', 'macro')),
    exchange TEXT NOT NULL,
    currency TEXT NOT NULL,
    country_code TEXT,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol, exchange)
);

CREATE INDEX IF NOT EXISTS idx_assets_class_active
    ON assets(asset_class, active, symbol);

CREATE TABLE IF NOT EXISTS asset_aliases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    normalized_alias TEXT NOT NULL,
    language TEXT,
    UNIQUE(asset_id, normalized_alias)
);

CREATE INDEX IF NOT EXISTS idx_asset_aliases_normalized
    ON asset_aliases(normalized_alias);

CREATE TABLE IF NOT EXISTS watchlists (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlists_single_default
    ON watchlists(is_default) WHERE is_default = 1;

CREATE TABLE IF NOT EXISTS watchlist_assets (
    watchlist_id TEXT NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
    added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (watchlist_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_assets_enabled
    ON watchlist_assets(watchlist_id, enabled, added_at);

CREATE TRIGGER IF NOT EXISTS trg_watchlist_assets_limit
BEFORE INSERT ON watchlist_assets
WHEN (SELECT COUNT(*) FROM watchlist_assets WHERE watchlist_id = NEW.watchlist_id) >= 50
BEGIN
    SELECT RAISE(ABORT, 'watchlist_limit_exceeded');
END;

CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    source_kind TEXT NOT NULL CHECK (source_kind IN ('reddit', 'rss', 'x', 'forum', 'market', 'macro')),
    collection_method TEXT NOT NULL CHECK (collection_method IN ('official_api', 'public_api', 'rss', 'permitted_scraping')),
    base_url TEXT,
    terms_url TEXT,
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
    terms_checked_at TEXT,
    robots_checked_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS source_documents (
    id TEXT PRIMARY KEY NOT NULL,
    source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
    external_id TEXT NOT NULL,
    canonical_url TEXT,
    title TEXT,
    raw_text TEXT NOT NULL,
    author_reference TEXT,
    language TEXT,
    published_at TEXT NOT NULL,
    collected_at TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    duplicate_of_id TEXT REFERENCES source_documents(id) ON DELETE SET NULL,
    retention_expires_at TEXT,
    UNIQUE(source_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_source_documents_published
    ON source_documents(published_at DESC, source_id);
CREATE INDEX IF NOT EXISTS idx_source_documents_hash
    ON source_documents(content_hash, published_at);

CREATE TABLE IF NOT EXISTS document_assets (
    id TEXT PRIMARY KEY NOT NULL,
    document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
    asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    match_method TEXT NOT NULL CHECK (match_method IN ('symbol', 'alias', 'jev')),
    matched_at TEXT NOT NULL,
    UNIQUE(document_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_document_assets_asset
    ON document_assets(asset_id, matched_at DESC);

CREATE TABLE IF NOT EXISTS document_classifications (
    id TEXT PRIMARY KEY NOT NULL,
    document_asset_id TEXT NOT NULL REFERENCES document_assets(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    question_version TEXT NOT NULL,
    sentiment TEXT NOT NULL CHECK (sentiment IN ('optimistic', 'pessimistic', 'neutral', 'uncertain')),
    sentiment_probability REAL NOT NULL CHECK (sentiment_probability BETWEEN 0 AND 1),
    relevance_score INTEGER NOT NULL CHECK (relevance_score BETWEEN 0 AND 3),
    content_type TEXT NOT NULL CHECK (content_type IN ('news', 'opinion', 'technical_analysis', 'meme', 'spam', 'uncertain')),
    hype_probability REAL NOT NULL CHECK (hype_probability BETWEEN 0 AND 1),
    factual_claim_probability REAL NOT NULL CHECK (factual_claim_probability BETWEEN 0 AND 1),
    confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    input_language TEXT,
    classified_at TEXT NOT NULL,
    UNIQUE(document_asset_id, model_version, question_version)
);

CREATE INDEX IF NOT EXISTS idx_classifications_time
    ON document_classifications(classified_at DESC, sentiment, relevance_score);

CREATE TABLE IF NOT EXISTS market_observations (
    id TEXT PRIMARY KEY NOT NULL,
    asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
    interval TEXT NOT NULL,
    observed_at TEXT NOT NULL,
    open_value REAL,
    high_value REAL,
    low_value REAL,
    close_value REAL NOT NULL,
    volume_value REAL,
    collected_at TEXT NOT NULL,
    UNIQUE(asset_id, source_id, interval, observed_at)
);

CREATE INDEX IF NOT EXISTS idx_market_observations_asset_time
    ON market_observations(asset_id, interval, observed_at DESC);

CREATE TABLE IF NOT EXISTS market_signals (
    id TEXT PRIMARY KEY NOT NULL,
    asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    window_started_at TEXT NOT NULL,
    window_ended_at TEXT NOT NULL,
    signal_score REAL NOT NULL CHECK (signal_score BETWEEN -1 AND 1),
    confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    source_count INTEGER NOT NULL CHECK (source_count >= 0),
    independent_source_count INTEGER NOT NULL CHECK (independent_source_count >= 0),
    evidence_count INTEGER NOT NULL CHECK (evidence_count >= 0),
    hype_penalty REAL NOT NULL CHECK (hype_penalty BETWEEN 0 AND 1),
    methodology_version TEXT NOT NULL,
    calculated_at TEXT NOT NULL,
    UNIQUE(asset_id, window_started_at, window_ended_at, methodology_version)
);

CREATE INDEX IF NOT EXISTS idx_market_signals_asset_time
    ON market_signals(asset_id, window_ended_at DESC);

CREATE TABLE IF NOT EXISTS signal_evidence (
    signal_id TEXT NOT NULL REFERENCES market_signals(id) ON DELETE CASCADE,
    classification_id TEXT NOT NULL REFERENCES document_classifications(id) ON DELETE RESTRICT,
    contribution_weight REAL NOT NULL,
    PRIMARY KEY (signal_id, classification_id)
);

CREATE TABLE IF NOT EXISTS market_events (
    id TEXT PRIMARY KEY NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('political', 'economic', 'regulatory', 'climate', 'health', 'technology', 'geopolitical', 'other')),
    title TEXT NOT NULL,
    observed_fact TEXT NOT NULL,
    country_codes TEXT,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    source_document_id TEXT REFERENCES source_documents(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_asset_relations (
    event_id TEXT NOT NULL REFERENCES market_events(id) ON DELETE CASCADE,
    asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    relation_type TEXT NOT NULL CHECK (relation_type IN ('known', 'correlation', 'hypothesis', 'unproven_causality')),
    confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    rationale_template_key TEXT NOT NULL,
    PRIMARY KEY (event_id, asset_id)
);

CREATE TABLE IF NOT EXISTS backtest_runs (
    id TEXT PRIMARY KEY NOT NULL,
    asset_id TEXT REFERENCES assets(id) ON DELETE RESTRICT,
    methodology_version TEXT NOT NULL,
    model_version TEXT NOT NULL,
    question_version TEXT NOT NULL,
    calibration_started_at TEXT NOT NULL,
    calibration_ended_at TEXT NOT NULL,
    evaluation_started_at TEXT NOT NULL,
    evaluation_ended_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    failure_code TEXT
);

CREATE TABLE IF NOT EXISTS backtest_results (
    run_id TEXT NOT NULL REFERENCES backtest_runs(id) ON DELETE CASCADE,
    horizon_days INTEGER NOT NULL CHECK (horizon_days IN (1, 7, 30)),
    sample_size INTEGER NOT NULL CHECK (sample_size >= 0),
    mean_return REAL,
    median_return REAL,
    positive_rate REAL CHECK (positive_rate BETWEEN 0 AND 1),
    baseline_positive_rate REAL CHECK (baseline_positive_rate BETWEEN 0 AND 1),
    confidence_interval_low REAL,
    confidence_interval_high REAL,
    PRIMARY KEY (run_id, horizon_days)
);

INSERT OR IGNORE INTO watchlists (id, name, is_default)
VALUES ('watchlist:default', 'Principal', 1);

INSERT OR IGNORE INTO assets (id, symbol, name, asset_class, exchange, currency, country_code) VALUES
    ('asset:b3:PETR4', 'PETR4', 'Petrobras PN', 'b3_equity', 'B3', 'BRL', 'BR'),
    ('asset:b3:VALE3', 'VALE3', 'Vale ON', 'b3_equity', 'B3', 'BRL', 'BR'),
    ('asset:b3:ITUB4', 'ITUB4', 'Itaú Unibanco PN', 'b3_equity', 'B3', 'BRL', 'BR'),
    ('asset:b3:BOVA11', 'BOVA11', 'iShares Ibovespa Fundo de Índice', 'b3_fund', 'B3', 'BRL', 'BR'),
    ('asset:crypto:BTC', 'BTC', 'Bitcoin', 'crypto', 'CRYPTO', 'USD', NULL),
    ('asset:crypto:ETH', 'ETH', 'Ethereum', 'crypto', 'CRYPTO', 'USD', NULL),
    ('asset:crypto:SOL', 'SOL', 'Solana', 'crypto', 'CRYPTO', 'USD', NULL),
    ('asset:macro:SELIC', 'SELIC', 'Taxa Selic', 'macro', 'BCB', 'BRL', 'BR'),
    ('asset:macro:CDI', 'CDI', 'Certificado de Depósito Interbancário', 'macro', 'BCB', 'BRL', 'BR');

INSERT OR IGNORE INTO asset_aliases (asset_id, alias, normalized_alias, language) VALUES
    ('asset:b3:PETR4', 'Petrobras', 'petrobras', 'pt-BR'),
    ('asset:b3:VALE3', 'Vale', 'vale', 'pt-BR'),
    ('asset:b3:ITUB4', 'Itaú Unibanco', 'itau unibanco', 'pt-BR'),
    ('asset:b3:BOVA11', 'Ibovespa ETF', 'ibovespa etf', 'pt-BR'),
    ('asset:crypto:BTC', 'Bitcoin', 'bitcoin', NULL),
    ('asset:crypto:BTC', 'BTCUSDT', 'btcusdt', NULL),
    ('asset:crypto:ETH', 'Ethereum', 'ethereum', NULL),
    ('asset:crypto:ETH', 'ETHUSDT', 'ethusdt', NULL),
    ('asset:crypto:SOL', 'Solana', 'solana', NULL),
    ('asset:macro:SELIC', 'Taxa Selic', 'taxa selic', 'pt-BR'),
    ('asset:macro:CDI', 'Taxa CDI', 'taxa cdi', 'pt-BR');

INSERT OR IGNORE INTO sources (id, name, source_kind, collection_method, base_url) VALUES
    ('source:binance', 'Binance Public API', 'market', 'public_api', 'https://api.binance.com'),
    ('source:brapi', 'brapi', 'market', 'public_api', 'https://brapi.dev'),
    ('source:bcb', 'Banco Central do Brasil', 'macro', 'official_api', 'https://api.bcb.gov.br'),
    ('source:reddit', 'Reddit', 'reddit', 'official_api', 'https://www.reddit.com'),
    ('source:rss', 'RSS e notícias', 'rss', 'rss', NULL),
    ('source:x', 'X', 'x', 'official_api', 'https://api.x.com');
