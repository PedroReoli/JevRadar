CREATE INDEX IF NOT EXISTS idx_market_events_type_time
    ON market_events(event_type, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_events_country_time
    ON market_events(country_codes, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_relations_asset_confidence
    ON event_asset_relations(asset_id, confidence DESC);

CREATE INDEX IF NOT EXISTS idx_event_relations_type_confidence
    ON event_asset_relations(relation_type, confidence DESC);
