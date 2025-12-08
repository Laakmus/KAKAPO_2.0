import React, { type RefObject } from 'react';
import type { MessageViewModel } from '@/types';
import { MessageBubble } from './MessageBubble';

/**
 * Props dla komponentu MessagesList
 */
type MessagesListProps = {
  messages: MessageViewModel[];
  currentUserId: string;
  messagesEndRef?: RefObject<HTMLDivElement>;
  isLoading?: boolean;
};

/**
 * MessagesList - Komponent wyświetlający scrollowaną listę wiadomości
 *
 * Prezentuje wiadomości ułożone chronologicznie, z automatycznym scrollowaniem
 * do dołu przy nowych wiadomościach.
 *
 * @param messages - lista wiadomości do wyświetlenia
 * @param currentUserId - ID zalogowanego użytkownika
 * @param messagesEndRef - ref do elementu na końcu listy (dla scrollowania)
 * @param isLoading - czy trwa ładowanie wiadomości
 */
export function MessagesList({ messages, currentUserId, messagesEndRef, isLoading }: MessagesListProps) {
  // Placeholder gdy brak wiadomości
  if (!isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">Brak wiadomości</p>
          <p className="text-muted-foreground text-xs mt-1">Rozpocznij konwersację wysyłając pierwszą wiadomość</p>
        </div>
      </div>
    );
  }

  // Skeleton loading
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
            <div className="animate-pulse">
              <div className="h-4 w-20 bg-muted rounded mb-1"></div>
              <div className="h-16 w-64 bg-muted rounded"></div>
              <div className="h-3 w-16 bg-muted rounded mt-1"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
      {/* Lista wiadomości */}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} isOwn={message.sender_id === currentUserId} />
      ))}

      {/* Element do scrollowania */}
      <div ref={messagesEndRef} />
    </div>
  );
}
