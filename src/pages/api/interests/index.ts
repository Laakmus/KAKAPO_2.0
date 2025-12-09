import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createErrorResponse } from '../../../utils/errors';
import { createInterestSchema } from '../../../schemas/interests.schema';
import { InterestsService } from '../../../services/interests.service';
import { authenticateRequest } from '../../../utils/auth';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const { request, locals } = context;
    const supabase = locals.supabase;
    if (!supabase) {
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    // Authenticate and set up session for RLS
    const userId = await authenticateRequest(context);
    if (!userId) {
      return createErrorResponse('UNAUTHORIZED', 'Brak autoryzacji', 401);
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse('VALIDATION_ERROR', 'Nieprawidłowe dane wejściowe', 400);
    }

    // Validate input
    let validatedInput: z.infer<typeof createInterestSchema>;
    try {
      validatedInput = createInterestSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        const fieldKey = String(firstError.path[0] || 'unknown');
        const value = (body as Record<string, unknown>)[fieldKey];
        return createErrorResponse('VALIDATION_ERROR', firstError.message, 422, {
          field: fieldKey,
          value,
        });
      }
      throw error;
    }

    // Call service
    const interestsService = new InterestsService(supabase);

    let result: Awaited<ReturnType<InterestsService['expressInterest']>>;
    try {
      result = await interestsService.expressInterest(userId, validatedInput);
    } catch (error) {
      if (error instanceof Error) {
        const code = (error as unknown as { code?: string }).code;
        if (code === 'OWN_OFFER') {
          return createErrorResponse('BAD_REQUEST', 'Nie możesz być zainteresowany własną ofertą', 400);
        }
        if (code === 'DUPLICATE') {
          return createErrorResponse('CONFLICT', 'Już wyraziłeś zainteresowanie tą ofertą', 409);
        }
        if (code === 'NOT_FOUND') {
          return createErrorResponse('NOT_FOUND', 'Nie znaleziono oferty', 404);
        }
        if (code === 'RLS_VIOLATION') {
          return createErrorResponse('FORBIDDEN', 'Brak uprawnień do wykonania tej operacji', 403);
        }
      }
      console.error('[CREATE_INTEREST_EXCEPTION]', error);
      return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas zapisywania zainteresowania', 500);
    }

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[CREATE_INTEREST_EXCEPTION_TOP]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas zapisywania zainteresowania', 500);
  }
};
