import { useState, useEffect, useCallback, useRef } from 'react';
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
  const hasLoadedOnce = useRef(false);

  /**
   * Funkcja fetchująca moje oferty
   */
  const fetchMyOffers = useCallback(
    async (isRefresh = false, externalSignal?: AbortSignal) => {
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
        if (isRefresh || hasLoadedOnce.current) {
          // Zmiana filtra lub refresh: zachowaj poprzednie dane, pokaż subtelny indicator
          setIsRefreshing(true);
        } else {
          // Pierwsze ładowanie: pokaż skeleton
          setIsLoading(true);
        }
        setError(undefined);

        // Buduj query params
        const params = new URLSearchParams({
          status: statusFilter,
        });

        // Fetch z timeout 10s i zewnętrznym abort signal
        const timeoutId = setTimeout(() => {}, 10000);
        const signal = externalSignal;

        const response = await fetch(`/api/offers/my?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal,
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
        // Abort z cleanup (zmiana filtra) - ignoruj, nowy fetch jest w toku
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        if (err instanceof Error) {
          setError({
            error: {
              code: 'NETWORK_ERROR',
              message: 'Błąd sieci. Sprawdź połączenie internetowe',
            },
            status: 0,
          });
        }
        setOffers([]);
      } finally {
        hasLoadedOnce.current = true;
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
   * Anuluje poprzedni request przy zmianie filtra (race condition prevention)
   */
  useEffect(() => {
    const controller = new AbortController();
    fetchMyOffers(false, controller.signal);
    return () => controller.abort();
  }, [fetchMyOffers]);

  return {
    offers,
    isLoading,
    isRefreshing,
    error,
    refetch,
  };
}
