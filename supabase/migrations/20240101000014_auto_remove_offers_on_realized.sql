-- KAKAPO Database Schema - Auto-remove offers on exchange realization
-- Migration: 20240101000014_auto_remove_offers_on_realized
--
-- Purpose: When both users confirm receipt (both interests REALIZED),
-- automatically mark both offers as REMOVED.
--
-- This prevents:
-- 1. Completed exchange offers from appearing in public /offers list
-- 2. Completed exchange offers from appearing in /offers/my list
-- 3. Users from expressing new interests in already-exchanged offers
--
-- Note: Chats are already blocked by isChatLocked() logic in ChatsService.

-- =============================================================================
-- FUNCTION: Auto-remove offers when both interests are REALIZED
-- =============================================================================

CREATE OR REPLACE FUNCTION remove_offers_on_mutual_realization()
RETURNS trigger AS $$
DECLARE
  v_other_user_id uuid;
  v_other_interest_id uuid;
  v_other_offer_id uuid;
  v_my_offer_id uuid;
BEGIN
  -- Only trigger when status changes to REALIZED
  IF NEW.status != 'REALIZED' OR OLD.status = 'REALIZED' THEN
    RETURN NEW;
  END IF;

  -- Find the offer owner (the person whose offer the current user is interested in)
  SELECT owner_id INTO v_other_user_id
  FROM offers
  WHERE id = NEW.offer_id;

  -- Store my offer ID (offer owned by NEW.user_id)
  v_my_offer_id := NEW.offer_id;

  -- Find the mutual interest:
  -- - The other user (offer owner) is interested in my offer
  -- - That interest also has status REALIZED
  SELECT i.id, i.offer_id
  INTO v_other_interest_id, v_other_offer_id
  FROM interests i
  JOIN offers o ON i.offer_id = o.id
  WHERE i.user_id = v_other_user_id
    AND o.owner_id = NEW.user_id
    AND i.status = 'REALIZED';

  -- If both interests are REALIZED, mark both offers as REMOVED
  IF v_other_interest_id IS NOT NULL THEN
    -- Mark the first offer as REMOVED (offer that NEW.user_id was interested in)
    UPDATE offers
    SET status = 'REMOVED'
    WHERE id = NEW.offer_id
      AND status != 'REMOVED'; -- Only update if not already removed

    -- Mark the second offer as REMOVED (offer that v_other_user_id was interested in)
    UPDATE offers
    SET status = 'REMOVED'
    WHERE id = v_other_offer_id
      AND status != 'REMOVED'; -- Only update if not already removed
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION remove_offers_on_mutual_realization() IS 'Automatically marks both offers as REMOVED when both users confirm receipt (SECURITY DEFINER for RLS bypass)';

-- =============================================================================
-- TRIGGER: Execute function after interest status update
-- =============================================================================

CREATE TRIGGER remove_offers_on_realized_trigger
  AFTER UPDATE ON interests
  FOR EACH ROW
  EXECUTE FUNCTION remove_offers_on_mutual_realization();

COMMENT ON TRIGGER remove_offers_on_realized_trigger ON interests IS 'Removes both offers from public view when exchange is confirmed by both parties';
