import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type {
  ChatsViewState,
  ChatSummaryViewModel,
  ChatDetailViewModel,
  ChatMessageViewModel,
  InterestActionContext,
  ChatListItemDTO,
  MessageViewModel,
  Paginated,
} from '@/types';

/**
 * Hook do zarządzania stanem widoku czatów
 *
 * Funkcjonalności:
 * - Fetch listy czatów
 * - Wybór czatu (z URL lub domyślny)
 * - Fetch szczegółów czatu i wiadomości
 * - Wysyłanie wiadomości
 * - Akcje realizacji/unrealizacji
 * - Zarządzanie wszystkimi stanami loading/error
 *
 * @param initialChatId - opcjonalny ID czatu do wybrania po załadowaniu
 */
export function useChatsViewState(initialChatId?: string) {
  const { token, user } = useAuth();

  // Stan główny
  const [state, setState] = useState<ChatsViewState>({
    chats: [],
    isLoadingChats: true,
    chatsError: undefined,
    selectedChatId: undefined,
    selectedChat: undefined,
    messages: [],
    isLoadingMessages: false,
    messagesError: undefined,
    interestContext: undefined,
    isSending: false,
    isRealizing: false,
    isUnrealizing: false,
    actionError: undefined,
  });

  /**
   * Formatuje datę dla UI
   */
  const formatMessageDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Teraz';
    if (diffMins < 60) return `${diffMins} min temu`;
    if (diffHours < 24) return `${diffHours}h temu`;
    if (diffDays === 1) return 'Wczoraj';
    if (diffDays < 7) return `${diffDays} dni temu`;

    return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  };

  /**
   * Formatuje czas wiadomości (godzina:minuta)
   */
  const formatMessageTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  };

  /**
   * Fetch listy czatów
   */
  const fetchChats = useCallback(async () => {
    if (!token) {
      setState((prev) => ({
        ...prev,
        chatsError: {
          error: { code: 'UNAUTHORIZED', message: 'Brak autoryzacji' },
          status: 401,
        },
        isLoadingChats: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoadingChats: true, chatsError: undefined }));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/chats?status=ACTIVE', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: { code: 'UNKNOWN', message: 'Nieznany błąd serwera' },
        }));
        setState((prev) => ({
          ...prev,
          chatsError: { ...errorData, status: response.status },
          isLoadingChats: false,
        }));
        return;
      }

      const result: { data: ChatListItemDTO[] } = await response.json();

      // Mapowanie do ChatSummaryViewModel
      const chats: ChatSummaryViewModel[] = (result.data || []).map((chat) => ({
        ...chat,
        formattedLastMessageAt: chat.last_message?.created_at ? formatMessageDate(chat.last_message.created_at) : '',
        interestId: undefined, // TODO: Może być dodane w przyszłości z API
      }));

      setState((prev) => ({
        ...prev,
        chats,
        isLoadingChats: false,
        chatsError: undefined,
      }));

      // Return chats dla użycia w useEffect
      return chats;
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setState((prev) => ({
            ...prev,
            chatsError: {
              error: { code: 'TIMEOUT', message: 'Przekroczono limit czasu żądania' },
              status: 408,
            },
            isLoadingChats: false,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            chatsError: {
              error: { code: 'NETWORK_ERROR', message: 'Błąd sieci. Sprawdź połączenie internetowe' },
              status: 0,
            },
            isLoadingChats: false,
          }));
        }
      }
      return [];
    }
  }, [token]);

  /**
   * Fetch szczegółów czatu
   */
  const fetchChatDetails = useCallback(
    async (chatId: string) => {
      if (!token) return;

      try {
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
          const errorData = await response.json().catch(() => ({
            error: { code: 'UNKNOWN', message: 'Nie udało się pobrać szczegółów czatu' },
          }));
          setState((prev) => ({
            ...prev,
            messagesError: { ...errorData, status: response.status },
          }));
          return;
        }

        const chatDetails = await response.json();

        // Mapowanie do ChatDetailViewModel
        const chatDetail: ChatDetailViewModel = {
          chatId: chatDetails.id,
          status: chatDetails.status,
          created_at: chatDetails.created_at,
          is_locked: Boolean(chatDetails.is_locked),
          participants: {
            me: { id: user?.id || '', name: '' },
            other: chatDetails.other_user || { id: '', name: 'Nieznany użytkownik' },
          },
          offerContext: chatDetails.related_offers
            ? {
                myOfferId: chatDetails.related_offers.my?.id || '',
                myOfferTitle: chatDetails.related_offers.my?.title || '',
                theirOfferId: chatDetails.related_offers.their?.id || '',
                theirOfferTitle: chatDetails.related_offers.their?.title || '',
              }
            : undefined,
          interestId: chatDetails.interest_id,
          realizationStatus: chatDetails.current_interest_status || 'PROPOSED',
        };

        // Przygotuj kontekst akcji
        const interestContext: InterestActionContext | undefined = chatDetail.interestId
          ? {
              interestId: chatDetail.interestId,
              otherUserName: chatDetail.participants.other.name,
              offerTitle: chatDetail.offerContext?.theirOfferTitle || '',
              realizationStatus: chatDetail.realizationStatus,
            }
          : undefined;

        setState((prev) => ({
          ...prev,
          selectedChat: chatDetail,
          interestContext,
        }));
      } catch (err) {
        console.error('[useChatsViewState] fetchChatDetails error:', err);
        if (err instanceof Error && err.name === 'AbortError') {
          setState((prev) => ({
            ...prev,
            messagesError: {
              error: { code: 'TIMEOUT', message: 'Przekroczono limit czasu żądania' },
              status: 408,
            },
          }));
        }
      }
    },
    [token, user?.id],
  );

  /**
   * Fetch wiadomości czatu
   */
  const fetchMessages = useCallback(
    async (chatId: string) => {
      if (!token) return;

      setState((prev) => ({ ...prev, isLoadingMessages: true, messagesError: undefined }));

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const params = new URLSearchParams({
          page: '1',
          limit: '100',
          order: 'asc',
        });

        const response = await fetch(`/api/chats/${chatId}/messages?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: { code: 'UNKNOWN', message: 'Nie udało się pobrać wiadomości' },
          }));
          setState((prev) => ({
            ...prev,
            messagesError: { ...errorData, status: response.status },
            isLoadingMessages: false,
          }));
          return;
        }

        const result: Paginated<MessageViewModel> = await response.json();

        // Mapowanie do ChatMessageViewModel - zabezpieczenie przed brakiem data
        const messages: ChatMessageViewModel[] = (result.data || []).map((msg) => ({
          ...msg,
          formattedTime: formatMessageTime(msg.created_at),
        }));

        setState((prev) => ({
          ...prev,
          messages,
          isLoadingMessages: false,
          messagesError: undefined,
        }));
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            setState((prev) => ({
              ...prev,
              messagesError: {
                error: { code: 'TIMEOUT', message: 'Przekroczono limit czasu żądania' },
                status: 408,
              },
              isLoadingMessages: false,
            }));
          } else {
            setState((prev) => ({
              ...prev,
              messagesError: {
                error: { code: 'NETWORK_ERROR', message: 'Błąd sieci. Sprawdź połączenie internetowe' },
                status: 0,
              },
              isLoadingMessages: false,
            }));
          }
        }
      }
    },
    [token],
  );

  /**
   * Wybór czatu
   */
  const selectChat = useCallback(
    (chatId: string) => {
      setState((prev) => ({
        ...prev,
        selectedChatId: chatId,
        messages: [],
        messagesError: undefined,
      }));

      // Fetch szczegółów i wiadomości
      fetchChatDetails(chatId);
      fetchMessages(chatId);
    },
    [fetchChatDetails, fetchMessages],
  );

  /**
   * Odświeżenie listy czatów
   */
  const refreshChats = useCallback(() => {
    fetchChats();
  }, [fetchChats]);

  /**
   * Odświeżenie wiadomości
   */
  const refreshMessages = useCallback(() => {
    if (state.selectedChatId) {
      fetchMessages(state.selectedChatId);
    }
  }, [state.selectedChatId, fetchMessages]);

  /**
   * Wysyłanie wiadomości
   */
  const sendMessage = useCallback(
    async (body: string): Promise<void> => {
      if (!token || !state.selectedChatId) {
        setState((prev) => ({
          ...prev,
          actionError: {
            error: { code: 'INVALID_STATE', message: 'Nie wybrano czatu' },
            status: 400,
          },
        }));
        return;
      }

      // Walidacja długości wiadomości
      if (!body || body.trim().length === 0) {
        setState((prev) => ({
          ...prev,
          actionError: {
            error: { code: 'VALIDATION_ERROR', message: 'Wiadomość nie może być pusta' },
            status: 400,
          },
        }));
        return;
      }

      if (body.length > 2000) {
        setState((prev) => ({
          ...prev,
          actionError: {
            error: { code: 'VALIDATION_ERROR', message: 'Wiadomość może mieć maksymalnie 2000 znaków' },
            status: 400,
          },
        }));
        return;
      }

      setState((prev) => ({ ...prev, isSending: true, actionError: undefined }));

      try {
        const response = await fetch(`/api/chats/${state.selectedChatId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ body: body.trim() }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: { code: 'UNKNOWN', message: 'Nie udało się wysłać wiadomości' },
          }));
          setState((prev) => ({
            ...prev,
            actionError: { ...errorData, status: response.status },
            isSending: false,
          }));
          return;
        }

        // Po sukcesie odśwież wiadomości
        await fetchMessages(state.selectedChatId);

        setState((prev) => ({ ...prev, isSending: false, actionError: undefined }));
      } catch (_err) {
        setState((prev) => ({
          ...prev,
          actionError: {
            error: { code: 'NETWORK_ERROR', message: 'Błąd sieci. Sprawdź połączenie internetowe' },
            status: 0,
          },
          isSending: false,
        }));
      }
    },
    [token, state.selectedChatId, fetchMessages],
  );

  /**
   * Realizacja wymiany
   */
  const realizeInterest = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    if (!token || !state.interestContext?.interestId) {
      return { success: false, message: 'Brak kontekstu realizacji' };
    }

    setState((prev) => ({ ...prev, isRealizing: true, actionError: undefined }));

    try {
      const response = await fetch(`/api/interests/${state.interestContext.interestId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setState((prev) => ({
          ...prev,
          actionError: { ...errorData, status: response.status },
          isRealizing: false,
        }));
        return { success: false, message: errorData.error?.message };
      }

      const result = await response.json();

      // Odśwież czat i wiadomości
      if (state.selectedChatId) {
        await fetchChatDetails(state.selectedChatId);
        await fetchMessages(state.selectedChatId);
      }

      setState((prev) => ({ ...prev, isRealizing: false, actionError: undefined }));

      return { success: true, message: result.message };
    } catch {
      setState((prev) => ({
        ...prev,
        actionError: {
          error: { code: 'NETWORK_ERROR', message: 'Błąd sieci. Sprawdź połączenie internetowe' },
          status: 0,
        },
        isRealizing: false,
      }));
      return { success: false };
    }
  }, [token, state.interestContext, state.selectedChatId, fetchChatDetails, fetchMessages]);

  /**
   * Anulowanie realizacji wymiany
   */
  const unrealizeInterest = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    if (!token || !state.interestContext?.interestId) {
      return { success: false, message: 'Brak kontekstu realizacji' };
    }

    setState((prev) => ({ ...prev, isUnrealizing: true, actionError: undefined }));

    try {
      const response = await fetch(`/api/interests/${state.interestContext.interestId}/unrealize`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setState((prev) => ({
          ...prev,
          actionError: { ...errorData, status: response.status },
          isUnrealizing: false,
        }));
        return { success: false, message: errorData.error?.message };
      }

      const result = await response.json();

      // Odśwież czat i wiadomości
      if (state.selectedChatId) {
        await fetchChatDetails(state.selectedChatId);
        await fetchMessages(state.selectedChatId);
      }

      setState((prev) => ({ ...prev, isUnrealizing: false, actionError: undefined }));

      return { success: true, message: result.message };
    } catch {
      setState((prev) => ({
        ...prev,
        actionError: {
          error: { code: 'NETWORK_ERROR', message: 'Błąd sieci. Sprawdź połączenie internetowe' },
          status: 0,
        },
        isUnrealizing: false,
      }));
      return { success: false };
    }
  }, [token, state.interestContext, state.selectedChatId, fetchChatDetails, fetchMessages]);

  /**
   * Efekt inicjalny - fetch listy czatów
   */
  useEffect(() => {
    const loadChats = async () => {
      const chats = await fetchChats();

      // Automatycznie wybierz pierwszy czat jeśli nie ma wybranego
      if (chats && chats.length > 0 && !state.selectedChatId) {
        const chatIdToSelect = initialChatId || chats[0].id;
        selectChat(chatIdToSelect);
      }
    };

    loadChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...state,
    // Akcje
    selectChat,
    refreshChats,
    refreshMessages,
    sendMessage,
    realizeInterest,
    unrealizeInterest,
  };
}
