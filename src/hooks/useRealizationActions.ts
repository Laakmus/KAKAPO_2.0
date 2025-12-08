import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiErrorViewModel } from '@/types';

/**
 * Hook do zarządzania akcjami realizacji wymiany
 *
 * Funkcjonalności:
 * - Realize - potwierdzenie realizacji
 * - Unrealize - cofnięcie potwierdzenia
 * - Obsługa stanów loading i error
 *
 * @param interestId - ID zainteresowania
 */
export function useRealizationActions(interestId: string) {
  const { token } = useAuth();

  const [isMutating, setIsMutating] = useState(false);
  const [actionError, setActionError] = useState<ApiErrorViewModel | undefined>();

  /**
   * Potwierdzenie realizacji wymiany
   */
  const realize = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    if (!token) {
      setActionError({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Brak autoryzacji',
        },
        status: 401,
      });
      return { success: false };
    }

    setIsMutating(true);
    setActionError(undefined);

    try {
      const response = await fetch(`/api/interests/${interestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setActionError({
          ...errorData,
          status: response.status,
        });
        return { success: false, message: errorData.error?.message };
      }

      const result = await response.json();
      return { success: true, message: result.message };
    } catch {
      setActionError({
        error: {
          code: 'NETWORK_ERROR',
          message: 'Błąd sieci. Sprawdź połączenie internetowe',
        },
        status: 0,
      });
      return { success: false };
    } finally {
      setIsMutating(false);
    }
  }, [token, interestId]);

  /**
   * Cofnięcie potwierdzenia realizacji
   */
  const unrealize = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    if (!token) {
      setActionError({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Brak autoryzacji',
        },
        status: 401,
      });
      return { success: false };
    }

    setIsMutating(true);
    setActionError(undefined);

    try {
      const response = await fetch(`/api/interests/${interestId}/unrealize`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setActionError({
          ...errorData,
          status: response.status,
        });
        return { success: false, message: errorData.error?.message };
      }

      const result = await response.json();
      return { success: true, message: result.message };
    } catch {
      setActionError({
        error: {
          code: 'NETWORK_ERROR',
          message: 'Błąd sieci. Sprawdź połączenie internetowe',
        },
        status: 0,
      });
      return { success: false };
    } finally {
      setIsMutating(false);
    }
  }, [token, interestId]);

  return {
    realize,
    unrealize,
    isMutating,
    actionError,
  };
}
