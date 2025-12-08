import { useState, useCallback } from 'react';
import type { CreateOfferCommand, CreateOfferResponse, ApiErrorResponse } from '@/types';

/**
 * Stan operacji tworzenia oferty
 */
type CreateOfferState = {
  isLoading: boolean;
  error?: string;
};

/**
 * Wynik operacji tworzenia oferty
 */
type CreateOfferResult =
  | { success: true; data: CreateOfferResponse }
  | { success: false; error: ApiErrorResponse | string };

/**
 * Hook useCreateOffer
 *
 * Zarządza operacją tworzenia nowej oferty (POST /api/offers).
 *
 * Funkcjonalności:
 * - Wywołanie API z danymi formularza
 * - Obsługa błędów (400/401/403/422/500)
 * - Stan ładowania (isLoading)
 * - Mapowanie błędów API na pola formularza
 *
 * Przepływ:
 * 1. Użytkownik wypełnia formularz i klika "Dodaj ofertę"
 * 2. Hook wywołuje POST /api/offers z danymi
 * 3. W przypadku sukcesu (201) zwraca CreateOfferResponse z ID nowej oferty
 * 4. W przypadku błędu walidacji (400/422) zwraca ApiErrorResponse z details.field
 * 5. W przypadku błędu autoryzacji (401) zwraca komunikat i przekierowuje do /login
 * 6. W przypadku błędu serwera (500) zwraca ogólny komunikat błędu
 *
 * @returns {CreateOfferState} - Stan operacji (isLoading, error)
 * @returns {createOffer} - Funkcja tworząca ofertę
 */
export function useCreateOffer() {
  const [state, setState] = useState<CreateOfferState>({
    isLoading: false,
    error: undefined,
  });

  /**
   * Tworzy nową ofertę
   *
   * @param values - Dane formularza (title, description, image_url?, city)
   * @returns CreateOfferResult - Sukces z danymi oferty lub błąd
   */
  const createOffer = useCallback(async (values: CreateOfferCommand): Promise<CreateOfferResult> => {
    // Resetuj stan
    setState({
      isLoading: true,
      error: undefined,
    });

    try {
      // Wywołaj API
      const response = await fetch('/api/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Wysyła ciasteczko sesji Supabase
        body: JSON.stringify(values),
      });

      // Parsuj odpowiedź
      const data = await response.json();

      // Sukces (201)
      if (response.ok) {
        setState({
          isLoading: false,
          error: undefined,
        });

        return {
          success: true,
          data: data as CreateOfferResponse,
        };
      }

      // Błąd autoryzacji (401) - przekieruj do logowania
      if (response.status === 401) {
        setState({
          isLoading: false,
          error: 'Sesja wygasła. Zaloguj się ponownie.',
        });

        // Przekieruj do logowania z parametrem redirect
        setTimeout(() => {
          window.location.href = `/login?redirect=${encodeURIComponent('/offers/new')}`;
        }, 1500);

        return {
          success: false,
          error: 'Sesja wygasła. Zaloguj się ponownie.',
        };
      }

      // Błąd uprawnień (403)
      if (response.status === 403) {
        const errorMessage = data.error?.message || 'Brak uprawnień do wykonania tej operacji.';
        setState({
          isLoading: false,
          error: errorMessage,
        });

        return {
          success: false,
          error: data as ApiErrorResponse,
        };
      }

      // Błąd walidacji (400/422)
      if (response.status === 400 || response.status === 422) {
        const errorMessage = data.error?.message || 'Nieprawidłowe dane formularza.';
        setState({
          isLoading: false,
          error: errorMessage,
        });

        return {
          success: false,
          error: data as ApiErrorResponse,
        };
      }

      // Błąd serwera (500+)
      if (response.status >= 500) {
        const errorMessage = 'Wystąpił błąd serwera. Spróbuj ponownie później.';
        setState({
          isLoading: false,
          error: errorMessage,
        });

        return {
          success: false,
          error: errorMessage,
        };
      }

      // Inny błąd
      const errorMessage = data.error?.message || 'Wystąpił nieoczekiwany błąd.';
      setState({
        isLoading: false,
        error: errorMessage,
      });

      return {
        success: false,
        error: data as ApiErrorResponse,
      };
    } catch (err) {
      // Błąd sieciowy lub parsowania
      const errorMessage = 'Nie udało się połączyć z serwerem. Sprawdź połączenie internetowe.';
      console.error('useCreateOffer error:', err);

      setState({
        isLoading: false,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, []);

  return {
    ...state,
    createOffer,
  };
}
