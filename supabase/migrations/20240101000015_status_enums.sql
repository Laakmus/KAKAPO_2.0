-- =============================================================================
-- MIGRATION: Convert VARCHAR status columns to PostgreSQL ENUMs
-- Migration: 20240101000015_status_enums
-- =============================================================================
-- This migration is DATA-SAFE:
-- - No DROP TABLE, DELETE, or TRUNCATE
-- - Existing VARCHAR values are converted in-place to ENUM values
-- - 'ACTIVE' (VARCHAR) -> 'ACTIVE' (ENUM), etc.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CREATE ENUM TYPES
-- -----------------------------------------------------------------------------

-- Offer status: ACTIVE (visible), REMOVED (soft-deleted)
CREATE TYPE offer_status AS ENUM ('ACTIVE', 'REMOVED');

-- Interest status: PROPOSED (initial), ACCEPTED (mutual match), REALIZED (confirmed receipt)
CREATE TYPE interest_status AS ENUM ('PROPOSED', 'ACCEPTED', 'REALIZED');

-- Chat status: ACTIVE (open), ARCHIVED (closed)
CREATE TYPE chat_status AS ENUM ('ACTIVE', 'ARCHIVED');

-- -----------------------------------------------------------------------------
-- 2. DROP RLS POLICIES THAT DEPEND ON STATUS COLUMNS
-- -----------------------------------------------------------------------------

-- offers: policy uses status column
DROP POLICY IF EXISTS offers_select_active ON offers;

-- -----------------------------------------------------------------------------
-- 3. ALTER TABLES - Convert VARCHAR columns to ENUM types
-- -----------------------------------------------------------------------------

-- 3.1 offers.status: VARCHAR(20) -> offer_status
ALTER TABLE offers
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE offer_status USING status::offer_status,
  ALTER COLUMN status SET DEFAULT 'ACTIVE'::offer_status;

-- 3.2 interests.status: VARCHAR(20) -> interest_status
ALTER TABLE interests
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE interest_status USING status::interest_status,
  ALTER COLUMN status SET DEFAULT 'PROPOSED'::interest_status;

-- 3.3 chats.status: VARCHAR(20) -> chat_status
ALTER TABLE chats
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE chat_status USING status::chat_status,
  ALTER COLUMN status SET DEFAULT 'ACTIVE'::chat_status;

-- -----------------------------------------------------------------------------
-- 4. RECREATE RLS POLICIES WITH ENUM TYPES
-- -----------------------------------------------------------------------------

-- Recreate offers_select_active policy with enum comparison
CREATE POLICY offers_select_active
  ON offers FOR SELECT
  USING (status = 'ACTIVE'::offer_status OR owner_id = auth.uid());

COMMENT ON POLICY offers_select_active ON offers IS 'Users see active offers and their own offers';

-- -----------------------------------------------------------------------------
-- 5. UPDATE COLUMN COMMENTS
-- -----------------------------------------------------------------------------

COMMENT ON COLUMN offers.status IS 'Offer status enum: ACTIVE (visible) or REMOVED (soft-deleted)';
COMMENT ON COLUMN interests.status IS 'Interest status enum: PROPOSED (initial), ACCEPTED (mutual match), REALIZED (confirmed receipt)';
COMMENT ON COLUMN chats.status IS 'Chat status enum: ACTIVE (open) or ARCHIVED (closed)';

-- -----------------------------------------------------------------------------
-- 6. ADD COMMENTS TO ENUM TYPES
-- -----------------------------------------------------------------------------

COMMENT ON TYPE offer_status IS 'Status of an offer: ACTIVE or REMOVED';
COMMENT ON TYPE interest_status IS 'Status of an interest: PROPOSED, ACCEPTED, or REALIZED';
COMMENT ON TYPE chat_status IS 'Status of a chat: ACTIVE or ARCHIVED';
