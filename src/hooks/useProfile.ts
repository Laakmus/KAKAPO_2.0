import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserProfileDTO, ApiErrorViewModel } from '@/types';

/**
 * Hook do zarządzania profilem użytkownika
 *
 * Funkcjonalności:
 * - Fetchuje profil z GET /api/users/me
 * - Obsługuje stany loading, error
 * - Umożliwia refetch (odświeżenie)
 * - Automatyczne przekierowanie na /login przy błędzie 401
 */
export function useProfile() {
  const { token } = useAuth();

  const [profile, setProfile] = useState<UserProfileDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiErrorViewModel | undefined>();

  /**
   * Funkcja fetchująca profil
   */
  const fetchProfile = useCallback(async () => {
    if (!token) {
      setError({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Brak autoryzacji',
        },
        status: 401,
      });
      setIsLoading(false);
      // Redirect to login
      window.location.href = '/login';
      return;
    }

    try {
      setIsLoading(true);
      setError(undefined);

      // Fetch z timeout 10s
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/users/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        setError({
          ...errorData,
          status: response.status,
        });

        // Jeśli 401 - redirect do loginu
        if (response.status === 401) {
          window.location.href = '/login';
        }

        setProfile(null);
        return;
      }

      const profileData: UserProfileDTO = await response.json();
      setProfile(profileData);
      setError(undefined);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError({
            error: {
              code: 'TIMEOUT',
              message: 'Przekroczono limit czasu żądania',
            },
            status: 408,
          });
        } else {
          setError({
            error: {
              code: 'NETWORK_ERROR',
              message: 'Błąd sieci. Sprawdź połączenie internetowe',
            },
            status: 0,
          });
        }
      }
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  /**
   * Refetch - odśwież dane profilu
   */
  const refetch = useCallback(() => {
    fetchProfile();
  }, [fetchProfile]);

  /**
   * Efekt - fetch przy montowaniu lub zmianie tokena
   */
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    error,
    refetch,
  };
}
