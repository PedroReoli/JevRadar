UPDATE sources
SET enabled = 0,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'source:rss';

UPDATE sources
SET terms_url = 'https://redditinc.com/policies/data-api-terms',
    terms_checked_at = '2026-11-01T00:00:00-03:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'source:reddit';

INSERT OR IGNORE INTO sources (
    id, name, source_kind, collection_method, base_url, terms_url, enabled, terms_checked_at
) VALUES
    (
        'source:rss:agencia-brasil-economia',
        'Agência Brasil — Economia',
        'rss',
        'rss',
        'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml',
        'https://agenciabrasil.ebc.com.br/termos-de-uso',
        1,
        '2026-11-01T00:00:00-03:00'
    ),
    (
        'source:rss:cvm-decisoes',
        'CVM — Decisões do Colegiado',
        'rss',
        'rss',
        'https://www.cvm.gov.br/feed/decisoes.xml',
        'https://conteudo.cvm.gov.br/feed.html',
        1,
        '2026-11-01T00:00:00-03:00'
    ),
    (
        'source:rss:cvm-legislacao',
        'CVM — Legislação',
        'rss',
        'rss',
        'https://www.cvm.gov.br/feed/legislacao.xml',
        'https://conteudo.cvm.gov.br/feed.html',
        1,
        '2026-11-01T00:00:00-03:00'
    ),
    (
        'source:rss:cvm-sancionadores',
        'CVM — Processos Sancionadores',
        'rss',
        'rss',
        'https://www.cvm.gov.br/feed/sancionadores.xml',
        'https://conteudo.cvm.gov.br/feed.html',
        1,
        '2026-11-01T00:00:00-03:00'
    );

CREATE TABLE IF NOT EXISTS source_collection_state (
    source_id TEXT PRIMARY KEY NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'skipped')),
    stored_document_count INTEGER NOT NULL DEFAULT 0 CHECK (stored_document_count >= 0),
    last_collected_at TEXT NOT NULL,
    error_code TEXT
);
