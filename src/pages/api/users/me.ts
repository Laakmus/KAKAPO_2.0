import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createErrorResponse, handleAuthError } from '../../../utils/errors';
import UserService from '../../../services/user.service';

// Wyłączenie pre-renderowania - endpoint musi działać server-side
export const prerender = false;

const passwordSchema = z.object({
  password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków'),
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
    const meta = (user as any).user_metadata ?? (user as any).raw_user_meta_data ?? {};
    const profile = {
      id: user.id,
      first_name: (meta as any)?.first_name ?? null,
      last_name: (meta as any)?.last_name ?? null,
      created_at: (user as any)?.created_at ?? undefined,
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
      const { error: signinError, data: signinData } = await (supabase.auth as any).signInWithPassword({
        email: currentUser.email ?? '',
        password,
      });

      if (signinError) {
        return createErrorResponse('UNAUTHORIZED', 'Nieprawidłowe hasło', 401);
      }

      // Dodatkowa weryfikacja identyfikatora użytkownika (safety)
      if (!signinData?.user || (signinData.user as any).id !== currentUser.id) {
        return createErrorResponse('UNAUTHORIZED', 'Nieprawidłowe dane uwierzytelniające', 401);
      }
    } catch (err: any) {
      // Mapowanie znanych błędów auth
      if (err?.message && typeof err.message === 'string') {
        return handleAuthError(err);
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
    } catch (err: any) {
      const status = Number(err?.status) || 500;
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
