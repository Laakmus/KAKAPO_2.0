-- KAKAPO Database Schema - Add chat_id to interests table
-- Migration: 20240101000009_add_chat_id_to_interests
--
-- Dodaje kolumnę chat_id do tabeli interests aby móc łączyć zainteresowania z czatami

-- Dodaj kolumnę chat_id do tabeli interests
ALTER TABLE interests
ADD COLUMN chat_id UUID NULL REFERENCES chats(id) ON DELETE SET NULL;

COMMENT ON COLUMN interests.chat_id IS 'Chat created when mutual interest is detected';

-- Dodaj indeks dla szybszego wyszukiwania zainteresowań po chat_id
CREATE INDEX idx_interests_chat_id ON interests(chat_id);

COMMENT ON INDEX idx_interests_chat_id IS 'Index for faster lookup of interests by chat';
