import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { InterestListItemDTO, Paginated, ApiErrorViewModel } from '@/types';

/**
 * Hook do zarządzania listą zainteresowanych ofertą
 *
 * Funkcjonalności:
 * - Fetchuje listę zainteresowanych z API
 * - Obsługuje paginację
 * - Obsługuje stany loading, error, empty
 * - Umożliwia refetch (odświeżenie)
 *
 * @param offerId - ID oferty
 * @param page - numer strony (1-based)
 * @param limit - liczba elementów na stronę
 */
export function useInterestsList(offerId: string | null, page: number = 1, limit: number = 20) {
  const { token } = useAuth();

  const [interests, setInterests] = useState<InterestListItemDTO[]>([]);
  const [pagination, setPagination] = useState<
    | {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
      }
    | undefined
  >();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiErrorViewModel | undefined>();

  /**
   * Funkcja fetchująca zainteresowania
   */
  const fetchInterests = useCallback(async () => {
    if (!token || !offerId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(undefined);

      // Buduj query params
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`/api/offers/${offerId}/interests?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError({
          ...errorData,
          status: response.status,
        });
        setInterests([]);
        setPagination(undefined);
        return;
      }

      const result: Paginated<InterestListItemDTO> = await response.json();

      setInterests(result.data);
      setPagination(result.pagination);
      setError(undefined);
    } catch (err) {
      if (err instanceof Error) {
        setError({
          error: {
            code: 'NETWORK_ERROR',
            message: 'Błąd sieci. Sprawdź połączenie internetowe',
          },
          status: 0,
        });
      }
      setInterests([]);
      setPagination(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [token, offerId, page, limit]);

  /**
   * Efekt - fetch przy zmianie parametrów
   */
  useEffect(() => {
    if (offerId) {
      fetchInterests();
    }
  }, [fetchInterests, offerId]);

  return {
    interests,
    pagination,
    isLoading,
    error,
    refetch: fetchInterests,
  };
}
