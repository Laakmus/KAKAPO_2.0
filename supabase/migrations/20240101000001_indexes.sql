-- KAKAPO Database Schema - Indexes
-- Migration: 20240101000001_indexes

-- =============================================================================
-- FOREIGN KEY INDEXES
-- =============================================================================

-- offers indexes
CREATE INDEX idx_offers_owner_id ON offers(owner_id);

-- interests indexes
CREATE INDEX idx_interests_offer_id ON interests(offer_id);
CREATE INDEX idx_interests_user_id ON interests(user_id);

-- chats indexes
CREATE INDEX idx_chats_user_a ON chats(user_a);
CREATE INDEX idx_chats_user_b ON chats(user_b);

-- messages indexes
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);

-- archived_messages indexes
CREATE INDEX idx_archived_messages_sender_id ON archived_messages(sender_id);
CREATE INDEX idx_archived_messages_receiver_id ON archived_messages(receiver_id);
CREATE INDEX idx_archived_messages_chat_id ON archived_messages(chat_id);

-- exchange_history indexes
CREATE INDEX idx_exchange_history_user_a ON exchange_history(user_a);
CREATE INDEX idx_exchange_history_user_b ON exchange_history(user_b);
CREATE INDEX idx_exchange_history_chat_id ON exchange_history(chat_id);

-- audit_logs indexes
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- For pagination and filtering of offers list (US-003, US-024)
CREATE INDEX idx_offers_city_status_created ON offers(city, status, created_at DESC);

-- For sorting offers by date
CREATE INDEX idx_offers_status_created ON offers(status, created_at DESC);

-- For filtering owner's active offers (US-007)
CREATE INDEX idx_offers_owner_status ON offers(owner_id, status);

-- For filtering interests by status
CREATE INDEX idx_interests_status ON interests(status);

-- For finding mutual interests (mutual match)
CREATE INDEX idx_interests_offer_status ON interests(offer_id, status);
CREATE INDEX idx_interests_user_status ON interests(user_id, status);

-- For paginating messages in chat (US-016, US-017)
CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at);

-- For finding user's active chats (US-015)
CREATE INDEX idx_chats_user_a_status ON chats(user_a, status);
CREATE INDEX idx_chats_user_b_status ON chats(user_b, status);

-- For browsing user's archived messages
CREATE INDEX idx_archived_messages_sender_sent ON archived_messages(sender_id, sent_at DESC);
CREATE INDEX idx_archived_messages_receiver_sent ON archived_messages(receiver_id, sent_at DESC);

-- For user's exchange history
CREATE INDEX idx_exchange_history_user_a_realized ON exchange_history(user_a, realized_at DESC);
CREATE INDEX idx_exchange_history_user_b_realized ON exchange_history(user_b, realized_at DESC);

-- For audit by date
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- =============================================================================
-- UNIQUE CONSTRAINT FOR EXCHANGE HISTORY
-- =============================================================================
-- Prevents duplicates when both triggers fire simultaneously
ALTER TABLE exchange_history
  ADD CONSTRAINT ux_exchange_history_users_offers 
  UNIQUE (user_a, user_b, chat_id, offer_a_id, offer_b_id);

