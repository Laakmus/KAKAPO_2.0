import React from 'react';
import { useOffersList } from '@/hooks/useOffersList';
import type { HomeFilterState } from '@/types';
import { OfferCard } from './OfferCard';
import { PaginationControls } from './PaginationControls';
import { LoadingSkeletonGrid } from './LoadingSkeletonGrid';
import { EmptyState } from './EmptyState';
import { ErrorBanner } from './ErrorBanner';

/**
 * Props dla OffersListPanel
 */
type OffersListPanelProps = {
  selectedOfferId: string; // ID aktualnie wybranej oferty (do highlightu)
  onSelect: (offerId: string) => void; // Callback przy wyborze oferty
  filter: HomeFilterState; // Filtry i sortowanie
  page: number; // Numer strony (1-based)
  onPageChange: (page: number) => void; // Callback przy zmianie strony
};

/**
 * Panel listy ofert (master)
 *
 * Funkcjonalności:
 * - Wyświetla listę ofert w formie kart
 * - Highlightuje aktualnie wybraną ofertę
 * - Obsługuje paginację (15 ofert na stronę)
 * - Pokazuje loading skeleton podczas ładowania
 * - Pokazuje empty state gdy brak ofert
 * - Pokazuje error banner przy błędzie
 */
export function OffersListPanel({ selectedOfferId, onSelect, filter, page, onPageChange }: OffersListPanelProps) {
  // Fetch offers
  const { offers, pagination, isLoading, error, refetch } = useOffersList(filter, page);

  /**
   * Renderuj loading state
   */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Oferty</h2>
        </div>
        <LoadingSkeletonGrid count={5} />
      </div>
    );
  }

  /**
   * Renderuj error state
   */
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Oferty</h2>
        </div>
        <ErrorBanner
          message={error.error.message}
          onRetry={refetch}
          isAuthError={error.status === 401 || error.status === 403}
        />
      </div>
    );
  }

  /**
   * Renderuj empty state
   */
  if (!offers || offers.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Oferty</h2>
        </div>
        <EmptyState
          title="Brak ofert"
          description="Nie znaleziono żadnych ofert spełniających kryteria"
          onRefresh={refetch}
        />
      </div>
    );
  }

  /**
   * Renderuj listę ofert
   */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          Oferty
          {pagination && <span className="ml-2 text-sm font-normal text-muted-foreground">({pagination.total})</span>}
        </h2>
      </div>

      {/* Offers list */}
      <div className="space-y-3" role="list" aria-label="Lista ofert">
        {offers.map((offer) => (
          <div key={offer.id} role="listitem">
            <OfferCard offer={offer} isSelected={offer.id === selectedOfferId} onSelect={() => onSelect(offer.id)} />
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="mt-6">
          <PaginationControls pagination={pagination} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  );
}
