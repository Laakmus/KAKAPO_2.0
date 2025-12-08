import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatDetailsViewModel, ApiErrorViewModel } from '@/types';

/**
 * Hook do zarządzania szczegółami czatu
 *
 * Funkcjonalności:
 * - Fetchuje szczegóły czatu z API
 * - Weryfikuje dostęp użytkownika
 * - Obsługuje stany loading, error
 * - Umożliwia refetch (odświeżenie)
 *
 * @param chatId - ID czatu
 */
export function useChatDetails(chatId: string) {
  const { token } = useAuth();

  const [chatDetails, setChatDetails] = useState<ChatDetailsViewModel | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<ApiErrorViewModel | undefined>();

  /**
   * Funkcja fetchująca szczegóły czatu
   */
  const fetchChatDetails = useCallback(
    async (isRefresh = false) => {
      if (!token) {
        setError({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Brak autoryzacji',
          },
          status: 401,
        });
        setIsLoading(false);
        return;
      }

      try {
        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setError(undefined);

        // Fetch z timeout 10s
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`/api/chats/${chatId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json();
          setError({
            ...errorData,
            status: response.status,
          });
          setChatDetails(undefined);
          return;
        }

        const result: ChatDetailsViewModel = await response.json();

        setChatDetails(result);
        setError(undefined);
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            setError({
              error: {
                code: 'TIMEOUT',
                message: 'Przekroczono limit czasu żądania',
              },
              status: 408,
            });
          } else {
            setError({
              error: {
                code: 'NETWORK_ERROR',
                message: 'Błąd sieci. Sprawdź połączenie internetowe',
              },
              status: 0,
            });
          }
        }
        setChatDetails(undefined);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, chatId],
  );

  /**
   * Refetch - odśwież dane
   */
  const refetch = useCallback(() => {
    fetchChatDetails(true);
  }, [fetchChatDetails]);

  /**
   * Efekt - fetch przy zmianie parametrów
   */
  useEffect(() => {
    fetchChatDetails();
  }, [fetchChatDetails]);

  // Drugi użytkownik i stan realizacji
  const otherUser = chatDetails?.other_user;

  return {
    chatDetails,
    otherUser,
    isLoading,
    isRefreshing,
    error,
    refetch,
  };
}
