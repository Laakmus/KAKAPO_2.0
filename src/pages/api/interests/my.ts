import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createErrorResponse } from '../../../utils/errors';
import { myInterestsQuerySchema } from '../../../schemas/interests.schema';
import { InterestsService } from '../../../services/interests.service';

export const prerender = false;

export const GET: APIRoute = async ({ request: _request, url, locals }) => {
  try {
    const supabase = locals.supabase;
    if (!supabase) {
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    // Auth check
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session) {
      return createErrorResponse('UNAUTHORIZED', 'Brak autoryzacji', 401);
    }

    const userId = session.user.id;

    // Parse & validate query params
    const searchParams = Object.fromEntries(url.searchParams.entries());
    let validatedQuery;
    try {
      validatedQuery = myInterestsQuerySchema.parse(searchParams);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return createErrorResponse('VALIDATION_ERROR', firstError.message, 400, {
          field: String(firstError.path[0] || 'unknown'),
        });
      }
      throw error;
    }

    // Call service
    const interestsService = new InterestsService(supabase);
    let result;
    try {
      result = await interestsService.getMyInterests(userId, validatedQuery.status);
    } catch (error) {
      console.error('[GET_MY_INTERESTS_EXCEPTION]', error);
      return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas pobierania zainteresowań', 500);
    }

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[GET_MY_INTERESTS_EXCEPTION_TOP]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas pobierania zainteresowań', 500);
  }
};
