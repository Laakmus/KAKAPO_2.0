import React from 'react';
import type { UserOfferDTO } from '@/types';
import { EmptyState } from './EmptyState';
import { Card } from './ui/card';
import { OfferImage } from './ImagePlaceholder';

/**
 * Props dla UserOffersSection
 */
export type UserOffersSectionProps = {
  offers: UserOfferDTO[];
  isLoading?: boolean;
  onRefresh: () => void;
};

/**
 * Komponent sekcji z ofertami użytkownika
 *
 * Wyświetla:
 * - Nagłówek sekcji
 * - Siatkę kart ofert
 * - EmptyState gdy brak ofert
 *
 * @param props - Props komponentu
 */
export const UserOffersSection = React.memo(function UserOffersSection({
  offers,
  isLoading = false,
  onRefresh,
}: UserOffersSectionProps) {
  /**
   * Skraca opis do określonej długości
   */
  const truncateText = (text: string, maxLength = 120): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  /**
   * Formatuje datę
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <section className="mb-8" aria-labelledby="user-offers-heading">
      {/* Nagłówek sekcji */}
      <h2 id="user-offers-heading" className="text-xl font-bold mb-4">
        Aktywne oferty
      </h2>

      {/* Loader */}
      {isLoading && (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          role="status"
          aria-label="Ładowanie ofert użytkownika"
        >
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-gray-200 rounded animate-pulse" aria-hidden="true" />
          ))}
        </div>
      )}

      {/* Pusta lista */}
      {!isLoading && offers.length === 0 && (
        <EmptyState
          title="Brak aktywnych ofert"
          description="Ten użytkownik nie ma jeszcze aktywnych ofert."
          onRefresh={onRefresh}
        />
      )}

      {/* Siatka ofert */}
      {!isLoading && offers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
          {offers.map((offer) => (
            <a
              key={offer.id}
              href={`/offers/${offer.id}`}
              className="group block transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
              role="listitem"
              aria-label={`Zobacz szczegóły oferty: ${offer.title} w ${offer.city}`}
            >
              <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow">
                {/* Miniatura */}
                <OfferImage
                  imageUrl={offer.image_url}
                  alt={`Zdjęcie oferty: ${offer.title}`}
                  className="aspect-video group-hover:scale-105 transition-transform duration-300"
                  useThumbnail={true}
                />

                {/* Treść karty */}
                <div className="p-4">
                  {/* Tytuł */}
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {offer.title}
                  </h3>

                  {/* Opis */}
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{truncateText(offer.description)}</p>

                  {/* Meta info */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span className="font-medium">{offer.city}</span>
                    </div>

                    <time dateTime={offer.created_at}>{formatDate(offer.created_at)}</time>
                  </div>
                </div>
              </Card>
            </a>
          ))}
        </div>
      )}
    </section>
  );
});
