import type { SupabaseClient } from '@supabase/supabase-js';
import type { APIContext } from 'astro';

/**
 * Authenticates a request using the per-request Supabase client.
 *
 * This function tries two methods of authentication:
 * 1. User from middleware (locals.user) - PREFERRED
 * 2. Bearer token from Authorization header - FALLBACK
 *
 * IMPORTANT: RLS policies work correctly because the middleware creates a per-request
 * Supabase client with the JWT token in headers. This ensures `auth.uid()` returns
 * the correct user ID in database queries.
 *
 * @param context - Astro API context
 * @returns User ID if authenticated, null otherwise
 */
export async function authenticateRequest(context: Pick<APIContext, 'locals' | 'request'>): Promise<string | null> {
  const supabase = context.locals.supabase as SupabaseClient;

  if (!supabase) {
    return null;
  }

  // Try 1: Use user from middleware
  const userId = context.locals.user?.id as string | undefined;

  if (userId) {
    return userId;
  }

  // Try 2: Extract Bearer token from Authorization header (fallback)
  const authHeader = context.request.headers.get('authorization') ?? context.request.headers.get('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (!userError && userData?.user) {
      return userData.user.id;
    }
  }

  return null;
}
