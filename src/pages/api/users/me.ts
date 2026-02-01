import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createErrorResponse } from '../../../utils/errors';
import UserService from '../../../services/user.service';

// Wyłączenie pre-renderowania - endpoint musi działać server-side
export const prerender = false;

const passwordSchema = z.object({
  password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków'),
});

const updateProfileSchema = z.object({
  first_name: z
    .string({ required_error: 'Imię jest wymagane' })
    .min(1, 'Imię jest wymagane')
    .max(100, 'Imię nie może przekraczać 100 znaków'),
  last_name: z
    .string({ required_error: 'Nazwisko jest wymagane' })
    .min(1, 'Nazwisko jest wymagane')
    .max(100, 'Nazwisko nie może przekraczać 100 znaków'),
});

/**
 * GET /api/users/me
 *
 * Zwraca profil zalogowanego użytkownika.
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const supabase = locals.supabase;
    if (!supabase) {
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
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

    const user = userData.user;
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

    const profile = {
      id: user.id,
      first_name: (meta as { first_name?: string })?.first_name ?? '',
      last_name: (meta as { last_name?: string })?.last_name ?? '',
      email: user.email ?? '',
      created_at: userWithMeta.created_at ?? new Date().toISOString(),
      active_offers_count: count ?? 0,
    };

    return new Response(JSON.stringify(profile), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[USERS_ME_GET_EXCEPTION]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd', 500);
  }
};

/**
 * PATCH /api/users/me
 *
 * Aktualizuje profil zalogowanego użytkownika (imię i nazwisko).
 *
 * Body:
 * { "first_name": "...", "last_name": "..." }
 */
export const PATCH: APIRoute = async ({ request, locals }) => {
  try {
    const supabase = locals.supabase;
    if (!supabase) {
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
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

    const user = userData.user;

    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return createErrorResponse('VALIDATION_ERROR', 'Nieprawidłowy format JSON', 400);
    }

    let validatedData: { first_name: string; last_name: string };
    try {
      validatedData = updateProfileSchema.parse(requestBody);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const first = err.errors[0];
        return createErrorResponse('VALIDATION_ERROR', first.message, 422, {
          field: String(first.path[0] ?? 'unknown'),
        });
      }
      throw err;
    }

    // Utwórz Admin klienta Supabase z service role key
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error(
        '[USERS_ME_PATCH_ERROR] Missing config - URL:',
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

    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        first_name: validatedData.first_name,
        last_name: validatedData.last_name,
      },
    });

    if (updateError || !updatedUser?.user) {
      console.error('[USERS_ME_PATCH_ERROR]', updateError);
      return createErrorResponse('INTERNAL_ERROR', 'Błąd podczas aktualizacji profilu', 500);
    }

    const { count } = await supabase
      .from('offers')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .eq('status', 'ACTIVE');

    const profile = {
      id: updatedUser.user.id,
      first_name: validatedData.first_name,
      last_name: validatedData.last_name,
      email: updatedUser.user.email ?? '',
      created_at: (updatedUser.user as { created_at?: string })?.created_at ?? new Date().toISOString(),
      active_offers_count: count ?? 0,
    };

    return new Response(JSON.stringify(profile), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[USERS_ME_PATCH_EXCEPTION]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd', 500);
  }
};

/**
 * DELETE /api/users/me
 *
 * Usuwa konto aktualnie zalogowanego użytkownika po weryfikacji hasła.
 *
 * Body:
 * { "password": "..." }
 */
export const DELETE: APIRoute = async ({ request, locals }) => {
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

    try {
      passwordSchema.parse(requestBody);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const first = err.errors[0];
        return createErrorResponse('VALIDATION_ERROR', first.message, 422, {
          field: String(first.path[0] ?? 'password'),
        });
      }
      throw err;
    }

    const { password } = requestBody as { password: string };

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
      password,
    });

    if (signinError) {
      return createErrorResponse('UNAUTHORIZED', 'Nieprawidłowe hasło', 401);
    }

    await UserService.deleteUser({ userId: currentUser.id, password }, supabase);
    return new Response(JSON.stringify({ message: 'Konto zostało usunięte' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[USERS_ME_DELETE_EXCEPTION]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Błąd podczas usuwania konta', 500);
  }
};
