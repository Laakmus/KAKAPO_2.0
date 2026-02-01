import React, { useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useChatDetails } from '@/hooks/useChatDetails';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useRealizationActions } from '@/hooks/useRealizationActions';
import { useRealizationHandlers } from '@/hooks/useRealizationHandlers';
import { useSendMessage } from '@/hooks/useSendMessage';
import { buildRealizationState } from '@/utils/realization';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { MessagesList } from './MessagesList';
import { MessageComposer } from './MessageComposer';
import { ChatStatusControls, RealizeButton } from './ChatStatusControls';
import { LoadingSkeleton } from './LoadingSkeleton';
import { ErrorBanner } from './ErrorBanner';

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
  const { user } = useAuth();
  const { push: pushToast } = useToast();

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
  const realizationState = useMemo(
    () =>
      chatDetails?.interest_id
        ? buildRealizationState(chatDetails.current_interest_status, chatDetails.other_interest_status)
        : undefined,
    [chatDetails],
  );

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

  // Wysyłanie wiadomości
  const onSendSuccess = useCallback(() => {
    refetchMessages();
    setTimeout(() => scrollToBottom(), 100);
  }, [refetchMessages, scrollToBottom]);

  const { send, isSending } = useSendMessage(chatId, onSendSuccess);

  const handleSendMessage = useCallback(
    async (body: string) => {
      const result = await send(body);
      if (result.success) {
        pushToast({ type: 'success', text: 'Wiadomość wysłana' });
      } else {
        pushToast({ type: 'error', text: result.message });
      }
    },
    [send, pushToast],
  );

  // Handlery realizacji (toast + refetch)
  const { handleRealize, handleUnrealize } = useRealizationHandlers(realize, unrealize, refetchChat);

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
    <div data-testid="chat-details-page" className="container mx-auto px-4 py-4 h-screen flex flex-col">
      {/* Header czatu */}
      <div className="bg-card border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a
            href="/chats"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Wróć do listy czatów"
          >
            <ChevronLeft className="h-6 w-6" />
          </a>
          <div>
            <h1 data-testid="chat-header-username" className="text-lg font-semibold">
              {otherUser?.name ?? 'Użytkownik'}
            </h1>
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
          <RefreshCw className="h-5 w-5" />
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
