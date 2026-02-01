# API Endpoint Implementation Plan: Lista aktywnych ofert — `GET /api/offers`

## 1. Przegląd punktu końcowego

Endpoint `GET /api/offers` zwraca paginowaną listę wszystkich aktywnych ofert wymiany. Umożliwia filtrowanie po mieście, sortowanie oraz paginację. Każda oferta zawiera podstawowe informacje oraz dane wyliczane (liczba zainteresowań, imię właściciela).

## 2. Szczegóły żądania

- Metoda HTTP: `GET`
- Struktura URL: `/api/offers`
- Nagłówki:
  - `Authorization: Bearer {token}` (wymagany)
- Parametry (query):
  - `page` (number, default: 1, min: 1)
  - `limit` (number, default: 15, max: 50)
  - `city` (string, optional) — musi być z listy 16 miast
  - `sort` (string, default: "created_at") — wartości: "created_at" | "title"
  - `order` (string, default: "desc") — wartości: "asc" | "desc"

### Walidacja (Zod Schema)

```typescript
import { z } from 'zod';

const ALLOWED_CITIES = [
  'Warszawa',
  'Kraków',
  'Wrocław',
  'Poznań',
  'Gdańsk',
  'Szczecin',
  'Łódź',
  'Lublin',
  'Białystok',
  'Olsztyn',
  'Rzeszów',
  'Opole',
  'Zielona Góra',
  'Gorzów Wielkopolski',
  'Kielce',
  'Katowice',
] as const;

export const offersListQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 15))
    .pipe(z.number().int().min(1).max(50, 'Limit nie może przekraczać 50')),
  city: z
    .string()
    .optional()
    .refine((city) => !city || ALLOWED_CITIES.includes(city as any), { message: 'Nieprawidłowa nazwa miasta' }),
  sort: z.enum(['created_at', 'title']).optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});
```

## 3. Wykorzystywane typy

Użyj istniejących typów z `src/types.ts`:

- `OffersListQuery` — query parameters
- `OfferListItemDTO` — pojedynczy element w response (z `owner_name` i `interests_count`)
- `Paginated<OfferListItemDTO>` — wrapper z `data` i `pagination`
- `ApiErrorResponse` — błędy

## 4. Szczegóły odpowiedzi

### 200 OK

```json
{
  "data": [
    {
      "id": "uuid",
      "owner_id": "uuid",
      "owner_name": "Jan Kowalski",
      "title": "Laptop Dell",
      "description": "Sprawny laptop...",
      "image_url": "https://...",
      "city": "Warszawa",
      "interests_count": 5,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 15,
    "total": 127,
    "total_pages": 9
  }
}
```

### Błędy

- **400 Bad Request** — nieprawidłowe parametry (limit > 50, city nie z listy)
- **401 Unauthorized** — brak/nieprawidłowy token
- **500 Internal Server Error** — błąd serwera

## 5. Przepływ danych

1. **Autoryzacja**: Middleware weryfikuje Bearer token przez Supabase Auth
2. **Walidacja**: Zod schema dla query parameters
3. **Service call**: `OfferService.listOffers(validatedQuery)`
   - Query COUNT dla pagination.total
   - Query główne z JOIN do users dla owner_name
   - Query interests_count dla każdej oferty (N+1 w MVP)
   - Mapowanie na DTO
4. **Response**: JSON z data + pagination

### Kluczowe query DB (Supabase)

```typescript
// Główne query
const { data: offers } = await supabase
  .from('offers')
  .select(
    `
    id, owner_id, title, description, image_url, city, status, created_at,
    users!owner_id (first_name, last_name)
  `,
  )
  .eq('status', 'ACTIVE')
  .eq(city ? 'city' : '', city || '')
  .order(sort, { ascending: order === 'asc' })
  .range((page - 1) * limit, page * limit - 1);

// Interests count per offer
for (const offer of offers) {
  const { count } = await supabase
    .from('interests')
    .select('*', { count: 'exact', head: true })
    .eq('offer_id', offer.id);
  offer.interests_count = count || 0;
}
```

## 6. Względy bezpieczeństwa

- **Autoryzacja**: Bearer token wymagany (middleware)
- **Filtrowanie**: Tylko oferty ze statusem 'ACTIVE' (RLS + endpoint)
- **Walidacja**: City z predefiniowanej listy, limit max 50
- **SQL Injection**: Supabase client automatycznie zabezpiecza
- **DoS Protection**: Max limit 50, rozważyć rate limiting
- **CORS**: Restrykcje do dozwolonych domen

## 7. Obsługa błędów

| Scenariusz   | Kod | Error Code       | Komunikat                                |
| ------------ | --- | ---------------- | ---------------------------------------- |
| Limit > 50   | 400 | VALIDATION_ERROR | "Limit nie może przekraczać 50"          |
| Page < 1     | 400 | VALIDATION_ERROR | "Numer strony musi być >= 1"             |
| City invalid | 400 | VALIDATION_ERROR | "Nieprawidłowa nazwa miasta"             |
| Brak tokena  | 401 | UNAUTHORIZED     | "Brak autoryzacji"                       |
| Błąd DB      | 500 | INTERNAL_ERROR   | "Wystąpił błąd podczas pobierania ofert" |

**Logowanie**: Tylko błędy 500 i nieoczekiwane wyjątki. Nie logować tokenów.

## 8. Wydajność

### Oczekiwany czas odpowiedzi

- P50: < 300ms
- P95: < 800ms
- P99: < 1500ms

### Wąskie gardła

**N+1 Problem dla interests_count**:

- MVP: Osobne query per oferta (15-50 queries)
- Post-MVP: Materialized view lub LEFT JOIN z agregacją

### Wykorzystanie indeksów (z db-plan.md)

```sql
-- Dla filtrowania z city
idx_offers_city_status_created ON offers(city, status, created_at DESC)

-- Dla sortowania bez city
idx_offers_status_created ON offers(status, created_at DESC)
```

**Brakujący indeks dla sort=title**:

```sql
CREATE INDEX idx_offers_status_title ON offers(status, title);
```

### Monitoring

- Request rate, response time (P50/P95/P99)
- Error rate, DB query time
- Narzędzia: Supabase Dashboard, Sentry

## 9. Kroki implementacji

### Struktura plików

```
src/
├── pages/api/offers/index.ts    # API route
├── services/offer.service.ts     # Business logic
├── schemas/offers.schema.ts      # Zod schemas
└── utils/errors.ts               # createErrorResponse (istniejący)
```

### 1. Schema (src/schemas/offers.schema.ts)

```typescript
import { z } from 'zod';

export const ALLOWED_CITIES = [
  /* 16 miast */
] as const;

export const offersListQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 15))
    .pipe(z.number().int().min(1).max(50)),
  city: z
    .string()
    .optional()
    .refine((city) => !city || ALLOWED_CITIES.includes(city as any), { message: 'Nieprawidłowa nazwa miasta' }),
  sort: z.enum(['created_at', 'title']).optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});
```

### 2. Service (src/services/offer.service.ts)

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types';
import type { Paginated, OfferListItemDTO, OffersListQuery } from '../types';

export class OfferService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async listOffers(query: OffersListQuery): Promise<Paginated<OfferListItemDTO>> {
    const { page = 1, limit = 15, city, sort = 'created_at', order = 'desc' } = query;

    // Base queries
    let countQuery = this.supabase.from('offers').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE');

    let dataQuery = this.supabase
      .from('offers')
      .select(
        'id, owner_id, title, description, image_url, city, status, created_at, users!owner_id(first_name, last_name)',
      )
      .eq('status', 'ACTIVE');

    // City filter
    if (city) {
      countQuery = countQuery.eq('city', city);
      dataQuery = dataQuery.eq('city', city);
    }

    // Sort & pagination
    dataQuery = dataQuery.order(sort, { ascending: order === 'asc' }).range((page - 1) * limit, page * limit - 1);

    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

    if (countResult.error || dataResult.error) {
      throw new Error('Nie udało się pobrać ofert');
    }

    const offers = dataResult.data || [];
    const total = countResult.count || 0;

    // Interests count (N+1 - optymalizacja post-MVP)
    const offersWithCounts = await Promise.all(
      offers.map(async (offer) => {
        const { count } = await this.supabase
          .from('interests')
          .select('*', { count: 'exact', head: true })
          .eq('offer_id', offer.id);
        return { ...offer, interests_count: count || 0 };
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
}
```

### 3. API Route (src/pages/api/offers/index.ts)

```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { offersListQuerySchema } from '../../../schemas/offers.schema';
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

    // Parse & validate query params
    const searchParams = Object.fromEntries(url.searchParams.entries());
    let validatedQuery;

    try {
      validatedQuery = offersListQuerySchema.parse(searchParams);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return createErrorResponse('VALIDATION_ERROR', firstError.message, 400, {
          field: String(firstError.path[0] || 'unknown'),
        });
      }
      throw error;
    }

    // Call service
    const offerService = new OfferService(supabase);
    const result = await offerService.listOffers(validatedQuery);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[OFFERS_LIST_EXCEPTION]', error);
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
# Test 1: Domyślne parametry
curl -H "Authorization: Bearer TOKEN" http://localhost:4321/api/offers

# Test 2: Filtrowanie po mieście
curl -H "Authorization: Bearer TOKEN" "http://localhost:4321/api/offers?city=Warszawa"

# Test 3: Sortowanie + paginacja
curl -H "Authorization: Bearer TOKEN" "http://localhost:4321/api/offers?sort=title&order=asc&page=2&limit=20"

# Test 4: Błąd walidacji
curl -H "Authorization: Bearer TOKEN" "http://localhost:4321/api/offers?limit=100"
# Oczekiwane: 400 Bad Request

# Test 5: Brak autoryzacji
curl http://localhost:4321/api/offers
# Oczekiwane: 401 Unauthorized
```

### 5. Checklist

- [ ] Zod schema z 16 miastami
- [ ] OfferService z N+1 queries (MVP)
- [ ] API route z auth + walidacją
- [ ] Tylko ACTIVE oferty
- [ ] Limit max 50 wymuszony
- [ ] owner_name konkatenowany
- [ ] interests_count dla każdej oferty
- [ ] Paginacja poprawnie obliczona
- [ ] Komunikaty po polsku
- [ ] Testy manualne przeszły

## 10. Dodatkowe uwagi

### Post-MVP optymalizacje

**Priorytet 1**: Agregacja interests_count w DB (materialized view)

```sql
CREATE MATERIALIZED VIEW offers_with_counts AS
SELECT o.*, COUNT(i.id) as interests_count,
       u.first_name || ' ' || u.last_name as owner_name
FROM offers o
LEFT JOIN interests i ON o.id = i.offer_id
LEFT JOIN users u ON o.owner_id = u.id
WHERE o.status = 'ACTIVE'
GROUP BY o.id, u.first_name, u.last_name;
```

**Priorytet 2**: Indeks dla sort=title

```sql
CREATE INDEX idx_offers_status_title ON offers(status, title);
```

### Decyzje projektowe

- **N+1 problem**: Akceptowalny w MVP (< 50 ofert per page), optymalizacja później
- **Paginacja**: OFFSET-based (prosta), cursor-based w przyszłości
- **Cache**: Nie w MVP (dane często się zmieniają)
- **RLS**: Policy `offers_select_active` automatycznie filtruje przez Supabase

---

Plan zakłada implementację zgodną z db-plan.md, types.ts i backend.mdc. Post-MVP: optymalizacja interests_count i dodanie cache.
