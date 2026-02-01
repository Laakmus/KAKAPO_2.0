import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { OfferDetailDTO, OfferDetailViewModel, ApiErrorViewModel } from '@/types';

/**
 * Hook do fetchowania szczegółów pojedynczej oferty
 *
 * Funkcjonalności:
 * - Pobiera szczegóły oferty z API /api/offers/{offer_id}
 * - Wzbogaca dane o pola UI (statusLabel, formattedDate)
 * - Obsługuje stany loading, error
 * - Umożliwia refresh (odświeżenie danych)
 *
 * @param offerId - UUID oferty do pobrania
 */
export function useOfferDetail(offerId: string) {
  const { token } = useAuth();

  const [offer, setOffer] = useState<OfferDetailViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<ApiErrorViewModel | undefined>();

  /**
   * Mapuje DTO na ViewModel - dodaje pola UI
   */
  const mapToViewModel = useCallback((dto: OfferDetailDTO): OfferDetailViewModel => {
    // Status label
    const statusLabel = dto.status === 'ACTIVE' ? 'Aktywna' : 'Usunięta';

    // Formatted date
    const date = new Date(dto.created_at);
    const formattedDate = date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return {
      ...dto,
      statusLabel,
      formattedDate,
    };
  }, []);

  /**
   * Funkcja fetchująca szczegóły oferty
   */
  const fetchOffer = useCallback(
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

        // Fetch z timeout 10s
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`/api/offers/${offerId}`, {
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
          setOffer(null);
          return;
        }

        const dto: OfferDetailDTO = await response.json();
        const viewModel = mapToViewModel(dto);

        setOffer(viewModel);
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
        setOffer(null);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, offerId, mapToViewModel],
  );

  /**
   * Refresh - odśwież dane oferty
   */
  const refresh = useCallback(() => {
    fetchOffer(true);
  }, [fetchOffer]);

  /**
   * Efekt - fetch przy zmianie offerId lub token
   */
  useEffect(() => {
    fetchOffer();
  }, [fetchOffer]);

  return {
    offer,
    isLoading,
    isRefreshing,
    error,
    refresh,
  };
}
