import type { APIRoute } from 'astro';
import { z } from 'zod';
import { offerIdParamsSchema } from '../../../schemas/offers.schema';
import { createErrorResponse } from '../../../utils/errors';
import { OfferService } from '../../../services/offer.service';

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

    // Pobranie sesji (jeśli brakujący, traktujemy jako unauthorized)
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const userId = session?.user?.id;
    if (!userId) {
      return createErrorResponse('UNAUTHORIZED', 'Brak ważnej sesji użytkownika', 401);
    }

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
