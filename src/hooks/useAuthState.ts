import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import type { UserProfileDTO, ApiErrorResponse } from '@/types';

/**
 * Hook useAuthState
 *
 * Zarządza stanem autoryzacji:
 * - Wczytuje token z localStorage (przez AuthContext)
 * - Weryfikuje token przez fetch GET /api/users/me
 * - Ustawia profil użytkownika w kontekście
 * - Obsługuje błędy autoryzacji (401/403/500)
 *
 * @returns Stan z AuthContext
 */
export function useAuthState() {
  const auth = useAuth();
  const toast = useToast();

  useEffect(() => {
    // Jeśli nie ma tokena, nie próbuj fetchować profilu
    if (!auth.token) {
      return;
    }

    // Jeśli user już jest załadowany, nie fetchuj ponownie
    if (auth.user) {
      return;
    }

    // Fetch profilu użytkownika
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/users/me', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = (await response.json()) as ApiErrorResponse;
          const errorMessage = errorData.error?.message || 'Nie udało się załadować profilu';

          if (response.status === 401 || response.status === 403) {
            // Token wygasł lub jest nieprawidłowy
            toast.push({
              type: 'error',
              text: 'Sesja wygasła. Zaloguj się ponownie.',
              actionLabel: 'Zaloguj',
              onAction: () => {
                auth.resetSession();
                window.location.href = '/login';
              },
            });
            auth.resetSession();
            return;
          }

          // Błąd serwera (500)
          if (response.status >= 500) {
            toast.push({
              type: 'error',
              text: errorMessage,
              actionLabel: 'Ponów',
              onAction: () => window.location.reload(),
            });
            return;
          }

          // Inne błędy
          toast.push({
            type: 'error',
            text: errorMessage,
          });
          return;
        }

        // Sukces - ustaw profil
        const profile = (await response.json()) as UserProfileDTO;
        auth.setUser(profile);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast.push({
          type: 'error',
          text: 'Nie udało się połączyć z serwerem',
          actionLabel: 'Ponów',
          onAction: () => window.location.reload(),
        });
      }
    };

    fetchProfile();
  }, [auth.token, auth.user]); // Zależności: token i user

  return auth;
}
