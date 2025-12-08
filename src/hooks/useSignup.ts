import { useState } from 'react';
import type { RegistrationFormValues, SignupResponseDTO, ApiErrorResponse, UseSignupState } from '@/types';

/**
 * Custom hook do obsługi rejestracji użytkownika
 *
 * Zarządza:
 * - Wysyłką requestu POST /api/auth/signup
 * - Stanem loading podczas requestu
 * - Notyfikacjami (success/error)
 * - Mapowaniem błędów API na pola formularza
 *
 * @returns {Object} - Stan i funkcja signup
 */
export function useSignup() {
  const [state, setState] = useState<UseSignupState>({
    isLoading: false,
    notification: undefined,
  });

  /**
   * Wykonuje rejestrację użytkownika
   *
   * @param values - Dane formularza rejestracji
   * @returns Promise z danymi odpowiedzi lub obiektem błędu
   */
  const signup = async (
    values: RegistrationFormValues,
  ): Promise<{ success: true; data: SignupResponseDTO } | { success: false; error: ApiErrorResponse | string }> => {
    // Rozpocznij loading
    setState({ isLoading: true, notification: undefined });

    try {
      // Wykonaj request do API
      const response = await fetch('/api/auth/signup', {
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
        // Błędy 400/422/500 z API
        const errorResponse = data as ApiErrorResponse;
        const errorMessage = errorResponse.error?.message || 'Wystąpił błąd podczas rejestracji';

        // Ustaw notyfikację błędu
        setState({
          isLoading: false,
          notification: {
            type: 'error',
            text: errorMessage,
          },
        });

        return { success: false, error: errorResponse };
      }

      // Success - 201 Created
      const successData = data as SignupResponseDTO;
      const successMessage = successData.message || 'Sprawdź swoją skrzynkę email w celu weryfikacji';

      setState({
        isLoading: false,
        notification: {
          type: 'success',
          text: successMessage,
        },
      });

      return { success: true, data: successData };
    } catch (error) {
      // Obsłuż błędy sieciowe lub inne nieoczekiwane błędy
      console.error('Signup error:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Nie udało się połączyć z serwerem. Spróbuj ponownie.';

      setState({
        isLoading: false,
        notification: {
          type: 'error',
          text: errorMessage,
        },
      });

      return { success: false, error: errorMessage };
    }
  };

  /**
   * Resetuje notyfikację (przydatne przy zamykaniu alertu)
   */
  const clearNotification = () => {
    setState((prev) => ({ ...prev, notification: undefined }));
  };

  return {
    ...state,
    signup,
    clearNotification,
  };
}
