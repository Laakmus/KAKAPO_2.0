import React from 'react';
import type { MessageViewModel } from '@/types';
import { cn } from '@/lib/utils';

/**
 * Props dla komponentu MessageBubble
 */
type MessageBubbleProps = {
  message: MessageViewModel;
  isOwn: boolean;
};

/**
 * MessageBubble - Komponent prezentujący pojedynczą wiadomość
 *
 * Wyświetla wiadomość z imieniem nadawcy i timestampem.
 * Własne wiadomości są wyróżnione wizualnie (po prawej stronie).
 *
 * @param message - ViewModel wiadomości
 * @param isOwn - czy wiadomość jest własna
 */
export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  // Walidacja - nie renderuj pustych wiadomości
  if (!message.body || message.body.trim() === '') {
    return null;
  }

  // Formatuj timestamp
  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Teraz';
      if (diffMins < 60) return `${diffMins} min temu`;

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h temu`;

      // Jeśli więcej niż dzień, pokaż datę
      return date.toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className={cn('flex flex-col mb-4', isOwn ? 'items-end' : 'items-start')}>
      {/* Nazwa nadawcy */}
      {!isOwn && <span className="text-xs text-muted-foreground mb-1 px-1">{message.sender_name}</span>}

      {/* Bąbelek wiadomości */}
      <div
        className={cn(
          'max-w-[75%] rounded-lg px-4 py-2',
          isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-all">{message.body}</p>
      </div>

      {/* Timestamp */}
      <span className="text-xs text-muted-foreground mt-1 px-1">{formatTimestamp(message.created_at)}</span>
    </div>
  );
}
