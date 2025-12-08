import { useState } from 'react';
import type { LoginFormValues, AuthTokensResponse, ApiErrorResponse, UseLoginState } from '@/types';

/**
 * Custom hook do obsługi logowania użytkownika
 *
 * Zarządza:
 * - Wysyłką requestu POST /api/auth/login
 * - Stanem loading podczas requestu
 * - Notyfikacjami (success/error) z CTA dla przypadków UNAUTHORIZED/FORBIDDEN/RATE_LIMIT
 * - Zapisywaniem tokenów JWT w localStorage
 * - Mapowaniem błędów API na pola formularza
 *
 * @returns {Object} - Stan i funkcja login
 */
export function useLogin() {
  const [state, setState] = useState<UseLoginState>({
    isLoading: false,
    notification: undefined,
  });

  /**
   * Wykonuje logowanie użytkownika
   *
   * @param values - Dane formularza logowania (email, password)
   * @returns Promise z danymi odpowiedzi (tokeny JWT) lub obiektem błędu
   */
  const login = async (
    values: LoginFormValues,
  ): Promise<{ success: true; data: AuthTokensResponse } | { success: false; error: ApiErrorResponse | string }> => {
    // Rozpocznij loading
    setState({ isLoading: true, notification: undefined });

    try {
      // Wykonaj request do API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      // Parsuj odpowiedź
      const data = await response.json();

      // Obsłuż błędy HTTP
      if (!response.ok) {
        // Błędy 400/401/403/429/500 z API
        const errorResponse = data as ApiErrorResponse;
        const errorCode = errorResponse.error?.code;
        const errorMessage = errorResponse.error?.message || 'Wystąpił błąd podczas logowania';

        // Mapowanie błędów na notyfikacje z CTA
        let notification = state.notification;

        if (response.status === 401 || errorCode === 'UNAUTHORIZED') {
          // 401: Email lub hasło niepoprawne
          notification = {
            type: 'error' as const,
            text: errorMessage,
            actionLabel: 'Zaloguj ponownie',
            actionHref: '/login',
          };
        } else if (response.status === 403 || errorCode === 'FORBIDDEN') {
          // 403: Email nie został zweryfikowany
          notification = {
            type: 'error' as const,
            text: errorMessage || 'Email nie został zweryfikowany. Sprawdź skrzynkę.',
            // TODO: W przyszłości dodać link "Wyślij link ponownie"
          };
        } else if (response.status === 429 || errorCode === 'RATE_LIMIT_EXCEEDED') {
          // 429: Przekroczono limit prób logowania
          notification = {
            type: 'error' as const,
            text: errorMessage || 'Przekroczono limit prób logowania. Spróbuj za 15 minut.',
            actionLabel: 'Ponów',
            actionOnClick: () => window.location.reload(),
          };
        } else {
          // 400/422/500: Inne błędy
          notification = {
            type: 'error' as const,
            text: errorMessage,
          };
        }

        setState({
          isLoading: false,
          notification,
        });

        return { success: false, error: errorResponse };
      }

      // Success - 200 OK
      const successData = data as AuthTokensResponse;

      // Zapisz tokeny w localStorage
      localStorage.setItem('access_token', successData.access_token);
      localStorage.setItem('refresh_token', successData.refresh_token);

      // Opcjonalnie: zapisz dane użytkownika
      if (successData.user) {
        localStorage.setItem('user', JSON.stringify(successData.user));
      }

      setState({
        isLoading: false,
        notification: {
          type: 'success',
          text: 'Logowanie pomyślne! Przekierowywanie...',
        },
      });

      return { success: true, data: successData };
    } catch (error) {
      // Obsłuż błędy sieciowe lub inne nieoczekiwane błędy
      console.error('Login error:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Nie udało się połączyć z serwerem. Spróbuj ponownie.';

      setState({
        isLoading: false,
        notification: {
          type: 'error',
          text: errorMessage,
          actionLabel: 'Ponów',
          actionOnClick: () => window.location.reload(),
        },
      });

      return { success: false, error: errorMessage };
    }
  };

  /**
   * Resetuje notyfikację (przydatne przy zamykaniu alertu lub rozpoczęciu nowego submitu)
   */
  const clearNotification = () => {
    setState((prev) => ({ ...prev, notification: undefined }));
  };

  return {
    ...state,
    login,
    clearNotification,
  };
}
