import { useState, useEffect } from 'react';
import type { PublicUserDTO, UserOfferDTO, ApiError } from '@/types';
import { supabaseClient } from '@/db/supabase.client';

/**
 * Hook useUserProfile
 *
 * Zarządza pobieraniem danych profilu użytkownika i jego ofert.
 * Automatycznie pobiera dane przy montowaniu i zmianie userId.
 *
 * @param userId - UUID użytkownika
 * @returns Stan profilu, ofert, flagi ładowania, błędy i funkcja odświeżania
 */
export function useUserProfile(userId: string) {
  const [profile, setProfile] = useState<PublicUserDTO | null>(null);
  const [offers, setOffers] = useState<UserOfferDTO[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [profileError, setProfileError] = useState<ApiError | null>(null);
  const [offersError, setOffersError] = useState<ApiError | null>(null);

  /**
   * Pobiera token autoryzacyjny z Supabase
   */
  const getAuthToken = async (): Promise<string | null> => {
    try {
      const { data } = await supabaseClient.auth.getSession();
      return data?.session?.access_token || null;
    } catch (error) {
      console.error('[useUserProfile] Error getting auth token:', error);
      return null;
    }
  };

  /**
   * Konwertuje response error na ApiError
   */
  const parseApiError = async (response: Response): Promise<ApiError> => {
    try {
      const json = await response.json();
      return {
        code: json.error?.code || 'UNKNOWN_ERROR',
        message: json.error?.message || 'Wystąpił nieoczekiwany błąd',
        statusCode: response.status,
      };
    } catch {
      return {
        code: 'NETWORK_ERROR',
        message: 'Nie udało się połączyć z serwerem',
        statusCode: response.status,
      };
    }
  };

  /**
   * Pobiera profil użytkownika
   */
  const fetchProfile = async () => {
    setIsLoadingProfile(true);
    setProfileError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        setProfileError({
          code: 'UNAUTHORIZED',
          message: 'Sesja wygasła. Zaloguj się ponownie.',
          statusCode: 401,
        });
        return;
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await parseApiError(response);
        setProfileError(error);
        return;
      }

      const data: PublicUserDTO = await response.json();
      setProfile(data);
    } catch (error) {
      console.error('[useUserProfile] fetchProfile error:', error);
      setProfileError({
        code: 'NETWORK_ERROR',
        message: 'Brak połączenia z internetem',
        statusCode: 0,
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  /**
   * Pobiera oferty użytkownika
   */
  const fetchOffers = async () => {
    setIsLoadingOffers(true);
    setOffersError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        setOffersError({
          code: 'UNAUTHORIZED',
          message: 'Sesja wygasła. Zaloguj się ponownie.',
          statusCode: 401,
        });
        return;
      }

      const response = await fetch(`/api/users/${userId}/offers`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await parseApiError(response);
        setOffersError(error);
        return;
      }

      const data: { data: UserOfferDTO[] } = await response.json();
      setOffers(data.data);
    } catch (error) {
      console.error('[useUserProfile] fetchOffers error:', error);
      setOffersError({
        code: 'NETWORK_ERROR',
        message: 'Brak połączenia z internetem',
        statusCode: 0,
      });
    } finally {
      setIsLoadingOffers(false);
    }
  };

  /**
   * Odświeża wszystkie dane (profil i oferty)
   */
  const refresh = () => {
    fetchProfile();
    fetchOffers();
  };

  /**
   * Automatyczne pobieranie danych przy montowaniu i zmianie userId
   */
  useEffect(() => {
    if (!userId) return;

    fetchProfile();
    fetchOffers();
  }, [userId]);

  const isLoading = isLoadingProfile || isLoadingOffers;
  const hasError = profileError !== null || offersError !== null;

  return {
    profile,
    offers,
    isLoading,
    isLoadingProfile,
    isLoadingOffers,
    hasError,
    profileError,
    offersError,
    refresh,
  };
}
