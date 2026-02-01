-- Migration: 20240101000017_drop_interests_status_check
-- Purpose: Remove legacy CHECK constraint on interests.status column.
-- The column is now typed as interest_status ENUM (which includes WAITING),
-- so the old VARCHAR CHECK constraint ('PROPOSED','ACCEPTED','REALIZED') is redundant
-- and blocks inserting WAITING values.

ALTER TABLE interests DROP CONSTRAINT IF EXISTS interests_status_check;
