import React, { useEffect, useState } from 'react';
import { useMyOffers } from '@/hooks/useMyOffers';
import { useOfferActions } from '@/hooks/useOfferActions';
import { LoadingSkeletonGrid } from './LoadingSkeletonGrid';
import { ErrorBanner } from './ErrorBanner';
import { OfferEditForm } from './OfferEditForm';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { InterestListPanel } from './InterestListPanel';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useToast } from '@/contexts/ToastContext';
import type { UpdateOfferCommand } from '@/types';

type SeenInterestsCountByOfferId = Record<string, number>;

/**
 * Komponent strony Moje Oferty
 *
 * Funkcjonalności:
 * - Wyświetla listę ofert zalogowanego użytkownika
 * - Umożliwia filtrowanie po statusie (ACTIVE/REMOVED)
 * - Wyświetla liczbę zainteresowanych dla każdej oferty
 * - Obsługuje edycję, usuwanie i podgląd zainteresowanych
 */
export function MyOffersPage() {
  // Stan filtra statusu
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'REMOVED'>('ACTIVE');

  // Fetchowanie moich ofert
  const { offers, isLoading, isRefreshing, error, refetch } = useMyOffers(statusFilter);

  // Akcje na ofertach
  const { updateOffer, deleteOffer, isLoading: isActionLoading } = useOfferActions();

  // Toast notifications
  const { push: showToast } = useToast();

  // Stan edycji oferty (ID oferty edytowanej)
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);

  // Stan panelu zainteresowanych (ID oferty)
  const [interestPanelOfferId, setInterestPanelOfferId] = useState<string | null>(null);

  /**
   * Lokalny "unread" dla przycisku Zainteresowani.
   * Kropka znika dopiero po tym, gdy lista zainteresowanych faktycznie się wyświetli
   * (czyli po zakończeniu ładowania i wyrenderowaniu kart w modalu).
   */
  const [seenInterestsCountByOfferId, setSeenInterestsCountByOfferId] = useState<SeenInterestsCountByOfferId>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem('kakapo_seen_interests_count_by_offer_id');
      const parsed = raw ? (JSON.parse(raw) as SeenInterestsCountByOfferId) : {};
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      return parsed;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        'kakapo_seen_interests_count_by_offer_id',
        JSON.stringify(seenInterestsCountByOfferId),
      );
    } catch {
      // ignore
    }
  }, [seenInterestsCountByOfferId]);

  // Stan dialogu usuwania (oferta do usunięcia)
  const [offerToDelete, setOfferToDelete] = useState<{ id: string; title: string } | null>(null);

  /**
   * Handler zmiany filtra statusu
   */
  const handleStatusChange = (newStatus: 'ACTIVE' | 'REMOVED') => {
    setStatusFilter(newStatus);
    // Reset stanów przy zmianie filtra
    setEditingOfferId(null);
    setInterestPanelOfferId(null);
    setOfferToDelete(null);
  };

  /**
   * Handler retry po błędzie
   */
  const handleRetry = () => {
    refetch();
  };

  /**
   * Handler odświeżenia
   */
  const handleRefresh = () => {
    refetch();
  };

  const markInterestsAsViewed = (offerId: string, totalInterests: number) => {
    setSeenInterestsCountByOfferId((prev) => ({
      ...prev,
      [offerId]: Math.max(0, Number(totalInterests) || 0),
    }));
  };

  /**
   * Handler edycji oferty
   */
  const handleEditSubmit = async (offerId: string, payload: UpdateOfferCommand) => {
    const result = await updateOffer(offerId, payload);

    if (result.success) {
      showToast({
        type: 'success',
        text: 'Oferta została zaktualizowana pomyślnie',
      });
      setEditingOfferId(null);
      refetch();
    } else {
      showToast({
        type: 'error',
        text: result.error?.error.message || 'Nie udało się zaktualizować oferty',
      });
    }
  };

  /**
   * Handler usunięcia oferty
   */
  const handleDeleteConfirm = async () => {
    if (!offerToDelete) return;

    const result = await deleteOffer(offerToDelete.id);

    if (result.success) {
      showToast({
        type: 'success',
        text: 'Oferta została usunięta pomyślnie',
      });
      setOfferToDelete(null);
      refetch();
    } else {
      showToast({
        type: 'error',
        text: result.error?.error.message || 'Nie udało się usunąć oferty',
      });
    }
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
      {/* Nagłówek i filtry */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold">Moje Oferty</h1>
            <p className="text-muted-foreground mt-1">Zarządzaj swoimi ofertami wymiany</p>
          </div>

          {/* CTA - Dodaj nową ofertę */}
          <Button asChild size="default">
            <a href="/offers/new" data-testid="my-offers-add-offer">
              Dodaj ofertę
            </a>
          </Button>
        </div>

        {/* Filtr statusu */}
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'}
            onClick={() => handleStatusChange('ACTIVE')}
            size="sm"
          >
            Aktywne
          </Button>
          <Button
            variant={statusFilter === 'REMOVED' ? 'default' : 'outline'}
            onClick={() => handleStatusChange('REMOVED')}
            size="sm"
          >
            Usunięte
          </Button>
          <Button variant="ghost" onClick={handleRefresh} size="sm" disabled={isLoading || isRefreshing}>
            Odśwież
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
            {/* Ikona */}
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>

            {/* Komunikat */}
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

            {/* CTA */}
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

      {/* Stan success - lista ofert */}
      {!isLoading && !error && offers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map((offer) => {
            const isEditing = editingOfferId === offer.id;
            const isLoadingAction = isActionLoading(offer.id);
            const lastSeenCount = seenInterestsCountByOfferId[offer.id] ?? 0;
            const hasNewInterests = (offer.interests_count ?? 0) > lastSeenCount;

            return (
              <Card key={offer.id} className="p-4">
                {/* Miniatura */}
                {offer.image_url && !isEditing && (
                  <div className="mb-3 rounded-md overflow-hidden aspect-video bg-muted">
                    <img
                      src={offer.image_url}
                      alt={offer.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Tryb normalny */}
                {!isEditing && (
                  <>
                    {/* Tytuł i status */}
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg line-clamp-2 flex-1">{offer.title}</h3>
                      <span
                        className={`ml-2 px-2 py-1 text-xs rounded-full ${
                          offer.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {offer.status === 'ACTIVE' ? 'Aktywna' : 'Usunięta'}
                      </span>
                    </div>

                    {/* Opis */}
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{offer.description}</p>

                    {/* Meta info */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <span className="font-medium">{offer.city}</span>
                      <span>
                        {new Date(offer.created_at).toLocaleDateString('pl-PL', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Licznik zainteresowanych */}
                    <div className="mb-3 py-2 px-3 bg-muted rounded-md">
                      <span className="text-sm font-medium">
                        Zainteresowani: <span className="text-primary">{offer.interests_count}</span>
                      </span>
                    </div>

                    {/* Akcje */}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingOfferId(offer.id)}
                        disabled={isLoadingAction}
                      >
                        Edytuj
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOfferToDelete({ id: offer.id, title: offer.title })}
                        disabled={isLoadingAction}
                      >
                        Usuń
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="relative"
                        onClick={() => setInterestPanelOfferId(offer.id)}
                        disabled={offer.interests_count === 0 || isLoadingAction}
                      >
                        {offer.interests_count > 0 && hasNewInterests && (
                          <>
                            <span
                              aria-hidden="true"
                              className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
                            />
                            <span className="sr-only">Nowe</span>
                          </>
                        )}
                        Zainteresowani ({offer.interests_count})
                      </Button>
                    </div>
                  </>
                )}

                {/* Tryb edycji */}
                {isEditing && (
                  <OfferEditForm
                    offer={offer}
                    onSubmit={(payload) => handleEditSubmit(offer.id, payload)}
                    onCancel={() => setEditingOfferId(null)}
                    isSubmitting={isLoadingAction}
                  />
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Refreshing indicator */}
      {isRefreshing && <div className="mt-4 text-center text-sm text-muted-foreground">Odświeżanie...</div>}

      {/* Dialog potwierdzenia usunięcia */}
      <DeleteConfirmationDialog
        isOpen={!!offerToDelete}
        offerTitle={offerToDelete?.title || ''}
        onCancel={() => setOfferToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={offerToDelete ? isActionLoading(offerToDelete.id) : false}
      />

      {/* Panel zainteresowanych */}
      <InterestListPanel
        offerId={interestPanelOfferId}
        isOpen={!!interestPanelOfferId}
        onClose={() => setInterestPanelOfferId(null)}
        onInterestsDisplayed={(offerId, total) => markInterestsAsViewed(offerId, total)}
      />
    </div>
  );
}
