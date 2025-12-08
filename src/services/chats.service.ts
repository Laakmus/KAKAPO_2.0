import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types';
import type {
  ChatListItemDTO,
  ChatDetailDTO,
  MessageViewModel,
  Paginated,
  MessageDTO,
  ChatDetailsViewModel,
} from '../types';

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  /**
   * Pobiera szczegóły pojedynczego czatu, weryfikując czy użytkownik ma dostęp.
   *
   * @param chatId - ID czatu
   * @param userId - ID zalogowanego użytkownika
   * @throws Error z kodem 'CHAT_NOT_FOUND' lub 'ACCESS_DENIED'
   */
  async getChatDetails(chatId: string, userId: string): Promise<ChatDetailDTO> {
    try {
      // 1) Pobierz czat
      const { data: chat, error: chatError } = await this.supabase
        .from('chats')
        .select('id, status, created_at, user_a, user_b')
        .eq('id', chatId)
        .maybeSingle();

      if (chatError) throw chatError;
      if (!chat) {
        throw new Error('CHAT_NOT_FOUND');
      }

      // 2) Weryfikuj dostęp - user musi być uczestnikiem
      const isParticipant = chat.user_a === userId || chat.user_b === userId;
      if (!isParticipant) {
        throw new Error('ACCESS_DENIED');
      }

      // 3) Pobierz dane obu użytkowników z auth.users
      const userAId = chat.user_a ?? '';
      const userBId = chat.user_b ?? '';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fromAuthUsers = (this.supabase as unknown as any).from('auth.users');

      const { data: userAData, error: userAError } = await fromAuthUsers
        .select('id, user_metadata->>first_name as first_name, user_metadata->>last_name as last_name')
        .eq('id', userAId)
        .maybeSingle();

      const { data: userBData, error: userBError } = await fromAuthUsers
        .select('id, user_metadata->>first_name as first_name, user_metadata->>last_name as last_name')
        .eq('id', userBId)
        .maybeSingle();

      if (userAError || userBError) {
        throw userAError || userBError;
      }

      const userA = userAData
        ? {
            id: userAData.id,
            name: `${(userAData.first_name ?? '').trim()} ${(userAData.last_name ?? '').trim()}`.trim() || 'Użytkownik',
          }
        : { id: userAId, name: 'Użytkownik' };

      const userB = userBData
        ? {
            id: userBData.id,
            name: `${(userBData.first_name ?? '').trim()} ${(userBData.last_name ?? '').trim()}`.trim() || 'Użytkownik',
          }
        : { id: userBId, name: 'Użytkownik' };

      // 4) Zwróć szczegóły czatu
      return {
        id: chat.id,
        status: chat.status,
        created_at: chat.created_at,
        user_a: userA,
        user_b: userB,
      };
    } catch (err) {
      console.error('[ChatsService.getChatDetails] Error:', err);
      throw err;
    }
  }

  /**
   * Pobiera listę wiadomości z czatu z paginacją.
   *
   * @param chatId - ID czatu
   * @param userId - ID zalogowanego użytkownika (dla weryfikacji dostępu)
   * @param opts - opcje: page, limit, order
   * @throws Error z kodem 'CHAT_NOT_FOUND' lub 'ACCESS_DENIED'
   */
  async listMessages(
    chatId: string,
    userId: string,
    opts?: { page?: number; limit?: number; order?: 'asc' | 'desc' },
  ): Promise<Paginated<MessageViewModel>> {
    try {
      const page = opts?.page ?? 1;
      const limit = opts?.limit ?? 50;
      const order = opts?.order ?? 'asc';

      // 1) Weryfikuj czy użytkownik ma dostęp do czatu
      const { data: chat, error: chatError } = await this.supabase
        .from('chats')
        .select('id, user_a, user_b')
        .eq('id', chatId)
        .maybeSingle();

      if (chatError) throw chatError;
      if (!chat) {
        throw new Error('CHAT_NOT_FOUND');
      }

      const isParticipant = chat.user_a === userId || chat.user_b === userId;
      if (!isParticipant) {
        throw new Error('ACCESS_DENIED');
      }

      // 2) Pobierz wiadomości z paginacją
      const offset = (page - 1) * limit;
      const start = offset;
      const end = offset + limit - 1;

      // Pobierz total count
      const { count: totalCount, error: countError } = await this.supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('chat_id', chatId);

      if (countError) throw countError;

      // Pobierz wiadomości
      const { data: messages, error: messagesError } = await this.supabase
        .from('messages')
        .select('id, chat_id, sender_id, body, created_at')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: order === 'asc' })
        .range(start, end);

      if (messagesError) throw messagesError;

      // 3) Pobierz imiona nadawców i mapuj do MessageViewModel
      const messageViewModels: MessageViewModel[] = [];

      for (const msg of messages ?? []) {
        // Pobierz imię nadawcy z auth.users
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fromAuthUsers = (this.supabase as unknown as any).from('auth.users');
        const { data: senderData, error: _senderError } = await fromAuthUsers
          .select('id, user_metadata->>first_name as first_name, user_metadata->>last_name as last_name')
          .eq('id', msg.sender_id)
          .maybeSingle();

        const senderName = senderData
          ? `${(senderData.first_name ?? '').trim()} ${(senderData.last_name ?? '').trim()}`.trim() || 'Użytkownik'
          : 'Użytkownik';

        messageViewModels.push({
          id: msg.id,
          chat_id: msg.chat_id,
          sender_id: msg.sender_id,
          sender_name: senderName,
          body: msg.body,
          created_at: msg.created_at,
          isOwn: msg.sender_id === userId,
        });
      }

      // 4) Zwróć z metadanymi paginacji
      const totalPages = Math.ceil((totalCount ?? 0) / limit);

      return {
        data: messageViewModels,
        pagination: {
          page,
          limit,
          total: totalCount ?? 0,
          total_pages: totalPages,
        },
      };
    } catch (err) {
      console.error('[ChatsService.listMessages] Error:', err);
      throw err;
    }
  }

  /**
   * Pobiera szczegóły czatu z informacjami o powiązanych interests i ofertach.
   *
   * @param chatId - ID czatu
   * @param userId - ID zalogowanego użytkownika
   * @throws Error z kodem 'CHAT_NOT_FOUND' lub 'ACCESS_DENIED'
   */
  async getChatDetailsWithInterests(chatId: string, userId: string): Promise<ChatDetailsViewModel> {
    try {
      // 1) Pobierz podstawowe szczegóły czatu
      const chatDetails = await this.getChatDetails(chatId, userId);

      // 2) Określ drugiego użytkownika
      const otherUserId = chatDetails.user_a.id === userId ? chatDetails.user_b.id : chatDetails.user_a.id;

      // 3) Znajdź interest current user (gdzie current user jest zainteresowany ofertą drugiego użytkownika)
      const { data: currentUserInterests, error: currentInterestsError } = await this.supabase
        .from('interests')
        .select('id, offer_id, status, realized_at')
        .eq('user_id', userId)
        .in('status', ['PROPOSED', 'ACCEPTED', 'REALIZED']);

      if (currentInterestsError) throw currentInterestsError;

      // 4) Znajdź oferty należące do drugiego użytkownika
      const { data: otherUserOffers, error: otherOffersError } = await this.supabase
        .from('offers')
        .select('id, title, owner_id')
        .eq('owner_id', otherUserId);

      if (otherOffersError) throw otherOffersError;

      // 5) Filtruj interest current usera który dotyczy oferty drugiego użytkownika
      const otherUserOfferIds = (otherUserOffers ?? []).map((o) => o.id);
      const currentUserInterest = (currentUserInterests ?? []).find((i) => otherUserOfferIds.includes(i.offer_id));

      // 6) Znajdź interest drugiego użytkownika (gdzie drugi użytkownik jest zainteresowany ofertą current usera)
      const { data: otherUserInterests, error: otherInterestsError } = await this.supabase
        .from('interests')
        .select('id, offer_id, status, realized_at')
        .eq('user_id', otherUserId)
        .in('status', ['PROPOSED', 'ACCEPTED', 'REALIZED']);

      if (otherInterestsError) throw otherInterestsError;

      // 7) Znajdź oferty należące do current usera
      const { data: currentUserOffers, error: currentOffersError } = await this.supabase
        .from('offers')
        .select('id, title, owner_id')
        .eq('owner_id', userId);

      if (currentOffersError) throw currentOffersError;

      // 8) Filtruj interest drugiego użytkownika który dotyczy oferty current usera
      const currentUserOfferIds = (currentUserOffers ?? []).map((o) => o.id);
      const otherUserInterest = (otherUserInterests ?? []).find((i) => currentUserOfferIds.includes(i.offer_id));

      // 9) Pobierz tytuły ofert
      const myOffer = currentUserOffers?.find((o) => o.id === otherUserInterest?.offer_id);
      const theirOffer = otherUserOffers?.find((o) => o.id === currentUserInterest?.offer_id);

      // 10) Zbuduj ChatDetailsViewModel
      const result: ChatDetailsViewModel = {
        id: chatDetails.id,
        status: chatDetails.status,
        created_at: chatDetails.created_at,
        interest_id: currentUserInterest?.id ?? '',
        other_interest_id: otherUserInterest?.id,
        current_user_id: userId,
        current_interest_status: (currentUserInterest?.status as 'PROPOSED' | 'ACCEPTED' | 'REALIZED') ?? 'PROPOSED',
        other_interest_status: otherUserInterest?.status as 'PROPOSED' | 'ACCEPTED' | 'REALIZED' | undefined,
        other_user: chatDetails.user_a.id === userId ? chatDetails.user_b : chatDetails.user_a,
        related_offers:
          myOffer && theirOffer
            ? {
                my: {
                  id: myOffer.id,
                  title: myOffer.title,
                },
                their: {
                  id: theirOffer.id,
                  title: theirOffer.title,
                },
              }
            : undefined,
        realized_at: currentUserInterest?.realized_at,
      };

      return result;
    } catch (err) {
      console.error('[ChatsService.getChatDetailsWithInterests] Error:', err);
      throw err;
    }
  }

  /**
   * Wysyła wiadomość w czacie.
   *
   * @param chatId - ID czatu
   * @param userId - ID zalogowanego użytkownika (nadawca)
   * @param body - treść wiadomości (1-2000 znaków)
   * @throws Error z kodem 'CHAT_NOT_FOUND' lub 'ACCESS_DENIED'
   */
  async sendMessage(chatId: string, userId: string, body: string): Promise<MessageDTO> {
    try {
      // 1) Weryfikuj czy użytkownik ma dostęp do czatu
      const { data: chat, error: chatError } = await this.supabase
        .from('chats')
        .select('id, user_a, user_b')
        .eq('id', chatId)
        .maybeSingle();

      if (chatError) throw chatError;
      if (!chat) {
        throw new Error('CHAT_NOT_FOUND');
      }

      const isParticipant = chat.user_a === userId || chat.user_b === userId;
      if (!isParticipant) {
        throw new Error('ACCESS_DENIED');
      }

      // 2) Określ odbiorcę wiadomości
      const receiverId = chat.user_a === userId ? chat.user_b : chat.user_a;

      // 3) Wstaw wiadomość do bazy danych
      const { data: message, error: insertError } = await this.supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: userId,
          receiver_id: receiverId,
          body: body.trim(),
          is_read: false,
        })
        .select('id, chat_id, sender_id, body, created_at')
        .single();

      if (insertError) throw insertError;
      if (!message) {
        throw new Error('Failed to create message');
      }

      // 4) Pobierz imię nadawcy
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fromAuthUsers = (this.supabase as unknown as any).from('auth.users');
      const { data: senderData, error: _senderError } = await fromAuthUsers
        .select('id, user_metadata->>first_name as first_name, user_metadata->>last_name as last_name')
        .eq('id', userId)
        .maybeSingle();

      const senderName = senderData
        ? `${(senderData.first_name ?? '').trim()} ${(senderData.last_name ?? '').trim()}`.trim() || 'Użytkownik'
        : 'Użytkownik';

      // 5) Zwróć MessageDTO
      return {
        id: message.id,
        chat_id: message.chat_id,
        sender_id: message.sender_id,
        sender_name: senderName,
        body: message.body,
        created_at: message.created_at,
      };
    } catch (err) {
      console.error('[ChatsService.sendMessage] Error:', err);
      throw err;
    }
  }
}

export default ChatsService;
