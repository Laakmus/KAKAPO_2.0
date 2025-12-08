import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createErrorResponse } from '../../../../utils/errors';
import { chatIdParamsSchema, listMessagesQuerySchema, createMessageSchema } from '../../../../schemas/chats.schema';
import ChatsService from '../../../../services/chats.service';

export const prerender = false;

/**
 * GET /api/chats/:chat_id/messages
 *
 * Zwraca listę wiadomości z czatu (tylko dla uczestników).
 * Query params:
 *  - page?: number (default 1)
 *  - limit?: number (default 50, max 100)
 *  - order?: 'asc' | 'desc' (default 'asc')
 */
export const GET: APIRoute = async ({ params, url, locals }) => {
  try {
    const supabase = locals.supabase;
    if (!supabase) {
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    // Auth - uzyskaj sesję
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session) {
      return createErrorResponse('UNAUTHORIZED', 'Brak autoryzacji', 401);
    }
    const userId = session.user.id;

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

    // Parsowanie i walidacja query params
    const searchParams = Object.fromEntries(url.searchParams.entries());
    let validatedQuery: z.infer<typeof listMessagesQuerySchema>;
    try {
      validatedQuery = listMessagesQuerySchema.parse(searchParams);
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
      result = await chatsService.listMessages(chatId, userId, {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        order: validatedQuery.order,
      });
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
      console.error('[GET_MESSAGES_EXCEPTION]', error);
      return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas pobierania wiadomości', 500);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[GET_MESSAGES_TOP_EXCEPTION]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd', 500);
  }
};

/**
 * POST /api/chats/:chat_id/messages
 *
 * Wysyła wiadomość w czacie (tylko dla uczestników).
 * Request body:
 *  - body: string (1-2000 znaków)
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const supabase = locals.supabase;
    if (!supabase) {
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    // Auth - uzyskaj sesję
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session) {
      return createErrorResponse('UNAUTHORIZED', 'Brak autoryzacji', 401);
    }
    const userId = session.user.id;

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

    // Parsowanie i walidacja body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return createErrorResponse('VALIDATION_ERROR', 'Nieprawidłowy format JSON', 400);
    }

    let validatedBody: z.infer<typeof createMessageSchema>;
    try {
      validatedBody = createMessageSchema.parse(requestBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return createErrorResponse('VALIDATION_ERROR', firstError.message, 422, {
          field: String(firstError.path[0] || 'unknown'),
        });
      }
      throw error;
    }

    // Call service
    const chatsService = new ChatsService(supabase);
    let result;
    try {
      result = await chatsService.sendMessage(chatId, userId, validatedBody.body);
    } catch (err) {
      // Handle specific errors
      if (err instanceof Error) {
        if (err.message === 'CHAT_NOT_FOUND') {
          return createErrorResponse('NOT_FOUND', 'Czat nie istnieje', 404);
        }
        if (err.message === 'ACCESS_DENIED') {
          return createErrorResponse('FORBIDDEN', 'Brak uprawnień do tego czatu', 403);
        }
      }
      console.error('[POST_MESSAGE_EXCEPTION]', err);
      return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas wysyłania wiadomości', 500);
    }

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[POST_MESSAGE_TOP_EXCEPTION]', error);
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd', 500);
  }
};
