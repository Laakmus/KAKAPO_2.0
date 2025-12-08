import { useState, useCallback } from 'react';
import type { OfferListItemViewModel } from '@/types';

/**
 * Hook do zarządzania wyborem oferty w widoku szczegółów
 *
 * Funkcjonalności:
 * - Przechowuje wybraną ofertę
 * - Udostępnia funkcje select/deselect
 */
export function useOfferSelection() {
  const [selectedOffer, setSelectedOffer] = useState<OfferListItemViewModel | undefined>();

  /**
   * Wybierz ofertę
   */
  const selectOffer = useCallback((offer: OfferListItemViewModel) => {
    setSelectedOffer(offer);
  }, []);

  /**
   * Odznacz ofertę
   */
  const deselectOffer = useCallback(() => {
    setSelectedOffer(undefined);
  }, []);

  return {
    selectedOffer,
    selectOffer,
    deselectOffer,
  };
}
