import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types';
import type {
  OfferDetailDTO,
  CreateOfferCommand,
  CreateOfferResponse,
  UpdateOfferCommand,
  UpdateOfferResponse,
  OfferListItemDTO,
  Paginated,
  OffersListQuery,
  OfferImageDTO,
  AddOfferImagesCommand,
  ReorderImagesCommand,
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
    };

    const offers = (dataResultTyped.data as RawOffer[]) || [];
    const total = countResultTyped.count || 0;

    // Get unique owner IDs
    const uniqueOwnerIds = [...new Set(offers.map((o) => o.owner_id))];

    // Fetch user data for all owners
    const { data: usersData } = await this.supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('id', uniqueOwnerIds);

    // Create map of user data
    const usersMap = new Map(
      (usersData || [])
        .filter((u): u is { id: string; first_name: string | null; last_name: string | null } => u.id !== null)
        .map((u) => [u.id, { first_name: u.first_name, last_name: u.last_name }]),
    );

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

    // Get image counts for all offers
    const offerIds = offersWithCountsTyped.map((o) => o.id);
    const { data: imagesData } = await this.supabase
      .from('offer_images')
      .select('offer_id, thumbnail_url, order_index')
      .in('offer_id', offerIds)
      .order('order_index', { ascending: true });

    // Create maps for images count and main thumbnail
    const imagesCountMap = new Map<string, number>();
    const thumbnailMap = new Map<string, string | null>();

    if (imagesData) {
      for (const img of imagesData) {
        const currentCount = imagesCountMap.get(img.offer_id) || 0;
        imagesCountMap.set(img.offer_id, currentCount + 1);
        // Store thumbnail for main image (order_index = 0)
        if (img.order_index === 0 && img.thumbnail_url) {
          thumbnailMap.set(img.offer_id, img.thumbnail_url);
        }
      }
    }

    // Map to DTO
    const items: OfferListItemDTO[] = offersWithCountsTyped.map((offer) => {
      const userData = usersMap.get(offer.owner_id);
      let ownerName: string | undefined;
      if (userData && userData.first_name) {
        ownerName = `${userData.first_name} ${userData.last_name ?? ''}`.trim();
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
        images_count: imagesCountMap.get(offer.id) || (offer.image_url ? 1 : 0),
        thumbnail_url: thumbnailMap.get(offer.id) || null,
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
   * @param userId - UUID aktualnego użytkownika (używane do is_interested, is_owner)
   */
  async getOfferById(offerId: string, userId?: string): Promise<OfferDetailDTO | null> {
    // 1) Główne zapytanie bez JOIN
    const { data: offerData, error: offerError } = await this.supabase
      .from('offers')
      .select('id, owner_id, title, description, image_url, city, status, created_at')
      .eq('id', offerId)
      .maybeSingle();

    if (offerError) {
      console.error('[OFFER_SERVICE][GET_OFFER]', offerError);
      throw new Error('Błąd pobierania oferty');
    }

    if (!offerData) {
      return null;
    }

    // Jeśli oferta jest usunięta, ukryj ją dla wszystkich poza właścicielem
    // (dla ownera jest widoczna np. w "Moje oferty" po filtrze REMOVED).
    const isOwnerForVisibility = userId ? userId === offerData.owner_id : false;
    if (offerData.status !== 'ACTIVE' && !isOwnerForVisibility) {
      return null;
    }

    // 2) Get owner data
    const { data: ownerData } = await this.supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('id', offerData.owner_id)
      .maybeSingle();

    const ownerName =
      ownerData && ownerData.first_name ? `${ownerData.first_name} ${ownerData.last_name ?? ''}`.trim() : undefined;

    // 3) Interests count (head: true zwraca count zamiast danych)
    const { count: interestsCountRaw, error: countError } = await this.supabase
      .from('interests')
      .select('*', { count: 'exact', head: true })
      .eq('offer_id', offerId);

    if (countError) {
      console.error('[OFFER_SERVICE][INTERESTS_COUNT]', countError);
      throw new Error('Błąd pobierania liczby zainteresowań');
    }

    const interestsCount = typeof interestsCountRaw === 'number' ? interestsCountRaw : 0;

    // 4) Czy aktualny użytkownik wyraził zainteresowanie (jeśli podano userId)
    let isInterested = false;
    let currentUserInterestId: string | undefined = undefined;
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

      if (userInterest) {
        isInterested = true;
        currentUserInterestId = userInterest.id;
      }
    }

    // 5) Czy aktualny użytkownik jest właścicielem oferty
    const isOwner = userId ? userId === offerData.owner_id : false;

    // 6) Pobierz zdjęcia oferty
    const images = await this.getOfferImages(offerId);

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
      is_owner: isOwner,
      current_user_interest_id: currentUserInterestId,
      created_at: offerData.created_at,
      images: images,
      images_count: images.length,
    } as OfferDetailDTO;

    return dto;
  }

  /**
   * Soft-delete oferty (status -> 'REMOVED') - tylko właściciel.
   *
   * @param userId - ID zalogowanego użytkownika
   * @param offerId - UUID oferty
   *
   * @throws Error z kodem:
   *  - 'NOT_FOUND' gdy oferta nie istnieje
   *  - 'FORBIDDEN' gdy użytkownik nie jest właścicielem
   *  - 'RLS_VIOLATION' przy naruszeniu RLS
   */
  async removeOffer(userId: string, offerId: string): Promise<void> {
    // 1) Sprawdź czy oferta istnieje + owner
    const { data: existingOffer, error: fetchError } = await this.supabase
      .from('offers')
      .select('id, owner_id, status')
      .eq('id', offerId)
      .maybeSingle();

    if (fetchError) {
      console.error('[REMOVE_OFFER_FETCH_ERROR]', fetchError);
      throw new Error('Nie udało się pobrać oferty');
    }

    if (!existingOffer) {
      const e = new Error('Oferta nie istnieje');
      Object.assign(e, { code: 'NOT_FOUND' });
      throw e;
    }

    if (existingOffer.owner_id !== userId) {
      const e = new Error('Brak uprawnień do usunięcia tej oferty');
      Object.assign(e, { code: 'FORBIDDEN' });
      throw e;
    }

    // 2) Jeśli już REMOVED, traktuj jako sukces (idempotent)
    if (String(existingOffer.status) === 'REMOVED') {
      return;
    }

    // 3) Soft-delete
    const { error: updateError } = await this.supabase
      .from('offers')
      .update({ status: 'REMOVED' })
      .eq('id', offerId)
      .eq('owner_id', userId);

    if (updateError) {
      console.error('[REMOVE_OFFER_UPDATE_ERROR]', updateError);
      if ((updateError as unknown as { code?: string }).code === '42501') {
        const e = new Error('RLS_VIOLATION');
        Object.assign(e, { code: 'RLS_VIOLATION' });
        throw e;
      }
      throw new Error('Nie udało się usunąć oferty');
    }
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
    // 1) Sprawdź czy użytkownik istnieje (używamy widoku public.users)
    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

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
    // Główne zapytanie: pobierz oferty
    const { data: offers, error } = await this.supabase
      .from('offers')
      .select('id, owner_id, title, description, image_url, city, status, created_at')
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

    // Get owner data
    const { data: ownerData } = await this.supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('id', userId)
      .maybeSingle();

    const ownerName =
      ownerData && ownerData.first_name ? `${ownerData.first_name} ${ownerData.last_name ?? ''}`.trim() : undefined;

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

    // Get image counts for all offers
    const offerIds = offersWithCounts.map((o) => o.id);
    const { data: imagesData } = await this.supabase
      .from('offer_images')
      .select('offer_id, thumbnail_url, order_index')
      .in('offer_id', offerIds)
      .order('order_index', { ascending: true });

    // Create maps for images count and main thumbnail
    const imagesCountMap = new Map<string, number>();
    const thumbnailMap = new Map<string, string | null>();

    if (imagesData) {
      for (const img of imagesData) {
        const currentCount = imagesCountMap.get(img.offer_id) || 0;
        imagesCountMap.set(img.offer_id, currentCount + 1);
        if (img.order_index === 0 && img.thumbnail_url) {
          thumbnailMap.set(img.offer_id, img.thumbnail_url);
        }
      }
    }

    // Map to DTO
    const items: OfferListItemDTO[] = offersWithCounts.map((offer) => ({
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
      images_count: imagesCountMap.get(offer.id) || (offer.image_url ? 1 : 0),
      thumbnail_url: thumbnailMap.get(offer.id) || null,
    }));

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
      .select('id, owner_id, title, description, image_url, city, status, created_at')
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

    // Get owner data
    const { data: ownerData } = await this.supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('id', userId)
      .maybeSingle();

    const owner_name =
      ownerData && ownerData.first_name ? `${ownerData.first_name} ${ownerData.last_name || ''}`.trim() : undefined;

    const response = {
      ...newOffer,
      owner_name,
      interests_count: 0,
      is_interested: false,
      message: 'Oferta dodana pomyślnie!',
    } as unknown as CreateOfferResponse;

    return response;
  }

  /**
   * Aktualizuje ofertę dla zalogowanego użytkownika
   *
   * @param userId - ID zalogowanego użytkownika (z auth.uid())
   * @param offerId - UUID oferty do aktualizacji
   * @param payload - Dane do aktualizacji (częściowe)
   * @returns Zaktualizowana oferta z pełnymi danymi
   *
   * @throws Error z kodem 'NOT_FOUND' gdy oferta nie istnieje
   * @throws Error z kodem 'FORBIDDEN' gdy użytkownik nie jest właścicielem
   * @throws Error z kodem 'RLS_VIOLATION' przy naruszeniu RLS
   */
  async updateOffer(userId: string, offerId: string, payload: UpdateOfferCommand): Promise<UpdateOfferResponse> {
    // 1. Sprawdź czy oferta istnieje i czy użytkownik jest właścicielem
    const { data: existingOffer, error: fetchError } = await this.supabase
      .from('offers')
      .select('id, owner_id, status')
      .eq('id', offerId)
      .maybeSingle();

    if (fetchError) {
      console.error('[UPDATE_OFFER_FETCH_ERROR]', fetchError);
      throw new Error('Nie udało się pobrać oferty');
    }

    if (!existingOffer) {
      const e = new Error('Oferta nie istnieje');
      Object.assign(e, { code: 'NOT_FOUND' });
      throw e;
    }

    // 2. Sprawdź uprawnienia (tylko właściciel może edytować)
    if (existingOffer.owner_id !== userId) {
      const e = new Error('Brak uprawnień do edycji tej oferty');
      Object.assign(e, { code: 'FORBIDDEN' });
      throw e;
    }

    // 3. Przygotuj dane do aktualizacji (tylko te pola, które zostały przekazane)
    const updateData: Record<string, unknown> = {};

    if (payload.title !== undefined) {
      updateData.title = payload.title;
    }
    if (payload.description !== undefined) {
      updateData.description = payload.description;
    }
    if (payload.image_url !== undefined) {
      updateData.image_url = payload.image_url;
    }
    if (payload.city !== undefined) {
      updateData.city = payload.city;
    }
    if (payload.status !== undefined) {
      updateData.status = payload.status;
    }

    // 4. Jeśli nie ma żadnych pól do aktualizacji, zwróć obecne dane
    if (Object.keys(updateData).length === 0) {
      return (await this.getOfferById(offerId, userId)) as UpdateOfferResponse;
    }

    // 5. Wykonaj aktualizację
    const { data: updatedOffer, error: updateError } = await this.supabase
      .from('offers')
      .update(updateData)
      .eq('id', offerId)
      .eq('owner_id', userId) // RLS policy enforcement
      .select('id, owner_id, title, description, image_url, city, status, created_at')
      .single();

    if (updateError) {
      console.error('[UPDATE_OFFER_ERROR]', updateError);

      // RLS violation (Postgres 42501)
      if ((updateError as unknown as { code?: string }).code === '42501') {
        const e = new Error('RLS_VIOLATION');
        Object.assign(e, { code: 'RLS_VIOLATION' });
        throw e;
      }

      // Constraint violation (Postgres check constraint 23514)
      if ((updateError as unknown as { code?: string }).code === '23514') {
        const e = new Error('CONSTRAINT_VIOLATION');
        Object.assign(e, { code: 'CONSTRAINT_VIOLATION' });
        throw e;
      }

      throw new Error('Nie udało się zaktualizować oferty');
    }

    if (!updatedOffer) {
      throw new Error('Nie otrzymano danych zaktualizowanej oferty');
    }

    // 6. Pobierz dane właściciela
    const { data: ownerData } = await this.supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('id', userId)
      .maybeSingle();

    const owner_name =
      ownerData && ownerData.first_name ? `${ownerData.first_name} ${ownerData.last_name || ''}`.trim() : undefined;

    // 7. Pobierz licznik zainteresowań
    const { count: interestsCount } = await this.supabase
      .from('interests')
      .select('*', { count: 'exact', head: true })
      .eq('offer_id', offerId);

    // 8. Przygotuj response
    const response: UpdateOfferResponse = {
      ...updatedOffer,
      owner_name,
      interests_count: interestsCount || 0,
      is_interested: false,
      is_owner: true,
      message: 'Oferta zaktualizowana pomyślnie!',
    } as UpdateOfferResponse;

    return response;
  }

  // ==========================================
  // Image Management Methods
  // ==========================================

  /**
   * Pobiera wszystkie zdjęcia oferty posortowane po order_index
   *
   * @param offerId - UUID oferty
   * @returns Tablica zdjęć oferty
   */
  async getOfferImages(offerId: string): Promise<OfferImageDTO[]> {
    const { data: images, error } = await this.supabase
      .from('offer_images')
      .select('id, offer_id, image_url, thumbnail_url, order_index, created_at')
      .eq('offer_id', offerId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('[GET_OFFER_IMAGES_ERROR]', error);
      throw new Error('Nie udało się pobrać zdjęć oferty');
    }

    return (images as OfferImageDTO[]) || [];
  }

  /**
   * Dodaje zdjęcia do oferty
   *
   * @param offerId - UUID oferty
   * @param userId - UUID właściciela (do weryfikacji uprawnień)
   * @param command - Dane zdjęć do dodania
   * @returns Tablica dodanych zdjęć
   *
   * @throws Error z kodem 'NOT_FOUND' gdy oferta nie istnieje
   * @throws Error z kodem 'FORBIDDEN' gdy użytkownik nie jest właścicielem
   * @throws Error z kodem 'MAX_IMAGES_EXCEEDED' gdy przekroczono limit 5 zdjęć
   */
  async addOfferImages(offerId: string, userId: string, command: AddOfferImagesCommand): Promise<OfferImageDTO[]> {
    // 1. Sprawdź czy oferta istnieje i użytkownik jest właścicielem
    const { data: offer, error: offerError } = await this.supabase
      .from('offers')
      .select('id, owner_id')
      .eq('id', offerId)
      .maybeSingle();

    if (offerError) {
      console.error('[ADD_OFFER_IMAGES_FETCH_ERROR]', offerError);
      throw new Error('Nie udało się pobrać oferty');
    }

    if (!offer) {
      const e = new Error('Oferta nie istnieje');
      Object.assign(e, { code: 'NOT_FOUND' });
      throw e;
    }

    if (offer.owner_id !== userId) {
      const e = new Error('Brak uprawnień do edycji tej oferty');
      Object.assign(e, { code: 'FORBIDDEN' });
      throw e;
    }

    // 2. Sprawdź ile zdjęć już istnieje
    const { count: existingCount } = await this.supabase
      .from('offer_images')
      .select('*', { count: 'exact', head: true })
      .eq('offer_id', offerId);

    const totalCount = (existingCount || 0) + command.images.length;
    if (totalCount > 5) {
      const e = new Error(
        `Przekroczono limit 5 zdjęć na ofertę. Obecna liczba: ${existingCount}, próbujesz dodać: ${command.images.length}`,
      );
      Object.assign(e, { code: 'MAX_IMAGES_EXCEEDED' });
      throw e;
    }

    // 3. Przygotuj dane do wstawienia
    const imagesToInsert = command.images.map((img) => ({
      offer_id: offerId,
      image_url: img.image_url,
      thumbnail_url: img.thumbnail_url || null,
      order_index: img.order_index,
    }));

    // 4. Wstaw zdjęcia
    const { data: insertedImages, error: insertError } = await this.supabase
      .from('offer_images')
      .insert(imagesToInsert)
      .select('id, offer_id, image_url, thumbnail_url, order_index, created_at');

    if (insertError) {
      console.error('[ADD_OFFER_IMAGES_INSERT_ERROR]', insertError);
      throw new Error('Nie udało się dodać zdjęć');
    }

    return (insertedImages as OfferImageDTO[]) || [];
  }

  /**
   * Zmienia kolejność zdjęć oferty
   *
   * @param offerId - UUID oferty
   * @param userId - UUID właściciela (do weryfikacji uprawnień)
   * @param command - Nowa kolejność zdjęć (id + order_index)
   * @returns Zaktualizowane zdjęcia
   *
   * @throws Error z kodem 'NOT_FOUND' gdy oferta nie istnieje
   * @throws Error z kodem 'FORBIDDEN' gdy użytkownik nie jest właścicielem
   */
  async updateImageOrder(offerId: string, userId: string, command: ReorderImagesCommand): Promise<OfferImageDTO[]> {
    // 1. Sprawdź czy oferta istnieje i użytkownik jest właścicielem
    const { data: offer, error: offerError } = await this.supabase
      .from('offers')
      .select('id, owner_id')
      .eq('id', offerId)
      .maybeSingle();

    if (offerError) {
      console.error('[UPDATE_IMAGE_ORDER_FETCH_ERROR]', offerError);
      throw new Error('Nie udało się pobrać oferty');
    }

    if (!offer) {
      const e = new Error('Oferta nie istnieje');
      Object.assign(e, { code: 'NOT_FOUND' });
      throw e;
    }

    if (offer.owner_id !== userId) {
      const e = new Error('Brak uprawnień do edycji tej oferty');
      Object.assign(e, { code: 'FORBIDDEN' });
      throw e;
    }

    // 2. Aktualizuj kolejność dla każdego zdjęcia
    // Najpierw ustawiamy tymczasowe indeksy (negatywne) aby uniknąć konfliktu UNIQUE
    for (let i = 0; i < command.images.length; i++) {
      const img = command.images[i];
      await this.supabase
        .from('offer_images')
        .update({ order_index: -(i + 100) })
        .eq('id', img.id)
        .eq('offer_id', offerId);
    }

    // Teraz ustawiamy docelowe indeksy
    for (const img of command.images) {
      const { error: updateError } = await this.supabase
        .from('offer_images')
        .update({ order_index: img.order_index })
        .eq('id', img.id)
        .eq('offer_id', offerId);

      if (updateError) {
        console.error('[UPDATE_IMAGE_ORDER_ERROR]', updateError);
        throw new Error('Nie udało się zaktualizować kolejności zdjęć');
      }
    }

    // 3. Zwróć zaktualizowane zdjęcia
    return this.getOfferImages(offerId);
  }

  /**
   * Usuwa zdjęcie z oferty
   *
   * @param imageId - UUID zdjęcia do usunięcia
   * @param userId - UUID właściciela (do weryfikacji uprawnień)
   * @returns true jeśli usunięto, false jeśli nie znaleziono
   *
   * @throws Error z kodem 'NOT_FOUND' gdy zdjęcie nie istnieje
   * @throws Error z kodem 'FORBIDDEN' gdy użytkownik nie jest właścicielem
   */
  async deleteOfferImage(imageId: string, userId: string): Promise<boolean> {
    // 1. Pobierz zdjęcie z ofertą
    const { data: image, error: imageError } = await this.supabase
      .from('offer_images')
      .select('id, offer_id, order_index')
      .eq('id', imageId)
      .maybeSingle();

    if (imageError) {
      console.error('[DELETE_OFFER_IMAGE_FETCH_ERROR]', imageError);
      throw new Error('Nie udało się pobrać zdjęcia');
    }

    if (!image) {
      const e = new Error('Zdjęcie nie istnieje');
      Object.assign(e, { code: 'NOT_FOUND' });
      throw e;
    }

    // 2. Sprawdź uprawnienia
    const { data: offer, error: offerError } = await this.supabase
      .from('offers')
      .select('id, owner_id')
      .eq('id', image.offer_id)
      .maybeSingle();

    if (offerError || !offer) {
      console.error('[DELETE_OFFER_IMAGE_OFFER_ERROR]', offerError);
      throw new Error('Nie udało się pobrać oferty');
    }

    if (offer.owner_id !== userId) {
      const e = new Error('Brak uprawnień do usunięcia tego zdjęcia');
      Object.assign(e, { code: 'FORBIDDEN' });
      throw e;
    }

    // 3. Usuń zdjęcie
    const { error: deleteError } = await this.supabase.from('offer_images').delete().eq('id', imageId);

    if (deleteError) {
      console.error('[DELETE_OFFER_IMAGE_ERROR]', deleteError);
      throw new Error('Nie udało się usunąć zdjęcia');
    }

    // 4. Zaktualizuj kolejność pozostałych zdjęć
    const remainingImages = await this.getOfferImages(image.offer_id);
    if (remainingImages.length > 0) {
      for (let i = 0; i < remainingImages.length; i++) {
        await this.supabase.from('offer_images').update({ order_index: i }).eq('id', remainingImages[i].id);
      }
    }

    return true;
  }

  /**
   * Pobiera liczbę zdjęć dla oferty
   *
   * @param offerId - UUID oferty
   * @returns Liczba zdjęć
   */
  async getOfferImagesCount(offerId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('offer_images')
      .select('*', { count: 'exact', head: true })
      .eq('offer_id', offerId);

    if (error) {
      console.error('[GET_OFFER_IMAGES_COUNT_ERROR]', error);
      return 0;
    }

    return count || 0;
  }
}

export default OfferService;
