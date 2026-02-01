import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { OfferListItemDTO, ApiErrorViewModel } from '@/types';

/**
 * Hook do zarządzania moimi ofertami
 *
 * Funkcjonalności:
 * - Fetchuje oferty użytkownika z API zgodnie ze statusem
 * - Obsługuje stany loading, error, empty
 * - Umożliwia refetch (odświeżenie)
 * - Zarządzanie filtrem statusu (ACTIVE | REMOVED)
 *
 * @param statusFilter - status ofert do filtrowania ('ACTIVE' | 'REMOVED')
 */
export function useMyOffers(statusFilter: 'ACTIVE' | 'REMOVED' = 'ACTIVE') {
  const { token } = useAuth();

  const [offers, setOffers] = useState<OfferListItemDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<ApiErrorViewModel | undefined>();

  /**
   * Funkcja fetchująca moje oferty
   */
  const fetchMyOffers = useCallback(
    async (isRefresh = false) => {
      if (!token) {
        setError({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Brak autoryzacji',
          },
          status: 401,
        });
        setIsLoading(false);
        return;
      }

      try {
        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setError(undefined);

        // Buduj query params
        const params = new URLSearchParams({
          status: statusFilter,
        });

        // Fetch z timeout 10s
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`/api/offers/my?${params.toString()}`, {
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
          setOffers([]);
          return;
        }

        const result: { data: OfferListItemDTO[] } = await response.json();

        setOffers(result.data);
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
        setOffers([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, statusFilter],
  );

  /**
   * Refetch - odśwież dane
   */
  const refetch = useCallback(() => {
    fetchMyOffers(true);
  }, [fetchMyOffers]);

  /**
   * Efekt - fetch przy zmianie parametrów
   */
  useEffect(() => {
    fetchMyOffers();
  }, [fetchMyOffers]);

  return {
    offers,
    isLoading,
    isRefreshing,
    error,
    refetch,
  };
}
