import type { APIRoute } from 'astro';
import { z } from 'zod';
import { listInterestsSchema, type ListInterestsInput } from '../../../../schemas/offers.schema';
import { createErrorResponse } from '../../../../utils/errors';
import type { InterestListItemDTO, Paginated } from '../../../../types';

export const prerender = false;

/**
 * GET /api/offers/{offer_id}/interests
 *
 * Zwraca paginowaną listę zainteresowań przypisanych do oferty.
 * Tylko właściciel oferty ma do tego dostęp.
 */
export const GET: APIRoute = async ({ params, request, locals }) => {
  try {
    // 1. Walidacja parametru ścieżki
    if (!params?.offer_id) {
      return createErrorResponse('VALIDATION_ERROR', 'ID oferty jest wymagane', 400);
    }

    // 2. Parsowanie query params
    const url = new URL(request.url);
    const pageRaw = url.searchParams.get('page');
    const limitRaw = url.searchParams.get('limit');
    const statusRaw = url.searchParams.get('status');

    // 3. Złożenie obiektu do walidacji (łączy path + query)
    const inputForValidation: Record<string, unknown> = {
      offer_id: params.offer_id,
    };

    // Dodaj tylko te parametry, które istnieją (dla prawidłowego działania .default())
    if (pageRaw !== null) {
      inputForValidation.page = pageRaw;
    }
    if (limitRaw !== null) {
      inputForValidation.limit = limitRaw;
    }
    if (statusRaw !== null) {
      inputForValidation.status = statusRaw;
    }

    let validated: ListInterestsInput;
    try {
      validated = listInterestsSchema.parse(inputForValidation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const first = error.errors[0];
        return createErrorResponse('VALIDATION_ERROR', first.message, 400, {
          field: String(first.path?.[0] || 'unknown'),
        });
      }
      throw error;
    }

    // 4. Supabase client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (locals as any).supabase;
    if (!supabase) {
      console.error('[GET_OFFER_INTERESTS] Supabase client missing in locals');
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    // 5. Autoryzacja - wymagamy zalogowanego użytkownika
    const requesterId = locals.user?.id;
    if (!requesterId) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        return createErrorResponse('UNAUTHORIZED', 'Brak autoryzacji', 401);
      }
    }

    const userId = (locals.user?.id as string) || (await supabase.auth.getSession()).data?.session?.user?.id;
    if (!userId) {
      return createErrorResponse('UNAUTHORIZED', 'Brak autoryzacji', 401);
    }

    // 6. Sprawdź czy oferta istnieje i czy requester jest właścicielem
    const { data: offerRow, error: offerError } = await supabase
      .from('offers')
      .select('id, owner_id')
      .eq('id', validated.offer_id)
      .single();

    if (offerError || !offerRow) {
      return createErrorResponse('NOT_FOUND', 'Oferta nie istnieje', 404);
    }

    if (offerRow.owner_id !== userId) {
      return createErrorResponse('FORBIDDEN', 'Brak uprawnień do przeglądania zainteresowań', 403);
    }

    // 7. Pobierz listę zainteresowań (paginacja + opcjonalny filtr status)
    const from = (validated.page - 1) * validated.limit;
    const to = from + validated.limit - 1;

    let query = supabase
      .from('interests')
      .select('id, offer_id, user_id, status, created_at', { count: 'exact' })
      .eq('offer_id', validated.offer_id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (validated.status) {
      query = query.eq('status', validated.status);
    }

    const { data: rows, error: rowsError, count } = await query;

    if (rowsError) {
      console.error('[GET_OFFER_INTERESTS_ERROR]', rowsError);
      return createErrorResponse('INTERNAL_ERROR', 'Błąd podczas pobierania zainteresowań', 500);
    }

    // 8. Pobierz dane użytkowników dla znalezionych interests
    const userIds = (rows || []).map((r) => r.user_id);
    const { data: usersData } = await supabase.from('users').select('id, first_name, last_name').in('id', userIds);

    // Stwórz mapę user_id -> user_name
    const userMap = new Map<string, string>();
    (usersData || []).forEach((u: Record<string, unknown>) => {
      const firstName = String(u.first_name || '');
      const lastName = String(u.last_name || '');
      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName) {
        userMap.set(u.id as string, fullName);
      }
    });

    const items: InterestListItemDTO[] = (rows || []).map((r: Record<string, unknown>) => {
      return {
        id: r.id as string,
        offer_id: r.offer_id as string,
        user_id: r.user_id as string,
        status: r.status as string,
        created_at: r.created_at as string,
        user_name: userMap.get(r.user_id as string),
      } as InterestListItemDTO;
    });

    const total = typeof count === 'number' ? count : items.length;
    const totalPages = Math.max(1, Math.ceil(total / validated.limit));

    const responseBody: Paginated<InterestListItemDTO> = {
      data: items,
      pagination: {
        page: validated.page,
        limit: validated.limit,
        total,
        total_pages: totalPages,
      },
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[GET_OFFER_INTERESTS_EXCEPTION]', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas pobierania zainteresowań', 500);
  }
};
