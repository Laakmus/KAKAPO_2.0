-- KAKAPO Database Schema - Fix exchange_history trigger RLS
-- Migration: 20240101000013_fix_exchange_history_trigger
-- 
-- Problem: Function create_exchange_history_on_realized() runs without SECURITY DEFINER,
-- so it executes with the calling user's permissions. Since there's no INSERT policy
-- for exchange_history table, the RLS blocks the insert.
--
-- Solution: Add SECURITY DEFINER to the function so it runs with elevated privileges.

-- =============================================================================
-- FIX: Add SECURITY DEFINER to create_exchange_history_on_realized function
-- =============================================================================

CREATE OR REPLACE FUNCTION create_exchange_history_on_realized() 
RETURNS trigger AS $$
DECLARE
  v_other_user_id uuid;
  v_other_interest_id uuid;
  v_other_offer_id uuid;
  v_my_offer_title varchar(100);
  v_other_offer_title varchar(100);
  v_chat_id uuid;
  v_user_a uuid;
  v_user_b uuid;
BEGIN
  -- Only for status REALIZED (and prevent duplicate runs)
  IF NEW.status != 'REALIZED' OR OLD.status = 'REALIZED' THEN
    RETURN NEW;
  END IF;

  -- Find offer owner
  SELECT owner_id, title INTO v_other_user_id, v_other_offer_title
  FROM offers
  WHERE id = NEW.offer_id;

  -- Find mutual interest
  SELECT i.id, i.offer_id, o.title
  INTO v_other_interest_id, v_other_offer_id, v_my_offer_title
  FROM interests i
  JOIN offers o ON i.offer_id = o.id
  WHERE i.user_id = v_other_user_id
    AND o.owner_id = NEW.user_id
    AND i.status = 'REALIZED';

  -- If both interests are REALIZED, create history entry
  IF v_other_interest_id IS NOT NULL THEN
    -- Determine user order
    IF NEW.user_id < v_other_user_id THEN
      v_user_a := NEW.user_id;
      v_user_b := v_other_user_id;
    ELSE
      v_user_a := v_other_user_id;
      v_user_b := NEW.user_id;
    END IF;

    -- Find chat between users
    SELECT id INTO v_chat_id
    FROM chats
    WHERE user_a = v_user_a AND user_b = v_user_b;

    -- Create history entry (only if doesn't exist for this pair of offers)
    INSERT INTO exchange_history (user_a, user_b, offer_a_id, offer_b_id, offer_a_title, offer_b_title, chat_id)
    VALUES (
      v_user_a,
      v_user_b,
      CASE WHEN v_user_a = NEW.user_id THEN v_other_offer_id ELSE NEW.offer_id END,
      CASE WHEN v_user_a = NEW.user_id THEN NEW.offer_id ELSE v_other_offer_id END,
      CASE WHEN v_user_a = NEW.user_id THEN v_my_offer_title ELSE v_other_offer_title END,
      CASE WHEN v_user_a = NEW.user_id THEN v_other_offer_title ELSE v_my_offer_title END,
      v_chat_id
    )
    ON CONFLICT (user_a, user_b, chat_id, offer_a_id, offer_b_id) 
    DO NOTHING; -- Prevents duplicates if both triggers fire simultaneously
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_exchange_history_on_realized() IS 'Creates exchange history entry when both users confirm receipt (SECURITY DEFINER for RLS bypass)';
