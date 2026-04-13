import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types';
import { getTokenFromCookie, clearAuthCookie } from '../utils/auth-cookie';
import type { UserProfileDTO } from '../types';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_KEY;

export const onRequest = defineMiddleware(async (context, next) => {
  // Extract Bearer token from Authorization header (API calls)
  const authHeader = context.request.headers.get('authorization') ?? context.request.headers.get('Authorization');
  let token: string | undefined;
  let tokenSource: 'header' | 'cookie' | undefined;

  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
    tokenSource = 'header';
  } else {
    // Fallback: read token from cookie (page navigation)
    token = getTokenFromCookie(context.request);
    if (token) tokenSource = 'cookie';
  }

  let supabase;

  if (token) {
    // Create Supabase client with JWT token in global headers
    // This ensures auth.uid() works in RLS policies
    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    try {
      // Validate and attach user to locals
      const { data } = await supabase.auth.getUser(token);
      if (data?.user) {
        context.locals.user = { id: data.user.id, email: (data.user.email as string) ?? undefined };
        // Cache full auth user for endpoints that need metadata (e.g. /api/users/me)
        context.locals.authUser = data.user;

        // For page requests (not API), build user profile server-side
        // so React can render immediately without a loading flash
        const isPageRequest = !context.url.pathname.startsWith('/api/');
        if (isPageRequest) {
          const user = data.user;
          const userWithMeta = user as {
            user_metadata?: Record<string, unknown>;
            raw_user_meta_data?: Record<string, unknown>;
            created_at?: string;
          };
          const meta = userWithMeta.user_metadata ?? userWithMeta.raw_user_meta_data ?? {};

          const { count } = await supabase
            .from('offers')
            .select('id', { count: 'exact', head: true })
            .eq('owner_id', user.id)
            .eq('status', 'ACTIVE');

          const profile: UserProfileDTO = {
            id: user.id,
            first_name: (meta as { first_name?: string })?.first_name ?? '',
            last_name: (meta as { last_name?: string })?.last_name ?? '',
            email: user.email ?? '',
            created_at: userWithMeta.created_at ?? new Date().toISOString(),
            active_offers_count: count ?? 0,
          };

          context.locals.userProfile = profile;
        }
      } else if (tokenSource === 'cookie') {
        // Cookie token invalid — clear it
        const response = await next();
        return clearAuthCookie(response);
      }
    } catch {
      if (tokenSource === 'cookie') {
        // Cookie token caused an error — clear it
        const response = await next();
        return clearAuthCookie(response);
      }
      // ignore auth errors for header tokens; endpoints may enforce auth as required
    }
  } else {
    // No auth token, create client without special headers
    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  // Attach the request-specific Supabase client to locals
  context.locals.supabase = supabase;

  return next();
});
