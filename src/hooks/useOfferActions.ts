import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { UpdateOfferCommand, ApiErrorViewModel } from '@/types';

/**
 * Hook do akcji na ofercie (edycja, usuwanie)
 *
 * Funkcjonalności:
 * - Edycja oferty (PATCH /api/offers/:offer_id)
 * - Usuwanie oferty (DELETE /api/offers/:offer_id)
 * - Zarządzanie stanem loading per offer
 */
export function useOfferActions() {
  const { token } = useAuth();

  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, ApiErrorViewModel>>({});

  /**
   * Aktualizacja oferty
   */
  const updateOffer = async (
    offerId: string,
    payload: UpdateOfferCommand,
  ): Promise<{ success: boolean; error?: ApiErrorViewModel }> => {
    if (!token) {
      return {
        success: false,
        error: {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Brak autoryzacji',
          },
          status: 401,
        },
      };
    }

    try {
      setLoadingStates((prev) => ({ ...prev, [offerId]: true }));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[offerId];
        return newErrors;
      });

      const response = await fetch(`/api/offers/${offerId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const error = {
          ...errorData,
          status: response.status,
        };
        setErrors((prev) => ({ ...prev, [offerId]: error }));
        return { success: false, error };
      }

      return { success: true };
    } catch {
      const error: ApiErrorViewModel = {
        error: {
          code: 'NETWORK_ERROR',
          message: 'Błąd sieci. Sprawdź połączenie internetowe',
        },
        status: 0,
      };
      setErrors((prev) => ({ ...prev, [offerId]: error }));
      return { success: false, error };
    } finally {
      setLoadingStates((prev) => ({ ...prev, [offerId]: false }));
    }
  };

  /**
   * Usunięcie oferty
   */
  const deleteOffer = async (offerId: string): Promise<{ success: boolean; error?: ApiErrorViewModel }> => {
    if (!token) {
      return {
        success: false,
        error: {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Brak autoryzacji',
          },
          status: 401,
        },
      };
    }

    try {
      setLoadingStates((prev) => ({ ...prev, [offerId]: true }));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[offerId];
        return newErrors;
      });

      const response = await fetch(`/api/offers/${offerId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        const error = {
          ...errorData,
          status: response.status,
        };
        setErrors((prev) => ({ ...prev, [offerId]: error }));
        return { success: false, error };
      }

      return { success: true };
    } catch {
      const error: ApiErrorViewModel = {
        error: {
          code: 'NETWORK_ERROR',
          message: 'Błąd sieci. Sprawdź połączenie internetowe',
        },
        status: 0,
      };
      setErrors((prev) => ({ ...prev, [offerId]: error }));
      return { success: false, error };
    } finally {
      setLoadingStates((prev) => ({ ...prev, [offerId]: false }));
    }
  };

  return {
    updateOffer,
    deleteOffer,
    isLoading: (offerId: string) => loadingStates[offerId] || false,
    getError: (offerId: string) => errors[offerId],
  };
}
