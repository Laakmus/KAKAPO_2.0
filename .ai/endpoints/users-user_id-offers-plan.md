# API Endpoint Implementation Plan: Lista ofert użytkownika — `GET /api/users/{user_id}/offers`

## 1. Przegląd punktu końcowego

Endpoint `GET /api/users/{user_id}/offers` zwraca listę aktywnych ofert innego użytkownika (nie zalogowanego). Wyświetla tylko oferty ze statusem `ACTIVE` (ukrywa usunięte). Służy do przeglądania ofert innych użytkowników w kontekście ich profilu.

## 2. Szczegóły żądania

- Metoda HTTP: `GET`
- Struktura URL: `/api/users/{user_id}/offers`
- Nagłówki:
  - `Authorization: Bearer {token}` (wymagany)
- Parametry:
  - Path parameter: `user_id` (UUID, wymagany)
  - Query parameters: brak

### Walidacja (Zod Schema)

```typescript
import { z } from 'zod';

export const userIdParamSchema = z.object({
  user_id: z.string().uuid({ message: 'Nieprawidłowy format ID użytkownika' }),
});
```

## 3. Wykorzystywane typy

Użyj typów z `src/types.ts`:

- `OfferListItemDTO` — pojedyncza oferta w response (uproszczona wersja bez `interests_count` zgodnie ze specyfikacją)
- `ApiErrorResponse` — struktura błędów

### Response Type

```typescript
type UserOffersResponse = {
  data: Array<Pick<OfferListItemDTO, 'id' | 'title' | 'description' | 'image_url' | 'city' | 'created_at'>>;
};
```

**Uwaga**: Specyfikacja API nie wymaga `interests_count` dla tego endpointu (w przeciwieństwie do `/api/offers/my`). Upraszcza to implementację i chroni prywatność danych o zainteresowaniach.

## 4. Szczegóły odpowiedzi

### 200 OK

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Rower górski",
      "description": "Rower w dobrym stanie...",
      "image_url": "https://...",
      "city": "Kraków",
      "created_at": "2024-01-01T10:00:00Z"
    },
    {
      "id": "uuid2",
      "title": "Książka fantasy",
      "description": "Trylogia w idealnym stanie",
      "image_url": null,
      "city": "Kraków",
      "created_at": "2023-12-20T15:45:00Z"
    }
  ]
}
```

### Błędy

- **400 Bad Request** — nieprawidłowy format UUID w `user_id`
- **401 Unauthorized** — brak/nieprawidłowy token autoryzacji
- **404 Not Found** — użytkownik o podanym ID nie istnieje
- **500 Internal Server Error** — błąd serwera

## 5. Przepływ danych

1. **Autoryzacja**: Middleware weryfikuje Bearer token przez Supabase Auth
2. **Walidacja**: Zod schema dla path parameter `user_id` (UUID)
3. **Sprawdzenie użytkownika**: Weryfikacja czy użytkownik o ID `user_id` istnieje w tabeli `users`
4. **Service call**: `OfferService.getUserOffers(userId)`
   - Query filtrujące WHERE owner_id = user_id AND status = 'ACTIVE'
   - Brak JOIN do interests (nie zwracamy interests_count)
   - Mapowanie na uproszczony DTO
5. **Response**: JSON z tablicą `data`

### Kluczowe query DB (Supabase)

```typescript
// 1. Sprawdź czy użytkownik istnieje
const { data: user, error: userError } = await supabase.from('users').select('id').eq('id', userId).single();

if (userError || !user) {
  throw new Error('USER_NOT_FOUND');
}

// 2. Pobierz aktywne oferty użytkownika
const { data: offers, error } = await supabase
  .from('offers')
  .select('id, title, description, image_url, city, created_at')
  .eq('owner_id', userId)
  .eq('status', 'ACTIVE')
  .order('created_at', { ascending: false });
```

## 6. Względy bezpieczeństwa

- **Autoryzacja**: Bearer token wymagany (tylko zalogowani użytkownicy mogą przeglądać oferty)
- **Prywatność**: Tylko oferty ACTIVE (ukrywa usunięte oferty użytkownika)
- **Brak interests_count**: Chroni prywatność - inni użytkownicy nie widzą popularności ofert
- **RLS Policy**: `offers_select_active` zapewnia dostęp tylko do aktywnych ofert
- **Walidacja UUID**: Zapobiega injection attacks i nieprawidłowym zapytaniom
- **Sprawdzenie istnienia użytkownika**: 404 zamiast 200 z pustą tablicą (security best practice)

## 7. Obsługa błędów

| Scenariusz                 | Kod | Error Code       | Komunikat                                                          |
| -------------------------- | --- | ---------------- | ------------------------------------------------------------------ |
| user_id nieprawidłowy UUID | 400 | VALIDATION_ERROR | "Nieprawidłowy format ID użytkownika"                              |
| Brak tokena                | 401 | UNAUTHORIZED     | "Brak autoryzacji"                                                 |
| Nieprawidłowy token        | 401 | UNAUTHORIZED     | "Nieprawidłowy lub wygasły token"                                  |
| Użytkownik nie istnieje    | 404 | USER_NOT_FOUND   | "Użytkownik nie został znaleziony"                                 |
| Błąd DB                    | 500 | INTERNAL_ERROR   | "Wystąpił błąd podczas pobierania ofert. Spróbuj ponownie później" |

**Logowanie**:

- Błędy 404: INFO level (normalne sytuacje)
- Błędy 500 i nieoczekiwane wyjątki: ERROR level
- Nie logować tokenów ani danych użytkownika

## 8. Wydajność

### Oczekiwany czas odpowiedzi

- P50: < 150ms
- P95: < 400ms
- P99: < 800ms

### Optymalizacje

**Zalety tego endpointu**:

- Brak N+1 problem (nie liczymy interests_count)
- Proste query bez JOIN i agregacji
- Szybsze niż `/api/offers/my`

### Wykorzystanie indeksów (z db-plan.md)

```sql
-- Wykorzystywany indeks
idx_offers_owner_status ON offers(owner_id, status)

-- Zapewnia szybkie filtrowanie aktywnych ofert właściciela
```

### Cache (Post-MVP)

```typescript
// Redis cache dla popularnych użytkowników
const cacheKey = `user_offers:${userId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// ... fetch from DB ...

await redis.setex(cacheKey, 300, JSON.stringify(offers)); // 5 min TTL
```

### Monitoring

- Request rate per user_id (wykrywanie abuse)
- Response time P50/P95/P99
- Error rate 404 vs 500
- Narzędzia: Supabase Dashboard, Sentry

## 9. Kroki implementacji

### Struktura plików

```
src/
├── pages/api/users/[user_id]/offers.ts   # API route (nowy plik + folder)
├── services/offer.service.ts              # Dodać metodę getUserOffers()
├── schemas/offers.schema.ts               # Dodać userIdParamSchema
└── utils/errors.ts                        # createErrorResponse (istniejący)
```

### 1. Schema (src/schemas/offers.schema.ts)

Dodaj do istniejącego pliku:

```typescript
import { z } from 'zod';

// ... istniejące schematy ...

export const userIdParamSchema = z.object({
  user_id: z.string().uuid({ message: 'Nieprawidłowy format ID użytkownika' }).describe('UUID użytkownika'),
});
```

### 2. Service (src/services/offer.service.ts)

Dodaj metodę do istniejącej klasy `OfferService`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types';

export class OfferService {
  constructor(private supabase: SupabaseClient<Database>) {}

  // ... istniejące metody ...

  /**
   * Pobiera listę aktywnych ofert innego użytkownika
   * @param userId - ID użytkownika którego oferty pobieramy
   * @returns Lista aktywnych ofert (bez interests_count dla prywatności)
   * @throws Error z kodem 'USER_NOT_FOUND' jeśli użytkownik nie istnieje
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
    // 1. Sprawdź czy użytkownik istnieje
    const { data: user, error: userError } = await this.supabase.from('users').select('id').eq('id', userId).single();

    if (userError || !user) {
      const error = new Error('Użytkownik nie został znaleziony');
      (error as any).code = 'USER_NOT_FOUND';
      throw error;
    }

    // 2. Pobierz aktywne oferty użytkownika (bez interests_count)
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

    return offers || [];
  }
}
```

### 3. API Route (src/pages/api/users/[user_id]/offers.ts)

Nowy plik (wymaga utworzenia struktury folderów):

```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { userIdParamSchema } from '../../../../schemas/offers.schema';
import { createErrorResponse } from '../../../../utils/errors';
import { OfferService } from '../../../../services/offer.service';

export const GET: APIRoute = async ({ params, locals }) => {
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

    // Validate path parameter
    let validatedParams;
    try {
      validatedParams = userIdParamSchema.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return createErrorResponse('VALIDATION_ERROR', firstError.message, 400, {
          field: String(firstError.path[0] || 'user_id'),
        });
      }
      throw error;
    }

    const { user_id } = validatedParams;

    // Call service
    const offerService = new OfferService(supabase);

    try {
      const offers = await offerService.getUserOffers(user_id);

      return new Response(JSON.stringify({ data: offers }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      // Handle USER_NOT_FOUND specifically
      if (error.code === 'USER_NOT_FOUND' || error.message?.includes('nie został znaleziony')) {
        return createErrorResponse('USER_NOT_FOUND', 'Użytkownik nie został znaleziony', 404);
      }
      throw error; // Re-throw dla globalnego error handlera
    }
  } catch (error) {
    console.error('[USER_OFFERS_EXCEPTION]', error);
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
# Test 1: Poprawne pobranie ofert użytkownika
USER_ID="valid-uuid-here"
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:4321/api/users/$USER_ID/offers"
# Oczekiwane: 200 OK z listą aktywnych ofert

# Test 2: Użytkownik bez ofert (ale istniejący)
USER_ID="user-without-offers-uuid"
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:4321/api/users/$USER_ID/offers"
# Oczekiwane: 200 OK z { "data": [] }

# Test 3: Użytkownik nie istnieje
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:4321/api/users/00000000-0000-0000-0000-000000000000/offers"
# Oczekiwane: 404 Not Found

# Test 4: Nieprawidłowy UUID
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:4321/api/users/invalid-uuid/offers"
# Oczekiwane: 400 Bad Request

# Test 5: Brak autoryzacji
curl "http://localhost:4321/api/users/$USER_ID/offers"
# Oczekiwane: 401 Unauthorized

# Test 6: Sprawdź że REMOVED oferty są ukryte
# 1. Utwórz ofertę przez innego użytkownika
# 2. Oznacz ją jako REMOVED
# 3. Wykonaj request - oferta nie powinna być widoczna
```

### 5. Checklist

- [ ] Zod schema `userIdParamSchema` w offers.schema.ts
- [ ] Metoda `getUserOffers()` w OfferService
- [ ] Sprawdzanie istnienia użytkownika (404 jeśli nie istnieje)
- [ ] API route `/api/users/[user_id]/offers.ts` z dynamic routing
- [ ] Filtrowanie owner_id = user_id AND status = 'ACTIVE'
- [ ] Brak interests_count w response (zgodnie ze specyfikacją)
- [ ] Sortowanie DESC po created_at
- [ ] Obsługa błędu 404 dla nieistniejącego użytkownika
- [ ] Komunikaty błędów po polsku
- [ ] Testy manualne przeszły (w tym 404 i 400)

## 10. Dodatkowe uwagi

### Różnice względem `/api/offers/my`

| Aspekt           | /api/offers/my        | /api/users/{user_id}/offers |
| ---------------- | --------------------- | --------------------------- |
| Właściciel       | auth.uid()            | {user_id} (path param)      |
| Statusy          | ACTIVE, REMOVED       | tylko ACTIVE                |
| interests_count  | TAK                   | NIE (prywatność)            |
| owner_name       | TAK                   | NIE (znany z kontekstu)     |
| Paginacja        | NIE (MVP)             | NIE                         |
| Sprawdzenie user | NIE (zawsze istnieje) | TAK (404 jeśli brak)        |

### Post-MVP optymalizacje

**Priorytet 1**: Cache dla popularnych użytkowników

```typescript
// Redis/Upstash cache z TTL 5 min
const cacheKey = `user:${userId}:offers:active`;
```

**Priorytet 2**: Paginacja jeśli użytkownik ma > 50 ofert

Dodać query params `page` i `limit`.

**Priorytet 3**: Opcjonalne interests_count

Dodać query param `?include_stats=true` dla frontendów które potrzebują tej informacji.

### Decyzje projektowe

- **Brak interests_count**: Świadomy wybór dla prywatności (zgodnie ze specyfikacją API)
- **404 vs 200 z []**: 404 dla nieistniejącego użytkownika (lepsze UX, wykrycie błędów)
- **Tylko ACTIVE**: Ukrywa historię użytkownika (REMOVED oferty prywatne)
- **Brak owner_name**: Kontekst użytkownika znany z URL/poprzedniej nawigacji
- **Sortowanie**: Tylko DESC po created_at (najnowsze najpierw)

### Zgodność z PRD

Endpoint realizuje:

- **US-024**: Przeglądanie ofert innego użytkownika (z profilu użytkownika)
- Wyświetlanie tylko aktywnych ofert
- Prywatność: ukrycie usunięch ofert i statystyk zainteresowań

### Security Considerations

**Dlaczego sprawdzamy istnienie użytkownika?**

1. Lepsze UX (404 vs 200 z pustą listą)
2. Security przez obscurity (nie ujawniamy czy UUID jest w systemie przy braku ofert)
3. Zapobiega enumeration attacks (rate limit na 404)

**Rate limiting (Post-MVP)**:

```typescript
// Ogranicz do 100 req/min per IP dla tego endpointu
// Zapobiega enumeration attacks na user_id
```

---

Plan zakłada implementację zgodną z db-plan.md, types.ts i backend.mdc. Uproszczona wersja bez interests_count dla ochrony prywatności użytkowników.
