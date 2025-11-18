import type { APIRoute } from 'astro';
import { z } from 'zod';
import { signupSchema } from '../../../schemas/auth.schema';
import { createErrorResponse } from '../../../utils/errors';
import type { RegisterUserCommand } from '../../../types';
import AuthService from '../../../services/auth.service';

// Wyłączenie pre-renderowania - endpoint musi działać server-side
export const prerender = false;

/**
 * POST /api/auth/signup
 *
 * Request body:
 * {
 *  "email": "user@example.com",
 *  "password": "securePassword123",
 *  "first_name": "Jan",
 *  "last_name": "Kowalski"
 * }
 *
 * Responses:
 * - 201 Created: { user: { id, email, email_confirmed_at }, message }
 * - 400 Bad Request: nieprawidłowe dane / email istnieje
 * - 422 Unprocessable Entity: walidacja (np. hasło za krótkie)
 * - 500 Internal Server Error
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

    // 2. Walidacja przy użyciu signupSchema
    let validated: RegisterUserCommand;
    try {
      validated = signupSchema.parse(requestBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        const field = String(firstError.path[0] ?? 'unknown');
        // Jeśli problem dotyczy hasła, zgodnie ze spec -> 422
        const status = field === 'password' ? 422 : 400;
        return createErrorResponse(
          'VALIDATION_ERROR',
          firstError.message,
          status,
          {
            field,
            // Nie ujawniamy wartości hasła
            value: field === 'password' ? undefined : (requestBody as Record<string, unknown>)?.[field],
          },
        );
      }
      throw error;
    }

    // 3. Supabase client z middleware
    const supabase = locals.supabase;
    if (!supabase) {
      console.error('[AUTH_SIGNUP] Supabase client not found in locals');
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    // 4. Wykonanie rejestracji przez serwis
    try {
      const result = await AuthService.register(validated, supabase);
      return new Response(JSON.stringify(result), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: unknown) {
      // Mapowanie błędów serwisowych na odpowiedzi API
      const e = err as any;
      const code = e.message ?? 'INTERNAL_ERROR';
      const status = typeof e.status === 'number' ? e.status : 500;

      if (code === 'EMAIL_EXISTS' || status === 400) {
        return createErrorResponse('BAD_REQUEST', 'Email już istnieje', 400);
      }
      if (code === 'WEAK_PASSWORD' || status === 422) {
        return createErrorResponse('VALIDATION_FAILED', 'Hasło za krótkie', 422);
      }

      console.error('[AUTH_SIGNUP_SERVICE_ERROR]', e);
      return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas tworzenia konta', 500);
    }
  } catch (error) {
    console.error('[AUTH_SIGNUP_EXCEPTION]', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd', 500);
  }
};


