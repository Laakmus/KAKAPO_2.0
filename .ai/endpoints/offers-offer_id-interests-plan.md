# API Endpoint Implementation Plan: Lista zainteresowanych dla oferty

## 1. Przegląd punktu końcowego

Endpoint zwraca listę zainteresowań (`interests`) przypisanych do konkretnej oferty (`offer_id`). Tylko właściciel oferty ma prawo odczytu tej listy. Punkt końcowy służy do przeglądania użytkowników, którzy zgłosili zainteresowanie ofertą — przydatne w workflowie akceptacji/ofertach.

## 2. Szczegóły żądania

- Metoda HTTP: `GET`
- Struktura URL: `/api/offers/{offer_id}/interests`

- Nagłówki:
  - `Authorization: Bearer {access_token}` (wymagane)
  - `Content-Type: application/json`

- Parametry:
  - Wymagane:
    - `offer_id` (path param) — UUID oferty
  - Opcjonalne (zalecane do implementacji od razu):
    - `page` (query) — numer strony (int, domyślnie 1)
    - `limit` (query) — liczba elementów na stronę (int, domyślnie 20, max 100)
    - `status` (query) — filtr po statusie zainteresowania (PROPOSED, ACCEPTED, REALIZED)

- Request Body: brak (GET)

## 3. Wykorzystywane typy

- Z `src/types.ts`:
  - `InterestListItemDTO` — element listy zainteresowań (id, offer_id, user_id, status, created_at, user_name)
  - `MyInterestDTO` / `InterestRow` — referencje przy potrzebie dopasowania pól
  - `ApiErrorResponse` — ujednolicony payload błędu

- Nowe / pomocnicze typy (na potrzeby endpointu):

```typescript
// src/pages/offers/types.ts (przykład)
type OffersInterestsQuery = {
  offer_id: string;
  page?: number;
  limit?: number;
  status?: 'PROPOSED' | 'ACCEPTED' | 'REALIZED';
};
```

## 4. Szczegóły odpowiedzi

- 200 OK
  - Body:

  ```json
  {
    "data": [
      {
        "id": "uuid",
        "offer_id": "uuid",
        "user_id": "uuid",
        "user_name": "Anna Nowak",
        "status": "PROPOSED",
        "created_at": "2024-01-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "total_pages": 3
    }
  }
  ```

- 400 Bad Request — nieprawidłowy `offer_id` (nie UUID) lub nieprawidłowe query params
- 401 Unauthorized — brak/nieprawidłowy token autoryzacji
- 403 Forbidden — użytkownik nie jest właścicielem oferty (brak uprawnień)
- 404 Not Found — oferta o podanym `offer_id` nie istnieje
- 429 Too Many Requests — rate limiting
- 500 Internal Server Error — nieoczekiwany błąd serwera

## 5. Przepływ danych

1. Autoryzacja: middleware (np. `src/middleware/index.ts`) dekoduje token i ustawia `locals.supabase` oraz `locals.user` / `auth.uid()` (zgodnie z projektem).
2. Walidacja wejścia:
   - Waliduj `offer_id` jako UUID.
   - Waliduj `page` i `limit` (liczby całkowite, limit maks. 100).
3. Sprawdzenie istnienia oferty i właściciela:
   - Zapytanie do `offers` aby pobrać `owner_id` dla `offer_id`.
   - Jeśli brak wpisu → 404.
   - Jeśli `owner_id !== auth.uid()` → 403.
   - Uwaga: można również polegać na RLS (ale nadal należy weryfikować is_owner dla lepszych komunikatów i krótkiego zapytania).
4. Pobranie listy zainteresowań:
   - Paginowane zapytanie do `interests` z warunkiem `offer_id = :offer_id` oraz opcjonalnym filtrem `status`.
   - JOIN (lub dodatkowe zapytanie) do `auth.users`/`users` aby pobrać `user_name` (first_name + last_name).
   - Zwrócić wynik wraz z meta pagination.

Przykładowe zapytanie (pseudokod / SQL logic):

```sql
SELECT i.id, i.offer_id, i.user_id, i.status, i.created_at,
       u.first_name || ' ' || u.last_name AS user_name
FROM interests i
JOIN users u ON u.id = i.user_id
WHERE i.offer_id = $1
  AND ($2::text IS NULL OR i.status = $2)
ORDER BY i.created_at DESC
LIMIT $3 OFFSET $4;
```

W implementacji Node/Ts użyć Supabase client (parameterized API) albo query builder, nie interpolować stringów.

## 6. Względy bezpieczeństwa

- Autentykacja: wymaga ważnego JWT (Supabase Auth). Token sprawdzany w middleware.
- Autoryzacja: tylko właściciel oferty (owner_id === auth.uid()) może odczytać listę — wymóg wymuszać w kodzie i/lub polegać na RLS.
- RLS: upewnić się, że `interests_select_related` policy z `db-plan.md` pozwala właścicielowi oferty odczyt; endpoint powinien działać zgodnie z RLS.
- Zapobieganie wyciekom prywatnych danych: zwracać minimalne pola; nie zwracać e-maili ani tajnych pól.
- Rate limiting: zastosować ograniczenie (np. 60 req/min per user or 10/min for sensitive ops) — implementacja w middleware lub infra (reverse proxy).
- Input validation: zapobiegać niepoprawnym UUID, atakom typu injection (używać parametrów).
- Logging: nie logować tokenów/hasła. Zdarzenia odmowy dostępu można zapisywać do `audit_logs` (opcjonalnie) z `actor_id = auth.uid()` i payload zawierającym `offer_id`, ip, timestamp.

## 7. Obsługa błędów

- Walidacja:
  - 400 → zwrócić `ApiErrorResponse` z code: `VALIDATION_ERROR`.
- Brak autoryzacji / brak tokena:
  - 401 → `UNAUTHORIZED`.
- Brak uprawnień:
  - 403 → `FORBIDDEN`, message: "Brak uprawnień do przeglądania zainteresowań".
- Nie znaleziono oferty:
  - 404 → `NOT_FOUND`.
- Rate limit:
  - 429 → `RATE_LIMIT_EXCEEDED`.
- Błędy wewnętrzne:
  - 500 → `INTERNAL_ERROR`, logować do Sentry/console i zwrócić ujednolicony błąd.

Przykład ujednoliconego błędu:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Brak uprawnień do przeglądania zainteresowań"
  }
}
```

## 8. Rozważania dotyczące wydajności

- Indeksy: upewnić się, że istnieją indeksy `idx_interests_offer_id` oraz `idx_interests_status` (są w `db-plan.md`).
- Paginacja ključem (keyset) preferowana przy dużej ilości danych — początkowo implementacja offset/limit jest akceptowalna; w przyszłości przejść na keyset (cursor) dla lepszej skali.
- Limit per-page (domyślnie 20, max 100) by unikać dużych odpowiedzi.
- JOIN do `users` powinien korzystać z indeksu na `users.id`.
- Cache: rozważyć krótkoterminowy cache poziomu aplikacji dla statycznych metadanych (np. count) ale nie cache'ować wrażliwych list bez sprawdzenia uprawnień.

## 9. Etapy wdrożenia

1. Przygotowanie TODO i środowiska (env vars, lokalny Supabase) — weryfikacja `locals.supabase` w `src/middleware/index.ts`.
2. Dodać Zod schema walidującą `offer_id`, `page`, `limit`, `status`:

```typescript
// src/schemas/offers.schema.ts
import { z } from 'zod';
export const listInterestsSchema = z.object({
  offer_id: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PROPOSED', 'ACCEPTED', 'REALIZED']).optional(),
});
```

3. Implementacja API route:
   - Plik: `src/pages/api/offers/[offer_id]/interests.ts` lub `src/pages/offers/[offer_id]/interests.ts` (zgodnie ze strukturą projektu).
   - Kroki w handlerze:
     a. Parsowanie i walidacja query/path za pomocą `listInterestsSchema`.
     b. Pobranie `supabase` z `locals` i `auth.uid()`.
     c. Pobranie `owner_id` z `offers` (SELECT owner_id WHERE id = offer_id).
     d. Jeśli brak oferty → 404.
     e. Jeśli `owner_id !== auth.uid()` → 403.
     f. Wykonanie zapytania do `interests` (paginacja + optional status) i join na `users` by uzyskać `user_name`.
     g. Złożenie odpowiedzi `data` + `pagination`.
     h. Obsługa błędów i zwrot `ApiErrorResponse`.

4. Testy manualne i integracyjne:
   - Test 200: właściciel pobiera listę.
   - Test 403: inny użytkownik próbuje odczytać.
   - Test 404: nieistniejące `offer_id`.
   - Test 400: nieprawidłowe `offer_id` / limit.
5. Dodanie metric/eventów: logowanie odmów dostępu do `audit_logs` (opcjonalne) i error capture do Sentry.
6. Review kodu i merge.
7. Deployment i smoke tests (staging).

## 10. Przykładowa implementacja (fragment TypeScript)

```typescript
// src/pages/api/offers/[offer_id]/interests.ts (schemat)
import type { APIRoute } from 'astro';
import { listInterestsSchema } from '../../../../schemas/offers.schema';
import { createErrorResponse } from '../../../../utils/errors';

export const GET: APIRoute = async ({ params, request, locals }) => {
  // 1. Validate
  // 2. Check auth and owner
  // 3. Query interests join users
  // 4. Return paginated result
};
```

Uwaga: powyższy fragment jest szkicem — dokładna implementacja powinna korzystać z `locals.supabase` i typów z `src/types.ts`.

---

Plik zapisany: `.ai/endpoints/offers-offer_id-interests-plan.md`
