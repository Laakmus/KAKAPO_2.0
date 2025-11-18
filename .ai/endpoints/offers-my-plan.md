# API Endpoint Implementation Plan: Lista moich ofert — `GET /api/offers/my`

## 1. Przegląd punktu końcowego

Endpoint `GET /api/offers/my` zwraca listę ofert należących do zalogowanego użytkownika. Umożliwia filtrowanie po statusie oferty (ACTIVE/REMOVED). Domyślnie zwracane są tylko aktywne oferty. Każda oferta zawiera podstawowe informacje oraz liczbę zainteresowań (`interests_count`).

## 2. Szczegóły żądania

- Metoda HTTP: `GET`
- Struktura URL: `/api/offers/my`
- Nagłówki:
  - `Authorization: Bearer {token}` (wymagany)
- Parametry (query):
  - `status` (string, default: "ACTIVE") — wartości: "ACTIVE" | "REMOVED"

### Walidacja (Zod Schema)

```typescript
import { z } from 'zod';

export const myOffersQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'REMOVED']).optional().default('ACTIVE'),
});
```

## 3. Wykorzystywane typy

Użyj istniejących typów z `src/types.ts`:

- `OfferListItemDTO` — pojedyncza oferta w response (z `owner_name`, `interests_count`)
- `ApiErrorResponse` — struktura błędów

### Response Type

```typescript
type MyOffersResponse = {
  data: OfferListItemDTO[];
};
```

## 4. Szczegóły odpowiedzi

### 200 OK

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Laptop Dell",
      "description": "Sprawny laptop...",
      "image_url": "https://...",
      "city": "Warszawa",
      "status": "ACTIVE",
      "interests_count": 5,
      "created_at": "2024-01-01T10:00:00Z"
    },
    {
      "id": "uuid2",
      "title": "Stary telefon",
      "description": "Już nieaktualny...",
      "image_url": null,
      "city": "Kraków",
      "status": "REMOVED",
      "interests_count": 0,
      "created_at": "2023-12-15T08:30:00Z"
    }
  ]
}
```

### Błędy

- **400 Bad Request** — nieprawidłowa wartość parametru status
- **401 Unauthorized** — brak/nieprawidłowy token autoryzacji
- **500 Internal Server Error** — błąd serwera

## 5. Przepływ danych

1. **Autoryzacja**: Middleware weryfikuje Bearer token przez Supabase Auth
2. **Walidacja**: Zod schema dla query parameter `status`
3. **Service call**: `OfferService.getMyOffers(userId, status)`
   - Query filtrujące WHERE owner_id = auth.uid() AND status = ?
   - LEFT JOIN do interests dla interests_count (agregacja w query)
   - Mapowanie na DTO
4. **Response**: JSON z tablicą `data`

### Kluczowe query DB (Supabase)

```typescript
// Query dla ofert użytkownika z agregacją interests_count
const { data: offers, error } = await supabase
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
    interests:interests(count)
  `,
  )
  .eq('owner_id', userId)
  .eq('status', status)
  .order('created_at', { ascending: false });

// Alternatywnie: N+1 approach jak w offers-plan.md (MVP)
for (const offer of offers) {
  const { count } = await supabase
    .from('interests')
    .select('*', { count: 'exact', head: true })
    .eq('offer_id', offer.id);
  offer.interests_count = count || 0;
}
```

## 6. Względy bezpieczeństwa

- **Autoryzacja**: Bearer token wymagany (middleware Supabase Auth)
- **Własność danych**: RLS policy `offers_select_active` zapewnia, że użytkownik widzi tylko swoje oferty (owner_id = auth.uid())
- **Filtrowanie statusu**: Walidacja przez Zod enum ('ACTIVE' | 'REMOVED')
- **SQL Injection**: Supabase client automatycznie zabezpiecza zapytania
- **Brak paginacji**: Lista wszystkich ofert użytkownika (zakładamy rozsądną liczbę < 100 per user)

## 7. Obsługa błędów

| Scenariusz          | Kod | Error Code       | Komunikat                                                            |
| ------------------- | --- | ---------------- | -------------------------------------------------------------------- |
| Status invalid      | 400 | VALIDATION_ERROR | "Nieprawidłowa wartość parametru status. Dozwolone: ACTIVE, REMOVED" |
| Brak tokena         | 401 | UNAUTHORIZED     | "Brak autoryzacji"                                                   |
| Nieprawidłowy token | 401 | UNAUTHORIZED     | "Nieprawidłowy lub wygasły token"                                    |
| Błąd DB             | 500 | INTERNAL_ERROR   | "Wystąpił błąd podczas pobierania ofert. Spróbuj ponownie później"   |

**Logowanie**: Tylko błędy 500 i nieoczekiwane wyjątki. Nie logować tokenów ani danych użytkownika.

## 8. Wydajność

### Oczekiwany czas odpowiedzi

- P50: < 200ms
- P95: < 500ms
- P99: < 1000ms

### Wąskie gardła

**N+1 Problem dla interests_count**:

- MVP: Osobne query per oferta (zazwyczaj < 20 ofert per user)
- Post-MVP: Agregacja w jednym query z LEFT JOIN lub subquery

### Wykorzystanie indeksów (z db-plan.md)

```sql
-- Wykorzystywany indeks
idx_offers_owner_status ON offers(owner_id, status)

-- Zapewnia szybkie filtrowanie ofert właściciela po statusie
```

### Monitoring

- Request rate, response time (P50/P95/P99)
- Error rate 4xx/5xx
- DB query time
- Narzędzia: Supabase Dashboard, Sentry

## 9. Kroki implementacji

### Struktura plików

```
src/
├── pages/api/offers/my.ts          # API route (nowy plik)
├── services/offer.service.ts        # Dodać metodę getMyOffers()
├── schemas/offers.schema.ts         # Dodać myOffersQuerySchema
└── utils/errors.ts                  # createErrorResponse (istniejący)
```

### 1. Schema (src/schemas/offers.schema.ts)

Dodaj do istniejącego pliku:

```typescript
import { z } from 'zod';

// ... istniejące schematy ...

export const myOffersQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'REMOVED']).optional().default('ACTIVE').describe('Status oferty do filtrowania'),
});
```

### 2. Service (src/services/offer.service.ts)

Dodaj metodę do istniejącej klasy `OfferService`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types';
import type { OfferListItemDTO } from '../types';

export class OfferService {
  constructor(private supabase: SupabaseClient<Database>) {}

  // ... istniejące metody ...

  /**
   * Pobiera listę ofert zalogowanego użytkownika
   * @param userId - ID zalogowanego użytkownika (z auth.uid())
   * @param status - Status oferty do filtrowania (ACTIVE lub REMOVED)
   * @returns Lista ofert użytkownika z interests_count
   */
  async getMyOffers(userId: string, status: 'ACTIVE' | 'REMOVED' = 'ACTIVE'): Promise<OfferListItemDTO[]> {
    // Główne query
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

    if (!offers || offers.length === 0) {
      return [];
    }

    // Pobierz interests_count dla każdej oferty (N+1 - optymalizacja post-MVP)
    const offersWithCounts = await Promise.all(
      offers.map(async (offer) => {
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
      }),
    );

    // Map to DTO
    const items: OfferListItemDTO[] = offersWithCounts.map((offer) => ({
      id: offer.id,
      owner_id: offer.owner_id,
      owner_name: offer.users ? `${offer.users.first_name} ${offer.users.last_name}`.trim() : undefined,
      title: offer.title,
      description: offer.description,
      image_url: offer.image_url,
      city: offer.city,
      status: offer.status,
      created_at: offer.created_at,
      interests_count: offer.interests_count,
    }));

    return items;
  }
}
```

### 3. API Route (src/pages/api/offers/my.ts)

Nowy plik:

```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { myOffersQuerySchema } from '../../../schemas/offers.schema';
import { createErrorResponse } from '../../../utils/errors';
import { OfferService } from '../../../services/offer.service';

export const GET: APIRoute = async ({ request, locals, url }) => {
  try {
    const supabase = locals.supabase;
    if (!supabase) {
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    // Auth check
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session) {
      return createErrorResponse('UNAUTHORIZED', 'Brak autoryzacji', 401);
    }

    const userId = session.user.id;

    // Parse & validate query params
    const searchParams = Object.fromEntries(url.searchParams.entries());
    let validatedQuery;

    try {
      validatedQuery = myOffersQuerySchema.parse(searchParams);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Nieprawidłowa wartość parametru status. Dozwolone: ACTIVE, REMOVED',
          400,
          { field: String(firstError.path[0] || 'status') },
        );
      }
      throw error;
    }

    // Call service
    const offerService = new OfferService(supabase);
    const offers = await offerService.getMyOffers(userId, validatedQuery.status);

    return new Response(JSON.stringify({ data: offers }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[MY_OFFERS_EXCEPTION]', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'Wystąpił błąd podczas pobierania ofert. Spróbuj ponownie później',
      500,
    );
  }
};
```

### 4. Testowanie

```bash
# Test 1: Domyślne parametry (ACTIVE)
curl -H "Authorization: Bearer TOKEN" http://localhost:4321/api/offers/my

# Test 2: Oferty usunięte (REMOVED)
curl -H "Authorization: Bearer TOKEN" "http://localhost:4321/api/offers/my?status=REMOVED"

# Test 3: Błąd walidacji - nieprawidłowy status
curl -H "Authorization: Bearer TOKEN" "http://localhost:4321/api/offers/my?status=INVALID"
# Oczekiwane: 400 Bad Request

# Test 4: Brak autoryzacji
curl http://localhost:4321/api/offers/my
# Oczekiwane: 401 Unauthorized

# Test 5: Nieprawidłowy token
curl -H "Authorization: Bearer INVALID_TOKEN" http://localhost:4321/api/offers/my
# Oczekiwane: 401 Unauthorized
```

### 5. Checklist

- [ ] Zod schema `myOffersQuerySchema` w offers.schema.ts
- [ ] Metoda `getMyOffers()` w OfferService
- [ ] API route `/api/offers/my.ts` z auth + walidacją
- [ ] Filtrowanie po owner_id = auth.uid()
- [ ] Filtrowanie po statusie (ACTIVE/REMOVED)
- [ ] interests_count dla każdej oferty
- [ ] owner_name konkatenowany (first_name + last_name)
- [ ] Sortowanie DESC po created_at
- [ ] Komunikaty błędów po polsku
- [ ] Testy manualne przeszły

## 10. Dodatkowe uwagi

### Post-MVP optymalizacje

**Priorytet 1**: Agregacja interests_count w jednym query

```sql
-- Opcja 1: Subquery w SELECT (Postgres)
SELECT
  o.*,
  (SELECT COUNT(*) FROM interests i WHERE i.offer_id = o.id) as interests_count
FROM offers o
WHERE o.owner_id = $1 AND o.status = $2;

-- Opcja 2: LEFT JOIN z GROUP BY
SELECT
  o.*,
  COUNT(i.id) as interests_count
FROM offers o
LEFT JOIN interests i ON o.id = i.offer_id
WHERE o.owner_id = $1 AND o.status = $2
GROUP BY o.id;
```

W Supabase:

```typescript
const { data } = await supabase.rpc('get_my_offers_with_counts', {
  p_user_id: userId,
  p_status: status,
});
```

**Priorytet 2**: Paginacja jeśli użytkownik ma > 50 ofert

Dodać parametry `page` i `limit` (podobnie jak w `/api/offers`).

### Decyzje projektowe

- **Brak paginacji w MVP**: Zakładamy że użytkownik ma < 100 ofert (rozsądne dla MVP)
- **N+1 problem**: Akceptowalny w MVP (typowo < 20 ofert per user)
- **RLS automatyczne filtrowanie**: Policy `offers_select_active` zapewnia bezpieczeństwo na poziomie DB
- **Sortowanie**: Tylko DESC po created_at (najnowsze najpierw), bez opcji zmiany
- **owner_name**: Zawsze zwracany (użytkownik widzi swoje imię i nazwisko)

### Zgodność z PRD

Endpoint realizuje:

- **US-007**: Użytkownik może przeglądać swoje oferty
- Filtrowanie po statusie: aktywne vs usunięte
- Liczba zainteresowań per oferta (interests_count)

---

Plan zakłada implementację zgodną z db-plan.md, types.ts i backend.mdc. Post-MVP: optymalizacja interests_count przez agregację w DB.
