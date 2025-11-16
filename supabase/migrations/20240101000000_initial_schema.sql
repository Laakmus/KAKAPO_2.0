-- KAKAPO Database Schema - Initial Tables
-- Migration: 20240101000000_initial_schema

-- =============================================================================
-- NOTE: NO CUSTOM USERS TABLE
-- =============================================================================
-- We use Supabase Auth's auth.users table directly
-- User metadata (first_name, last_name) is stored in auth.users.raw_user_meta_data
-- All foreign keys reference auth.users(id) directly

-- =============================================================================
-- 1. OFFERS TABLE
-- =============================================================================
-- Table for product/service exchange offers
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL CHECK (length(title) >= 5 AND length(title) <= 100),
  description TEXT NOT NULL CHECK (length(description) >= 10 AND length(description) <= 5000),
  image_url VARCHAR(2048) NULL,
  city VARCHAR(100) NOT NULL CHECK (city IN (
    'Warszawa','Kraków','Wrocław','Poznań','Gdańsk','Szczecin',
    'Łódź','Lublin','Białystok','Olsztyn','Rzeszów','Opole',
    'Zielona Góra','Gorzów Wielkopolski','Kielce','Katowice'
  )),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REMOVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE offers IS 'Product/service exchange offers';
COMMENT ON COLUMN offers.owner_id IS 'User who created the offer';
COMMENT ON COLUMN offers.title IS 'Offer title (5-100 characters)';
COMMENT ON COLUMN offers.description IS 'Offer description (10-5000 characters)';
COMMENT ON COLUMN offers.image_url IS 'URL to image in Supabase Storage';
COMMENT ON COLUMN offers.city IS 'City from predefined list of 16 Polish cities';
COMMENT ON COLUMN offers.status IS 'Offer status: ACTIVE or REMOVED';

-- =============================================================================
-- 2. INTERESTS TABLE
-- =============================================================================
-- Table for user interests in offers
CREATE TABLE interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED','ACCEPTED','REALIZED')),
  realized_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(offer_id, user_id)
);

COMMENT ON TABLE interests IS 'User interests in offers';
COMMENT ON COLUMN interests.status IS 'Interest status: PROPOSED, ACCEPTED (mutual match), REALIZED (confirmed receipt)';
COMMENT ON COLUMN interests.realized_at IS 'When user confirmed receipt of goods';
COMMENT ON CONSTRAINT interests_offer_id_user_id_key ON interests IS 'User can only express interest once per offer';

-- =============================================================================
-- 3. CHATS TABLE
-- =============================================================================
-- Table for conversations between users (reused for multiple exchanges)
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE CHECK (user_a::text < user_b::text),
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_a, user_b)
);

COMMENT ON TABLE chats IS 'Conversations between users - reused for multiple exchanges';
COMMENT ON COLUMN chats.user_a IS 'First user (user_a < user_b to prevent duplicates)';
COMMENT ON COLUMN chats.user_b IS 'Second user';
COMMENT ON COLUMN chats.status IS 'Chat status: ACTIVE or ARCHIVED';
COMMENT ON CONSTRAINT chats_user_a_user_b_key ON chats IS 'Only one chat per user pair';

-- =============================================================================
-- 4. MESSAGES TABLE
-- =============================================================================
-- Table for messages in chats
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) >= 1 AND length(body) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE messages IS 'Messages in chats';
COMMENT ON COLUMN messages.body IS 'Message content (1-2000 characters)';
COMMENT ON COLUMN messages.created_at IS 'Used for chronological sorting';

-- =============================================================================
-- 5. ARCHIVED_MESSAGES TABLE
-- =============================================================================
-- Table for archived old messages
CREATE TABLE archived_messages (
  id UUID PRIMARY KEY,
  chat_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE archived_messages IS 'Archive of old messages';
COMMENT ON COLUMN archived_messages.chat_id IS 'No FK - preserves archive even after chat deletion';
COMMENT ON COLUMN archived_messages.receiver_id IS 'Added to maintain full conversation context';

-- =============================================================================
-- 6. EXCHANGE_HISTORY TABLE
-- =============================================================================
-- Table for completed exchange history
CREATE TABLE exchange_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  user_b UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  offer_a_id UUID NULL,
  offer_b_id UUID NULL,
  offer_a_title VARCHAR(100) NOT NULL,
  offer_b_title VARCHAR(100) NOT NULL,
  chat_id UUID NULL REFERENCES chats(id) ON DELETE SET NULL,
  realized_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE exchange_history IS 'History of completed exchanges';
COMMENT ON COLUMN exchange_history.offer_a_title IS 'Copy of offer title - preserves history after offer deletion';
COMMENT ON COLUMN exchange_history.offer_b_title IS 'Copy of offer title - preserves history after offer deletion';
COMMENT ON COLUMN exchange_history.offer_a_id IS 'May be NULL if offer was deleted';

-- =============================================================================
-- 7. AUDIT_LOGS TABLE
-- =============================================================================
-- Table for administrative operation audit
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  payload JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit_logs IS 'Audit log for administrative operations';
COMMENT ON COLUMN audit_logs.actor_id IS 'NULL for system/automatic operations';
COMMENT ON COLUMN audit_logs.payload IS 'Operation details in JSON format';

