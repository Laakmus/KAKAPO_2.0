-- KAKAPO Database Schema - Auth Trigger for User Profile Creation
-- Migration: 20240101000005_auth_trigger

-- =============================================================================
-- FUNCTION: Handle new user registration
-- =============================================================================
-- Automatically creates user profile when new user registers via Supabase Auth

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail auth registration
    RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user profile on auth registration';

-- =============================================================================
-- TRIGGER: Create profile on auth user creation
-- =============================================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- FUNCTION: Handle user deletion from auth
-- =============================================================================
-- Ensures user profile is deleted when auth user is deleted

CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.users WHERE id = OLD.id;
  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to delete user profile for %: %', OLD.id, SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.handle_user_delete() IS 'Deletes user profile when auth user is deleted';

CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_delete();

