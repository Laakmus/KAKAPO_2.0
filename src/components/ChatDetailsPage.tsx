import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useChatDetails } from '@/hooks/useChatDetails';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useRealizationActions } from '@/hooks/useRealizationActions';
import { MessagesList } from './MessagesList';
import { MessageComposer } from './MessageComposer';
import { ChatStatusControls, RealizeButton } from './ChatStatusControls';
import { LoadingSkeleton } from './LoadingSkeleton';
import { ErrorBanner } from './ErrorBanner';
import type { InterestRealizationState } from '@/types';

/**
 * Props dla komponentu ChatDetailsPage
 */
type ChatDetailsPageProps = {
  chatId: string;
};

/**
 * ChatDetailsPage - Główny komponent widoku szczegółów czatu
 *
 * Orchestruje fetchowanie danych czatu i wiadomości, trzyma stany loading/error
 * oraz przekazuje propsy do pozostałych komponentów.
 *
 * Funkcjonalności:
 * - Pobiera szczegóły czatu
 * - Wyświetla chronologiczną historię wiadomości
 * - Obsługuje błędy (403/404)
 * - Umożliwia odświeżanie danych
 *
 * @param chatId - ID czatu
 */
export function ChatDetailsPage({ chatId }: ChatDetailsPageProps) {
  const { user, token } = useAuth();
  const { push: pushToast } = useToast();

  // Stan wysyłania wiadomości
  const [isSending, setIsSending] = useState(false);

  // Pobierz szczegóły czatu (z interests)
  const {
    chatDetails,
    otherUser,
    isLoading: isLoadingChat,
    error: chatError,
    refetch: refetchChat,
  } = useChatDetails(chatId);

  // Hook do akcji realizacji (tylko jeśli mamy interest_id)
  const {
    realize,
    unrealize,
    isMutating: isRealizationMutating,
  } = useRealizationActions(chatDetails?.interest_id ?? '');

  // Oblicz stan realizacji
  const realizationState = useMemo((): InterestRealizationState | undefined => {
    if (!chatDetails || !chatDetails.interest_id) return undefined;

    const currentStatus = chatDetails.current_interest_status;
    const otherStatus = chatDetails.other_interest_status;
    const bothRealized = currentStatus === 'REALIZED' && otherStatus === 'REALIZED';

    return {
      can_realize: currentStatus === 'ACCEPTED',
      can_unrealize: currentStatus === 'REALIZED' && !bothRealized,
      other_confirmed: otherStatus === 'REALIZED',
      status: currentStatus,
      message:
        currentStatus === 'ACCEPTED'
          ? 'Wymiana została zaakceptowana. Możesz potwierdzić realizację.'
          : currentStatus === 'REALIZED' && !bothRealized
            ? 'Potwierdziłeś realizację. Oczekiwanie na drugą stronę.'
            : currentStatus === 'REALIZED' && bothRealized
              ? 'Wymiana została zrealizowana przez obie strony!'
              : undefined,
    };
  }, [chatDetails]);

  // Pobierz wiadomości
  const {
    messages,
    isLoading: isLoadingMessages,
    error: messagesError,
    refetch: refetchMessages,
    messagesEndRef,
    scrollToBottom,
  } = useChatMessages(chatId, {
    page: 1,
    limit: 100,
    order: 'asc',
  });

  /**
   * Obsługa wysyłania wiadomości
   */
  const handleSendMessage = useCallback(
    async (body: string) => {
      if (!token) {
        pushToast({
          type: 'error',
          text: 'Brak autoryzacji. Zaloguj się ponownie.',
        });
        return;
      }

      setIsSending(true);

      try {
        const response = await fetch(`/api/chats/${chatId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ body }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message ?? 'Nie udało się wysłać wiadomości');
        }

        // Odśwież listę wiadomości i przewiń do dołu
        await refetchMessages();
        setTimeout(() => scrollToBottom(), 100);

        pushToast({
          type: 'success',
          text: 'Wiadomość wysłana',
        });
      } catch (error) {
        console.error('[ChatDetailsPage] Send message error:', error);
        pushToast({
          type: 'error',
          text: error instanceof Error ? error.message : 'Nie udało się wysłać wiadomości',
        });
      } finally {
        setIsSending(false);
      }
    },
    [token, chatId, refetchMessages, scrollToBottom, pushToast],
  );

  /**
   * Obsługa realizacji wymiany
   */
  const handleRealize = useCallback(async () => {
    const result = await realize();

    if (result.success) {
      pushToast({
        type: 'success',
        text: result.message ?? 'Potwierdzenie realizacji zostało zapisane',
      });
      // Odśwież szczegóły czatu aby zaktualizować status
      refetchChat();
    } else {
      pushToast({
        type: 'error',
        text: result.message ?? 'Nie udało się potwierdzić realizacji',
      });
    }
  }, [realize, pushToast, refetchChat]);

  /**
   * Obsługa cofnięcia realizacji
   */
  const handleUnrealize = useCallback(async () => {
    const result = await unrealize();

    if (result.success) {
      pushToast({
        type: 'success',
        text: result.message ?? 'Potwierdzenie zostało anulowane',
      });
      // Odśwież szczegóły czatu aby zaktualizować status
      refetchChat();
    } else {
      pushToast({
        type: 'error',
        text: result.message ?? 'Nie udało się anulować potwierdzenia',
      });
    }
  }, [unrealize, pushToast, refetchChat]);

  // Obsługa błędów - 403/404
  if (chatError) {
    const is403or404 = chatError.status === 403 || chatError.status === 404;
    const isAuthError = chatError.status === 401;
    const errorMessage =
      chatError.status === 403
        ? 'Brak dostępu do czatu'
        : chatError.status === 404
          ? 'Czat nie istnieje'
          : chatError.error.message;

    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorBanner message={errorMessage} onRetry={refetchChat} isAuthError={isAuthError} />
        {is403or404 && (
          <div className="mt-4 text-center">
            <a
              href="/chats"
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Wróć do listy czatów
            </a>
          </div>
        )}
      </div>
    );
  }

  // Loading state
  if (isLoadingChat) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSkeleton />
      </div>
    );
  }

  // Brak danych czatu
  if (!chatDetails || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorBanner message="Nie udało się załadować szczegółów czatu" onRetry={refetchChat} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 h-screen flex flex-col">
      {/* Header czatu */}
      <div className="bg-card border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a
            href="/chats"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Wróć do listy czatów"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <div>
            <h1 className="text-lg font-semibold">{otherUser?.name ?? 'Użytkownik'}</h1>
            <p className="text-xs text-muted-foreground">
              Status:{' '}
              {chatDetails.is_locked ? 'Zamknięty' : chatDetails.status === 'ACTIVE' ? 'Aktywny' : 'Zarchiwizowany'}
            </p>
          </div>
        </div>

        {/* Przycisk odświeżania */}
        <button
          onClick={() => {
            refetchChat();
            refetchMessages();
          }}
          className="p-2 rounded-md hover:bg-muted transition-colors"
          aria-label="Odśwież"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Lista wiadomości */}
      <div className="flex-1 overflow-hidden bg-background">
        {messagesError ? (
          <div className="p-4">
            <ErrorBanner
              message={messagesError.error.message}
              onRetry={refetchMessages}
              isAuthError={messagesError.status === 401}
            />
          </div>
        ) : (
          <MessagesList
            messages={messages}
            currentUserId={user.id}
            messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
            isLoading={isLoadingMessages}
          />
        )}
      </div>

      {/* Status wymiany i kontrole realizacji - pokazuj tylko gdy NIE jest ACCEPTED (bo wtedy info jest w dialogu) */}
      {realizationState && realizationState.status !== 'ACCEPTED' && (
        <div className="px-4 py-2">
          <ChatStatusControls
            state={realizationState}
            onRealize={handleRealize}
            onUnrealize={handleUnrealize}
            isProcessing={isRealizationMutating}
            hideRealizeButton
          />
        </div>
      )}

      {/* Formularz wysyłania wiadomości */}
      <div className="bg-card border-t p-4">
        <MessageComposer
          onSend={handleSendMessage}
          isSending={isSending}
          leftAction={
            realizationState?.can_realize ? (
              <RealizeButton onRealize={handleRealize} isProcessing={isRealizationMutating} />
            ) : undefined
          }
        />
      </div>
    </div>
  );
}
