import React, { useEffect, useState } from 'react';
import { useOfferActions } from '@/hooks/useOfferActions';
import { useToast } from '@/contexts/ToastContext';
import { OfferEditForm } from './OfferEditForm';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';
import { InterestListPanel } from './InterestListPanel';
import { Button } from './ui/button';
import { Card } from './ui/card';
import type { OfferListItemDTO, UpdateOfferCommand } from '@/types';

type SeenInterestsCountByOfferId = Record<string, number>;

type ActiveOffersListProps = {
  offers: OfferListItemDTO[];
  onRefetch: () => void;
};

/**
 * Lista aktywnych ofert z edycją, usuwaniem i panelem zainteresowanych.
 */
export function ActiveOffersList({ offers, onRefetch }: ActiveOffersListProps) {
  const { updateOffer, deleteOffer, isLoading: isActionLoading } = useOfferActions();
  const { push: showToast } = useToast();

  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [interestPanelOfferId, setInterestPanelOfferId] = useState<string | null>(null);
  const [offerToDelete, setOfferToDelete] = useState<{ id: string; title: string } | null>(null);

  // Lokalny "unread" dla przycisku Zainteresowani
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

  const markInterestsAsViewed = (offerId: string, totalInterests: number) => {
    setSeenInterestsCountByOfferId((prev) => ({
      ...prev,
      [offerId]: Math.max(0, Number(totalInterests) || 0),
    }));
  };

  const handleEditSubmit = async (offerId: string, payload: UpdateOfferCommand) => {
    const result = await updateOffer(offerId, payload);
    if (result.success) {
      showToast({ type: 'success', text: 'Oferta została zaktualizowana pomyślnie' });
      setEditingOfferId(null);
      onRefetch();
    } else {
      showToast({ type: 'error', text: result.error?.error.message || 'Nie udało się zaktualizować oferty' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!offerToDelete) return;
    const result = await deleteOffer(offerToDelete.id);
    if (result.success) {
      showToast({ type: 'success', text: 'Oferta została usunięta pomyślnie' });
      setOfferToDelete(null);
      onRefetch();
    } else {
      showToast({ type: 'error', text: result.error?.error.message || 'Nie udało się usunąć oferty' });
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {offers.map((offer) => {
          const isEditing = editingOfferId === offer.id;
          const isLoadingAction = isActionLoading(offer.id);
          const lastSeenCount = seenInterestsCountByOfferId[offer.id] ?? 0;
          const hasNewInterests = (offer.interests_count ?? 0) > lastSeenCount;

          return (
            <Card key={offer.id} data-testid="my-offer-card" className="p-4">
              {/* Miniatura */}
              {offer.image_url && !isEditing && (
                <div className="mb-3 rounded-md overflow-hidden aspect-video bg-muted">
                  <img src={offer.image_url} alt={offer.title} className="w-full h-full object-cover" loading="lazy" />
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
                      data-testid="my-offer-edit-button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingOfferId(offer.id)}
                      disabled={isLoadingAction}
                    >
                      Edytuj
                    </Button>
                    <Button
                      data-testid="my-offer-delete-button"
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
    </>
  );
}
