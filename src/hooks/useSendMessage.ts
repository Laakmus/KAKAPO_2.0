import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type SendResult = { success: true } | { success: false; message: string };

/**
 * Hook do wysyłania wiadomości w czacie.
 *
 * Enkapsuluje fetch POST /api/chats/:chatId/messages,
 * zarządzanie stanem isSending i walidację tokenu.
 *
 * @param chatId - ID czatu
 * @param onSuccess - callback po udanym wysłaniu (np. refetch + scroll)
 */
export function useSendMessage(chatId: string, onSuccess?: () => void) {
  const { token } = useAuth();
  const [isSending, setIsSending] = useState(false);

  const send = useCallback(
    async (body: string): Promise<SendResult> => {
      if (!token) {
        return { success: false, message: 'Brak autoryzacji. Zaloguj się ponownie.' };
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
          return {
            success: false,
            message: errorData.error?.message ?? 'Nie udało się wysłać wiadomości',
          };
        }

        onSuccess?.();
        return { success: true };
      } catch (err) {
        console.error('[useSendMessage] error:', err);
        return {
          success: false,
          message: err instanceof Error ? err.message : 'Nie udało się wysłać wiadomości',
        };
      } finally {
        setIsSending(false);
      }
    },
    [token, chatId, onSuccess],
  );

  return { send, isSending };
}
