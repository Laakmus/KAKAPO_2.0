-- KAKAPO Database Schema - Full-Text Search (Optional/Future)
-- Migration: 20240101000004_full_text_search

-- =============================================================================
-- FULL-TEXT SEARCH FOR OFFERS
-- =============================================================================
-- This migration adds full-text search capabilities for offers
-- Can be applied later if needed for search functionality

-- Add tsvector column for search
ALTER TABLE offers ADD COLUMN search_vector tsvector;

-- Trigger to update search_vector
CREATE OR REPLACE FUNCTION offers_search_vector_update() 
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER offers_search_vector_trigger
  BEFORE INSERT OR UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION offers_search_vector_update();

-- GIN index for fast full-text search
CREATE INDEX idx_offers_search_vector ON offers USING GIN(search_vector);

COMMENT ON COLUMN offers.search_vector IS 'Full-text search vector for title and description';
COMMENT ON FUNCTION offers_search_vector_update() IS 'Updates search vector on offer insert/update';
COMMENT ON INDEX idx_offers_search_vector IS 'GIN index for fast full-text search';

-- =============================================================================
-- EXAMPLE SEARCH QUERY
-- =============================================================================
-- To search offers:
-- SELECT * FROM offers 
-- WHERE search_vector @@ to_tsquery('simple', 'search_term')
-- ORDER BY ts_rank(search_vector, to_tsquery('simple', 'search_term')) DESC;

