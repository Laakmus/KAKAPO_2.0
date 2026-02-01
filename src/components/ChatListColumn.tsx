import React from 'react';
import type { ChatSummaryViewModel } from '@/types';
import { ChatListItem } from './ChatListItem';
import { Button } from '@/components/ui/button';
import { EmptyState } from './EmptyState';
import { LoadingSkeleton } from './LoadingSkeleton';

/**
 * Props dla komponentu ChatListColumn
 */
type ChatListColumnProps = {
  /**
   * Lista czatów do wyświetlenia
   */
  chats: ChatSummaryViewModel[];
  /**
   * ID aktualnie wybranego czatu
   */
  selectedChatId?: string;
  /**
   * Callback przy wyborze czatu
   */
  onSelect: (chatId: string) => void;
  /**
   * Callback przy odświeżeniu listy
   */
  onRefresh: () => void;
  /**
   * Czy trwa ładowanie listy czatów
   */
  isLoading: boolean;
};

/**
 * ChatListColumn - Lewa kolumna z listą czatów
 *
 * Funkcjonalności:
 * - Scrollowana lista czatów
 * - Przycisk "Odśwież"
 * - Pusty stan (brak czatów)
 * - Loading skeleton
 * - Highlight aktywnego czatu
 * - Keyboard navigation (strzałki ↑/↓)
 *
 * @param chats - lista czatów
 * @param selectedChatId - ID wybranego czatu
 * @param onSelect - callback wyboru czatu
 * @param onRefresh - callback odświeżenia
 * @param isLoading - czy trwa ładowanie
 */
export function ChatListColumn({ chats, selectedChatId, onSelect, onRefresh, isLoading }: ChatListColumnProps) {
  /**
   * Obsługa klawiatury dla nawigacji
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!selectedChatId || chats.length === 0) return;

    const currentIndex = chats.findIndex((chat) => chat.id === selectedChatId);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % chats.length;
      onSelect(chats[nextIndex].id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex === 0 ? chats.length - 1 : currentIndex - 1;
      onSelect(chats[prevIndex].id);
    }
  };

  return (
    <div
      className="flex flex-col h-full border-r border-border bg-background"
      onKeyDown={handleKeyDown}
      role="navigation"
      aria-label="Lista czatów"
    >
      {/* Nagłówek */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold" id="chats-list-heading">
          Czaty
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label={isLoading ? 'Odświeżanie listy czatów...' : 'Odśwież listę czatów'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
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
        </Button>
      </div>

      {/* Zawartość */}
      <div className="flex-1 overflow-y-auto">
        {/* Loading state */}
        {isLoading && chats.length === 0 && (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4].map((i) => (
              <LoadingSkeleton key={i} height="h-20" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && chats.length === 0 && (
          <EmptyState
            title="Brak czatów"
            description="Nie masz jeszcze żadnych czatów. Wyraź zainteresowanie ofertą, aby rozpocząć rozmowę."
            onRefresh={onRefresh}
          />
        )}

        {/* Lista czatów */}
        {!isLoading && chats.length > 0 && (
          <div role="list" aria-labelledby="chats-list-heading" aria-live="polite">
            {chats.map((chat) => (
              <ChatListItem key={chat.id} chat={chat} isActive={chat.id === selectedChatId} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
