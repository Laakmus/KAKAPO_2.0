import { useState } from 'react';
import { useOffersList } from '@/hooks/useOffersList';
import { useUrlPagination } from '@/hooks/useUrlPagination';
import type { HomeFilterState } from '@/types';
import { OffersSearchInput } from './OffersSearchInput';
import { OffersFilterPanel } from './OffersFilterPanel';
import { OffersGrid } from './OffersGrid';
import { PaginationControls } from './PaginationControls';
import { LoadingSkeletonGrid } from './LoadingSkeletonGrid';
import { EmptyState } from './EmptyState';
import { ErrorBanner } from './ErrorBanner';

/**
 * Główny komponent strony Home - lista ofert
 *
 * Orkiestruje:
 * - Fetchowanie ofert z filtrowaniem i paginacją
 * - Zarządzanie stanem (loading, error, empty)
 * - Obsługa interakcji (filtrowanie, paginacja, odświeżanie)
 */
export function HomeOffersPage() {
  // Stan filtra
  const [filter, setFilter] = useState<HomeFilterState>({
    sort: 'created_at',
    order: 'desc',
    search: '',
  });

  // Paginacja z synchronizacją URL
  const { page, setPage } = useUrlPagination();

  // Fetchowanie ofert
  const { offers, pagination, isLoading, isRefreshing, error, refetch } = useOffersList(filter, page);

  /**
   * Handler zmiany wyszukiwania
   */
  const handleSearchChange = (search: string) => {
    setFilter((prev) => ({ ...prev, search }));
    // Reset do strony 1 przy zmianie wyszukiwania
    setPage(1);
  };

  /**
   * Handler zmiany filtra
   */
  const handleFilterChange = (newFilter: HomeFilterState) => {
    setFilter(newFilter);
    // Reset do strony 1 przy zmianie filtra
    setPage(1);
  };

  /**
   * Handler zmiany strony
   */
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // Scroll na górę
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Handler odświeżenia
   */
  const handleRefresh = () => {
    refetch();
  };

  /**
   * Handler retry po błędzie
   */
  const handleRetry = () => {
    refetch();
  };

  /**
   * Renderowanie stanów
   */

  // Błąd autoryzacji
  if (error?.status === 401 || error?.status === 403) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorBanner message={error.error.message} onRetry={handleRetry} isAuthError={true} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Pole wyszukiwania */}
      <div className="mb-6">
        <OffersSearchInput value={filter.search || ''} onChange={handleSearchChange} />
      </div>

      {/* Panel filtrowania */}
      <div className="mb-6">
        <OffersFilterPanel
          values={filter}
          onChange={handleFilterChange}
          onRefresh={handleRefresh}
          isLoading={isLoading || isRefreshing}
        />
      </div>

      {/* Stan loading - skeleton */}
      {isLoading && !isRefreshing && <LoadingSkeletonGrid count={6} />}

      {/* Stan error */}
      {error && error.status !== 401 && error.status !== 403 && (
        <ErrorBanner message={error.error.message} onRetry={handleRetry} isAuthError={false} />
      )}

      {/* Stan empty */}
      {!isLoading && !error && offers.length === 0 && (
        <EmptyState onRefresh={handleRefresh} searchQuery={filter.search} />
      )}

      {/* Stan success - siatka ofert */}
      {!isLoading && !error && offers.length > 0 && (
        <>
          <OffersGrid offers={offers} />

          {/* Paginacja */}
          {pagination && pagination.total_pages > 1 && (
            <div className="mt-8">
              <PaginationControls pagination={pagination} onPageChange={handlePageChange} />
            </div>
          )}
        </>
      )}

      {/* Refreshing indicator */}
      {isRefreshing && <div className="mt-4 text-center text-sm text-muted-foreground">Odświeżanie...</div>}
    </div>
  );
}
