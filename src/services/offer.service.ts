import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types';
import type {
  OfferDetailDTO,
  CreateOfferCommand,
  CreateOfferResponse,
  OfferListItemDTO,
  Paginated,
  OffersListQuery,
} from '../types';

/**
 * OfferService
 *
 * Encapsuluje zapytania związane z ofertami.
 * Zawiera metody:
 *  - getOfferById (szczegóły oferty + interests_count + is_interested)
 *  - getUserOffers (lista aktywnych ofert danego użytkownika)
 *  - getMyOffers (oferty zalogowanego użytkownika z liczbą zainteresowań)
 *  - createOffer (tworzenie oferty)
 *
 * RLS w bazie odpowiada za ograniczenie widoczności (ACTIVE lub własne).
 */
export class OfferService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Lista aktywnych ofert (paginated) z liczbą zainteresowań i imieniem właściciela.
   * - Filtrowanie po mieście (opcjonalne)
   * - Sortowanie po polu `created_at` lub `title`
   * - Paginate (offset-based)
   */
  async listOffers(query: OffersListQuery): Promise<Paginated<OfferListItemDTO>> {
    const { page = 1, limit = 15, city, sort = 'created_at', order = 'desc' } = query;

    // Count query (exact)
    let countQuery = this.supabase.from('offers').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE');

    // Data query with join to users for owner name
    let dataQuery = this.supabase
      .from('offers')
      .select(
        'id, owner_id, title, description, image_url, city, status, created_at, users!owner_id(first_name, last_name)',
      )
      .eq('status', 'ACTIVE');

    if (city) {
      countQuery = countQuery.eq('city', city);
      dataQuery = dataQuery.eq('city', city);
    }

    dataQuery = dataQuery.order(sort, { ascending: order === 'asc' }).range((page - 1) * limit, page * limit - 1);

    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

    const countResultTyped = countResult as { error?: unknown; count?: number };
    const dataResultTyped = dataResult as { error?: unknown; data?: unknown[] };

    if (countResultTyped.error || dataResultTyped.error) {
      console.error('[OFFER_SERVICE][LIST_OFFERS_ERROR]', {
        countError: countResultTyped.error,
        dataError: dataResultTyped.error,
      });
      throw new Error('Nie udało się pobrać ofert');
    }

    type RawOffer = {
      id: string;
      owner_id: string;
      title: string;
      description: string;
      image_url?: string | null;
      city?: string;
      status?: string;
      created_at?: string;
      users?: { first_name?: string | null; last_name?: string | null } | null;
    };

    const offers = (dataResultTyped.data as RawOffer[]) || [];
    const total = countResultTyped.count || 0;

    // N+1: interests_count per offer (MVP)
    const offersWithCounts = await Promise.all(
      offers.map(async (offer) => {
        try {
          const { count } = await this.supabase
            .from('interests')
            .select('*', { count: 'exact', head: true })
            .eq('offer_id', offer.id);

          return { ...offer, interests_count: count || 0 };
        } catch (err) {
          console.error('[OFFER_SERVICE][INTERESTS_COUNT_EXCEPTION]', err);
          return { ...offer, interests_count: 0 };
        }
      }),
    );
    const offersWithCountsTyped = offersWithCounts as Array<RawOffer & { interests_count: number }>;

    // Map to DTO
    const items: OfferListItemDTO[] = offersWithCountsTyped.map((offer) => {
      let ownerName: string | undefined;
      if (offer.users && offer.users.first_name) {
        ownerName = `${offer.users.first_name} ${offer.users.last_name ?? ''}`.trim();
      } else {
        ownerName = undefined;
      }

      return {
        id: offer.id,
        owner_id: offer.owner_id,
        owner_name: ownerName,
        title: offer.title,
        description: offer.description,
        image_url: offer.image_url ?? null,
        city: offer.city ?? '',
        status: offer.status ?? '',
        created_at: offer.created_at ?? '',
        interests_count: Number(offer.interests_count) || 0,
      };
    });

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Pobiera szczegóły oferty (OfferDetailDTO) lub null jeśli nie znaleziono.
   *
   * @param offerId - UUID oferty
   * @param userId - UUID aktualnego użytkownika (używane do is_interested)
   */
  async getOfferById(offerId: string, userId?: string): Promise<OfferDetailDTO | null> {
    // 1) Główne zapytanie z JOIN do users dla owner_name
    const { data: offerData, error: offerError } = await this.supabase
      .from('offers')
      .select(
        `
        id, owner_id, title, description, image_url, city, status, created_at,
        users!owner_id (first_name, last_name)
      `,
      )
      .eq('id', offerId)
      .maybeSingle();

    if (offerError) {
      console.error('[OFFER_SERVICE][GET_OFFER]', offerError);
      throw new Error('Błąd pobierania oferty');
    }

    if (!offerData) {
      return null;
    }

    // 2) Interests count (head: true zwraca count zamiast danych)
    const { count: interestsCountRaw, error: countError } = await this.supabase
      .from('interests')
      .select('*', { count: 'exact', head: true })
      .eq('offer_id', offerId);

    if (countError) {
      console.error('[OFFER_SERVICE][INTERESTS_COUNT]', countError);
      throw new Error('Błąd pobierania liczby zainteresowań');
    }

    const interestsCount = typeof interestsCountRaw === 'number' ? interestsCountRaw : 0;

    // 3) Czy aktualny użytkownik wyraził zainteresowanie (jeśli podano userId)
    let isInterested = false;
    if (userId) {
      const { data: userInterest, error: interestError } = await this.supabase
        .from('interests')
        .select('id')
        .eq('offer_id', offerId)
        .eq('user_id', userId)
        .maybeSingle();

      if (interestError) {
        console.error('[OFFER_SERVICE][IS_INTERESTED]', interestError);
        throw new Error('Błąd sprawdzania zainteresowania');
      }

      isInterested = !!userInterest;
    }

    type OfferWithUser = {
      users?: { first_name?: string | null; last_name?: string | null } | null;
    } & Record<string, unknown>;

    const rawOffer = offerData as OfferWithUser;
    const ownerName = rawOffer.users?.first_name
      ? `${rawOffer.users.first_name} ${rawOffer.users.last_name ?? ''}`.trim()
      : undefined;

    // Mapowanie do DTO
    const dto: OfferDetailDTO = {
      id: offerData.id,
      owner_id: offerData.owner_id,
      owner_name: ownerName,
      title: offerData.title,
      description: offerData.description,
      image_url: offerData.image_url,
      city: offerData.city,
      status: offerData.status,
      interests_count: interestsCount,
      is_interested: isInterested,
      created_at: offerData.created_at,
    } as OfferDetailDTO;

    return dto;
  }

  /**
   * Pobiera aktywne oferty użytkownika (bez interests_count).
   * Rzuca error z kodem 'USER_NOT_FOUND' gdy użytkownik nie istnieje.
   */
  async getUserOffers(userId: string): Promise<
    Array<{
      id: string;
      title: string;
      description: string;
      image_url: string | null;
      city: string;
      created_at: string;
    }>
  > {
    // 1) Sprawdź czy użytkownik istnieje
    // `auth.users` leży poza schematem `public` — definiujemy minimalny interfejs dla wywołania `.from()`
    type GenericSupabaseFrom = {
      from: (relation: string) => {
        select: (cols: string) => {
          eq: (
            col: string,
            val: string,
          ) => {
            single: () => Promise<{ data: unknown; error: unknown }>;
          };
        };
      };
    };

    const sb = this.supabase as unknown as GenericSupabaseFrom;
    const { data: user, error: userError } = await sb.from('auth.users').select('id').eq('id', userId).single();

    if (userError || !user) {
      const notFoundError = new Error('Użytkownik nie został znaleziony');
      Object.assign(notFoundError, { code: 'USER_NOT_FOUND' });
      throw notFoundError;
    }

    // 2) Pobierz aktywne oferty użytkownika
    const { data: offers, error } = await this.supabase
      .from('offers')
      .select('id, title, description, image_url, city, created_at')
      .eq('owner_id', userId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET_USER_OFFERS_ERROR]', error);
      throw new Error('Nie udało się pobrać ofert użytkownika');
    }

    type OfferItem = {
      id: string;
      title: string;
      description: string;
      image_url: string | null;
      city: string;
      created_at: string;
    };

    return (offers as OfferItem[]) || [];
  }

  /**
   * Pobiera listę ofert zalogowanego użytkownika z liczbą zainteresowań.
   *
   * @param userId - UUID użytkownika (auth.uid())
   * @param status - Filtrowanie statusu oferty ('ACTIVE' | 'REMOVED')
   * @returns Lista ofert w formacie OfferListItemDTO
   */
  async getMyOffers(userId: string, status: 'ACTIVE' | 'REMOVED' = 'ACTIVE'): Promise<OfferListItemDTO[]> {
    // Główne zapytanie: pobierz oferty oraz dane właściciela (first_name, last_name)
    const { data: offers, error } = await this.supabase
      .from('offers')
      .select(
        `
        id,
        owner_id,
        title,
        description,
        image_url,
        city,
        status,
        created_at,
        users!owner_id(first_name, last_name)
      `,
      )
      .eq('owner_id', userId)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET_MY_OFFERS_ERROR]', error);
      throw new Error('Nie udało się pobrać ofert użytkownika');
    }

    if (!offers || (offers as unknown[]).length === 0) {
      return [];
    }

    // N+1: pobierz licznik zainteresowań dla każdej oferty (MVP)
    type RawOffer = {
      id: string;
      owner_id: string;
      title: string;
      description: string;
      image_url: string | null;
      city: string;
      status: string;
      created_at: string;
      users?: { first_name?: string | null; last_name?: string | null } | null;
    };

    const offersArray = offers as RawOffer[];
    const offersWithCounts = await Promise.all(
      offersArray.map(async (offer) => {
        try {
          const { count, error: countError } = await this.supabase
            .from('interests')
            .select('*', { count: 'exact', head: true })
            .eq('offer_id', offer.id);

          if (countError) {
            console.error('[GET_INTERESTS_COUNT_ERROR]', countError);
          }

          return {
            ...offer,
            interests_count: count || 0,
          };
        } catch (err) {
          console.error('[GET_INTERESTS_COUNT_EXCEPTION]', err);
          return {
            ...offer,
            interests_count: 0,
          };
        }
      }),
    );

    // Map to DTO
    const items: OfferListItemDTO[] = offersWithCounts.map((offer) => {
      let ownerName: string | undefined;
      if (offer.users && offer.users.first_name) {
        const firstName = String(offer.users.first_name);
        const lastName = String(offer.users.last_name ?? '');
        ownerName = `${firstName} ${lastName}`.trim();
      } else {
        ownerName = undefined;
      }

      return {
        id: offer.id,
        owner_id: offer.owner_id,
        owner_name: ownerName,
        title: offer.title,
        description: offer.description,
        image_url: offer.image_url,
        city: offer.city,
        status: offer.status,
        created_at: offer.created_at,
        interests_count: Number(offer.interests_count) || 0,
      };
    });

    return items;
  }

  /**
   * Tworzy nową ofertę dla zalogowanego użytkownika
   * @param userId - ID zalogowanego użytkownika (z auth.uid())
   * @param input - Dane nowej oferty
   * @returns Utworzona oferta z pełnymi danymi
   */
  async createOffer(userId: string, input: CreateOfferCommand): Promise<CreateOfferResponse> {
    const { data: newOffer, error: insertError } = await this.supabase
      .from('offers')
      .insert({
        title: input.title,
        description: input.description,
        image_url: input.image_url || null,
        city: input.city,
        owner_id: userId,
        status: 'ACTIVE',
      })
      .select(
        `
        id,
        owner_id,
        title,
        description,
        image_url,
        city,
        status,
        created_at,
        users!owner_id(first_name, last_name)
      `,
      )
      .single();

    if (insertError) {
      console.error('[CREATE_OFFER_ERROR]', insertError);

      // RLS violation (Postgres 42501) or Supabase permission error
      if ((insertError as unknown as { code?: string }).code === '42501') {
        const e = new Error('RLS_VIOLATION');
        Object.assign(e, { code: 'RLS_VIOLATION' });
        throw e;
      }

      // Constraint violation (Postgres check constraint 23514)
      if ((insertError as unknown as { code?: string }).code === '23514') {
        const e = new Error('CONSTRAINT_VIOLATION');
        Object.assign(e, { code: 'CONSTRAINT_VIOLATION' });
        throw e;
      }

      throw new Error('Nie udało się utworzyć oferty');
    }

    if (!newOffer) {
      throw new Error('Nie otrzymano danych utworzonej oferty');
    }
    // Supabase zwraca `data` o niepewnej strukturze; zwracamy pełen row rozłożony oraz pola wyliczane.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertedAny: any = newOffer;

    const owner_name =
      insertedAny.users && insertedAny.users.first_name
        ? `${insertedAny.users.first_name} ${insertedAny.users.last_name || ''}`.trim()
        : undefined;

    const response = {
      ...(insertedAny || {}),
      owner_name,
      interests_count: 0,
      is_interested: false,
      message: 'Oferta dodana pomyślnie!',
    } as unknown as CreateOfferResponse;

    return response;
  }
}

export default OfferService;
