import type { APIRoute } from 'astro';
import { z } from 'zod';
import { offerIdParamsSchema, updateOfferSchema } from '@/schemas/offers.schema';
import { createErrorResponse } from '@/utils/errors';
import { OfferService } from '@/services/offer.service';
import type { UpdateOfferCommand } from '@/types';

export const prerender = false;

/**
 * GET /api/offers/{offer_id}
 *
 * Zwraca szczegóły oferty (OfferDetailDTO) lub 404 jeśli oferta nie istnieje / RLS nie pozwala.
 *
 * Headers:
 *  - Authorization: Bearer {token} (wymagany - middleware zwykle weryfikuje)
 *
 * Path params:
 *  - offer_id: UUID
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // Walidacja parametrów ścieżki
    try {
      offerIdParamsSchema.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const first = error.errors[0];
        return createErrorResponse('VALIDATION_ERROR', first.message, 400, {
          field: String(first.path[0] || 'offer_id'),
          value: (params as Record<string, unknown>)?.[String(first.path[0] || 'offer_id')],
        });
      }
      throw error;
    }

    const offerId = String(params.offer_id);

    const supabase = locals.supabase;
    if (!supabase) {
      console.error('[OFFERS_GET] Supabase client not found in locals');
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    // Get userId from locals (set by middleware) - optional for this endpoint
    // If user is logged in, we'll show additional info (is_interested, is_owner)
    const userId = locals.user?.id;

    const service = new OfferService(supabase);
    const offer = await service.getOfferById(offerId, userId);

    if (!offer) {
      return createErrorResponse('NOT_FOUND', 'Oferta nie istnieje', 404);
    }

    return new Response(JSON.stringify(offer), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[OFFERS_GET_EXCEPTION]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd', 500);
  }
};

/**
 * PATCH /api/offers/{offer_id}
 *
 * Aktualizuje ofertę (tylko właściciel).
 *
 * Headers:
 *  - Authorization: Bearer {token} (wymagany)
 *  - Content-Type: application/json
 *
 * Path params:
 *  - offer_id: UUID
 *
 * Request Body (wszystkie pola opcjonalne):
 *  - title?: string (5-100 znaków)
 *  - description?: string (10-5000 znaków)
 *  - image_url?: string | null (prawidłowy URL, kończy się .jpg/.jpeg/.png/.webp)
 *  - city?: string (jedna z 16 dostępnych miast)
 *  - status?: 'ACTIVE' | 'REMOVED'
 *
 * Response:
 *  - 200 OK: Zaktualizowana oferta (UpdateOfferResponse)
 *  - 400 Bad Request: Nieprawidłowe dane wejściowe
 *  - 401 Unauthorized: Brak autoryzacji
 *  - 403 Forbidden: Brak uprawnień do edycji tej oferty
 *  - 404 Not Found: Oferta nie istnieje
 *  - 422 Unprocessable Entity: Błąd walidacji
 *  - 500 Internal Server Error: Błąd serwera
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    // 1. Walidacja parametrów ścieżki
    try {
      offerIdParamsSchema.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const first = error.errors[0];
        return createErrorResponse('VALIDATION_ERROR', first.message, 400, {
          field: String(first.path[0] || 'offer_id'),
          value: (params as Record<string, unknown>)?.[String(first.path[0] || 'offer_id')],
        });
      }
      throw error;
    }

    const offerId = String(params.offer_id);

    // 2. Sprawdź klienta Supabase
    const supabase = locals.supabase;
    if (!supabase) {
      console.error('[OFFERS_PATCH] Supabase client not found in locals');
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    // 3. Get userId from locals (set by middleware) - required for PATCH
    const userId = locals.user?.id;
    if (!userId) {
      return createErrorResponse('UNAUTHORIZED', 'Brak autoryzacji', 401);
    }

    // 4. Parse i walidacja request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch (error) {
      console.error('[OFFERS_PATCH_JSON_PARSE_ERROR]', error);
      return createErrorResponse('VALIDATION_ERROR', 'Nieprawidłowy format JSON', 400);
    }

    // 5. Walidacja danych wejściowych
    let validatedData: UpdateOfferCommand;
    try {
      validatedData = updateOfferSchema.parse(requestBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const first = error.errors[0];
        return createErrorResponse('VALIDATION_ERROR', first.message, 422, {
          field: String(first.path[0] || 'unknown'),
          value:
            requestBody && typeof requestBody === 'object'
              ? (requestBody as Record<string, unknown>)[String(first.path[0])]
              : undefined,
        });
      }
      throw error;
    }

    // 6. Wywołaj serwis aktualizacji
    const service = new OfferService(supabase);

    try {
      const updatedOffer = await service.updateOffer(userId, offerId, validatedData);

      return new Response(JSON.stringify(updatedOffer), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (serviceError) {
      // Obsługa specyficznych błędów z serwisu
      const error = serviceError as Error & { code?: string };

      if (error.code === 'NOT_FOUND') {
        return createErrorResponse('NOT_FOUND', 'Oferta nie istnieje', 404);
      }

      if (error.code === 'FORBIDDEN') {
        return createErrorResponse('FORBIDDEN', 'Nie masz uprawnień do edycji tej oferty', 403);
      }

      if (error.code === 'RLS_VIOLATION') {
        return createErrorResponse('FORBIDDEN', 'Naruszenie zasad bezpieczeństwa', 403);
      }

      if (error.code === 'CONSTRAINT_VIOLATION') {
        return createErrorResponse('VALIDATION_ERROR', 'Naruszenie ograniczeń danych', 400);
      }

      // Inne błędy
      console.error('[OFFERS_PATCH_SERVICE_ERROR]', serviceError);
      throw serviceError;
    }
  } catch (error) {
    console.error('[OFFERS_PATCH_EXCEPTION]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd', 500);
  }
};

/**
 * DELETE /api/offers/{offer_id}
 *
 * Soft-delete oferty: ustawia status = 'REMOVED' (tylko właściciel).
 *
 * Headers:
 *  - Authorization: Bearer {token} (wymagany)
 *
 * Response:
 *  - 204 No Content: oferta oznaczona jako REMOVED
 *  - 400 Bad Request: nieprawidłowy offer_id
 *  - 401 Unauthorized: brak autoryzacji
 *  - 403 Forbidden: brak uprawnień
 *  - 404 Not Found: oferta nie istnieje
 *  - 500 Internal Server Error
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // 1) Walidacja parametrów ścieżki
    try {
      offerIdParamsSchema.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const first = error.errors[0];
        return createErrorResponse('VALIDATION_ERROR', first.message, 400, {
          field: String(first.path[0] || 'offer_id'),
          value: (params as Record<string, unknown>)?.[String(first.path[0] || 'offer_id')],
        });
      }
      throw error;
    }

    const offerId = String(params.offer_id);

    // 2) Sprawdź klienta Supabase
    const supabase = locals.supabase;
    if (!supabase) {
      console.error('[OFFERS_DELETE] Supabase client not found in locals');
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    // 3) Get userId from locals (set by middleware) - required for DELETE
    const userId = locals.user?.id;
    if (!userId) {
      return createErrorResponse('UNAUTHORIZED', 'Brak autoryzacji', 401);
    }

    // 4) Soft-delete w serwisie
    const service = new OfferService(supabase);
    try {
      await service.removeOffer(userId, offerId);
    } catch (serviceError) {
      const error = serviceError as Error & { code?: string };

      if (error.code === 'NOT_FOUND') {
        return createErrorResponse('NOT_FOUND', 'Oferta nie istnieje', 404);
      }
      if (error.code === 'FORBIDDEN') {
        return createErrorResponse('FORBIDDEN', 'Nie masz uprawnień do usunięcia tej oferty', 403);
      }
      if (error.code === 'RLS_VIOLATION') {
        return createErrorResponse('FORBIDDEN', 'Naruszenie zasad bezpieczeństwa', 403);
      }

      console.error('[OFFERS_DELETE_SERVICE_ERROR]', serviceError);
      throw serviceError;
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('[OFFERS_DELETE_EXCEPTION]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd', 500);
  }
};
