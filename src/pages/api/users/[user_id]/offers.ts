import type { APIRoute } from 'astro';
import { z } from 'zod';
import { userIdParamSchema } from '../../../../schemas/offers.schema';
import { createErrorResponse } from '../../../../utils/errors';
import OfferService from '../../../../services/offer.service';

export const prerender = false;

/**
 * GET /api/users/{user_id}/offers
 *
 * Zwraca listę aktywnych ofert innego użytkownika.
 * Wymaga nagłówka Authorization: Bearer {token}
 */
export const GET: APIRoute = async ({ params, request, locals }) => {
  try {
    const supabase = locals.supabase;
    if (!supabase) {
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    // Auth: wymagamy tokena Bearer
    const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse('UNAUTHORIZED', 'Brak autoryzacji', 401);
    }
    const token = authHeader.split(' ')[1];

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return createErrorResponse('UNAUTHORIZED', 'Token nieprawidłowy lub wygasł', 401);
    }

    // Walidacja parametru ścieżki
    let validatedParams;
    try {
      validatedParams = userIdParamSchema.parse(params);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const first = err.errors[0];
        return createErrorResponse('VALIDATION_ERROR', first.message, 400, {
          field: String(first.path[0] ?? 'user_id'),
        });
      }
      throw err;
    }

    const { user_id } = validatedParams;

    // Wywołanie serwisu
    const offerService = new OfferService(supabase);
    try {
      const offers = await offerService.getUserOffers(user_id);
      return new Response(JSON.stringify({ data: offers }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      if (errObj.code === 'USER_NOT_FOUND' || String(errObj.message).toLowerCase().includes('nie został znaleziony')) {
        return createErrorResponse('USER_NOT_FOUND', 'Użytkownik nie został znaleziony', 404);
      }
      console.error('[USER_OFFERS_SERVICE_ERROR]', err);
      return createErrorResponse(
        'INTERNAL_ERROR',
        'Wystąpił błąd podczas pobierania ofert. Spróbuj ponownie później',
        500,
      );
    }
  } catch (error) {
    console.error('[USER_OFFERS_EXCEPTION]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd', 500);
  }
};
