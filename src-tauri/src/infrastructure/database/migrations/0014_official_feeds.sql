INSERT OR IGNORE INTO sources (
    id, name, source_kind, collection_method, base_url, terms_url, enabled, terms_checked_at
) VALUES
    (
        'source:rss:cvm-audiencias',
        'CVM — Audiências Públicas',
        'rss',
        'rss',
        'https://www.cvm.gov.br/feed/audiencias.xml',
        'https://conteudo.cvm.gov.br/feed.html',
        1,
        '2026-11-01T00:00:00-03:00'
    ),
    (
        'source:rss:cvm-informativos-colegiado',
        'CVM — Informativos do Colegiado',
        'rss',
        'rss',
        'https://www.cvm.gov.br/feed/informativos_colegiado.xml',
        'https://conteudo.cvm.gov.br/feed.html',
        1,
        '2026-11-01T00:00:00-03:00'
    ),
    (
        'source:rss:cvm-despachos',
        'CVM — Despachos de Processos',
        'rss',
        'rss',
        'https://www.cvm.gov.br/feed/despachos.xml',
        'https://conteudo.cvm.gov.br/feed.html',
        1,
        '2026-11-01T00:00:00-03:00'
    ),
    (
        'source:rss:agencia-brasil-politica',
        'Agência Brasil — Política',
        'rss',
        'rss',
        'https://agenciabrasil.ebc.com.br/rss/politica/feed.xml',
        'https://agenciabrasil.ebc.com.br/termos-de-uso',
        1,
        '2026-11-01T00:00:00-03:00'
    ),
    (
        'source:rss:agencia-brasil-internacional',
        'Agência Brasil — Internacional',
        'rss',
        'rss',
        'https://agenciabrasil.ebc.com.br/rss/internacional/feed.xml',
        'https://agenciabrasil.ebc.com.br/termos-de-uso',
        1,
        '2026-11-01T00:00:00-03:00'
    );
