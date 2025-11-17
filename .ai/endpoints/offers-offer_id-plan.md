# API Endpoint Implementation Plan: Szczegóły oferty — `GET /api/offers/{offer_id}`

## 1. Przegląd punktu końcowego

Endpoint `GET /api/offers/{offer_id}` zwraca szczegółowe informacje o pojedynczej ofercie wymiany. Zawiera dane podstawowe oferty oraz pola wyliczane: imię i nazwisko właściciela (`owner_name`), liczba zainteresowań (`interests_count`) oraz informację czy aktualnie zalogowany użytkownik wyraził zainteresowanie tą ofertą (`is_interested`). Endpoint respektuje zasady Row Level Security — użytkownik widzi tylko aktywne oferty lub swoje własne (niezależnie od statusu).

## 2. Szczegóły żądania

- Metoda HTTP: `GET`
- Struktura URL: `/api/offers/{offer_id}`
- Nagłówki:
  - `Authorization: Bearer {token}` (wymagany)
- Parametry:
  - Wymagane:
    - `offer_id` (UUID w path) — identyfikator oferty
  - Opcjonalne: brak
- Request Body: brak (GET request)

### Walidacja

Brak dodatkowej walidacji - endpoint obsługuje tylko błąd 404 zgodnie ze specyfikacją API.

## 3. Wykorzystywane typy

Użyj istniejących typów z `src/types.ts`:

- `OfferDetailDTO` — response DTO rozszerzający `OfferRow` o:
  - `owner_name?: string` — imię i nazwisko właściciela
  - `interests_count: number` — liczba użytkowników zainteresowanych ofertą
  - `is_interested?: boolean` — czy aktualny użytkownik wyraził zainteresowanie
- `ApiErrorResponse` — błędy

## 4. Szczegóły odpowiedzi

### 200 OK
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "owner_id": "660e8400-e29b-41d4-a716-446655440001",
  "owner_name": "Jan Kowalski",
  "title": "Laptop Dell Latitude E7470",
  "description": "Sprawny laptop w bardzo dobrym stanie. Procesor i5, 8GB RAM, 256GB SSD. Idealny do pracy i nauki.",
  "image_url": "https://xyz.supabase.co/storage/v1/object/public/offer-images/...",
  "city": "Warszawa",
  "status": "ACTIVE",
  "interests_count": 5,
  "is_interested": false,
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Opis pól**:
- `id` — UUID oferty
- `owner_id` — UUID właściciela
- `owner_name` — imię i nazwisko właściciela (konkatenacja `first_name` + `last_name` z tabeli `users`)
- `title` — tytuł oferty (5-100 znaków)
- `description` — opis oferty (10-5000 znaków)
- `image_url` — URL do obrazka w Supabase Storage (może być null)
- `city` — miasto z listy 16 miast (CHECK constraint w DB)
- `status` — status oferty: "ACTIVE" lub "REMOVED"
- `interests_count` — liczba użytkowników którzy wyrazili zainteresowanie (COUNT z tabeli `interests`)
- `is_interested` — czy aktualny użytkownik wyraził zainteresowanie ofertą (boolean, może być undefined dla właściciela)
- `created_at` — data utworzenia oferty (ISO 8601 timestamp)

### Błędy

- **404 Not Found** — oferta nie istnieje
  ```json
  {
    "error": {
      "code": "NOT_FOUND",
      "message": "Oferta nie istnieje"
    }
  }
  ```

## 5. Przepływ danych

1. **Autoryzacja**: Middleware weryfikuje Bearer token przez Supabase Auth
2. **Walidacja**: Zod schema dla `offer_id` (UUID)
3. **Service call**: `OfferService.getOfferById(offer_id, user_id)`
   - Query główne: SELECT oferty z JOIN do `users` dla `owner_name`
   - RLS automatycznie filtruje (tylko ACTIVE lub własne oferty)
   - Query `interests_count`: COUNT z tabeli `interests` dla danej oferty
   - Query `is_interested`: sprawdzenie czy istnieje rekord w `interests` dla (offer_id, user_id)
   - Mapowanie na `OfferDetailDTO`
4. **Response**: JSON z danymi oferty lub 404 jeśli nie znaleziono

### Kluczowe query DB (Supabase)

```typescript
// Główne query z owner_name
const { data: offer, error } = await supabase
  .from('offers')
  .select(`
    id, owner_id, title, description, image_url, city, status, created_at,
    users!owner_id (first_name, last_name)
  `)
  .eq('id', offer_id)
  .single();

// RLS automatycznie filtruje:
// - Tylko ACTIVE oferty ALBO
// - Własne oferty (owner_id = auth.uid())

if (!offer) {
  // 404 Not Found
}

// Interests count
const { count: interestsCount } = await supabase
  .from('interests')
  .select('*', { count: 'exact', head: true })
  .eq('offer_id', offer_id);

// Is interested (czy aktualny user wyraził zainteresowanie)
const { data: userInterest } = await supabase
  .from('interests')
  .select('id')
  .eq('offer_id', offer_id)
  .eq('user_id', user_id)
  .maybeSingle();

const isInterested = !!userInterest;
```

## 6. Względy bezpieczeństwa

- **Autoryzacja**: Bearer token wymagany (middleware)
- **RLS Policy**: `offers_select_active` zapewnia że:
  - Użytkownik widzi tylko oferty ze statusem 'ACTIVE' ALBO
  - Użytkownik widzi swoje własne oferty (niezależnie od statusu)
- **UUID Validation**: Zod schema zapobiega nieprawidłowym formatom
- **Enumeration Attack**: Nie ujawniamy różnicy między "oferta nie istnieje" a "oferta REMOVED" (zawsze 404)
- **Prywatność**: 
  - `owner_id` ujawniony (potrzebny dla UI)
  - `is_interested` zawsze relative do aktualnego użytkownika (nie ujawnia innych)
- **SQL Injection**: Supabase client automatycznie zabezpiecza parametry
- **CORS**: Restrykcje do dozwolonych domen

### Zasady RLS (db-plan.md)

```sql
-- Użytkownik widzi aktywne oferty lub swoje własne
CREATE POLICY offers_select_active
  ON offers FOR SELECT
  USING (status = 'ACTIVE' OR owner_id = auth.uid());
```

## 7. Obsługa błędów

| Scenariusz | Kod | Error Code | Komunikat |
|-----------|-----|------------|-----------|
| Oferta nie istnieje | 404 | NOT_FOUND | "Oferta nie istnieje" |
| Oferta REMOVED (nie właściciel) | 404 | NOT_FOUND | "Oferta nie istnieje" |

**Uwaga**: Ten sam komunikat dla ofert nieistniejących i REMOVED (nie ujawniamy różnicy).

## 8. Wydajność

### Oczekiwany czas odpowiedzi
- P50: < 150ms
- P95: < 400ms
- P99: < 800ms

### Zapytania do DB
1. **Główne query**: SELECT oferty z JOIN do `users` (1 query)
2. **Interests count**: COUNT z `interests` (1 query)
3. **Is interested**: SELECT z `interests` (1 query)
**Razem: 3 queries** (akceptowalne dla endpoint szczegółów)

### Wykorzystanie indeksów (z db-plan.md)

```sql
-- Primary key na offers.id (automatyczny)
CREATE UNIQUE INDEX offers_pkey ON offers(id);

-- Foreign key index na offers.owner_id
CREATE INDEX idx_offers_owner_id ON offers(owner_id);

-- Dla COUNT interests
CREATE INDEX idx_interests_offer_id ON interests(offer_id);

-- Dla sprawdzenia is_interested
CREATE INDEX idx_interests_user_id ON interests(user_id);
-- lub lepiej composite:
CREATE INDEX idx_interests_offer_user ON interests(offer_id, user_id);
```

### Optymalizacje Post-MVP

**Priorytet 1**: Agregacja interests_count w ofercie (denormalizacja)
```sql
-- Dodaj kolumnę interests_count do offers
ALTER TABLE offers ADD COLUMN interests_count INTEGER DEFAULT 0;

-- Trigger INCREMENT/DECREMENT przy INSERT/DELETE w interests
CREATE FUNCTION update_offer_interests_count() RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE offers SET interests_count = interests_count + 1 WHERE id = NEW.offer_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE offers SET interests_count = interests_count - 1 WHERE id = OLD.offer_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_offer_interests_count_trigger
  AFTER INSERT OR DELETE ON interests
  FOR EACH ROW
  EXECUTE FUNCTION update_offer_interests_count();
```

**Priorytet 2**: Cache na poziomie Supabase (dla popularnych ofert)

### Monitoring
- Request rate, response time (P50/P95/P99)
- Error rate (szczególnie 404 vs 500)
- DB query time per query
- Narzędzia: Supabase Dashboard, Sentry

## 9. Kroki implementacji

### Struktura plików
```
src/
├── pages/api/offers/[offer_id].ts   # API route
├── services/offer.service.ts         # Business logic (rozszerz istniejący)
├── schemas/offers.schema.ts          # Zod schemas (dodaj offerIdSchema)
└── utils/errors.ts                   # createErrorResponse (istniejący)
```

### 1. Schema (src/schemas/offers.schema.ts)

Nie jest wymagany dodatkowy schema - walidacja UUID może być opcjonalna lub wykonana podstawowo.

### 2. Service (src/services/offer.service.ts)

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types';
import type { OfferDetailDTO } from '../types';

export class OfferService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getOfferById(offerId: string, userId: string): Promise<OfferDetailDTO | null> {
    // Główne query z owner_name (RLS automatycznie filtruje)
    const { data: offer, error } = await this.supabase
      .from('offers')
      .select(`
        id, owner_id, title, description, image_url, city, status, created_at,
        users!owner_id (first_name, last_name)
      `)
      .eq('id', offerId)
      .maybeSingle();

    if (error) {
      console.error('[OFFER_SERVICE_ERROR]', error);
      throw new Error('Błąd pobierania oferty');
    }

    if (!offer) {
      return null; // 404 Not Found
    }

    // Interests count
    const { count: interestsCount, error: countError } = await this.supabase
      .from('interests')
      .select('*', { count: 'exact', head: true })
      .eq('offer_id', offerId);

    if (countError) {
      console.error('[INTERESTS_COUNT_ERROR]', countError);
      throw new Error('Błąd pobierania liczby zainteresowań');
    }

    // Is interested (czy aktualny user wyraził zainteresowanie)
    const { data: userInterest, error: interestError } = await this.supabase
      .from('interests')
      .select('id')
      .eq('offer_id', offerId)
      .eq('user_id', userId)
      .maybeSingle();

    if (interestError && interestError.code !== 'PGRST116') {
      // PGRST116 = no rows found, to OK
      console.error('[IS_INTERESTED_ERROR]', interestError);
      throw new Error('Błąd sprawdzania zainteresowania');
    }

    // Map to DTO
    const ownerName = offer.users 
      ? `${offer.users.first_name} ${offer.users.last_name}`.trim()
      : undefined;

    return {
      id: offer.id,
      owner_id: offer.owner_id,
      owner_name: ownerName,
      title: offer.title,
      description: offer.description,
      image_url: offer.image_url,
      city: offer.city,
      status: offer.status,
      interests_count: interestsCount || 0,
      is_interested: !!userInterest,
      created_at: offer.created_at
    };
  }
}
```

### 3. API Route (src/pages/api/offers/[offer_id].ts)

```typescript
import type { APIRoute } from 'astro';
import { createErrorResponse } from '../../../utils/errors';
import { OfferService } from '../../../services/offer.service';

export const GET: APIRoute = async ({ params, locals }) => {
  const supabase = locals.supabase;
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session.user.id;

  // Call service
  const offerService = new OfferService(supabase);
  const offer = await offerService.getOfferById(params.offer_id, userId);

  if (!offer) {
    return createErrorResponse('NOT_FOUND', 'Oferta nie istnieje', 404);
  }

  return new Response(JSON.stringify(offer), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
```

### 4. Testowanie

```bash
# Test 1: Pobranie szczegółów aktywnej oferty
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:4321/api/offers/550e8400-e29b-41d4-a716-446655440000
# Oczekiwane: 200 OK z pełnymi danymi oferty

# Test 2: Pobranie własnej oferty (nawet jeśli REMOVED)
curl -H "Authorization: Bearer OWNER_TOKEN" \
  http://localhost:4321/api/offers/OWNER_OFFER_ID
# Oczekiwane: 200 OK (owner widzi swoje oferty niezależnie od statusu)

# Test 3: Pobranie oferty REMOVED (nie owner)
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:4321/api/offers/REMOVED_OFFER_ID
# Oczekiwane: 404 Not Found

# Test 4: Nieistniejąca oferta
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:4321/api/offers/550e8400-0000-0000-0000-000000000000
# Oczekiwane: 404 Not Found

# Test 5: is_interested = true (user wyraził zainteresowanie)
# Najpierw dodaj zainteresowanie przez POST /api/interests
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:4321/api/offers/INTERESTED_OFFER_ID
# Oczekiwane: 200 OK z is_interested: true

# Test 6: owner_name obecny
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:4321/api/offers/550e8400-e29b-41d4-a716-446655440000
# Oczekiwane: 200 OK z owner_name: "Jan Kowalski"

# Test 7: interests_count
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:4321/api/offers/POPULAR_OFFER_ID
# Oczekiwane: 200 OK z interests_count > 0
```

### 5. Checklist

- [ ] `OfferService.getOfferById()` z 3 queries (offer + count + is_interested)
- [ ] API route z podstawowym flow
- [ ] RLS policy automatycznie filtruje (ACTIVE lub własne)
- [ ] `owner_name` konkatenowany z `first_name` + `last_name`
- [ ] `interests_count` obliczony z COUNT
- [ ] `is_interested` sprawdzony dla aktualnego użytkownika
- [ ] 404 dla nieistniejących i REMOVED ofert (jednolity komunikat)
- [ ] Komunikaty po polsku
- [ ] Testy manualne przeszły (wszystkie 7 scenariuszy)

## 10. Dodatkowe uwagi

### Decyzje projektowe

- **3 queries**: Akceptowalne dla endpoint szczegółów (nie lista)
- **RLS**: Automatyczne filtrowanie przez Supabase (nie duplikujemy logiki w kodzie)
- **404 dla REMOVED**: Nie ujawniamy różnicy między "nie istnieje" a "usunięte" (bezpieczeństwo)
- **is_interested**: Zawsze relative do aktualnego użytkownika (privacy)
- **owner_name**: Zawsze obecny (JOIN z users jest wymagany przez FK)

### Post-MVP optymalizacje

**Priorytet 1**: Denormalizacja `interests_count` w tabeli `offers`
- Trigger INCREMENT/DECREMENT przy operacjach na `interests`
- Eliminuje jedno query (z 3 do 2)

**Priorytet 2**: Composite index dla `is_interested`
```sql
CREATE INDEX idx_interests_offer_user ON interests(offer_id, user_id);
```

**Priorytet 3**: Cache dla popularnych ofert
- Redis/Upstash z TTL 5 minut
- Invalidacja przy UPDATE oferty lub zmianie interests

### Edge cases

1. **Właściciel widzi swoją ofertę REMOVED**: OK (zgodne z RLS)
2. **Użytkownik nie-owner próbuje zobaczyć REMOVED**: 404 (RLS blokuje)
3. **Oferta bez użytkownika (owner deleted)**: ON DELETE CASCADE zapobiega (db-plan.md)
4. **is_interested dla właściciela**: Trigger blokuje self-interest (check_self_interest), więc zawsze false

### Zgodność z PRD

- **US-004**: Wyświetlanie szczegółów oferty ✅
- Pola: tytuł, opis, zdjęcie, miasto, data utworzenia, właściciel ✅
- Liczba zainteresowanych użytkowników ✅
- Przycisk zainteresowania (is_interested informuje UI) ✅

---

Plan zakłada implementację zgodną z db-plan.md, types.ts i backend.mdc. Endpoint wykorzystuje RLS policies dla bezpieczeństwa i nie duplikuje logiki autoryzacji w kodzie.

