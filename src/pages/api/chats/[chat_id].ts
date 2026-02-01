import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createErrorResponse } from '../../../utils/errors';
import { chatIdParamsSchema } from '../../../schemas/chats.schema';
import ChatsService from '../../../services/chats.service';

export const prerender = false;

/**
 * GET /api/chats/:chat_id
 *
 * Zwraca szczegóły czatu (tylko dla uczestników).
 * Response zawiera:
 * - id czatu
 * - user_a i user_b (id + name)
 * - status czatu
 * - created_at
 */
export const GET: APIRoute = async ({ params, locals }) => {
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

    // Walidacja parametru chat_id
    let validatedParams: z.infer<typeof chatIdParamsSchema>;
    try {
      validatedParams = chatIdParamsSchema.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return createErrorResponse('VALIDATION_ERROR', firstError.message, 400, {
          field: String(firstError.path[0] || 'unknown'),
        });
      }
      throw error;
    }

    const chatId = validatedParams.chat_id;

    // Call service - get full details with interests
    const chatsService = new ChatsService(supabase);
    let result;
    try {
      result = await chatsService.getChatDetailsWithInterests(chatId, userId);
    } catch (error) {
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message === 'CHAT_NOT_FOUND') {
          return createErrorResponse('NOT_FOUND', 'Czat nie istnieje', 404);
        }
        if (error.message === 'ACCESS_DENIED') {
          return createErrorResponse('FORBIDDEN', 'Brak uprawnień do tego czatu', 403);
        }
      }
      console.error('[GET_CHAT_DETAILS_EXCEPTION]', error);
      return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas pobierania czatu', 500);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[GET_CHAT_DETAILS_TOP_EXCEPTION]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd', 500);
  }
};
