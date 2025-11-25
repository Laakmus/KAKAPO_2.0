import type { APIRoute } from 'astro';
import { z } from 'zod';
import { offersListQuerySchema, createOfferSchema } from '../../../schemas/offers.schema';
import { createErrorResponse } from '../../../utils/errors';
import { OfferService } from '../../../services/offer.service';

export const prerender = false;

export const GET: APIRoute = async ({ request: _request, locals, url }) => {
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

    // Parse & validate query params
    const searchParams = Object.fromEntries(url.searchParams.entries());
    let validatedQuery;

    try {
      validatedQuery = offersListQuerySchema.parse(searchParams);
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
    const offerService = new OfferService(supabase);
    const result = await offerService.listOffers(validatedQuery);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[OFFERS_LIST_EXCEPTION]', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'Wystąpił błąd podczas pobierania ofert. Spróbuj ponownie później',
      500,
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
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

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse('VALIDATION_ERROR', 'Nieprawidłowe dane wejściowe', 400);
    }

    // Validate input
    let validatedInput;
    try {
      validatedInput = createOfferSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        const statusCode = firstError.code === 'too_small' || firstError.code === 'too_big' ? 422 : 400;
        const fieldKey = String(firstError.path[0] || 'unknown');
        const value = (body as Record<string, unknown>)[fieldKey];

        return createErrorResponse('VALIDATION_ERROR', firstError.message, statusCode, {
          field: fieldKey,
          value,
        });
      }
      throw error;
    }

    // Call service
    const offerService = new OfferService(supabase);

    let result;
    try {
      result = await offerService.createOffer(userId, validatedInput);
    } catch (error) {
      if (error instanceof Error) {
        const code = (error as unknown as { code?: string }).code;
        if (code === 'RLS_VIOLATION' || error.message === 'RLS_VIOLATION') {
          return createErrorResponse('FORBIDDEN', 'Brak uprawnień do wykonania tej operacji', 403);
        }
        if (code === 'CONSTRAINT_VIOLATION' || error.message === 'CONSTRAINT_VIOLATION') {
          return createErrorResponse('VALIDATION_ERROR', 'Dane nie spełniają wymagań bazy danych', 422);
        }
      }
      throw error;
    }

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[CREATE_OFFER_EXCEPTION]', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'Wystąpił błąd podczas tworzenia oferty. Spróbuj ponownie później',
      500,
    );
  }
};
