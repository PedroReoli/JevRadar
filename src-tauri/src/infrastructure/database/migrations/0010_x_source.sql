UPDATE sources
SET terms_url = 'https://developer.x.com/en/developer-terms/agreement-and-policy',
    terms_checked_at = '2026-11-01T00:00:00-03:00',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'source:x';
