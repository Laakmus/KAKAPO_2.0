import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { InterestActionState, CreateInterestResponse } from '@/types';

/**
 * Hook do zarządzania akcjami zainteresowania (wyrażanie/anulowanie)
 *
 * Funkcjonalności:
 * - expressInterest - POST /api/interests (tworzy nowe zainteresowanie)
 * - cancelInterest - DELETE /api/interests/{interest_id} (anuluje zainteresowanie)
 * - Zarządza stanem mutacji (loading, error, success)
 * - Zwraca komunikaty sukcesu/błędu z API
 */
export function useInterestToggle() {
  const { token } = useAuth();

  const [actionState, setActionState] = useState<InterestActionState>({
    mutating: false,
    error: undefined,
    successMessage: undefined,
  });

  /**
   * Wyraź zainteresowanie ofertą
   *
   * @param offerId - UUID oferty
   * @returns CreateInterestResponse lub undefined w przypadku błędu
   */
  const expressInterest = useCallback(
    async (offerId: string): Promise<CreateInterestResponse | undefined> => {
      if (!token) {
        setActionState({
          mutating: false,
          error: 'Brak autoryzacji',
          successMessage: undefined,
        });
        return undefined;
      }

      try {
        setActionState({
          mutating: true,
          error: undefined,
          successMessage: undefined,
        });

        const response = await fetch('/api/interests', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ offer_id: offerId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          setActionState({
            mutating: false,
            error: errorData.error?.message || 'Nie udało się wyrazić zainteresowania',
            successMessage: undefined,
          });
          return undefined;
        }

        const result: CreateInterestResponse = await response.json();

        setActionState({
          mutating: false,
          error: undefined,
          successMessage: result.message || 'Zainteresowanie zostało wyrażone',
        });

        return result;
      } catch {
        setActionState({
          mutating: false,
          error: 'Błąd sieci. Sprawdź połączenie internetowe',
          successMessage: undefined,
        });
        return undefined;
      }
    },
    [token],
  );

  /**
   * Anuluj zainteresowanie ofertą
   *
   * @param interestId - UUID zainteresowania do anulowania
   * @returns true jeśli sukces, false w przypadku błędu
   */
  const cancelInterest = useCallback(
    async (interestId: string): Promise<boolean> => {
      if (!token) {
        setActionState({
          mutating: false,
          error: 'Brak autoryzacji',
          successMessage: undefined,
        });
        return false;
      }

      try {
        setActionState({
          mutating: true,
          error: undefined,
          successMessage: undefined,
        });

        const response = await fetch(`/api/interests/${interestId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          setActionState({
            mutating: false,
            error: errorData.error?.message || 'Nie udało się anulować zainteresowania',
            successMessage: undefined,
          });
          return false;
        }

        const result = await response.json();

        setActionState({
          mutating: false,
          error: undefined,
          successMessage: result.message || 'Zainteresowanie zostało anulowane',
        });

        return true;
      } catch {
        setActionState({
          mutating: false,
          error: 'Błąd sieci. Sprawdź połączenie internetowe',
          successMessage: undefined,
        });
        return false;
      }
    },
    [token],
  );

  /**
   * Reset stanu akcji (np. po zamknięciu notyfikacji)
   */
  const resetActionState = useCallback(() => {
    setActionState({
      mutating: false,
      error: undefined,
      successMessage: undefined,
    });
  }, []);

  return {
    actionState,
    expressInterest,
    cancelInterest,
    resetActionState,
  };
}
