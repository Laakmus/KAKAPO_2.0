import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createErrorResponse, handleAuthError } from '../../../utils/errors';
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
      return createErrorResponse('UNAUTHORIZED', 'Token nieprawidłowy lub wygasł', 401);
    }

    const user = userData.user;
    const userWithMeta = user as {
      user_metadata?: Record<string, unknown>;
      raw_user_meta_data?: Record<string, unknown>;
      created_at?: string;
    };
    const meta = userWithMeta.user_metadata ?? userWithMeta.raw_user_meta_data ?? {};

    // Policz aktywne oferty użytkownika
    const { count, error: countError } = await supabase
      .from('offers')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .eq('status', 'ACTIVE');

    if (countError) {
      console.error('[USERS_ME_GET_COUNT_ERROR]', countError);
      return createErrorResponse('INTERNAL_ERROR', 'Błąd podczas pobierania liczby ofert', 500);
    }

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
      return createErrorResponse('UNAUTHORIZED', 'Token nieprawidłowy lub wygasł', 401);
    }

    const user = userData.user;

    // Parsowanie body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return createErrorResponse('VALIDATION_ERROR', 'Nieprawidłowy format JSON', 400);
    }

    // Walidacja danych
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

    // Aktualizacja metadanych użytkownika w Supabase Auth
    const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({
      data: {
        first_name: validatedData.first_name,
        last_name: validatedData.last_name,
      },
    });

    if (updateError) {
      console.error('[USERS_ME_PATCH_ERROR]', updateError);
      return createErrorResponse('INTERNAL_ERROR', 'Błąd podczas aktualizacji profilu', 500);
    }

    if (!updatedUser?.user) {
      return createErrorResponse('INTERNAL_ERROR', 'Błąd podczas aktualizacji profilu', 500);
    }

    // Policz aktywne oferty użytkownika
    const { count, error: countError } = await supabase
      .from('offers')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .eq('status', 'ACTIVE');

    if (countError) {
      console.error('[USERS_ME_PATCH_COUNT_ERROR]', countError);
      return createErrorResponse('INTERNAL_ERROR', 'Błąd podczas pobierania liczby ofert', 500);
    }

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

    // Parsowanie body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return createErrorResponse('VALIDATION_ERROR', 'Nieprawidłowy format JSON', 400);
    }

    // Walidacja hasła
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

    // Pobranie użytkownika z tokena
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return createErrorResponse('UNAUTHORIZED', 'Token nieprawidłowy lub wygasł', 401);
    }
    const currentUser = userData.user;

    // Weryfikacja hasła poprzez próbę zalogowania (security: nie ujawniamy szczegółów)
    try {
      const { error: signinError, data: signinData } = await supabase.auth.signInWithPassword({
        email: currentUser.email ?? '',
        password,
      });

      if (signinError) {
        return createErrorResponse('UNAUTHORIZED', 'Nieprawidłowe hasło', 401);
      }

      // Dodatkowa weryfikacja identyfikatora użytkownika (safety)
      if (!signinData?.user || signinData.user.id !== currentUser.id) {
        return createErrorResponse('UNAUTHORIZED', 'Nieprawidłowe dane uwierzytelniające', 401);
      }
    } catch (err: unknown) {
      // Mapowanie znanych błędów auth
      const error = err as { message?: string };
      if (error?.message && typeof error.message === 'string') {
        return handleAuthError(error as Error);
      }
      console.error('[USERS_ME_VERIFY_PASSWORD_ERROR]', err);
      return createErrorResponse('INTERNAL_ERROR', 'Błąd podczas weryfikacji hasła', 500);
    }

    // Wywołanie serwisu usuwania konta
    try {
      await UserService.deleteUser({ userId: currentUser.id, password }, supabase);
      return new Response(JSON.stringify({ message: 'Konto zostało usunięte' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: unknown) {
      const status = Number((err as { status?: number })?.status) || 500;
      if (status === 404) {
        return createErrorResponse('NOT_FOUND', 'Użytkownik nie znaleziony', 404);
      }
      if (status === 501) {
        return createErrorResponse('NOT_IMPLEMENTED', 'Operacja nieobsługiwana przez serwer', 501);
      }
      console.error('[USERS_ME_DELETE_ERROR]', err);
      return createErrorResponse('INTERNAL_ERROR', 'Błąd podczas usuwania konta', 500);
    }
  } catch (error) {
    console.error('[USERS_ME_DELETE_EXCEPTION]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd', 500);
  }
};
