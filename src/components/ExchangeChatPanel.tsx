import React from 'react';
import { useChatDetails } from '@/hooks/useChatDetails';
import { useChatMessages } from '@/hooks/useChatMessages';
import { ErrorBanner } from './ErrorBanner';
import { LoadingSkeleton } from './LoadingSkeleton';
import { MessagesList } from './MessagesList';
import { Card } from './ui/card';

type ExchangeChatPanelProps = {
  chatId: string;
};

/**
 * Panel czatu wymiany — wyświetla nagłówek rozmówcy i historię wiadomości.
 * Używany w widoku usuniętych ofert (RemovedOffersView).
 */
export function ExchangeChatPanel({ chatId }: ExchangeChatPanelProps) {
  const {
    chatDetails,
    otherUser,
    isLoading: isLoadingDetails,
    error: detailsError,
    refetch: refetchDetails,
  } = useChatDetails(chatId);
  const {
    messages,
    isLoading: isLoadingMessages,
    error: messagesError,
    messagesEndRef,
    refetch: refetchMessages,
  } = useChatMessages(chatId, { limit: 100, order: 'asc' });

  if (detailsError || messagesError) {
    return (
      <ErrorBanner
        message="Nie udało się załadować czatu"
        onRetry={() => {
          refetchDetails();
          refetchMessages();
        }}
        isAuthError={
          detailsError?.status === 401 ||
          detailsError?.status === 403 ||
          messagesError?.status === 401 ||
          messagesError?.status === 403
        }
      />
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <div className="border-b border-border p-4">
        {isLoadingDetails && !chatDetails ? (
          <LoadingSkeleton height="h-5" className="w-40" />
        ) : (
          <h3 className="text-base font-semibold truncate">{otherUser?.name || 'Czat'}</h3>
        )}
      </div>
      <MessagesList
        messages={messages}
        currentUserId={chatDetails?.current_user_id || ''}
        messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
        isLoading={isLoadingMessages}
      />
    </Card>
  );
}
