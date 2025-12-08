import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createErrorResponse } from '../../../utils/errors';
import { InterestsService } from '../../../services/interests.service';

export const prerender = false;

/**
 * DELETE /api/interests/{interest_id}
 *
 * Auth required. Only owner of the interest may cancel it.
 */
export const DELETE: APIRoute = async ({ request: _request, params, locals }) => {
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
      await interestsService.cancelInterest(userId, interestId);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'NOT_FOUND') {
        return createErrorResponse('NOT_FOUND', 'Zainteresowanie nie istnieje', 404);
      }
      if (code === 'FORBIDDEN') {
        return createErrorResponse('FORBIDDEN', 'Brak uprawnień', 403);
      }
      if (code === 'ALREADY_CANCELLED') {
        return createErrorResponse('CONFLICT', 'Zainteresowanie już anulowane', 409);
      }
      if (code === 'DB_ERROR') {
        return createErrorResponse('INTERNAL_ERROR', 'Błąd bazy danych', 500);
      }

      console.error('[DELETE_INTEREST_EXCEPTION]', err);
      return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas anulowania zainteresowania', 500);
    }

    return new Response(JSON.stringify({ message: 'Zainteresowanie zostało anulowane' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[DELETE_INTEREST_TOP_EXCEPTION]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas anulowania zainteresowania', 500);
  }
};

/**
 * PATCH /api/interests/{interest_id}
 *
 * Potwierdzenie realizacji wymiany przez uczestnika.
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
      const result = await interestsService.realizeInterest(userId, interestId);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'NOT_FOUND') {
        return createErrorResponse('NOT_FOUND', 'Zainteresowanie nie istnieje', 404);
      }
      if (code === 'FORBIDDEN') {
        return createErrorResponse('FORBIDDEN', 'Brak uprawnień', 403);
      }
      if (code === 'BAD_STATUS') {
        return createErrorResponse('BAD_REQUEST', 'Status musi być ACCEPTED aby potwierdzić realizację', 400);
      }
      if (code === 'ALREADY_REALIZED') {
        return createErrorResponse('CONFLICT', 'Zainteresowanie już zrealizowane', 409);
      }
      if (code === 'DB_ERROR') {
        return createErrorResponse('INTERNAL_ERROR', 'Błąd bazy danych', 500);
      }

      console.error('[PATCH_INTEREST_EXCEPTION]', err);
      return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas potwierdzania realizacji', 500);
    }
  } catch (error) {
    console.error('[PATCH_INTEREST_TOP_EXCEPTION]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas potwierdzania realizacji', 500);
  }
};
