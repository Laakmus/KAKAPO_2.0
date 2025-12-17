import type { APIRoute } from 'astro';
import { createErrorResponse } from '../../../utils/errors';
import { InterestsService } from '../../../services/interests.service';

export const prerender = false;

/**
 * DELETE /api/interests/{interest_id}
 *
 * Auth required. Only owner of the interest may cancel it.
 */
export const DELETE: APIRoute = async ({ request, params, locals }) => {
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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return createErrorResponse('UNAUTHORIZED', 'Brak autoryzacji', 401);
    }
    const userId = user.id;

    const interestId = params.interest_id ?? '';

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
export const PATCH: APIRoute = async ({ request, params, locals }) => {
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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return createErrorResponse('UNAUTHORIZED', 'Brak autoryzacji', 401);
    }
    const userId = user.id;

    const interestId = params.interest_id ?? '';

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

      console.error('[PATCH_INTEREST_EXCEPTION]', err);
      return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas potwierdzania realizacji', 500);
    }
  } catch (error) {
    console.error('[PATCH_INTEREST_TOP_EXCEPTION]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas potwierdzania realizacji', 500);
  }
};
