import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createErrorResponse } from '../../../../utils/errors';
import { InterestsService } from '../../../../services/interests.service';

export const prerender = false;

/**
 * PATCH /api/interests/{interest_id}/unrealize
 *
 * Cofnięcie potwierdzenia realizacji przez inicjatora zainteresowania.
 * Auth required.
 */
export const PATCH: APIRoute = async ({ request: _request, params, locals }) => {
  try {
    const supabase = locals.supabase;
    if (!supabase) {
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    // Enforce auth
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session) {
      return createErrorResponse('UNAUTHORIZED', 'Brak autoryzacji', 401);
    }
    const userId = session.user.id;

    // Extract interest_id from params
    const interestId = params.interest_id ?? '';

    // Validate interest_id (UUID)
    try {
      z.object({ interest_id: z.string().uuid() }).parse({ interest_id: interestId });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const first = err.errors[0];
        return createErrorResponse('VALIDATION_ERROR', first.message, 400, {
          field: String(first.path[0] || 'interest_id'),
        });
      }
      throw err;
    }

    const interestsService = new InterestsService(supabase);
    try {
      const result = await interestsService.unrealizeInterest(userId, interestId);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      const code = (err as any)?.code as string | undefined;
      if (code === 'NOT_FOUND') {
        return createErrorResponse('NOT_FOUND', 'Zainteresowanie nie istnieje', 404);
      }
      if (code === 'FORBIDDEN') {
        return createErrorResponse('FORBIDDEN', 'Brak uprawnień', 403);
      }
      // Jeżeli już zrealizowane -> 400 Bad Request
      if (code === 'ALREADY_REALIZED') {
        return createErrorResponse('BAD_REQUEST', 'Nie można anulować - wymiana już została zrealizowana', 400);
      }
      if (code === 'DB_ERROR') {
        return createErrorResponse('INTERNAL_ERROR', 'Błąd bazy danych', 500);
      }

      console.error('[UNREALIZE_INTEREST_EXCEPTION]', err);
      return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas cofania potwierdzenia realizacji', 500);
    }
  } catch (error) {
    console.error('[UNREALIZE_INTEREST_TOP_EXCEPTION]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas cofania potwierdzenia realizacji', 500);
  }
};
