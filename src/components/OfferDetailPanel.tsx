import React, { useState, useCallback } from 'react';
import type { OfferDetailViewModel, ApiErrorViewModel, OfferImageDTO } from '@/types';
import { Card } from './ui/card';
import { InterestToggleCTA } from './InterestToggleCTA';
import { LoadingSkeleton } from './LoadingSkeleton';
import { ErrorBanner } from './ErrorBanner';
import { OfferImage } from './ImagePlaceholder';
import { Button } from './ui/button';

/**
 * Props dla OfferDetailPanel
 */
type OfferDetailPanelProps = {
  offer: OfferDetailViewModel | null;
  isLoading: boolean;
  error?: ApiErrorViewModel;
  onRetry: () => void;
  onExpressInterest: (offerId: string) => void;
  onCancelInterest: (interestId: string) => void;
  isMutating: boolean;
};

/**
 * Panel szczegółów oferty (detail)
 *
 * Funkcjonalności:
 * - Wyświetla pełne dane oferty (obraz, tytuł, opis)
 * - Meta info (miasto, data, status, oferent)
 * - Przycisk zainteresowania (InterestToggleCTA)
 * - Linki do profilu oferenta i jego ofert
 * - Breadcrumb "Wróć do listy"
 * - Loading skeleton podczas ładowania
 * - Error banner przy błędzie
 */
export function OfferDetailPanel({
  offer,
  isLoading,
  error,
  onRetry,
  onExpressInterest,
  onCancelInterest,
  isMutating,
}: OfferDetailPanelProps) {
  /**
   * Renderuj loading state
   */
  if (isLoading) {
    return (
      <Card className="p-6">
        <LoadingSkeleton variant="detail" />
      </Card>
    );
  }

  /**
   * Renderuj error state
   */
  if (error) {
    return (
      <div className="space-y-4">
        <BackToListLink />
        <ErrorBanner
          message={error.error.message}
          onRetry={onRetry}
          isAuthError={error.status === 401 || error.status === 403}
        />
      </div>
    );
  }

  /**
   * Renderuj empty state (404)
   */
  if (!offer) {
    return (
      <div className="space-y-4">
        <BackToListLink />
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Oferta nie istnieje</h2>
          <p className="text-muted-foreground mb-4">Oferta mogła zostać usunięta lub nie masz do niej dostępu</p>
          <a
            href="/offers"
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Wróć do listy ofert
          </a>
        </Card>
      </div>
    );
  }

  /**
   * Renderuj szczegóły oferty
   */
  // Przygotuj listę zdjęć - użyj tablicy images lub fallback do image_url
  const images: Array<{ url: string; thumbnail_url?: string | null }> =
    offer.images && offer.images.length > 0
      ? offer.images.map((img) => ({ url: img.image_url, thumbnail_url: img.thumbnail_url }))
      : offer.image_url
        ? [{ url: offer.image_url, thumbnail_url: null }]
        : [];

  return (
    <div className="space-y-4">
      {/* Breadcrumb - Wróć do listy */}
      <BackToListLink />

      {/* Main card */}
      <Card className="overflow-hidden">
        {/* Galeria zdjęć */}
        <ImageGallery images={images} title={offer.title} />

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Tytuł */}
          <div>
            <h1 className="text-3xl font-bold mb-2">{offer.title}</h1>
            <MetaSection offer={offer} />
          </div>

          {/* Opis */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Opis</h2>
            <p className="text-base leading-relaxed whitespace-pre-wrap">{offer.description}</p>
          </div>

          {/* Interest Toggle Button */}
          <InterestToggleCTA
            offerId={offer.id}
            isInterested={offer.is_interested || false}
            isOwner={offer.is_owner || false}
            currentInterestId={offer.current_user_interest_id}
            status={offer.status}
            isMutating={isMutating}
            interestsCount={offer.interests_count}
            onExpress={onExpressInterest}
            onCancel={onCancelInterest}
          />

          {/* Owner info and links */}
          <OwnerLinks ownerId={offer.owner_id} ownerName={offer.owner_name} isOwner={offer.is_owner || false} />
        </div>
      </Card>
    </div>
  );
}

/**
 * MetaSection - Meta informacje o ofercie
 */
type MetaSectionProps = {
  offer: OfferDetailViewModel;
};

function MetaSection({ offer }: MetaSectionProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
      {/* Miasto */}
      <span className="flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {offer.city}
      </span>

      {/* Data utworzenia */}
      <span className="flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        {offer.formattedDate}
      </span>

      {/* Status badge */}
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          offer.status === 'ACTIVE'
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
        }`}
      >
        {offer.statusLabel}
      </span>

      {/* Licznik zainteresowanych - tylko dla nie-właścicieli */}
      {!offer.is_owner && (
        <span className="flex items-center gap-1 text-primary font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          {offer.interests_count} {offer.interests_count === 1 ? 'zainteresowany' : 'zainteresowanych'}
        </span>
      )}
    </div>
  );
}

/**
 * OwnerLinks - Linki do profilu oferenta i jego ofert
 */
type OwnerLinksProps = {
  ownerId: string;
  ownerName?: string;
  isOwner: boolean;
};

function OwnerLinks({ ownerId, ownerName, isOwner }: OwnerLinksProps) {
  const displayName = ownerName || 'Nieznany oferent';

  return (
    <div className="pt-4 border-t">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        {isOwner ? 'Twoja oferta' : 'Oferent'}
      </h3>
      <div className="flex flex-wrap gap-3">
        {/* Link do profilu */}
        <a
          href={`/users/${ownerId}`}
          className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
          aria-label={`Zobacz profil ${displayName}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span>Profil {isOwner ? '' : displayName}</span>
        </a>

        {/* Link do ofert użytkownika - prowadzi do profilu z ofertami */}
        {!isOwner && (
          <a
            href={`/users/${ownerId}#user-offers-heading`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
            aria-label={`Zobacz oferty ${displayName}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <span>Oferty oferenta</span>
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * BackToListLink - Breadcrumb z linkiem powrotu do listy
 */
function BackToListLink() {
  return (
    <nav aria-label="Breadcrumb">
      <a
        href="/offers"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Wróć do listy ofert</span>
      </a>
    </nav>
  );
}

/**
 * ImageGallery - Galeria zdjęć oferty z nawigacją
 */
type ImageGalleryProps = {
  images: Array<{ url: string; thumbnail_url?: string | null }>;
  title: string;
};

function ImageGallery({ images, title }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  // Obsługa klawiszy strzałek
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    },
    [goToPrevious, goToNext],
  );

  // Brak zdjęć - pokaż placeholder
  if (images.length === 0) {
    return <OfferImage imageUrl={null} alt={title} className="aspect-video w-full" useThumbnail={false} />;
  }

  // Jedno zdjęcie - prosta wersja bez nawigacji
  if (images.length === 1) {
    return <OfferImage imageUrl={images[0].url} alt={title} className="aspect-video w-full" useThumbnail={false} />;
  }

  // Wiele zdjęć - pełna galeria
  const currentImage = images[currentIndex];

  return (
    <div className="relative" onKeyDown={handleKeyDown} tabIndex={0} role="region" aria-label="Galeria zdjęć">
      {/* Główne zdjęcie */}
      <div className="relative aspect-video bg-muted">
        <OfferImage
          imageUrl={currentImage.url}
          alt={`${title} - zdjęcie ${currentIndex + 1} z ${images.length}`}
          className="aspect-video w-full"
          useThumbnail={false}
        />

        {/* Przycisk poprzedni */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-10 w-10"
          onClick={goToPrevious}
          aria-label="Poprzednie zdjęcie"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>

        {/* Przycisk następny */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-10 w-10"
          onClick={goToNext}
          aria-label="Następne zdjęcie"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>

        {/* Licznik zdjęć */}
        <div className="absolute bottom-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      {/* Miniatury nawigacyjne */}
      <div className="flex gap-2 p-3 overflow-x-auto bg-muted/50">
        {images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`flex-shrink-0 rounded-md overflow-hidden transition-all ${
              idx === currentIndex ? 'ring-2 ring-primary ring-offset-2' : 'opacity-70 hover:opacity-100'
            }`}
            aria-label={`Przejdź do zdjęcia ${idx + 1}`}
            aria-current={idx === currentIndex ? 'true' : 'false'}
          >
            <OfferImage
              imageUrl={img.url}
              thumbnailUrl={img.thumbnail_url}
              alt={`${title} miniatura ${idx + 1}`}
              className="h-16 w-20 object-cover"
              useThumbnail={true}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
