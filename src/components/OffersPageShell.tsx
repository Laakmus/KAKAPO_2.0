import React, { useState, useCallback, useEffect } from 'react';
import { useOfferDetail } from '@/hooks/useOfferDetail';
import { useInterestToggle } from '@/hooks/useInterestToggle';
import { useUrlPagination } from '@/hooks/useUrlPagination';
import { hardNavigate } from '@/utils/navigation';
import type { HomeFilterState, NotificationMessage } from '@/types';
import { OffersListPanel } from '@/components/OffersListPanel';
import { OfferDetailPanel } from '@/components/OfferDetailPanel';
import { GlobalNotification } from '@/components/GlobalNotification';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Props dla OffersPageShell
 */
type OffersPageShellProps = {
  offerId: string; // ID oferty z URL params
};

/**
 * Główny kontener widoku szczegółów oferty (master-detail)
 *
 * Funkcjonalności:
 * - Pokazuje listę ofert (po lewej) z highlightem wybranej oferty
 * - Pokazuje panel szczegółów oferty (po prawej)
 * - Zarządza akcjami zainteresowania (wyrażanie/anulowanie)
 * - Wyświetla globalne notyfikacje o sukcesie/błędzie
 * - Obsługuje routing - parametr offerId z URL
 */
export function OffersPageShell({ offerId }: OffersPageShellProps) {
  // Hooks
  const { offer, isLoading, error, refresh } = useOfferDetail(offerId);
  const { actionState, expressInterest, cancelInterest, resetActionState } = useInterestToggle();
  const { page, setPage } = useUrlPagination();
  const { user } = useAuth();

  // Stan lokalny
  const [notification, setNotification] = useState<NotificationMessage | undefined>();
  const [filter] = useState<HomeFilterState>({
    sort: 'created_at',
    order: 'desc',
  });

  /**
   * Czy user ma przynajmniej jedną aktywną ofertę do zaoferowania.
   * Jeśli profil nie jest jeszcze załadowany, nie blokujemy akcji (fallback = true).
   */
  const canExpressInterest = (user?.active_offers_count ?? 1) > 0;

  /**
   * Handler: user próbuje wyrazić zainteresowanie bez aktywnych ofert
   */
  // Komunikat dla tej sytuacji pokazujemy lokalnie przy kursorze (w InterestToggleCTA).

  /**
   * Handler dla akcji zainteresowania (wyrażanie)
   */
  const handleExpressInterest = useCallback(
    async (offerId: string) => {
      const result = await expressInterest(offerId);

      if (result) {
        // Sukces - odśwież dane oferty
        refresh();

        // Pokaż notyfikację
        setNotification({
          type: 'success',
          text: result.message || 'Zainteresowanie zostało wyrażone',
        });

        // Jeśli mutual match, dodaj informację o chacie
        if (result.chat_id) {
          setNotification({
            type: 'success',
            text: result.message || 'Wzajemne zainteresowanie! Chat został utworzony',
          });
        }
      } else {
        // Błąd - pokaż notyfikację
        if (actionState.error) {
          setNotification({
            type: 'error',
            text: actionState.error,
          });
        }
      }
    },
    [expressInterest, refresh, actionState.error],
  );

  /**
   * Handler dla akcji zainteresowania (anulowanie)
   */
  const handleCancelInterest = useCallback(
    async (interestId: string) => {
      const success = await cancelInterest(interestId);

      if (success) {
        // Sukces - odśwież dane oferty
        refresh();

        // Pokaż notyfikację
        setNotification({
          type: 'success',
          text: 'Zainteresowanie zostało anulowane',
        });
      } else {
        // Błąd - pokaż notyfikację
        if (actionState.error) {
          setNotification({
            type: 'error',
            text: actionState.error,
          });
        }
      }
    },
    [cancelInterest, refresh, actionState.error],
  );

  /**
   * Handler dla wyboru oferty z listy
   * Nawiguje do nowej oferty
   */
  const handleSelectOffer = useCallback((selectedOfferId: string) => {
    hardNavigate(`/offers/${selectedOfferId}`);
  }, []);

  /**
   * Handler dla zamknięcia notyfikacji
   */
  const handleCloseNotification = useCallback(() => {
    setNotification(undefined);
    resetActionState();
  }, [resetActionState]);

  /**
   * Efekt - auto-hide notyfikacji po 5s
   */
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(undefined);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to content link - accessibility */}
      <a
        href="#offer-detail"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Przejdź do szczegółów oferty
      </a>

      {/* Main container - flex layout (list + detail) */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel - Offers list (1/3 width on large screens) */}
          <div className="lg:col-span-1">
            <OffersListPanel
              selectedOfferId={offerId}
              onSelect={handleSelectOffer}
              filter={filter}
              page={page}
              onPageChange={setPage}
            />
          </div>

          {/* Right panel - Offer detail (2/3 width on large screens) */}
          <div className="lg:col-span-2" id="offer-detail">
            {/* Global notification - shows success/error messages */}
            {notification && (
              <div className="mb-4">
                <GlobalNotification notification={notification} onClose={handleCloseNotification} />
              </div>
            )}

            {/* Offer detail panel */}
            <OfferDetailPanel
              offer={offer}
              isLoading={isLoading}
              error={error}
              onRetry={refresh}
              onExpressInterest={handleExpressInterest}
              onCancelInterest={handleCancelInterest}
              isMutating={actionState.mutating}
              canExpressInterest={canExpressInterest}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
