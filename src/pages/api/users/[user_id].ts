import type { APIRoute } from 'astro';
import { z } from 'zod';
import { userIdParamSchema } from '../../../schemas/user.schema';
import { createErrorResponse } from '../../../utils/errors';
import { UserService } from '../../../services/user.service';
import type { PublicUserDTO } from '../../../types';

export const prerender = false;

/**
 * GET /api/users/{user_id}
 *
 * Zwraca publiczny profil użytkownika: id, first_name, last_name, active_offers_count
 * Wymaga autoryzacji (zalogowany użytkownik).
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // 1. Walidacja parametru path
    if (!params?.user_id) {
      return createErrorResponse('VALIDATION_ERROR', 'ID użytkownika jest wymagane', 400);
    }

    let validatedParams: { user_id: string };
    try {
      validatedParams = userIdParamSchema.parse({ user_id: params.user_id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return createErrorResponse('VALIDATION_ERROR', firstError.message, 400, { field: 'user_id' });
      }
      throw error;
    }

    // 2. Pobranie Supabase client z locals (middleware powinien go ustawić)
    const supabase = locals.supabase;
    if (!supabase) {
      console.error('[GET_USER_PROFILE] Supabase client not found in locals');
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    // 3. Autoryzacja - wymagamy zalogowanego użytkownika
    const requesterId = locals.user?.id;
    if (!requesterId) {
      // Spróbuj pobrać sesję (np. cookie-based sessions)
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        return createErrorResponse('UNAUTHORIZED', 'Brak autoryzacji', 401);
      }
    }

    // 4. Wywołanie serwisu i zmapowanie odpowiedzi
    const userService = new UserService(supabase);
    const profile = await userService.getPublicProfile(validatedParams.user_id);

    if (!profile) {
      return createErrorResponse('NOT_FOUND', 'Użytkownik nie istnieje', 404);
    }

    const responseBody: PublicUserDTO = profile;
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[GET_USER_PROFILE_EXCEPTION]', {
      timestamp: new Date().toISOString(),
      requestedUserId: params?.user_id,
      error: error instanceof Error ? error.message : String(error),
    });
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas pobierania profilu użytkownika', 500);
  }
};
