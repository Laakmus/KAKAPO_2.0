import React, { useCallback, useState, useEffect } from 'react';
import { useChatsViewState } from '@/hooks/useChatsViewState';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRealizationHandlers } from '@/hooks/useRealizationHandlers';
import { buildRealizationState } from '@/utils/realization';
import { ChatListColumn } from './ChatListColumn';
import { MessagesList } from './MessagesList';
import { MessageComposer } from './MessageComposer';
import { ChatStatusControls, RealizeButton } from './ChatStatusControls';
import { ErrorBanner } from './ErrorBanner';
import { LoadingSkeleton } from './LoadingSkeleton';
import { EmptyState } from './EmptyState';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Props dla komponentu ChatsViewPage
 */
type ChatsViewPageProps = {
  /**
   * Opcjonalny ID czatu do wybrania przy inicjalizacji
   */
  initialChatId?: string;
};

/**
 * ChatsViewPage - Główny widok czatów z dwoma kolumnami
 *
 * Funkcjonalności:
 * - Lewa kolumna: scrollowana lista czatów
 * - Prawa kolumna: szczegóły czatu, historia wiadomości, composer
 * - Obsługa wyboru czatu
 * - Wysyłanie wiadomości
 * - Akcje realizacji wymiany
 * - Obsługa błędów i pustych stanów
 *
 * @param initialChatId - opcjonalny ID czatu z URL
 */
export function ChatsViewPage({ initialChatId }: ChatsViewPageProps) {
  const { user } = useAuth();
  const { push: pushToast } = useToast();

  // Stan dla widoku mobile (true = pokazuj listę, false = pokazuj szczegóły)
  const [showChatList, setShowChatList] = useState(true);

  // Hook zarządzający całym stanem widoku
  const {
    chats,
    isLoadingChats,
    chatsError,
    selectedChatId,
    selectedChat,
    messages,
    isLoadingMessages,
    messagesError,
    interestContext,
    isSending,
    isRealizing,
    isUnrealizing,
    actionError,
    selectChat,
    refreshChats,
    refreshMessages,
    sendMessage,
    realizeInterest,
    unrealizeInterest,
  } = useChatsViewState(initialChatId);

  /**
   * Obsługa wyboru czatu - na mobile przełącz na widok szczegółów
   */
  const handleSelectChat = useCallback(
    (chatId: string) => {
      selectChat(chatId);
      setShowChatList(false); // Na mobile przełącz na szczegóły
    },
    [selectChat],
  );

  /**
   * Powrót do listy czatów (tylko mobile)
   */
  const handleBackToList = useCallback(() => {
    setShowChatList(true);
  }, []);

  /**
   * Obsługa wysyłania wiadomości
   */
  const handleSendMessage = useCallback(
    async (body: string) => {
      try {
        await sendMessage(body);
      } catch (error) {
        console.error('[ChatsViewPage] Send message error:', error);
        pushToast({
          type: 'error',
          text: 'Wystąpił nieoczekiwany błąd podczas wysyłania wiadomości',
        });
      }
    },
    [sendMessage, pushToast],
  );

  // Handlery realizacji (toast + refresh)
  const { handleRealize, handleUnrealize } = useRealizationHandlers(
    realizeInterest,
    unrealizeInterest,
    refreshMessages,
  );

  /**
   * Efekt - wyświetlanie toastów dla błędów akcji
   */
  useEffect(() => {
    if (actionError) {
      pushToast({
        type: 'error',
        text: actionError.error.message || 'Wystąpił błąd podczas wykonywania akcji',
      });
    }
  }, [actionError, pushToast]);

  // Stan realizacji dla ChatStatusControls
  const realizationState = interestContext
    ? buildRealizationState(interestContext.realizationStatus, interestContext.otherRealizationStatus)
    : undefined;

  const exchangeLabel = (() => {
    if (!selectedChat) {
      return undefined;
    }

    if (selectedChat.orderedRelatedOffers?.length === 2) {
      return selectedChat.orderedRelatedOffers
        .map((entry) => `${entry.offerTitle}${entry.ownerName ? ` (${entry.ownerName})` : ''}`)
        .join(' ↔ ');
    }

    if (selectedChat.offerContext) {
      return `${selectedChat.offerContext.myOfferTitle} ↔ ${selectedChat.offerContext.theirOfferTitle}`;
    }

    return undefined;
  })();

  return (
    <div className="flex h-full bg-background">
      {/* Lewa kolumna - Lista czatów */}
      <div
        className={`
          w-full md:w-80 lg:w-96 flex-shrink-0 transition-transform duration-300
          ${showChatList ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${!showChatList ? 'hidden md:block' : 'block'}
        `}
      >
        <ChatListColumn
          chats={chats}
          selectedChatId={selectedChatId}
          onSelect={handleSelectChat}
          onRefresh={refreshChats}
          isLoading={isLoadingChats}
        />
      </div>

      {/* Prawa kolumna - Szczegóły czatu */}
      <div
        className={`
          flex-1 flex flex-col transition-transform duration-300
          ${!showChatList ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
          ${showChatList ? 'hidden md:flex' : 'flex'}
        `}
      >
        {/* Błąd ładowania listy czatów */}
        {chatsError && (
          <ErrorBanner
            message="Nie udało się załadować listy czatów"
            onRetry={refreshChats}
            isAuthError={chatsError.status === 401 || chatsError.status === 403}
          />
        )}

        {/* Brak wybranego czatu */}
        {!selectedChatId && !isLoadingChats && chats.length > 0 && (
          <EmptyState
            title="Wybierz czat"
            description="Wybierz czat z listy, aby zobaczyć wiadomości"
            onRefresh={refreshChats}
          />
        )}

        {/* Wybrany czat */}
        {selectedChatId && (
          <>
            {/* Nagłówek czatu */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Przycisk powrotu (tylko mobile) */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToList}
                  className="md:hidden flex-shrink-0"
                  aria-label="Powrót do listy czatów"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                <div className="flex-1 min-w-0">
                  {isLoadingMessages && !selectedChat ? (
                    <LoadingSkeleton height="h-6" className="w-32" />
                  ) : (
                    <>
                      <h2 className="text-lg font-semibold truncate">
                        {selectedChat?.participants.other.name || 'Czat'}
                      </h2>
                      {exchangeLabel && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">Wymiana: {exchangeLabel}</p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Przycisk odświeżenia wiadomości */}
              <button
                onClick={refreshMessages}
                disabled={isLoadingMessages}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                aria-label="Odśwież wiadomości"
              >
                <RefreshCw className={`h-5 w-5 ${isLoadingMessages ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Błąd ładowania wiadomości */}
            {messagesError && (
              <ErrorBanner
                message="Nie udało się załadować wiadomości"
                onRetry={refreshMessages}
                isAuthError={messagesError.status === 401 || messagesError.status === 403}
              />
            )}

            {/* Lista wiadomości */}
            <MessagesList messages={messages} currentUserId={user?.id || ''} isLoading={isLoadingMessages} />

            {/* Panel akcji realizacji - pokazuj tylko gdy NIE jest ACCEPTED (bo wtedy info jest w dialogu) */}
            {realizationState && realizationState.status !== 'ACCEPTED' && (
              <div className="p-4 border-t border-border bg-card">
                <ChatStatusControls
                  state={realizationState}
                  isProcessing={isRealizing || isUnrealizing}
                  onRealize={handleRealize}
                  onUnrealize={handleUnrealize}
                  hideRealizeButton
                />
              </div>
            )}

            {/* Composer */}
            <div className="p-4 border-t border-border bg-card">
              {messagesError?.status === 403 ? (
                <div className="text-center text-sm text-muted-foreground py-4">
                  Brak uprawnień do wysyłania wiadomości w tym czacie
                </div>
              ) : (
                <MessageComposer
                  onSend={handleSendMessage}
                  isSending={isSending}
                  leftAction={
                    realizationState?.can_realize ? (
                      <RealizeButton onRealize={handleRealize} isProcessing={isRealizing || isUnrealizing} />
                    ) : undefined
                  }
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
