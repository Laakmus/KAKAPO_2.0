import type { APIRoute } from 'astro';
import { z } from 'zod';
import AuthService from '../../../services/auth.service';
import { createErrorResponse } from '../../../utils/errors';

// Wyłączenie pre-renderowania - endpoint musi działać w trybie server-side
export const prerender = false;

const logoutSchema = z.object({
  allDevices: z.boolean().optional(),
  sessionId: z.string().uuid().optional(),
});

/**
 * POST /api/auth/logout
 *
 * Wyciąga token z nagłówka Authorization: Bearer {token}, weryfikuje go poprzez Supabase
 * i wykonuje unieważnienie sesji (jeśli to możliwe). Operacja jest idempotentna.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parsowanie body, body jest opcjonalne
    let body: unknown = {};
    try {
      body = await request.json().catch(() => ({}));
    } catch {
      return createErrorResponse('VALIDATION_ERROR', 'Nieprawidłowy format JSON', 400);
    }

    // Walidacja body
    try {
      logoutSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const first = error.errors[0];
        return createErrorResponse('VALIDATION_ERROR', first.message, 400, {
          field: String(first.path[0] || 'unknown'),
          value: undefined,
        });
      }
      throw error;
    }

    const { allDevices, sessionId } = body as { allDevices?: boolean; sessionId?: string };

    // Authorization header
    const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
    if (!authHeader || typeof authHeader !== 'string') {
      return createErrorResponse('UNAUTHORIZED', 'Brak nagłówka Authorization', 401);
    }

    if (!authHeader.startsWith('Bearer ')) {
      return createErrorResponse('UNAUTHORIZED', 'Nieprawidłowy format nagłówka Authorization', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return createErrorResponse('UNAUTHORIZED', 'Brak tokena w nagłówku Authorization', 401);
    }

    const supabase = locals.supabase;
    if (!supabase) {
      console.error('[AUTH_LOGOUT] Supabase client not found in locals');
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    // Weryfikacja tokena przez Supabase
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return createErrorResponse('UNAUTHORIZED', 'Token nieprawidłowy lub wygasł', 401);
    }

    const userId = userData.user.id;

    try {
      await AuthService.revokeSession({ userId, sessionId, allDevices }, supabase);
    } catch (err: unknown) {
      const status = Number((err as { status?: number })?.status) || 500;
      if (status === 501) {
        return createErrorResponse('NOT_IMPLEMENTED', 'Operacja wymaga wsparcia serwera (not implemented)', 501);
      }
      if (status === 404) {
        return createErrorResponse('NOT_FOUND', 'Nie znaleziono sesji', 404);
      }
      console.error('[AUTH_LOGOUT_ERROR]', err);
      return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas wylogowywania', 500);
    }

    return new Response(JSON.stringify({ message: 'Wylogowano pomyślnie' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[AUTH_LOGOUT_EXCEPTION]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd', 500);
  }
};
