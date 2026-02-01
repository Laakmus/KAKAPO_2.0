import React from 'react';
import type { ChatSummaryViewModel } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';

/**
 * Props dla komponentu ChatListItem
 */
type ChatListItemProps = {
  /**
   * Dane czatu do wyświetlenia
   */
  chat: ChatSummaryViewModel;
  /**
   * Czy czat jest aktualnie wybrany
   */
  isActive: boolean;
  /**
   * Callback wywoływany przy kliknięciu
   */
  onSelect: (chatId: string) => void;
};

/**
 * ChatListItem - Element listy czatów
 *
 * Funkcjonalności:
 * - Wyświetla nazwę drugiego użytkownika
 * - Pokazuje ostatnią wiadomość i datę
 * - Badge z liczbą nieprzeczytanych wiadomości
 * - Badge statusu czatu
 * - Obsługa kliknięcia i klawiatury (Enter/Space)
 * - Highlight dla aktywnego czatu
 *
 * @param chat - dane czatu
 * @param isActive - czy czat jest wybrany
 * @param onSelect - callback wyboru czatu
 */
export function ChatListItem({ chat, isActive, onSelect }: ChatListItemProps) {
  /**
   * Obsługa kliknięcia
   */
  const handleClick = () => {
    // Blokuj kliknięcie jeśli czat jest zablokowany
    if (isLocked) return;
    onSelect(chat.id);
  };

  /**
   * Obsługa klawiatury (Enter/Space)
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Blokuj akcję klawiatury jeśli czat jest zablokowany
    if (isLocked) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(chat.id);
    }
  };

  // Skróć wiadomość jeśli za długa
  const truncateMessage = (message: string, maxLength = 60): string => {
    if (message.length <= maxLength) return message;
    return `${message.substring(0, maxLength)}...`;
  };

  const lastMessagePreview = chat.last_message?.body ? truncateMessage(chat.last_message.body) : 'Brak wiadomości';
  const isLocked = Boolean(chat.is_locked);

  return (
    <div
      role="button"
      tabIndex={isLocked ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'group flex items-start gap-3 p-4 border-b border-border',
        'transition-all duration-200 ease-in-out',
        !isLocked &&
          'cursor-pointer hover:bg-accent hover:shadow-sm focus:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset',
        isActive && !isLocked && 'bg-accent border-l-4 border-l-primary shadow-sm',
        isLocked && 'opacity-50 cursor-not-allowed',
      )}
      aria-label={`Czat z ${chat.other_user.name}${isLocked ? ' (nieaktywny)' : ''}${(chat.unread_count ?? 0) > 0 ? `, ${chat.unread_count} nieprzeczytanych wiadomości` : ''}`}
      aria-current={isActive ? 'true' : 'false'}
      aria-disabled={isLocked}
    >
      {/* Avatar użytkownika */}
      <Avatar className="h-10 w-10 flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
        <div
          className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground font-semibold text-sm"
          aria-hidden="true"
        >
          {chat.other_user.name ? chat.other_user.name.charAt(0).toUpperCase() : '?'}
        </div>
      </Avatar>

      {/* Główna zawartość */}
      <div className="flex-1 min-w-0">
        {/* Nagłówek - nazwa + data */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="font-semibold text-sm truncate">{chat.other_user.name}</h3>
          <span className="text-xs text-muted-foreground flex-shrink-0">{chat.formattedLastMessageAt}</span>
        </div>

        {/* Ostatnia wiadomość */}
        <p className="text-sm text-muted-foreground truncate mb-1">{lastMessagePreview}</p>

        {/* Stopka - status i badge nieprzeczytanych */}
        <div className="flex items-center justify-between gap-2">
          {/* Badge statusu */}
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              isLocked || chat.status !== 'ACTIVE' ? 'bg-gray-200 text-gray-800' : 'bg-green-100 text-green-800',
            )}
          >
            {isLocked ? 'Nieaktywny' : chat.status === 'ACTIVE' ? 'Aktywny' : 'Archiwizowany'}
          </span>

          {/* Badge nieprzeczytanych wiadomości */}
          {(chat.unread_count ?? 0) > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
              {chat.unread_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
