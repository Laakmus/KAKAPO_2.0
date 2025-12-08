import React from 'react';
import type { OfferListItemViewModel } from '@/types';
import { OfferCard } from './OfferCard';

/**
 * Props dla OffersGrid
 */
type OffersGridProps = {
  offers: OfferListItemViewModel[];
  selectedOfferId?: string;
  onSelectOffer: (offer: OfferListItemViewModel) => void;
};

/**
 * Siatka kart ofert
 *
 * Responsywna siatka (1-3 kolumny zależnie od breakpointu)
 */
export function OffersGrid({ offers, selectedOfferId, onSelectOffer }: OffersGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {offers.map((offer) => (
        <OfferCard key={offer.id} offer={offer} isSelected={selectedOfferId === offer.id} onSelect={onSelectOffer} />
      ))}
    </div>
  );
}
