import type { APIRoute } from 'astro';
import { z } from 'zod';
import { imageIdParamsSchema } from '../../../../../schemas/offers.schema';
import { createErrorResponse } from '../../../../../utils/errors';
import { OfferService } from '../../../../../services/offer.service';

export const prerender = false;

/**
 * DELETE /api/offers/{offer_id}/images/{image_id}
 *
 * Usuwa pojedyncze zdjęcie z oferty. Wymaga autoryzacji jako właściciel oferty.
 *
 * Response:
 *  - 200 OK: Zdjęcie usunięte pomyślnie
 *  - 400 Bad Request: Nieprawidłowe parametry
 *  - 401 Unauthorized: Brak autoryzacji
 *  - 403 Forbidden: Brak uprawnień (nie właściciel)
 *  - 404 Not Found: Zdjęcie nie istnieje
 *  - 500 Internal Server Error: Błąd serwera
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // 1. Walidacja parametrów ścieżki
    try {
      imageIdParamsSchema.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const first = error.errors[0];
        return createErrorResponse('VALIDATION_ERROR', first.message, 400, {
          field: String(first.path[0] || 'image_id'),
          value: (params as Record<string, unknown>)?.[String(first.path[0] || 'image_id')],
        });
      }
      throw error;
    }

    const imageId = String(params.image_id);

    // 2. Pobierz klienta Supabase
    const supabase = locals.supabase;
    if (!supabase) {
      console.error('[OFFER_IMAGE_DELETE] Supabase client not found in locals');
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

    // 4. Usuń zdjęcie
    const service = new OfferService(supabase);

    try {
      await service.deleteOfferImage(imageId, userId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Zdjęcie zostało usunięte',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    } catch (serviceError) {
      const error = serviceError as Error & { code?: string };

      if (error.code === 'NOT_FOUND') {
        return createErrorResponse('NOT_FOUND', 'Zdjęcie nie istnieje', 404);
      }

      if (error.code === 'FORBIDDEN') {
        return createErrorResponse('FORBIDDEN', 'Nie masz uprawnień do usunięcia tego zdjęcia', 403);
      }

      console.error('[OFFER_IMAGE_DELETE_SERVICE_ERROR]', serviceError);
      throw serviceError;
    }
  } catch (error) {
    console.error('[OFFER_IMAGE_DELETE_EXCEPTION]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd', 500);
  }
};
