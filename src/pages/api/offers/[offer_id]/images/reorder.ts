import type { APIRoute } from 'astro';
import { z } from 'zod';
import { offerIdParamsSchema, reorderImagesSchema } from '../../../../../schemas/offers.schema';
import { createErrorResponse } from '../../../../../utils/errors';
import { OfferService } from '../../../../../services/offer.service';

export const prerender = false;

/**
 * PUT /api/offers/{offer_id}/images/reorder
 *
 * Zmienia kolejność zdjęć oferty. Wymaga autoryzacji jako właściciel oferty.
 *
 * Request Body:
 *  - images: Array<{ id: string, order_index: number }>
 *
 * Response:
 *  - 200 OK: Zaktualizowane zdjęcia (OfferImageDTO[])
 *  - 400 Bad Request: Nieprawidłowe dane wejściowe
 *  - 401 Unauthorized: Brak autoryzacji
 *  - 403 Forbidden: Brak uprawnień (nie właściciel)
 *  - 404 Not Found: Oferta nie istnieje
 *  - 422 Unprocessable Entity: Błąd walidacji
 *  - 500 Internal Server Error: Błąd serwera
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
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
      console.error('[OFFER_IMAGES_REORDER] Supabase client not found in locals');
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
      console.error('[OFFER_IMAGES_REORDER_JSON_PARSE_ERROR]', error);
      return createErrorResponse('VALIDATION_ERROR', 'Nieprawidłowy format JSON', 400);
    }

    // 5. Walidacja danych wejściowych
    let validatedData;
    try {
      validatedData = reorderImagesSchema.parse(requestBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const first = error.errors[0];
        return createErrorResponse('VALIDATION_ERROR', first.message, 422, {
          field: String(first.path.join('.') || 'images'),
        });
      }
      throw error;
    }

    // 6. Zmień kolejność zdjęć
    const service = new OfferService(supabase);

    try {
      const updatedImages = await service.updateImageOrder(offerId, userId, validatedData);

      return new Response(
        JSON.stringify({
          data: updatedImages,
          message: 'Kolejność zdjęć została zaktualizowana',
        }),
        {
          status: 200,
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

      console.error('[OFFER_IMAGES_REORDER_SERVICE_ERROR]', serviceError);
      throw serviceError;
    }
  } catch (error) {
    console.error('[OFFER_IMAGES_REORDER_EXCEPTION]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd', 500);
  }
};

