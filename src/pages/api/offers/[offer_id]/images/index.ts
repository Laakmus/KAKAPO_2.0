import type { APIRoute } from 'astro';
import { z } from 'zod';
import { offerIdParamsSchema, addOfferImagesSchema } from '../../../../../schemas/offers.schema';
import { createErrorResponse } from '../../../../../utils/errors';
import { OfferService } from '../../../../../services/offer.service';

export const prerender = false;

/**
 * GET /api/offers/{offer_id}/images
 *
 * Pobiera wszystkie zdjęcia oferty posortowane po kolejności.
 *
 * Response:
 *  - 200 OK: Lista zdjęć (OfferImageDTO[])
 *  - 400 Bad Request: Nieprawidłowy offer_id
 *  - 404 Not Found: Oferta nie istnieje
 *  - 500 Internal Server Error: Błąd serwera
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // 1. Walidacja parametru ścieżki
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

    // 2. Pobierz klienta Supabase
    const supabase = locals.supabase;
    if (!supabase) {
      console.error('[OFFER_IMAGES_GET] Supabase client not found in locals');
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    // 3. Pobierz zdjęcia
    const service = new OfferService(supabase);
    const images = await service.getOfferImages(offerId);

    return new Response(JSON.stringify({ data: images }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[OFFER_IMAGES_GET_EXCEPTION]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd', 500);
  }
};

/**
 * POST /api/offers/{offer_id}/images
 *
 * Dodaje zdjęcia do oferty. Wymaga autoryzacji jako właściciel oferty.
 *
 * Request Body:
 *  - images: Array<{ image_url: string, thumbnail_url?: string, order_index: number }>
 *
 * Response:
 *  - 201 Created: Lista dodanych zdjęć
 *  - 400 Bad Request: Nieprawidłowe dane wejściowe
 *  - 401 Unauthorized: Brak autoryzacji
 *  - 403 Forbidden: Brak uprawnień (nie właściciel)
 *  - 404 Not Found: Oferta nie istnieje
 *  - 422 Unprocessable Entity: Błąd walidacji lub przekroczono limit zdjęć
 *  - 500 Internal Server Error: Błąd serwera
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    // 1. Walidacja parametru ścieżki
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

    // 2. Pobierz klienta Supabase
    const supabase = locals.supabase;
    if (!supabase) {
      console.error('[OFFER_IMAGES_POST] Supabase client not found in locals');
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    // 3. Pobierz sesję użytkownika
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const userId = session?.user?.id;
    if (!userId) {
      return createErrorResponse('UNAUTHORIZED', 'Brak ważnej sesji użytkownika', 401);
    }

    // 4. Parse i walidacja request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch (error) {
      console.error('[OFFER_IMAGES_POST_JSON_PARSE_ERROR]', error);
      return createErrorResponse('VALIDATION_ERROR', 'Nieprawidłowy format JSON', 400);
    }

    // 5. Walidacja danych wejściowych
    let validatedData;
    try {
      validatedData = addOfferImagesSchema.parse(requestBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const first = error.errors[0];
        return createErrorResponse('VALIDATION_ERROR', first.message, 422, {
          field: String(first.path.join('.') || 'images'),
        });
      }
      throw error;
    }

    // 6. Dodaj zdjęcia
    const service = new OfferService(supabase);

    try {
      const addedImages = await service.addOfferImages(offerId, userId, validatedData);

      return new Response(
        JSON.stringify({
          data: addedImages,
          message: `Dodano ${addedImages.length} zdjęć`,
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    } catch (serviceError) {
      const error = serviceError as Error & { code?: string };

      if (error.code === 'NOT_FOUND') {
        return createErrorResponse('NOT_FOUND', 'Oferta nie istnieje', 404);
      }

      if (error.code === 'FORBIDDEN') {
        return createErrorResponse('FORBIDDEN', 'Nie masz uprawnień do edycji tej oferty', 403);
      }

      if (error.code === 'MAX_IMAGES_EXCEEDED') {
        return createErrorResponse('VALIDATION_ERROR', error.message, 422);
      }

      console.error('[OFFER_IMAGES_POST_SERVICE_ERROR]', serviceError);
      throw serviceError;
    }
  } catch (error) {
    console.error('[OFFER_IMAGES_POST_EXCEPTION]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd', 500);
  }
};

