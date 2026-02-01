-- KAKAPO Database Schema - Users View
-- Migration: 20240101000006_users_view

-- =============================================================================
-- PUBLIC USERS VIEW
-- =============================================================================
-- Creates a view in public schema that exposes user data from auth.users
-- This allows PostgREST to JOIN with this view using foreign keys

CREATE OR REPLACE VIEW public.users AS
SELECT
  id,
  email,
  raw_user_meta_data->>'first_name' AS first_name,
  raw_user_meta_data->>'last_name' AS last_name,
  created_at
FROM auth.users;

COMMENT ON VIEW public.users IS 'View exposing user data from auth.users for PostgREST queries';

-- Grant read access to authenticated users
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

