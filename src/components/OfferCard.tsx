import React from 'react';
import type { OfferListItemViewModel } from '@/types';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { OfferImage } from './ImagePlaceholder';

/**
 * Props dla OfferCard
 */
type OfferCardProps = {
  offer: OfferListItemViewModel;
};

/**
 * Karta pojedynczej oferty w siatce
 *
 * Funkcjonalności:
 * - Wyświetla podstawowe dane oferty
 * - Skraca opis do 120 znaków
 * - Ukrywa licznik zainteresowanych dla własnych ofert
 * - Przycisk "Zobacz szczegóły" prowadzący do pełnego widoku oferty
 * - Badge z liczbą zdjęć (jeśli > 1)
 */
export function OfferCard({ offer }: OfferCardProps) {
  /**
   * Skróć opis do 120 znaków
   */
  const truncateDescription = (text: string, maxLength = 120): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  /**
   * Format daty
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const ownerName = offer.owner_name || 'Nieznany oferent';
  const truncatedDesc = truncateDescription(offer.description);

  // Oblicz liczbę zdjęć - użyj images_count jeśli dostępne, w przeciwnym razie sprawdź image_url
  const imagesCount = offer.images_count ?? (offer.image_url ? 1 : 0);

  return (
    <Card className="group relative p-4 transition-all hover:shadow-xl hover:scale-105 hover:z-10 flex flex-col h-full origin-top">
      {/* Miniatura z badge liczby zdjęć */}
      <div className="relative mb-3">
        <OfferImage
          imageUrl={offer.image_url}
          thumbnailUrl={offer.thumbnail_url}
          alt={offer.title}
          className="rounded-md aspect-video w-full"
          useThumbnail={true}
        />

        {/* Badge z liczbą zdjęć - wyświetlaj tylko jeśli > 1 */}
        {imagesCount > 1 && (
          <div
            className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
            aria-label={`${imagesCount} zdjęć`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {imagesCount}
          </div>
        )}
      </div>

      {/* Tytuł */}
      <h3 className="font-semibold text-lg mb-2 line-clamp-2">{offer.title}</h3>

      {/* Opis */}
      <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{truncatedDesc}</p>

      {/* Meta info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <div className="flex flex-col gap-1">
          <span className="font-medium">{offer.city}</span>
          <span>{ownerName}</span>
        </div>

        <div className="flex flex-col gap-1 items-end">
          <span>{formatDate(offer.created_at)}</span>
          {/* Licznik zainteresowanych - ukryty dla własnych ofert */}
          {!offer.isOwnOffer && (
            <span className="text-primary font-medium">
              {offer.interests_count} {offer.interests_count === 1 ? 'zainteresowany' : 'zainteresowanych'}
            </span>
          )}
        </div>
      </div>

      {/* Przycisk zobacz szczegóły - widoczny tylko przy hover */}
      <Button
        asChild
        variant="default"
        className="w-full mt-auto opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity"
      >
        <a href={`/offers/${offer.id}`}>Zobacz szczegóły</a>
      </Button>
    </Card>
  );
}
