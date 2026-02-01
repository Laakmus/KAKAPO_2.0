import React from 'react';

interface ImagePlaceholderProps {
  className?: string;
}

/**
 * Placeholder component for offers without images
 * Displays "Brak zdjęcia" text similar to OLX style
 */
export function ImagePlaceholder({ className = '' }: ImagePlaceholderProps) {
  return (
    <div
      className={`flex items-center justify-center bg-gray-200 text-gray-500 ${className}`}
      role="img"
      aria-label="Brak zdjęcia"
    >
      <div className="text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="mt-2 text-sm font-medium">Brak zdjęcia</p>
      </div>
    </div>
  );
}

interface OfferImageProps {
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  alt: string;
  className?: string;
  useThumbnail?: boolean;
}

/**
 * Component for displaying offer images with automatic fallback to placeholder
 */
export function OfferImage({ imageUrl, thumbnailUrl, alt, className = '', useThumbnail = false }: OfferImageProps) {
  const [imageError, setImageError] = React.useState(false);

  // Use thumbnail for lists, full image for details
  const displayUrl = useThumbnail && thumbnailUrl ? thumbnailUrl : imageUrl;

  // Show placeholder if no image or image failed to load
  if (!displayUrl || imageError) {
    return <ImagePlaceholder className={className} />;
  }

  return (
    <img
      src={displayUrl}
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => setImageError(true)}
      loading="lazy"
    />
  );
}
