import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import type { ApiErrorResponse } from '@/types';

/**
 * Payload dla logout
 */
export type LogoutPayload = {
  token: string;
  allDevices?: boolean;
};

/**
 * Stan hooka useLogout
 */
export type UseLogoutState = {
  isLoggingOut: boolean;
  error?: ApiErrorResponse | string;
};

/**
 * Hook useLogout
 *
 * Obsługuje wylogowanie użytkownika:
 * - Wywołuje POST /api/auth/logout z tokenem
 * - Czyści sesję (token, user, localStorage)
 * - Przekierowuje na /login
 * - Obsługuje błędy (401/404/500)
 *
 * @returns Stan i funkcja logout
 */
export function useLogout() {
  const [state, setState] = useState<UseLogoutState>({
    isLoggingOut: false,
    error: undefined,
  });
  const auth = useAuth();
  const toast = useToast();

  /**
   * Wykonuje wylogowanie
   */
  const logout = async () => {
    // Sprawdź czy token istnieje
    if (!auth.token) {
      toast.push({
        type: 'error',
        text: 'Brak tokena autoryzacji',
      });
      throw new Error('Token missing');
    }

    setState({ isLoggingOut: true, error: undefined });

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
      });

      // Obsługa odpowiedzi
      if (!response.ok) {
        const errorData = (await response.json()) as ApiErrorResponse;
        const errorMessage = errorData.error?.message || 'Nie udało się wylogować';

        if (response.status === 404) {
          // Sesja nie istnieje - mimo to wyloguj lokalnie
          toast.push({
            type: 'error',
            text: 'Sesja nie została znaleziona. Zostaniesz wylogowany.',
          });
        } else if (response.status === 401) {
          // Token nieprawidłowy - wyloguj lokalnie
          toast.push({
            type: 'error',
            text: 'Token wygasł. Zostaniesz wylogowany.',
          });
        } else if (response.status >= 500) {
          // Błąd serwera
          toast.push({
            type: 'error',
            text: errorMessage,
            actionLabel: 'Ponów',
            onAction: () => logout(),
          });
          setState({ isLoggingOut: false, error: errorData });
          return;
        } else {
          // Inne błędy
          toast.push({
            type: 'error',
            text: errorMessage,
          });
          setState({ isLoggingOut: false, error: errorData });
          return;
        }
      } else {
        // Sukces
        toast.push({
          type: 'success',
          text: 'Wylogowano pomyślnie',
        });
      }

      // Resetuj sesję lokalnie (nawet jeśli API zwróciło błąd 404/401)
      auth.resetSession();

      // Przekieruj na /login po krótkiej chwili
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
    } catch (error) {
      console.error('Logout error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Nie udało się połączyć z serwerem';

      toast.push({
        type: 'error',
        text: errorMessage,
        actionLabel: 'Ponów',
        onAction: () => logout(),
      });

      setState({ isLoggingOut: false, error: errorMessage });
    }
  };

  return {
    ...state,
    logout,
  };
}
