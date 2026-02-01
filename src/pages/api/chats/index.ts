import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createErrorResponse } from '../../../utils/errors';
import { listChatsQuerySchema } from '../../../schemas/chats.schema';
import ChatsService from '../../../services/chats.service';

export const prerender = false;

/**
 * GET /api/chats
 *
 * Zwraca listę czatów zalogowanego użytkownika.
 * Query params:
 *  - status?: 'ACTIVE' | 'ARCHIVED' (domyślnie 'ACTIVE')
 *  - limit?: number
 *  - offset?: number
 */
export const GET: APIRoute = async ({ request: _request, url, locals }) => {
  try {
    const supabase = locals.supabase;
    if (!supabase) {
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    // Get userId from locals (set by middleware) - required
    const userId = locals.user?.id;
    if (!userId) {
      return createErrorResponse('UNAUTHORIZED', 'Brak autoryzacji', 401);
    }

    // Parsowanie i walidacja query params
    const searchParams = Object.fromEntries(url.searchParams.entries());
    let validatedQuery: z.infer<typeof listChatsQuerySchema>;
    try {
      validatedQuery = listChatsQuerySchema.parse(searchParams);
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
    const chatsService = new ChatsService(supabase);
    let result;
    try {
      result = await chatsService.listChats(userId, {
        status: validatedQuery.status,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
      });
    } catch (error) {
      console.error('[GET_CHATS_EXCEPTION]', error);
      return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas pobierania czatów', 500);
    }

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[GET_CHATS_TOP_EXCEPTION]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd', 500);
  }
};
