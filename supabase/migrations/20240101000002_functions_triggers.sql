-- KAKAPO Database Schema - Functions and Triggers
-- Migration: 20240101000002_functions_triggers

-- =============================================================================
-- TRIGGER: Prevent self-interest
-- =============================================================================
-- User cannot be interested in their own offer

CREATE OR REPLACE FUNCTION check_self_interest() 
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM offers
    WHERE id = NEW.offer_id AND owner_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Nie możesz być zainteresowany własną ofertą';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_self_interest
  BEFORE INSERT OR UPDATE ON interests
  FOR EACH ROW
  EXECUTE FUNCTION check_self_interest();

COMMENT ON FUNCTION check_self_interest() IS 'Prevents users from being interested in their own offers';

-- =============================================================================
-- TRIGGER: Automatic chat creation on mutual match
-- =============================================================================
-- When two interests are mutual (ACCEPTED), automatically creates or reactivates chat

CREATE OR REPLACE FUNCTION create_chat_on_mutual_match() 
RETURNS trigger AS $$
DECLARE
  v_other_user_id uuid;
  v_other_offer_id uuid;
  v_chat_id uuid;
  v_user_a uuid;
  v_user_b uuid;
BEGIN
  -- Only for ACCEPTED status
  IF NEW.status != 'ACCEPTED' THEN
    RETURN NEW;
  END IF;

  -- Find offer owner and check for mutual interest
  SELECT owner_id INTO v_other_user_id
  FROM offers
  WHERE id = NEW.offer_id;

  -- Find interested user's offer where owner is interested
  SELECT i.offer_id INTO v_other_offer_id
  FROM interests i
  JOIN offers o ON i.offer_id = o.id
  WHERE i.user_id = v_other_user_id
    AND o.owner_id = NEW.user_id
    AND i.status = 'ACCEPTED';

  -- If mutual interest exists, create or reactivate chat
  IF v_other_offer_id IS NOT NULL THEN
    -- Determine user order (user_a < user_b)
    IF NEW.user_id < v_other_user_id THEN
      v_user_a := NEW.user_id;
      v_user_b := v_other_user_id;
    ELSE
      v_user_a := v_other_user_id;
      v_user_b := NEW.user_id;
    END IF;

    -- Create chat if doesn't exist or reactivate if archived
    INSERT INTO chats (user_a, user_b, status)
    VALUES (v_user_a, v_user_b, 'ACTIVE')
    ON CONFLICT (user_a, user_b)
    DO UPDATE SET status = 'ACTIVE'; -- Reactivate if was archived
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_chat_on_mutual_interest
  AFTER INSERT OR UPDATE ON interests
  FOR EACH ROW
  EXECUTE FUNCTION create_chat_on_mutual_match();

COMMENT ON FUNCTION create_chat_on_mutual_match() IS 'Automatically creates or reactivates chat when mutual interest is detected';

-- =============================================================================
-- TRIGGER: Automatic exchange history creation
-- =============================================================================
-- When both interests reach REALIZED status, creates entry in exchange_history

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
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_exchange_history_trigger
  AFTER UPDATE ON interests
  FOR EACH ROW
  EXECUTE FUNCTION create_exchange_history_on_realized();

COMMENT ON FUNCTION create_exchange_history_on_realized() IS 'Creates exchange history entry when both users confirm receipt';

-- =============================================================================
-- FUNCTION: Admin delete user account (RPC)
-- =============================================================================
-- Available only for service_role

CREATE OR REPLACE FUNCTION admin_delete_user_account(target_user_id uuid)
RETURNS jsonb
SECURITY DEFINER -- Executed with function owner's permissions
AS $$
DECLARE
  v_email text;
  v_first_name text;
  v_last_name text;
BEGIN
  -- Check if user exists and get metadata
  SELECT
    email,
    raw_user_meta_data->>'first_name',
    raw_user_meta_data->>'last_name'
  INTO v_email, v_first_name, v_last_name
  FROM auth.users
  WHERE id = target_user_id;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Użytkownik nie istnieje'
    );
  END IF;

  -- Log operation before deletion
  INSERT INTO audit_logs (actor_id, action, payload)
  VALUES (
    auth.uid(),
    'DELETE_USER_ACCOUNT',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'email', v_email,
      'first_name', v_first_name,
      'last_name', v_last_name,
      'timestamp', now()
    )
  );

  -- Delete from Supabase Auth
  -- This cascades to offers, interests, messages through FK constraints
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Konto zostało usunięte',
    'user_id', target_user_id
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION admin_delete_user_account(uuid) IS 'Admin RPC to delete user account (requires service_role)';

-- =============================================================================
-- FUNCTION: Archive old messages
-- =============================================================================
-- Function to archive messages older than X months

CREATE OR REPLACE FUNCTION archive_old_messages(months_old integer DEFAULT 6)
RETURNS jsonb
AS $$
DECLARE
  v_cutoff_date timestamptz;
  v_archived_count integer;
BEGIN
  v_cutoff_date := now() - (months_old || ' months')::interval;

  -- Move old messages to archive
  INSERT INTO archived_messages (id, chat_id, sender_id, receiver_id, body, sent_at)
  SELECT
    m.id,
    m.chat_id,
    m.sender_id,
    CASE
      WHEN c.user_a = m.sender_id THEN c.user_b
      ELSE c.user_a
    END as receiver_id,
    m.body,
    m.created_at
  FROM messages m
  JOIN chats c ON m.chat_id = c.id
  WHERE m.created_at < v_cutoff_date;

  GET DIAGNOSTICS v_archived_count = ROW_COUNT;

  -- Delete moved messages
  DELETE FROM messages WHERE created_at < v_cutoff_date;

  RETURN jsonb_build_object(
    'success', true,
    'archived_count', v_archived_count,
    'cutoff_date', v_cutoff_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION archive_old_messages(integer) IS 'Archives messages older than specified months (default 6)';

