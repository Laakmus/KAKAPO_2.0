import type { APIRoute } from 'astro';
import { z } from 'zod';
import { myOffersQuerySchema } from '../../../schemas/offers.schema';
import { createErrorResponse } from '../../../utils/errors';
import { OfferService } from '../../../services/offer.service';

// Wyłączenie pre-renderowania - endpoint działa tylko server-side
export const prerender = false;

/**
 * GET /api/offers/my
 *
 * Zwraca listę ofert należących do aktualnie zalogowanego użytkownika.
 * Query params:
 *  - status: 'ACTIVE' | 'REMOVED' (opcjonalne, domyślnie 'ACTIVE')
 */
export const GET: APIRoute = async ({ locals, url }) => {
  try {
    // supabase klient jest w locals (middleware)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (locals as any).supabase;
    if (!supabase) {
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    // Pobranie sesji/auth - jeśli brak -> 401
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session) {
      return createErrorResponse('UNAUTHORIZED', 'Brak autoryzacji', 401);
    }

    const userId = session.user.id;

    // Parsowanie i walidacja query params
    const searchParams = Object.fromEntries(url.searchParams.entries());
    let validatedQuery;
    try {
      validatedQuery = myOffersQuerySchema.parse(searchParams);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const first = err.errors[0];
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Nieprawidłowa wartość parametru status. Dozwolone: ACTIVE, REMOVED',
          400,
          { field: String(first.path[0] ?? 'status') },
        );
      }
      throw err;
    }

    // Wywołanie serwisu
    const offerService = new OfferService(supabase);
    const offers = await offerService.getMyOffers(userId, validatedQuery.status);

    return new Response(JSON.stringify({ data: offers }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[MY_OFFERS_EXCEPTION]', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'Wystąpił błąd podczas pobierania ofert. Spróbuj ponownie później',
      500,
    );
  }
};
