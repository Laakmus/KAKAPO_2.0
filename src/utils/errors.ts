import type { ApiErrorResponse } from '../types';

/**
 * Tworzy standaryzowaną odpowiedź błędu API
 *
 * @param code - Kod błędu (np. 'VALIDATION_ERROR', 'UNAUTHORIZED')
 * @param message - Komunikat błędu czytelny dla użytkownika
 * @param status - Kod statusu HTTP
 * @param details - Opcjonalne dodatkowe szczegóły błędu (np. nazwa pola)
 * @returns Response z JSON body i odpowiednim statusem HTTP
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: { field?: string; value?: unknown },
): Response {
  const errorBody: ApiErrorResponse = {
    error: { code, message, ...(details && { details }) },
  };

  return new Response(JSON.stringify(errorBody), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Mapuje błędy Supabase Auth API na odpowiedzi API zgodne ze specyfikacją
 *
 * Obsługiwane scenariusze:
 * - Email niezweryfikowany -> 403 Forbidden
 * - Nieprawidłowe credentials -> 401 Unauthorized
 * - Inne błędy -> 500 Internal Server Error
 *
 * UWAGA BEZPIECZEŃSTWA: Komunikaty błędów nie ujawniają czy email istnieje w systemie
 *
 * @param error - Obiekt błędu zwrócony przez Supabase
 * @returns Odpowiedź HTTP z odpowiednim kodem i komunikatem
 */
export function handleAuthError(error: { message: string }): Response {
  // Email niezweryfikowany
  if (error.message.includes('Email not confirmed')) {
    return createErrorResponse('FORBIDDEN', 'Email nie został zweryfikowany. Sprawdź swoją skrzynkę pocztową.', 403);
  }

  // Nieprawidłowe credentials (email lub hasło)
  // UWAGA: Nie rozróżniamy czy problem jest w emailu czy haśle (security best practice)
  if (error.message.includes('Invalid login credentials')) {
    return createErrorResponse('UNAUTHORIZED', 'Email lub hasło niepoprawne', 401);
  }

  // Nieoczekiwany błąd - logujemy do console dla debugowania
  console.error('[AUTH_ERROR]', error);
  return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas logowania. Spróbuj ponownie później', 500);
}
