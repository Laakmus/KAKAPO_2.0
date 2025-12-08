import React from 'react';
import type { OfferListItemViewModel } from '@/types';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { OfferImage } from './ImagePlaceholder';

/**
 * Props dla OfferDetailsPanel
 */
type OfferDetailsPanelProps = {
  selectedOffer?: OfferListItemViewModel;
  onClose: () => void;
};

/**
 * Panel szczegółów oferty
 *
 * Funkcjonalności:
 * - Wyświetla rozszerzone dane wybranej oferty
 * - Link do pełnego widoku szczegółów (/offers/{id})
 * - Przycisk zamknięcia
 * - Placeholder gdy brak wyboru
 */
export function OfferDetailsPanel({ selectedOffer, onClose }: OfferDetailsPanelProps) {
  /**
   * Format daty
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Placeholder - brak wyboru
  if (!selectedOffer) {
    return (
      <Card className="p-6 text-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>Wybierz ofertę, aby zobaczyć szczegóły</p>
        </div>
      </Card>
    );
  }

  const ownerName = selectedOffer.owner_name || 'Nieznany oferent';

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-lg font-semibold">Szczegóły oferty</h2>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Zamknij szczegóły">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>

      {/* Miniatura z badge liczby zdjęć */}
      <div className="relative mb-4">
        <OfferImage
          imageUrl={selectedOffer.image_url}
          thumbnailUrl={selectedOffer.thumbnail_url}
          alt={selectedOffer.title}
          className="rounded-md aspect-video w-full"
          useThumbnail={true}
        />
        
        {/* Badge z liczbą zdjęć - wyświetlaj tylko jeśli > 1 */}
        {(selectedOffer.images_count ?? 0) > 1 && (
          <div 
            className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
            aria-label={`${selectedOffer.images_count} zdjęć`}
          >
            <svg 
              className="w-3 h-3" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {selectedOffer.images_count}
          </div>
        )}
      </div>

      {/* Tytuł */}
      <h3 className="text-xl font-bold mb-2">{selectedOffer.title}</h3>

      {/* Opis */}
      <p className="text-sm text-muted-foreground mb-4 whitespace-pre-line">{selectedOffer.description}</p>

      {/* Meta info */}
      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Miasto:</span>
          <span className="font-medium">{selectedOffer.city}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Oferent:</span>
          {selectedOffer.isOwnOffer ? (
            <span className="font-medium">{ownerName}</span>
          ) : (
            <a
              href={`/users/${selectedOffer.owner_id}`}
              className="font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
              aria-label={`Zobacz profil użytkownika ${ownerName}`}
            >
              {ownerName}
            </a>
          )}
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Dodano:</span>
          <span className="font-medium">{formatDate(selectedOffer.created_at)}</span>
        </div>
        {!selectedOffer.isOwnOffer && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Zainteresowanych:</span>
            <span className="font-medium text-primary">{selectedOffer.interests_count}</span>
          </div>
        )}
      </div>

      {/* CTA - link do pełnego widoku */}
      <Button asChild variant="default" className="w-full">
        <a href={`/offers/${selectedOffer.id}`}>Zobacz szczegóły</a>
      </Button>
    </Card>
  );
}
