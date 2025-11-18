import { defineMiddleware } from 'astro:middleware';

import { supabaseClient } from '../db/supabase.client.ts';

export const onRequest = defineMiddleware((context, next) => {
  context.locals.supabase = supabaseClient;

  try {
    // Extract Bearer token if present and attach user to locals
    const authHeader = context.request.headers.get('authorization') ?? context.request.headers.get('Authorization');
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      // Validate token and resolve user; non-blocking (silently continue on error)
      supabaseClient.auth
        .getUser(token)
        .then(({ data }) => {
          if (data?.user) {
            context.locals.user = { id: data.user.id, email: (data.user.email as string) ?? undefined };
          }
        })
        .catch(() => {
          // ignore auth errors here; endpoints may enforce auth as required
        });
    }

    return next();
  } catch {
    return next();
  }
});
