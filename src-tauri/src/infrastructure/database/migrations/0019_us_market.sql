PRAGMA foreign_keys = OFF;
PRAGMA legacy_alter_table = ON;

ALTER TABLE assets RENAME TO assets_legacy;

CREATE TABLE assets (
    id TEXT PRIMARY KEY NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    asset_class TEXT NOT NULL CHECK (asset_class IN (
        'b3_equity', 'b3_fund', 'us_equity', 'us_fund', 'crypto', 'macro'
    )),
    exchange TEXT NOT NULL,
    currency TEXT NOT NULL,
    country_code TEXT,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol, exchange)
);

INSERT INTO assets (
    id, symbol, name, asset_class, exchange, currency, country_code,
    active, created_at, updated_at
)
SELECT
    id, symbol, name, asset_class, exchange, currency, country_code,
    active, created_at, updated_at
FROM assets_legacy;

DROP TABLE assets_legacy;

CREATE INDEX idx_assets_class_active
    ON assets(asset_class, active, symbol);

PRAGMA legacy_alter_table = OFF;
PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO sources (
    id, name, source_kind, collection_method, base_url, terms_url
) VALUES (
    'source:alpha-vantage',
    'Alpha Vantage',
    'market',
    'official_api',
    'https://www.alphavantage.co',
    'https://www.alphavantage.co/terms_of_service/'
);

INSERT OR IGNORE INTO assets (
    id, symbol, name, asset_class, exchange, currency, country_code
) VALUES
    ('asset:us:AAPL', 'AAPL', 'Apple Inc.', 'us_equity', 'NASDAQ', 'USD', 'US'),
    ('asset:us:MSFT', 'MSFT', 'Microsoft Corporation', 'us_equity', 'NASDAQ', 'USD', 'US'),
    ('asset:us:NVDA', 'NVDA', 'NVIDIA Corporation', 'us_equity', 'NASDAQ', 'USD', 'US'),
    ('asset:us:AMZN', 'AMZN', 'Amazon.com, Inc.', 'us_equity', 'NASDAQ', 'USD', 'US'),
    ('asset:us:GOOGL', 'GOOGL', 'Alphabet Inc. Class A', 'us_equity', 'NASDAQ', 'USD', 'US'),
    ('asset:us:META', 'META', 'Meta Platforms, Inc.', 'us_equity', 'NASDAQ', 'USD', 'US'),
    ('asset:us:TSLA', 'TSLA', 'Tesla, Inc.', 'us_equity', 'NASDAQ', 'USD', 'US'),
    ('asset:us:BRK.B', 'BRK.B', 'Berkshire Hathaway Inc. Class B', 'us_equity', 'NYSE', 'USD', 'US'),
    ('asset:us:SPY', 'SPY', 'SPDR S&P 500 ETF Trust', 'us_fund', 'NYSE ARCA', 'USD', 'US'),
    ('asset:us:QQQ', 'QQQ', 'Invesco QQQ Trust', 'us_fund', 'NASDAQ', 'USD', 'US');
