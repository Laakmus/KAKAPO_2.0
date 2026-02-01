import React, { useState } from 'react';
import { useMyOffers } from '@/hooks/useMyOffers';
import { LoadingSkeletonGrid } from './LoadingSkeletonGrid';
import { ErrorBanner } from './ErrorBanner';
import { ActiveOffersList } from './ActiveOffersList';
import { RemovedOffersView } from './RemovedOffersView';
import { Inbox } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

/**
 * Komponent strony Moje Oferty
 *
 * Funkcjonalności:
 * - Wyświetla listę ofert zalogowanego użytkownika
 * - Umożliwia filtrowanie po statusie (ACTIVE/REMOVED)
 * - Deleguje renderowanie do ActiveOffersList / RemovedOffersView
 */
export function MyOffersPage() {
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'REMOVED'>('ACTIVE');
  const { offers, isLoading, isRefreshing, error, refetch } = useMyOffers(statusFilter);

  const handleStatusChange = (newStatus: 'ACTIVE' | 'REMOVED') => {
    setStatusFilter(newStatus);
  };

  const handleRetry = () => {
    refetch();
  };

  // Błąd autoryzacji
  if (error?.status === 401 || error?.status === 403) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorBanner message={error.error.message} onRetry={handleRetry} isAuthError={true} />
      </div>
    );
  }

  return (
    <div data-testid="my-offers-page" className="container mx-auto px-4 py-6">
      {/* Nagłówek i filtry */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold">Moje Oferty</h1>
            <p className="text-muted-foreground mt-1">Zarządzaj swoimi ofertami wymiany</p>
          </div>
          <Button asChild size="sm">
            <a href="/offers/new" data-testid="my-offers-add-offer">
              Dodaj ofertę
            </a>
          </Button>
        </div>

        {/* Filtr statusu */}
        <div className="flex gap-2">
          <Button
            data-testid="my-offers-status-active"
            variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'}
            onClick={() => handleStatusChange('ACTIVE')}
            size="sm"
          >
            Aktywne
          </Button>
          <Button
            data-testid="my-offers-status-removed"
            variant={statusFilter === 'REMOVED' ? 'default' : 'outline'}
            onClick={() => handleStatusChange('REMOVED')}
            size="sm"
          >
            Usunięte
          </Button>
        </div>
      </div>

      {/* Stan loading - skeleton */}
      {isLoading && !isRefreshing && <LoadingSkeletonGrid count={6} />}

      {/* Stan error */}
      {error && error.status !== 401 && error.status !== 403 && (
        <ErrorBanner message={error.error.message} onRetry={handleRetry} isAuthError={false} />
      )}

      {/* Stan empty */}
      {!isLoading && !error && offers.length === 0 && (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
              <Inbox className="h-12 w-12 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">
                {statusFilter === 'ACTIVE' ? 'Nie masz jeszcze żadnych aktywnych ofert' : 'Nie masz usuniętych ofert'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter === 'ACTIVE'
                  ? 'Dodaj swoją pierwszą ofertę i zacznij wymieniać się z innymi użytkownikami.'
                  : 'Wszystkie Twoje oferty są aktywne.'}
              </p>
            </div>
            {statusFilter === 'ACTIVE' && (
              <Button asChild variant="default">
                <a href="/offers/new" data-testid="my-offers-add-first-offer">
                  Dodaj pierwszą ofertę
                </a>
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Widok aktywnych ofert */}
      {!isLoading && !error && offers.length > 0 && statusFilter === 'ACTIVE' && (
        <ActiveOffersList offers={offers} onRefetch={refetch} />
      )}

      {/* Widok usuniętych ofert */}
      {!isLoading && !error && offers.length > 0 && statusFilter === 'REMOVED' && <RemovedOffersView offers={offers} />}

      {/* Refreshing indicator */}
      {isRefreshing && <div className="mt-4 text-center text-sm text-muted-foreground">Odświeżanie...</div>}
    </div>
  );
}
