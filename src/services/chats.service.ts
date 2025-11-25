import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types';
import type { ChatListItemDTO } from '../types';

/**
 * ChatsService
 *
 * Encapsuluje logikę pobierania listy czatów dla użytkownika.
 * Implementacja jest konserwatywna (kilka zapytań zamiast jednego złożonego JOIN),
 * co ułatwia czytelność i zgodność z RLS. Można ją później zoptimizować.
 */
export class ChatsService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Pobiera listę czatów, w których uczestniczy `userId`.
   *
   * @param userId - id zalogowanego użytkownika
   * @param opts - opcjonalne filtry: status, limit, offset
   */
  async listChats(
    userId: string,
    opts?: { status?: 'ACTIVE' | 'ARCHIVED'; limit?: number; offset?: number },
  ): Promise<ChatListItemDTO[]> {
    try {
      const status = opts?.status ?? 'ACTIVE';

      // 1) Pobierz czaty, w których uczestniczy user (kolumny user_a/user_b istnieją w tabeli `chats`)
      let chatsQuery = this.supabase
        .from('chats')
        .select('id, status, created_at, user_a, user_b')
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (opts?.limit) {
        const offset = opts.offset ?? 0;
        const start = offset;
        const end = offset + opts.limit - 1;
        chatsQuery = chatsQuery.range(start, end);
      }

      const { data: chats, error: chatsError } = await chatsQuery;
      if (chatsError) throw chatsError;

      const results: ChatListItemDTO[] = [];

      // 3) Dla każdego czatu pobierz drugiego użytkownika, ostatnią wiadomość i liczbę nieprzeczytanych
      for (const c of chats ?? []) {
        const chatRow = c as {
          id: string;
          status: string;
          created_at: string;
          user_a?: string | null;
          user_b?: string | null;
        };
        const chatId = chatRow.id;

        // Determine other participant from user_a/user_b columns
        const otherUserId =
          String(chatRow.user_a ?? '') === String(userId)
            ? (chatRow.user_b ?? undefined)
            : (chatRow.user_a ?? undefined);

        let otherUser = { id: otherUserId ?? userId, name: '' };
        if (otherUserId) {
          // Pobieramy imię/nazwisko z auth.users.user_metadata
          const fromAuthUsers = (this.supabase as unknown as any).from('auth.users');
          const { data: userRow, error: userRowError } = await fromAuthUsers
            .select('id, user_metadata->>first_name as first_name, user_metadata->>last_name as last_name')
            .eq('id', otherUserId)
            .maybeSingle();
          if (!userRowError && userRow) {
            const first = (userRow.first_name ?? '').trim();
            const last = (userRow.last_name ?? '').trim();
            otherUser = { id: userRow.id, name: `${first} ${last}`.trim() || '' };
          }
        }

        // last message
        const { data: lastMsg, error: lastMsgError } = await this.supabase
          .from('messages')
          .select('body, sender_id, created_at')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastMsgError) throw lastMsgError;

        // unread count
        const { count: unreadCount, error: countError } = await this.supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('chat_id', chatId)
          .eq('is_read', false)
          .eq('receiver_id', userId);
        if (countError) throw countError;

        results.push({
          id: chatRow.id,
          status: chatRow.status,
          created_at: chatRow.created_at,
          other_user: otherUser,
          last_message: lastMsg ?? null,
          unread_count: unreadCount ?? 0,
        });
      }

      return results;
    } catch (err) {
      console.error('[ChatsService.listChats] Error:', err);
      throw err;
    }
  }
}

export default ChatsService;
