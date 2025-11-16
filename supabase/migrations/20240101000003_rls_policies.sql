-- KAKAPO Database Schema - Row Level Security Policies
-- Migration: 20240101000003_rls_policies

-- =============================================================================
-- USERS TABLE - RLS
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only read their own profile
CREATE POLICY users_select_own
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY users_update_own
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Profile creation only for newly registered users (via Supabase trigger)
CREATE POLICY users_insert_own
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

COMMENT ON POLICY users_select_own ON users IS 'Users can read only their own profile';
COMMENT ON POLICY users_update_own ON users IS 'Users can update only their own profile';
COMMENT ON POLICY users_insert_own ON users IS 'Users can create only their own profile';

-- =============================================================================
-- OFFERS TABLE - RLS
-- =============================================================================

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active offers
CREATE POLICY offers_select_active
  ON offers FOR SELECT
  USING (status = 'ACTIVE' OR owner_id = auth.uid());

-- Only owner can create offers for themselves
CREATE POLICY offers_insert_own
  ON offers FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Only owner can edit their offers
CREATE POLICY offers_update_own
  ON offers FOR UPDATE
  USING (auth.uid() = owner_id);

-- Only owner can delete their offers
CREATE POLICY offers_delete_own
  ON offers FOR DELETE
  USING (auth.uid() = owner_id);

COMMENT ON POLICY offers_select_active ON offers IS 'Users see active offers and their own offers';
COMMENT ON POLICY offers_insert_own ON offers IS 'Users can create offers only for themselves';
COMMENT ON POLICY offers_update_own ON offers IS 'Users can update only their own offers';
COMMENT ON POLICY offers_delete_own ON offers IS 'Users can delete only their own offers';

-- =============================================================================
-- INTERESTS TABLE - RLS
-- =============================================================================

ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

-- User sees interests that relate to:
-- 1. Their own offers (as offerer)
-- 2. Offers they're interested in (as interested party)
CREATE POLICY interests_select_related
  ON interests FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM offers
      WHERE offers.id = interests.offer_id
        AND offers.owner_id = auth.uid()
    )
  );

-- User can add interest only for themselves
CREATE POLICY interests_insert_own
  ON interests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User can update only their own interests
CREATE POLICY interests_update_own
  ON interests FOR UPDATE
  USING (auth.uid() = user_id);

-- User can delete only their own interests
CREATE POLICY interests_delete_own
  ON interests FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON POLICY interests_select_related ON interests IS 'Users see interests in their offers or their own interests';
COMMENT ON POLICY interests_insert_own ON interests IS 'Users can create interests only for themselves';
COMMENT ON POLICY interests_update_own ON interests IS 'Users can update only their own interests';
COMMENT ON POLICY interests_delete_own ON interests IS 'Users can delete only their own interests';

-- =============================================================================
-- CHATS TABLE - RLS
-- =============================================================================

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- User sees only chats they participate in
CREATE POLICY chats_select_participant
  ON chats FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Chats created only by trigger (no INSERT policy for users)

-- Participants can update chat status
CREATE POLICY chats_update_participant
  ON chats FOR UPDATE
  USING (auth.uid() = user_a OR auth.uid() = user_b);

COMMENT ON POLICY chats_select_participant ON chats IS 'Users see only chats they participate in';
COMMENT ON POLICY chats_update_participant ON chats IS 'Participants can update chat status';

-- =============================================================================
-- MESSAGES TABLE - RLS
-- =============================================================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- User sees messages only from chats they participate in
CREATE POLICY messages_select_participant
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
        AND (chats.user_a = auth.uid() OR chats.user_b = auth.uid())
    )
  );

-- User can send messages only in chats they participate in
CREATE POLICY messages_insert_participant
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_id
        AND (chats.user_a = auth.uid() OR chats.user_b = auth.uid())
    )
  );

COMMENT ON POLICY messages_select_participant ON messages IS 'Users see messages from their chats';
COMMENT ON POLICY messages_insert_participant ON messages IS 'Users can send messages in their chats';

-- =============================================================================
-- ARCHIVED_MESSAGES TABLE - RLS
-- =============================================================================

ALTER TABLE archived_messages ENABLE ROW LEVEL SECURITY;

-- User sees only their archived messages (as sender or receiver)
CREATE POLICY archived_messages_select_own
  ON archived_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Only system can add archived messages (via SECURITY DEFINER function)
-- No INSERT/UPDATE/DELETE policy for users

COMMENT ON POLICY archived_messages_select_own ON archived_messages IS 'Users see their archived messages as sender or receiver';

-- =============================================================================
-- EXCHANGE_HISTORY TABLE - RLS
-- =============================================================================

ALTER TABLE exchange_history ENABLE ROW LEVEL SECURITY;

-- User sees only their exchange history
CREATE POLICY exchange_history_select_own
  ON exchange_history FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Only triggers can create history entries (no INSERT policy for users)

COMMENT ON POLICY exchange_history_select_own ON exchange_history IS 'Users see only their exchange history';

-- =============================================================================
-- AUDIT_LOGS TABLE - RLS
-- =============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only administrators can read logs (requires custom claim or service_role)
-- For MVP: no access for regular users
CREATE POLICY audit_logs_admin_only
  ON audit_logs FOR SELECT
  USING (false); -- Only via service_role or backend

COMMENT ON POLICY audit_logs_admin_only ON audit_logs IS 'Audit logs accessible only via service_role';

