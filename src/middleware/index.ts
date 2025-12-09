import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_KEY;

export const onRequest = defineMiddleware(async (context, next) => {
  // Extract Bearer token if present
  const authHeader = context.request.headers.get('authorization') ?? context.request.headers.get('Authorization');
  let supabase;

  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

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
      }
    } catch {
      // ignore auth errors here; endpoints may enforce auth as required
    }
  } else {
    // No auth token, create client without special headers
    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  // Attach the request-specific Supabase client to locals
  context.locals.supabase = supabase;

  return next();
});
