-- Migration: 20240101000016_add_waiting_interest_status
-- Purpose: Add WAITING status to interest_status enum to support chat confirmation flow.

-- WAITING means: one party confirmed in /chats, waiting for the other party.
ALTER TYPE interest_status ADD VALUE IF NOT EXISTS 'WAITING';

COMMENT ON TYPE interest_status IS 'Status of an interest: PROPOSED, ACCEPTED, WAITING, or REALIZED';

