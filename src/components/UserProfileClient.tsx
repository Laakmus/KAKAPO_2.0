import React, { useEffect } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { UserProfileHeader } from './UserProfileHeader';
import { UserOffersSection } from './UserOffersSection';
import { LoadingSkeleton } from './LoadingSkeleton';
import { ErrorBanner } from './ErrorBanner';
import { Button } from './ui/button';

/**
 * Props dla UserProfileClient
 */
export type UserProfileClientProps = {
  userId: string;
};

/**
 * Komponent główny widoku profilu użytkownika
 *
 * Orkiestruje:
 * - Pobieranie danych profilu i ofert (hook useUserProfile)
 * - Zarządzanie stanem ładowania i błędów
 * - Renderowanie warunkowe (loading/error/success)
 * - Breadcrumb i przycisk odświeżania
 *
 * @param props - Props komponentu
 */
export function UserProfileClient({ userId }: UserProfileClientProps) {
  const { profile, offers, isLoadingProfile, isLoadingOffers, profileError, offersError, refresh } =
    useUserProfile(userId);

  // Redirect do logowania przy błędzie autoryzacji
  useEffect(() => {
    if (profileError?.statusCode === 401) {
      window.location.href = '/login';
    }
  }, [profileError]);

  /**
   * Obsługa nawigacji wstecz
   */
  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/offers';
    }
  };

  /**
   * Renderowanie stanu ładowania
   */
  if (isLoadingProfile && !profile) {
    return (
      <div
        className="container mx-auto px-4 py-8"
        role="main"
        aria-busy="true"
        aria-label="Ładowanie profilu użytkownika"
      >
        <div className="max-w-5xl mx-auto">
          <LoadingSkeleton variant="profile" />
          <div className="mt-6">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" aria-hidden="true" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-gray-200 rounded animate-pulse" aria-hidden="true" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Renderowanie błędu profilu (krytyczny)
   */
  if (profileError && !profile) {
    const isAuthError = profileError.statusCode === 401 || profileError.statusCode === 403;
    const isNotFound = profileError.statusCode === 404;

    return (
      <div className="container mx-auto px-4 py-8" role="main">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <Button variant="ghost" onClick={handleGoBack} className="mb-6 -ml-2" aria-label="Wróć do poprzedniej strony">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Wróć
          </Button>

          <ErrorBanner
            message={isNotFound ? 'Użytkownik nie został znaleziony' : profileError.message}
            onRetry={isNotFound ? handleGoBack : refresh}
            isAuthError={isAuthError}
          />
        </div>
      </div>
    );
  }

  /**
   * Renderowanie sukcesu - profil z ofertami
   */
  return (
    <div className="container mx-auto px-4 py-8" role="main">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb i akcje */}
        <nav className="flex items-center justify-between mb-6" aria-label="Nawigacja profilu">
          <Button variant="ghost" onClick={handleGoBack} className="-ml-2" aria-label="Wróć do poprzedniej strony">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Wróć
          </Button>

          <Button
            variant="outline"
            onClick={refresh}
            disabled={isLoadingProfile || isLoadingOffers}
            aria-label={isLoadingProfile || isLoadingOffers ? 'Odświeżanie...' : 'Odśwież profil i oferty'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 mr-2 ${isLoadingProfile || isLoadingOffers ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Odśwież
          </Button>
        </nav>

        {/* Nagłówek profilu */}
        {profile && (
          <UserProfileHeader
            firstName={profile.first_name}
            lastName={profile.last_name}
            activeOffersCount={profile.active_offers_count}
          />
        )}

        {/* Błąd ofert (non-critical - profil jest wyświetlony) */}
        {offersError && (
          <div className="mb-6">
            <ErrorBanner message={offersError.message} onRetry={refresh} isAuthError={false} />
          </div>
        )}

        {/* Sekcja ofert */}
        <UserOffersSection offers={offers} isLoading={isLoadingOffers} onRefresh={refresh} />
      </div>
    </div>
  );
}
