import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type {
  OfferListItemViewModel,
  OffersPaginationMeta,
  HomeFilterState,
  ApiErrorViewModel,
  Paginated,
  OfferListItemDTO,
} from '@/types';

/**
 * Hook do zarządzania listą ofert
 *
 * Funkcjonalności:
 * - Fetchuje oferty z API zgodnie z filtrem i paginacją
 * - Oznacza własne oferty (isOwnOffer = true)
 * - Obsługuje stany loading, error, empty
 * - Umożliwia refetch (odświeżenie)
 *
 * @param filter - filtry i sortowanie
 * @param page - numer strony (1-based)
 */
export function useOffersList(filter: HomeFilterState, page: number) {
  const { token, user } = useAuth();

  const [offers, setOffers] = useState<OfferListItemViewModel[]>([]);
  const [pagination, setPagination] = useState<OffersPaginationMeta | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<ApiErrorViewModel | undefined>();

  /**
   * Funkcja fetchująca oferty
   */
  const fetchOffers = useCallback(
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
          page: page.toString(),
          limit: '15',
          sort: filter.sort,
          order: filter.order,
        });

        if (filter.city) {
          params.append('city', filter.city);
        }

        // Fetch z timeout 10s
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`/api/offers?${params.toString()}`, {
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
          setPagination(undefined);
          return;
        }

        const result: Paginated<OfferListItemDTO> = await response.json();

        // Mapuj do ViewModel - oznacz własne oferty
        const viewModels: OfferListItemViewModel[] = result.data.map((offer) => ({
          ...offer,
          isOwnOffer: user?.id === offer.owner_id,
        }));

        setOffers(viewModels);
        setPagination(result.pagination);
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
        setPagination(undefined);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, user?.id, filter, page],
  );

  /**
   * Refetch - odśwież dane
   */
  const refetch = useCallback(() => {
    fetchOffers(true);
  }, [fetchOffers]);

  /**
   * Efekt - fetch przy zmianie parametrów
   */
  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  return {
    offers,
    pagination,
    isLoading,
    isRefreshing,
    error,
    refetch,
  };
}
