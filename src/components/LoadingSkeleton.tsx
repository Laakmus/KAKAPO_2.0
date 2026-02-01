import React from 'react';

/**
 * Props dla LoadingSkeleton
 */
export type LoadingSkeletonProps = {
  variant?: 'default' | 'nav' | 'profile' | 'detail';
  height?: string;
  className?: string;
};

/**
 * Komponent LoadingSkeleton
 *
 * Skeleton loader dla różnych części layoutu podczas ładowania.
 * Zapewnia lepsze UX niż prosty spinner.
 *
 * Warianty:
 * - default: Podstawowy spinner (używany w MainContentContainer)
 * - nav: Skeleton dla TopNavBar (gdy ładuje się profil użytkownika)
 * - profile: Skeleton dla obszaru profilu
 * - detail: Skeleton dla szczegółów oferty
 *
 * @param props - Props komponentu
 */
export function LoadingSkeleton({ variant = 'default', height, className }: LoadingSkeletonProps) {
  // Jeśli podano height lub className, renderuj prosty skeleton
  if (height || className) {
    return <div className={`bg-gray-200 rounded animate-pulse ${height || ''} ${className || ''}`} />;
  }
  if (variant === 'nav') {
    return (
      <div className="flex items-center space-x-4">
        {/* Skeleton nazwy użytkownika */}
        <div className="hidden sm:block">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        {/* Skeleton przycisku logout */}
        <div className="h-10 w-24 bg-gray-200 rounded-md animate-pulse" />
      </div>
    );
  }

  if (variant === 'profile') {
    return (
      <div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className="space-y-6">
        {/* Skeleton obrazu */}
        <div className="aspect-video bg-gray-200 rounded animate-pulse" />

        {/* Skeleton tytułu */}
        <div className="space-y-2">
          <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Skeleton opisu */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Skeleton przycisku */}
        <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  // Default variant - spinner
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div
          className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-primary"
          role="status"
          aria-label="Ładowanie..."
        />
        <p className="text-sm text-gray-600">Ładowanie...</p>
      </div>
    </div>
  );
}
