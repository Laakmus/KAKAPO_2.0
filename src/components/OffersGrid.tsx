import React from 'react';
import type { OfferListItemViewModel } from '@/types';
import { OfferCard } from './OfferCard';

/**
 * Props dla OffersGrid
 */
type OffersGridProps = {
  offers: OfferListItemViewModel[];
};

/**
 * Siatka kart ofert
 *
 * Responsywna siatka (1-4 kolumny zależnie od breakpointu)
 */
export function OffersGrid({ offers }: OffersGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {offers.map((offer) => (
        <OfferCard key={offer.id} offer={offer} />
      ))}
    </div>
  );
}
