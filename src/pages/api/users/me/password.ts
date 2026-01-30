import type { APIRoute } from 'astro';
import { z } from 'zod';
import { changePasswordFormSchema } from '../../../../schemas/profile.schema';
import { createErrorResponse } from '../../../../utils/errors';
import type { ChangePasswordCommand } from '../../../../types';

// Wyłączenie pre-renderowania - endpoint musi działać server-side
export const prerender = false;

/**
 * PATCH /api/users/me/password
 *
 * Zmienia hasło aktualnie zalogowanego użytkownika po weryfikacji obecnego hasła.
 *
 * Body:
 * { "current_password": "...", "new_password": "...", "confirm_password": "..." }
 */
export const PATCH: APIRoute = async ({ request, locals }) => {
  try {
    const supabase = locals.supabase;
    if (!supabase) {
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return createErrorResponse('VALIDATION_ERROR', 'Nieprawidłowy format JSON', 400);
    }

    let validatedData: ChangePasswordCommand;
    try {
      validatedData = changePasswordFormSchema.parse(requestBody);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const first = err.errors[0];
        return createErrorResponse('VALIDATION_ERROR', first.message, 422, {
          field: String(first.path[0] ?? 'unknown'),
        });
      }
      throw err;
    }

    const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse('UNAUTHORIZED', 'Brak autoryzacji', 401);
    }
    const token = authHeader.split(' ')[1];

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return createErrorResponse('UNAUTHORIZED', 'Brak autoryzacji', 401);
    }

    const currentUser = userData.user;

    const { error: signinError } = await supabase.auth.signInWithPassword({
      email: currentUser.email ?? '',
      password: validatedData.current_password,
    });

    if (signinError) {
      return createErrorResponse('UNAUTHORIZED', 'Nieprawidłowe hasło', 401);
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error(
        '[USERS_ME_PASSWORD_PATCH_ERROR] Missing config - URL:',
        !!supabaseUrl,
        'ServiceKey:',
        !!supabaseServiceRoleKey,
      );
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(currentUser.id, {
      password: validatedData.new_password,
    });

    if (updateError || !updatedUser?.user) {
      console.error('[USERS_ME_PASSWORD_PATCH_ERROR]', updateError);
      return createErrorResponse('INTERNAL_ERROR', 'Błąd podczas zmiany hasła', 500);
    }

    return new Response(JSON.stringify({ message: 'Hasło zostało zmienione' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[USERS_ME_PASSWORD_PATCH_EXCEPTION]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd', 500);
  }
};
