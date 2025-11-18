import type { APIRoute } from 'astro';
import { z } from 'zod';
import { loginSchema } from '../../../schemas/auth.schema';
import { createErrorResponse, handleAuthError } from '../../../utils/errors';
import type { LoginUserCommand, AuthTokensResponse } from '../../../types';

// Wyłączenie pre-renderowania - endpoint musi działać w trybie server-side
export const prerender = false;

/**
 * POST /api/auth/login
 *
 * Endpoint uwierzytelniania użytkownika.
 *
 * Request body:
 * {
 *   "email": "jan.kowalski@example.com",
 *   "password": "securePassword123"
 * }
 *
 * Response 200 OK:
 * {
 *   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "refresh_token": "v1.MRjRfNBGf3uxF8xGzXU0oA...",
 *   "user": {
 *     "id": "550e8400-e29b-41d4-a716-446655440000",
 *     "email": "jan.kowalski@example.com"
 *   }
 * }
 *
 * Możliwe błędy:
 * - 400 Bad Request: Nieprawidłowy format danych
 * - 401 Unauthorized: Email lub hasło niepoprawne
 * - 403 Forbidden: Email niezweryfikowany
 * - 500 Internal Server Error: Błąd serwera
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Parsowanie request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return createErrorResponse('VALIDATION_ERROR', 'Nieprawidłowy format JSON', 400);
    }

    // 2. Walidacja danych wejściowych za pomocą Zod
    let validatedData: LoginUserCommand;
    try {
      validatedData = loginSchema.parse(requestBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return createErrorResponse('VALIDATION_ERROR', firstError.message, 400, {
          field: String(firstError.path[0] || 'unknown'),
          // Nie ujawniamy wartości hasła w odpowiedzi błędu (security)
          value:
            firstError.path[0] === 'password'
              ? undefined
              : (requestBody as Record<string, unknown>)?.[firstError.path[0]],
        });
      }
      throw error;
    }

    // 3. Pobranie Supabase client z locals (dostępny dzięki middleware)
    const supabase = locals.supabase;
    if (!supabase) {
      console.error('[AUTH_LOGIN] Supabase client not found in locals');
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    // 4. Uwierzytelnienie użytkownika przez Supabase Auth API
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    });

    // 5. Obsługa błędów uwierzytelniania
    if (error) {
      return handleAuthError(error);
    }

    // 6. Sprawdzenie poprawności odpowiedzi z Supabase
    if (!data.session || !data.user) {
      console.error('[AUTH_LOGIN] Invalid response from Supabase', {
        hasSession: !!data.session,
        hasUser: !!data.user,
      });
      return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas logowania', 500);
    }

    // 7. Konstrukcja odpowiedzi zgodnej z AuthTokensResponse
    const responseBody: AuthTokensResponse = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email ?? '',
      },
    };

    // 8. Zwrot sukcesu z tokenami i danymi użytkownika
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Obsługa nieoczekiwanych wyjątków
    console.error('[AUTH_LOGIN_EXCEPTION]', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd', 500);
  }
};
