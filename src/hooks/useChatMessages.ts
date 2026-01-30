import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { MessageViewModel, OffersPaginationMeta, ApiErrorViewModel, Paginated } from '@/types';

/**
 * Hook do zarządzania listą wiadomości w czacie
 *
 * Funkcjonalności:
 * - Fetchuje wiadomości z API zgodnie z paginacją
 * - Oznacza własne wiadomości (isOwn = true)
 * - Obsługuje stany loading, error, empty
 * - Umożliwia refetch (odświeżenie)
 * - Automatyczne scrollowanie do dołu przy nowych wiadomościach
 *
 * @param chatId - ID czatu
 * @param options - opcje paginacji i sortowania
 */
export function useChatMessages(
  chatId: string,
  options?: {
    page?: number;
    limit?: number;
    order?: 'asc' | 'desc';
  },
) {
  const { token } = useAuth();

  const [messages, setMessages] = useState<MessageViewModel[]>([]);
  const [pagination, setPagination] = useState<OffersPaginationMeta | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<ApiErrorViewModel | undefined>();

  // Ref do scrollowania
  const messagesEndRef = useRef<HTMLDivElement>(null!);

  /**
   * Funkcja fetchująca wiadomości
   */
  const fetchMessages = useCallback(
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

        // Buduj query params
        const params = new URLSearchParams({
          page: (options?.page ?? 1).toString(),
          limit: (options?.limit ?? 100).toString(),
          order: options?.order ?? 'asc',
        });

        // Fetch z timeout 10s
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`/api/chats/${chatId}/messages?${params.toString()}`, {
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
          setMessages([]);
          setPagination(undefined);
          return;
        }

        const result: Paginated<MessageViewModel> = await response.json();

        setMessages(result.data);
        setPagination(result.pagination);
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
        setMessages([]);
        setPagination(undefined);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, chatId, options?.page, options?.limit, options?.order],
  );

  /**
   * Refetch - odśwież dane
   */
  const refetch = useCallback(() => {
    fetchMessages(true);
  }, [fetchMessages]);

  /**
   * Scroll do dołu
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
  }, []);

  /**
   * Efekt - fetch przy zmianie parametrów
   */
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    pagination,
    isLoading,
    isRefreshing,
    error,
    refetch,
    messagesEndRef,
    scrollToBottom,
  };
}
