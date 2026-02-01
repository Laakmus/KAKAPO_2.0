import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types';
import type { InterestStatus } from '../db/enums';
import type { CreateInterestCommand, CreateInterestResponse } from '../types';

/**
 * InterestsService
 *
 * Encapsuluje logikę wyrażania zainteresowania ofertą.
 * Metoda `expressInterest`:
 *  - waliduje i pobiera ofertę
 *  - blokuje wyrażenie zainteresowania własną ofertą
 *  - sprawdza duplikaty
 *  - wykrywa mutual match (jeśli właściciel target oferty wcześniej wyraził zainteresowanie jedną z ofert requestera)
 *  - tworzy wpis w `interests` i w przypadku mutual match tworzy `chats` i aktualizuje status na 'ACCEPTED'
 */
export class InterestsService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Wyraź zainteresowanie ofertą.
   *
   * @param requesterId - UUID użytkownika wykonującego akcję (z auth)
   * @param command - { offer_id }
   * @returns CreateInterestResponse
   */
  async expressInterest(requesterId: string, command: CreateInterestCommand): Promise<CreateInterestResponse> {
    const targetOfferId = command.offer_id;

    // 1) Pobierz ofertę
    const { data: offer, error: offerError } = await this.supabase
      .from('offers')
      .select('id, owner_id')
      .eq('id', targetOfferId)
      .maybeSingle();

    if (offerError) {
      console.error('[INTERESTS_SERVICE][GET_OFFER_ERROR]', offerError);
      throw new Error('Błąd pobierania oferty');
    }

    if (!offer) {
      const e = new Error('Oferta nie została znaleziona');
      Object.assign(e, { code: 'NOT_FOUND' });
      throw e;
    }

    const offerOwnerId = (offer as { owner_id: string }).owner_id;

    // 2) Nie pozwalaj na zainteresowanie własną ofertą
    if (offerOwnerId === requesterId) {
      const e = new Error('Nie możesz być zainteresowany własną ofertą');
      Object.assign(e, { code: 'OWN_OFFER' });
      throw e;
    }

    // 3) Sprawdź czy już istnieje interest (unikalność: offer_id + user_id)
    const { data: existingInterest, error: existingInterestError } = await this.supabase
      .from('interests')
      .select('id')
      .eq('offer_id', targetOfferId)
      .eq('user_id', requesterId)
      .maybeSingle();

    if (existingInterestError) {
      console.error('[INTERESTS_SERVICE][CHECK_DUPLICATE_ERROR]', existingInterestError);
      throw new Error('Błąd sprawdzania istniejącego zainteresowania');
    }

    if (existingInterest) {
      const e = new Error('Już wyraziłeś zainteresowanie tą ofertą');
      Object.assign(e, { code: 'DUPLICATE' });
      throw e;
    }

    // 4) Wykryj mutual match
    // Pobierz AKTYWNE oferty requestera (REMOVED nie liczą się do matchu)
    const { data: requesterOffers, error: requesterOffersError } = await this.supabase
      .from('offers')
      .select('id')
      .eq('owner_id', requesterId)
      .eq('status', 'ACTIVE');

    if (requesterOffersError) {
      console.error('[INTERESTS_SERVICE][REQUESTER_OFFERS_ERROR]', requesterOffersError);
      throw new Error('Błąd pobierania ofert requestera');
    }

    const requesterOfferIds = (requesterOffers || []).map((r: { id: string }) => r.id) as string[];

    let mutualMatch = false;
    let mutualInterestId: string | null = null;
    if (requesterOfferIds.length > 0) {
      // Szukaj tylko PROPOSED interests — ACCEPTED/REALIZED to stare (już zmatchowane) wymiany
      const { data: mutual, error: mutualError } = await this.supabase
        .from('interests')
        .select('id')
        .in('offer_id', requesterOfferIds)
        .eq('user_id', offerOwnerId)
        .eq('status', 'PROPOSED')
        .limit(1);

      if (mutualError) {
        console.error('[INTERESTS_SERVICE][MUTUAL_CHECK_ERROR]', mutualError);
        throw new Error('Błąd podczas sprawdzania wzajemnego zainteresowania');
      }

      mutualMatch = Array.isArray(mutual) && mutual.length > 0;
      if (mutualMatch && mutual.length > 0) {
        mutualInterestId = (mutual[0] as { id: string }).id;
      }
    }

    // 5) Jeśli mutual match, zaktualizuj wcześniejsze zainteresowanie na ACCEPTED
    if (mutualMatch && mutualInterestId) {
      console.warn('[INTERESTS_SERVICE][MUTUAL_MATCH_DETECTED]', {
        mutualInterestId,
        willUpdateStatus: 'ACCEPTED',
      });

      const { data: updateResult, error: updateMutualError } = await this.supabase
        .from('interests')
        .update({ status: 'ACCEPTED' })
        .eq('id', mutualInterestId)
        .select('*');

      console.warn('[INTERESTS_SERVICE][UPDATE_RESULT]', {
        error: updateMutualError,
        updatedRows: updateResult,
      });

      if (updateMutualError) {
        console.error('[INTERESTS_SERVICE][UPDATE_MUTUAL_INTEREST_ERROR]', updateMutualError);
        // Nie przerywamy operacji, kontynuujemy tworzenie nowego zainteresowania
      } else {
        console.warn('[INTERESTS_SERVICE][MUTUAL_INTEREST_UPDATED]', {
          updatedCount: updateResult?.length ?? 0,
          updatedData: updateResult,
        });
      }
    } else {
      console.warn('[INTERESTS_SERVICE][NO_MUTUAL_MATCH]', {
        mutualMatch,
        mutualInterestId,
        requesterOfferIds: (requesterOffers || []).map((r: { id: string }) => r.id),
      });
    }

    // 6) Utwórz interest (domyślnie PROPOSED, lub ACCEPTED jeśli mutual match)
    const initialStatus = mutualMatch ? 'ACCEPTED' : 'PROPOSED';

    const { data: insertedInterest, error: insertError } = await this.supabase
      .from('interests')
      .insert({
        offer_id: targetOfferId,
        user_id: requesterId,
        status: initialStatus,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('[INTERESTS_SERVICE][INSERT_ERROR]', insertError);
      // RLS violation
      const insertErrorCode = (insertError as unknown as { code?: string }).code;
      if (insertErrorCode === '42501') {
        const e = new Error('RLS_VIOLATION');
        Object.assign(e, { code: 'RLS_VIOLATION' });
        throw e;
      }

      // Unique constraint / conflict - translate to DUPLICATE
      if (insertErrorCode === '23505') {
        const e = new Error('Już wyraziłeś zainteresowanie tą ofertą');
        Object.assign(e, { code: 'DUPLICATE' });
        throw e;
      }

      throw new Error('Nie udało się zapisać zainteresowania');
    }

    // 7) Jeśli mutualMatch, utwórz chat i zaktualizuj interest.chat_id (jeśli tabela chats istnieje)
    let chatId: string | null = null;
    if (mutualMatch) {
      try {
        // Ensure user_a < user_b (lexicographically) to satisfy CHECK constraint
        const [userA, userB] = [requesterId, offerOwnerId].sort();

        const { data: chat, error: chatError } = await this.supabase
          .from('chats')
          .insert({
            user_a: userA,
            user_b: userB,
            status: 'ACTIVE',
          })
          .select('id')
          .single();

        if (chatError) {
          // UNIQUE conflict — czat między tymi użytkownikami już istnieje, reaktywuj go
          const chatErrorCode = (chatError as unknown as { code?: string }).code;
          if (chatErrorCode === '23505') {
            const [existingUserA, existingUserB] = [requesterId, offerOwnerId].sort();
            const { data: existingChat } = await this.supabase
              .from('chats')
              .select('id')
              .eq('user_a', existingUserA)
              .eq('user_b', existingUserB)
              .maybeSingle();

            if (existingChat) {
              chatId = (existingChat as unknown as { id: string }).id;

              // Reaktywuj zarchiwizowany czat
              await this.supabase.from('chats').update({ status: 'ACTIVE' }).eq('id', chatId);

              // Wyczyść chat_id ze starych REALIZED interestów — nie należą do nowej wymiany
              await this.supabase
                .from('interests')
                .update({ chat_id: null } as { chat_id: null })
                .eq('chat_id', chatId)
                .eq('status', 'REALIZED');

              // Ustaw chat_id na nowych interestach
              const insertedAny = insertedInterest as unknown as { id: string } | null;
              if (insertedAny?.id) {
                await this.supabase
                  .from('interests')
                  .update({ status: 'ACCEPTED', chat_id: chatId })
                  .eq('id', insertedAny.id);
              }
              if (mutualInterestId) {
                await this.supabase.from('interests').update({ chat_id: chatId }).eq('id', mutualInterestId);
              }
            }
          } else {
            console.error('[INTERESTS_SERVICE][CHAT_INSERT_ERROR]', chatError);
          }
        } else {
          const chatAny = chat as unknown as { id?: string } | null;
          if (chatAny?.id) {
            chatId = chatAny.id;
            // Aktualizuj oba interests (nowe i wcześniejsze), ustaw chat_id
            const insertedAny = insertedInterest as unknown as { id: string } | null;
            const { error: updateError } = await this.supabase
              .from('interests')
              .update({ status: 'ACCEPTED', chat_id: chatId })
              .eq('id', insertedAny?.id ?? '');

            if (updateError) {
              console.error('[INTERESTS_SERVICE][INTEREST_UPDATE_ERROR]', updateError);
            }

            // Aktualizuj wcześniejsze zainteresowanie chat_id
            if (mutualInterestId) {
              const { error: updateMutualChatError } = await this.supabase
                .from('interests')
                .update({ chat_id: chatId })
                .eq('id', mutualInterestId);

              if (updateMutualChatError) {
                console.error('[INTERESTS_SERVICE][UPDATE_MUTUAL_CHAT_ERROR]', updateMutualChatError);
              }
            }
          }
        }
      } catch (err) {
        console.error('[INTERESTS_SERVICE][CHAT_TRANSACTION_EXCEPTION]', err);
      }
    }

    // Przygotuj response DTO
    const insertedAny = insertedInterest as unknown as {
      id: string;
      offer_id: string;
      user_id: string;
      status: InterestStatus;
      created_at: string;
    };

    const response: CreateInterestResponse = {
      id: insertedAny.id,
      offer_id: insertedAny.offer_id,
      user_id: insertedAny.user_id,
      status: insertedAny.status,
      created_at: insertedAny.created_at,
      message: mutualMatch ? 'Wzajemne zainteresowanie! Chat został otwarty' : 'Zainteresowanie zostało wyrażone',
      chat_id: chatId ?? null,
    };

    return response;
  }

  /**
   * Pobiera listę zainteresowań zalogowanego użytkownika.
   *
   * @param userId - UUID użytkownika
   * @param status - opcjonalny filtr statusu ('PROPOSED'|'ACCEPTED'|'REALIZED')
   * @returns lista InterestListItemDTO (mapowana)
   */
  async getMyInterests(userId: string, status?: 'PROPOSED' | 'ACCEPTED' | 'WAITING' | 'REALIZED') {
    // Zbuduj select z relacją do offers i użytkownika właściciela oferty (users)
    const selectCols =
      'id, offer_id, status, created_at, offers(id, title, owner_id, users!owner_id(first_name, last_name))';

    let query = this.supabase
      .from('interests')
      .select(selectCols)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[INTERESTS_SERVICE][GET_MY_INTERESTS_ERROR]', error);
      throw new Error('Błąd podczas pobierania zainteresowań');
    }

    const rows = (data || []) as Array<unknown>;

    const mapped = rows.map((r) => {
      const row = r as Record<string, unknown>;
      const offer =
        (row['offers'] as unknown as {
          title?: string;
          users?: { first_name?: string; last_name?: string } | null;
        }) || null;

      let ownerName: string | undefined;
      if (offer && offer.users && offer.users.first_name) {
        ownerName = `${offer.users.first_name} ${offer.users.last_name ?? ''}`.trim();
      } else {
        ownerName = undefined;
      }

      return {
        id: String(row['id']),
        offer_id: String(row['offer_id']),
        offer_title: offer ? offer.title : undefined,
        offer_owner: ownerName,
        status: String(row['status']),
        created_at: String(row['created_at']),
      };
    });

    return mapped;
  }

  /**
   * Anuluje (usuwa) zainteresowanie.
   *
   * Hard-delete: usuwa rekord z bazy danych
   *
   * @param requesterId - UUID użytkownika wykonującego operację
   * @param interestId - UUID rekordu zainteresowania
   */
  async cancelInterest(requesterId: string, interestId: string): Promise<void> {
    // Pobierz rekord zainteresowania
    const { data: interest, error } = await this.supabase
      .from('interests')
      .select('id, user_id')
      .eq('id', interestId)
      .maybeSingle();

    if (error) {
      console.error('[INTERESTS_SERVICE][GET_INTEREST_ERROR]', error);
      const e = new Error('Błąd podczas pobierania zainteresowania');
      Object.assign(e, { code: 'DB_ERROR' });
      throw e;
    }

    if (!interest) {
      const e = new Error('Zainteresowanie nie istnieje');
      Object.assign(e, { code: 'NOT_FOUND' });
      throw e;
    }

    // Sprawdź właściciela
    const interestOwnerId = (interest as unknown as { user_id?: string }).user_id;
    if (interestOwnerId !== requesterId) {
      const e = new Error('Brak uprawnień do anulowania tego zainteresowania');
      Object.assign(e, { code: 'FORBIDDEN' });
      throw e;
    }

    // Hard-delete: usuń rekord
    const { error: deleteError } = await this.supabase.from('interests').delete().eq('id', interestId);

    if (deleteError) {
      console.error('[INTERESTS_SERVICE][DELETE_ERROR]', deleteError);
      const e = new Error('Błąd podczas anulowania zainteresowania');
      Object.assign(e, { code: 'DB_ERROR' });
      throw e;
    }

    return;
  }

  /**
   * Potwierdza realizację wymiany ze strony użytkownika.
   *
   * Zasady:
   * - tylko uczestnik wymiany (interest.user_id lub owner of offer) może potwierdzić
   * - interest musi mieć status 'ACCEPTED' aby potwierdzić realizację
   * - ustawia status = 'REALIZED' oraz realized_at = now()
   * - jeżeli druga strona także ma status 'REALIZED' dla tego samego chat_id -> opcjonalnie tworzy wpis w exchange_history
   *
   * @param requestingUserId - UUID użytkownika potwierdzającego
   * @param interestId - UUID rekordu interest
   */
  async realizeInterest(requestingUserId: string, interestId: string) {
    // Pobierz interest wraz z powiązaną ofertą (aby sprawdzić właściciela) i potencjalnym chat_id
    const { data: interest, error: interestError } = await this.supabase
      .from('interests')
      .select('id, user_id, status, realized_at, offer_id, chat_id')
      .eq('id', interestId)
      .maybeSingle();

    if (interestError) {
      console.error('[INTERESTS_SERVICE][GET_INTEREST_ERROR]', interestError);
      const e = new Error('Błąd podczas pobierania zainteresowania');
      Object.assign(e, { code: 'DB_ERROR' });
      throw e;
    }

    if (!interest) {
      const e = new Error('Zainteresowanie nie istnieje');
      Object.assign(e, { code: 'NOT_FOUND' });
      throw e;
    }

    // Pobierz ofertę aby sprawdzić właściciela (owner)
    const { data: offer, error: offerError } = await this.supabase
      .from('offers')
      .select('id, owner_id')
      .eq('id', (interest as unknown as { offer_id?: string }).offer_id ?? '')
      .maybeSingle();

    if (offerError) {
      console.error('[INTERESTS_SERVICE][GET_OFFER_ERROR]', offerError);
      const e = new Error('Błąd pobierania oferty powiązanej z zainteresowaniem');
      Object.assign(e, { code: 'DB_ERROR' });
      throw e;
    }

    const offerOwnerId = (offer as unknown as { owner_id?: string } | null)?.owner_id;

    // Sprawdź czy requestingUserId jest jedną ze stron wymiany
    const interestUserId = (interest as unknown as { user_id?: string }).user_id;
    const isParticipant =
      String(interestUserId) === String(requestingUserId) ||
      (offerOwnerId && String(offerOwnerId) === String(requestingUserId));

    if (!isParticipant) {
      const e = new Error('Brak uprawnień do potwierdzenia realizacji tej wymiany');
      Object.assign(e, { code: 'FORBIDDEN' });
      throw e;
    }

    // Jeśli już zrealizowane -> konflikt
    if ((interest as any).status === 'REALIZED') {
      const e = new Error('Zainteresowanie zostało już zrealizowane');
      Object.assign(e, { code: 'ALREADY_REALIZED' });
      throw e;
    }

    // Jeśli już WAITING -> już potwierdzone przez tę stronę
    if ((interest as any).status === 'WAITING') {
      const e = new Error('Potwierdzenie już zostało złożone, oczekiwanie na drugą stronę');
      Object.assign(e, { code: 'ALREADY_REALIZED' });
      throw e;
    }

    // Status must be ACCEPTED to allow realize
    if ((interest as any).status !== 'ACCEPTED') {
      const e = new Error('Status musi być ACCEPTED aby potwierdzić realizację');
      Object.assign(e, { code: 'BAD_STATUS' });
      throw e;
    }

    const realizedAt = new Date().toISOString();
    const chatId = (interest as any).chat_id as string | null | undefined;

    // Sprawdź czy druga strona już WAITING (czeka na nas)
    let otherIsWaiting = false;
    let other: any = null;

    if (chatId) {
      const { data: otherData, error: otherError } = await this.supabase
        .from('interests')
        .select('id, user_id, status, offer_id')
        .eq('chat_id', chatId)
        .neq('id', interestId)
        .in('status', ['ACCEPTED', 'WAITING'])
        .limit(1)
        .maybeSingle();

      if (otherError) {
        console.error('[INTERESTS_SERVICE][CHECK_OTHER_WAITING_ERROR]', otherError);
      } else {
        other = otherData;
        otherIsWaiting = other && (other as any).status === 'WAITING';
      }
    }

    if (otherIsWaiting && other) {
      // Druga strona już czeka — oba interesty → REALIZED
      const { error: updateBothError } = await this.supabase
        .from('interests')
        .update({ status: 'REALIZED', realized_at: realizedAt })
        .in('id', [interestId, (other as any).id]);

      if (updateBothError) {
        console.error('[INTERESTS_SERVICE][UPDATE_BOTH_REALIZED_ERROR]', updateBothError);
        const e = new Error('Błąd przy aktualizacji statusów na REALIZED');
        Object.assign(e, { code: 'DB_ERROR' });
        throw e;
      }

      // Obie strony REALIZED — utwórz exchange_history i archiwizuj czat
      let exchangeHistoryId: string | undefined = undefined;
      try {
        const offerIds = [(interest as any).offer_id, (other as any).offer_id].filter(Boolean) as string[];
        const { data: offersData, error: offersError } = await this.supabase
          .from('offers')
          .select('id, title, owner_id')
          .in('id', offerIds as string[]);

        if (offersError) {
          console.error('[INTERESTS_SERVICE][OFFERS_FETCH_FOR_HISTORY_ERROR]', offersError);
        } else {
          const offerMap = new Map<string, { id: string; title: string; owner_id: string }>();
          (offersData || []).forEach((o: any) => offerMap.set(o.id, o));

          const offerA = offerMap.get((interest as any).offer_id);
          const offerB = offerMap.get((other as any).offer_id);

          const insertPayload: any = {
            chat_id: chatId ?? null,
            offer_a_id: offerA?.id ?? null,
            offer_a_title: offerA?.title ?? '',
            offer_b_id: offerB?.id ?? null,
            offer_b_title: offerB?.title ?? '',
            realized_at: realizedAt,
            user_a: (interest as any).user_id ?? null,
            user_b: (other as any).user_id ?? null,
          };

          const { data: history, error: historyError } = await this.supabase
            .from('exchange_history')
            .insert(insertPayload)
            .select('id')
            .single();

          if (historyError) {
            console.error('[INTERESTS_SERVICE][EXCHANGE_HISTORY_INSERT_ERROR]', historyError);
          } else if (history && (history as any).id) {
            exchangeHistoryId = (history as any).id;

            // Archiwizuj czat — wymiana zakończona
            const { error: archiveError } = await this.supabase
              .from('chats')
              .update({ status: 'ARCHIVED' })
              .eq('id', chatId);

            if (archiveError) {
              console.error('[INTERESTS_SERVICE][ARCHIVE_CHAT_ERROR]', archiveError);
            }
          }
        }
      } catch (err) {
        console.error('[INTERESTS_SERVICE][EXCHANGE_HISTORY_EXCEPTION]', err);
      }

      return {
        id: interestId,
        status: 'REALIZED',
        realized_at: realizedAt,
        message: exchangeHistoryId ? 'Wymiana została zrealizowana!' : 'Wymiana potwierdzona przez obie strony',
        ...(exchangeHistoryId ? { exchange_history_id: exchangeHistoryId } : {}),
      };
    }

    // Pierwsza strona potwierdza — ustaw WAITING
    const { error: updateError } = await this.supabase
      .from('interests')
      .update({ status: 'WAITING', realized_at: realizedAt })
      .eq('id', interestId);

    if (updateError) {
      console.error('[INTERESTS_SERVICE][UPDATE_WAITING_ERROR]', updateError);
      const e = new Error('Błąd przy aktualizacji statusu na WAITING');
      Object.assign(e, { code: 'DB_ERROR' });
      throw e;
    }

    return {
      id: interestId,
      status: 'WAITING',
      realized_at: realizedAt,
      message: 'Potwierdzenie złożone, oczekiwanie na drugą stronę',
    };
  }

  /**
   * Anuluje potwierdzenie realizacji wymiany (unrealize).
   *
   * Zasady:
   * - tylko uczestnik wymiany może cofnąć swoje potwierdzenie
   * - cofnięcie możliwe tylko ze statusu WAITING (jedna strona potwierdziła)
   * - ze statusu REALIZED cofnięcie niemożliwe (obie strony potwierdziły)
   * - ustawia status = 'ACCEPTED' i realized_at = null
   *
   * @param actorId - UUID użytkownika wykonującego operację
   * @param interestId - UUID rekordu interest
   */
  async unrealizeInterest(actorId: string, interestId: string) {
    const { data: interest, error: interestError } = await this.supabase
      .from('interests')
      .select('id, user_id, status, realized_at, offer_id, chat_id')
      .eq('id', interestId)
      .maybeSingle();

    if (interestError) {
      console.error('[INTERESTS_SERVICE][GET_INTEREST_ERROR]', interestError);
      const e = new Error('Błąd podczas pobierania zainteresowania');
      Object.assign(e, { code: 'DB_ERROR' });
      throw e;
    }

    if (!interest) {
      const e = new Error('Zainteresowanie nie istnieje');
      Object.assign(e, { code: 'NOT_FOUND' });
      throw e;
    }

    // Ze statusu REALIZED cofnięcie niemożliwe (obie strony potwierdziły)
    if ((interest as any).status === 'REALIZED') {
      const e = new Error('Nie można cofnąć potwierdzenia — wymiana została zrealizowana przez obie strony');
      Object.assign(e, { code: 'ALREADY_REALIZED' });
      throw e;
    }

    // Cofnięcie możliwe tylko ze statusu WAITING
    if ((interest as any).status !== 'WAITING') {
      const e = new Error('Status musi być WAITING aby cofnąć potwierdzenie');
      Object.assign(e, { code: 'BAD_STATUS' });
      throw e;
    }

    // Pobierz ofertę aby sprawdzić właściciela (owner)
    const { data: offer, error: offerError } = await this.supabase
      .from('offers')
      .select('id, owner_id')
      .eq('id', (interest as any).offer_id)
      .maybeSingle();

    if (offerError) {
      console.error('[INTERESTS_SERVICE][GET_OFFER_ERROR]', offerError);
      const e = new Error('Błąd pobierania oferty powiązanej z zainteresowaniem');
      Object.assign(e, { code: 'DB_ERROR' });
      throw e;
    }

    const offerOwnerId = (offer as any)?.owner_id as string | undefined;

    const isParticipant =
      String((interest as any).user_id) === String(actorId) ||
      (offerOwnerId && String(offerOwnerId) === String(actorId));

    if (!isParticipant) {
      const e = new Error('Brak uprawnień do cofnięcia potwierdzenia');
      Object.assign(e, { code: 'FORBIDDEN' });
      throw e;
    }

    // Cofnij: WAITING → ACCEPTED, wyczyść realized_at
    const { error: updateError } = await this.supabase
      .from('interests')
      .update({ status: 'ACCEPTED', realized_at: null } as any)
      .eq('id', interestId);

    if (updateError) {
      console.error('[INTERESTS_SERVICE][UNREALIZE_UPDATE_ERROR]', updateError);
      const e = new Error('Błąd podczas cofania potwierdzenia realizacji');
      Object.assign(e, { code: 'DB_ERROR' });
      throw e;
    }

    return {
      id: interestId,
      status: 'ACCEPTED',
      realized_at: null,
      message: 'Potwierdzenie anulowane',
    };
  }
}

export default InterestsService;
