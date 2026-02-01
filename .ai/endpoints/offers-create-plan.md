# API Endpoint Implementation Plan: Tworzenie oferty — `POST /api/offers`

## 1. Przegląd punktu końcowego

Endpoint `POST /api/offers` umożliwia zalogowanemu użytkownikowi utworzenie nowej oferty wymiany. Oferta jest automatycznie przypisana do użytkownika (owner_id = auth.uid()) i otrzymuje status 'ACTIVE'. Endpoint waliduje wszystkie wymagane pola zgodnie z ograniczeniami bazy danych i zwraca pełne dane utworzonej oferty.

## 2. Szczegóły żądania

- Metoda HTTP: `POST`
- Struktura URL: `/api/offers`
- Nagłówki:
  - `Authorization: Bearer {token}` (wymagany)
  - `Content-Type: application/json`
- Request Body:
  ```json
  {
    "title": "Laptop Dell",
    "description": "Sprawny laptop w bardzo dobrym stanie, wymienię na rower",
    "image_url": "https://...",
    "city": "Warszawa"
  }
  ```

### Parametry Request Body

**Wymagane**:

- `title` (string, 5-100 znaków) — tytuł oferty
- `description` (string, 10-5000 znaków) — szczegółowy opis oferty
- `city` (string, enum) — jedno z 16 miast: 'Warszawa', 'Kraków', 'Wrocław', 'Poznań', 'Gdańsk', 'Szczecin', 'Łódź', 'Lublin', 'Białystok', 'Olsztyn', 'Rzeszów', 'Opole', 'Zielona Góra', 'Gorzów Wielkopolski', 'Kielce', 'Katowice'

**Opcjonalne**:

- `image_url` (string | null, max 2048 znaków) — URL do obrazka w Supabase Storage

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

export const createOfferSchema = z.object({
  title: z
    .string()
    .min(5, 'Tytuł musi mieć co najmniej 5 znaków')
    .max(100, 'Tytuł nie może przekraczać 100 znaków')
    .trim(),
  description: z
    .string()
    .min(10, 'Opis musi mieć co najmniej 10 znaków')
    .max(5000, 'Opis nie może przekraczać 5000 znaków')
    .trim(),
  image_url: z
    .string()
    .url('Nieprawidłowy format URL')
    .max(2048, 'URL nie może przekraczać 2048 znaków')
    .nullable()
    .optional(),
  city: z.enum(ALLOWED_CITIES, {
    errorMap: () => ({ message: 'Nieprawidłowa nazwa miasta. Miasto musi być jednym z 16 dostępnych miast' }),
  }),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
```

## 3. Wykorzystywane typy

Użyj istniejących typów z `src/types.ts`:

- `CreateOfferCommand` — typ dla request body (Pick<OfferInsert, 'title' | 'description' | 'image_url' | 'city'>)
- `CreateOfferResponse` — typ response (OfferDetailDTO & { message?: string })
- `OfferDetailDTO` — pełne dane oferty z polami wyliczanymi (owner_name, interests_count, is_interested)
- `ApiErrorResponse` — struktura błędów

### Mapping typów

```typescript
// Request body → DB Insert
const offerInsert: TablesInsert<'offers'> = {
  title: validatedInput.title,
  description: validatedInput.description,
  image_url: validatedInput.image_url || null,
  city: validatedInput.city,
  owner_id: userId, // z auth.uid()
  status: 'ACTIVE', // domyślny
  // id, created_at - auto-generowane przez DB
};
```

## 4. Szczegóły odpowiedzi

### 201 Created

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "owner_id": "660e8400-e29b-41d4-a716-446655440001",
  "owner_name": "Jan Kowalski",
  "title": "Laptop Dell",
  "description": "Sprawny laptop w bardzo dobrym stanie, wymienię na rower",
  "image_url": "https://example.com/image.jpg",
  "city": "Warszawa",
  "status": "ACTIVE",
  "created_at": "2024-01-01T10:00:00Z",
  "interests_count": 0,
  "is_interested": false,
  "message": "Oferta dodana pomyślnie!"
}
```

### Błędy

- **400 Bad Request** — brak wymaganych pól, nieprawidłowy JSON

  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Nieprawidłowe dane wejściowe",
      "details": { "field": "title" }
    }
  }
  ```

- **401 Unauthorized** — brak/nieprawidłowy token

  ```json
  {
    "error": {
      "code": "UNAUTHORIZED",
      "message": "Brak autoryzacji"
    }
  }
  ```

- **422 Unprocessable Entity** — walidacja długości/formatu

  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Tytuł musi mieć 5-100 znaków",
      "details": { "field": "title", "value": "abc" }
    }
  }
  ```

- **500 Internal Server Error** — błąd serwera/bazy danych
  ```json
  {
    "error": {
      "code": "INTERNAL_ERROR",
      "message": "Wystąpił błąd podczas tworzenia oferty. Spróbuj ponownie później"
    }
  }
  ```

## 5. Przepływ danych

1. **Autoryzacja**: Middleware weryfikuje Bearer token przez Supabase Auth
2. **Parsowanie body**: Odczyt JSON z request body
3. **Walidacja**: Zod schema `createOfferSchema`
   - Sprawdzenie wymaganych pól (title, description, city)
   - Walidacja długości (title 5-100, description 10-5000)
   - Walidacja image_url (format URL, max 2048)
   - Walidacja city (enum z 16 miast)
4. **Service call**: `OfferService.createOffer(userId, validatedInput)`
   - INSERT do tabeli offers z owner_id = userId
   - RLS policy `offers_insert_own` weryfikuje autoryzację
   - DB constraints (CHECK) wykonują dodatkową walidację
5. **Wzbogacenie danych**: Pobranie pełnych danych oferty
   - JOIN z users dla owner_name
   - interests_count = 0 (nowa oferta)
   - is_interested = false (własna oferta)
6. **Response**: JSON z kodem 201 Created

### Kluczowe query DB (Supabase)

```typescript
// 1. Insert oferty
const { data: newOffer, error: insertError } = await supabase
  .from('offers')
  .insert({
    title: input.title,
    description: input.description,
    image_url: input.image_url || null,
    city: input.city,
    owner_id: userId,
    status: 'ACTIVE',
  })
  .select()
  .single();

// 2. Pobranie pełnych danych z owner_name
const { data: offerWithOwner, error: selectError } = await supabase
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
  .eq('id', newOffer.id)
  .single();

// 3. Map do DTO
const response: CreateOfferResponse = {
  id: offerWithOwner.id,
  owner_id: offerWithOwner.owner_id,
  owner_name: offerWithOwner.users
    ? `${offerWithOwner.users.first_name} ${offerWithOwner.users.last_name}`.trim()
    : undefined,
  title: offerWithOwner.title,
  description: offerWithOwner.description,
  image_url: offerWithOwner.image_url,
  city: offerWithOwner.city,
  status: offerWithOwner.status,
  created_at: offerWithOwner.created_at,
  interests_count: 0, // nowa oferta
  is_interested: false, // własna oferta
  message: 'Oferta dodana pomyślnie!',
};
```

## 6. Względy bezpieczeństwa

### Autoryzacja i uwierzytelnianie

- **Bearer token wymagany**: Middleware sprawdza `Authorization` header
- **Session validation**: Supabase Auth weryfikuje token i zwraca user.id
- **owner_id automatyczny**: Wymuszony z auth.uid(), nie może być podany w body

### Row Level Security (RLS)

Z `db-plan.md`:

```sql
-- Tylko właściciel może tworzyć oferty dla siebie
CREATE POLICY offers_insert_own
  ON offers FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
```

### Walidacja danych

- **SQL Injection**: Supabase client automatycznie parametryzuje zapytania
- **XSS Prevention**: image_url walidowany jako prawidłowy URL (nie przechowujemy HTML)
- **Długość stringów**: Zgodna z DB constraints (title 5-100, description 10-5000)
- **City enum**: Tylko z predefiniowanej listy 16 miast
- **Trim input**: Usuwanie białych znaków z title i description

### Database constraints (automatyczne)

```sql
-- Z db-plan.md, tabela offers
CHECK (length(title) >= 5 AND length(title) <= 100)
CHECK (length(description) >= 10 AND length(description) <= 5000)
CHECK (city IN ('Warszawa','Kraków',...)) -- 16 miast
```

### Dodatkowe zabezpieczenia

- **CORS**: Restrykcje do dozwolonych domen (konfiguracja Astro)
- **Rate limiting**: Rozważyć dla POST endpoints (post-MVP)
- **Nie logować**: Token, body request (może zawierać wrażliwe dane)

## 7. Obsługa błędów

| Scenariusz                  | Kod | Error Code       | Komunikat                                                                  |
| --------------------------- | --- | ---------------- | -------------------------------------------------------------------------- |
| Brak body                   | 400 | VALIDATION_ERROR | "Nieprawidłowe dane wejściowe"                                             |
| Brak title                  | 400 | VALIDATION_ERROR | "Pole 'title' jest wymagane"                                               |
| Brak description            | 400 | VALIDATION_ERROR | "Pole 'description' jest wymagane"                                         |
| Brak city                   | 400 | VALIDATION_ERROR | "Pole 'city' jest wymagane"                                                |
| Title < 5 znaków            | 422 | VALIDATION_ERROR | "Tytuł musi mieć co najmniej 5 znaków"                                     |
| Title > 100 znaków          | 422 | VALIDATION_ERROR | "Tytuł nie może przekraczać 100 znaków"                                    |
| Description < 10 znaków     | 422 | VALIDATION_ERROR | "Opis musi mieć co najmniej 10 znaków"                                     |
| Description > 5000 znaków   | 422 | VALIDATION_ERROR | "Opis nie może przekraczać 5000 znaków"                                    |
| City invalid                | 422 | VALIDATION_ERROR | "Nieprawidłowa nazwa miasta. Miasto musi być jednym z 16 dostępnych miast" |
| image_url nieprawidłowy URL | 422 | VALIDATION_ERROR | "Nieprawidłowy format URL"                                                 |
| image_url > 2048 znaków     | 422 | VALIDATION_ERROR | "URL nie może przekraczać 2048 znaków"                                     |
| Brak tokena                 | 401 | UNAUTHORIZED     | "Brak autoryzacji"                                                         |
| Nieprawidłowy token         | 401 | UNAUTHORIZED     | "Nieprawidłowy lub wygasły token"                                          |
| RLS violation               | 403 | FORBIDDEN        | "Brak uprawnień do wykonania tej operacji"                                 |
| DB constraint error         | 500 | INTERNAL_ERROR   | "Wystąpił błąd podczas tworzenia oferty. Spróbuj ponownie później"         |
| Nieoczekiwany błąd          | 500 | INTERNAL_ERROR   | "Wystąpił błąd serwera. Spróbuj ponownie później"                          |

**Logowanie błędów**:

- **400/422**: Nie logować (oczekiwane błędy walidacji)
- **401/403**: Nie logować (oczekiwane błędy autoryzacji)
- **500**: Logować z pełnym stack trace (nieoczekiwane)
- **NIGDY nie logować**: Token, hasła, dane osobowe

## 8. Wydajność

### Oczekiwany czas odpowiedzi

- P50: < 250ms
- P95: < 600ms
- P99: < 1200ms

### Operacje DB

1. **INSERT** — O(1), indeksowane przez PK
2. **SELECT z JOIN** — O(1), lookup po PK + FK

### Wykorzystanie indeksów (z db-plan.md)

```sql
-- Primary key (auto-indexed)
offers(id) — UUID primary key

-- Foreign key index
idx_offers_owner_id ON offers(owner_id) — dla JOIN z users
```

### Optymalizacje

- **Single query**: Użyj `.select()` z INSERT aby uniknąć dodatkowego SELECT
- **No N+1**: interests_count = 0 (hardcoded dla nowej oferty)
- **Atomic operation**: INSERT w jednej transakcji

### Monitoring

- Request rate (POST /api/offers)
- Response time (P50/P95/P99)
- Error rate 4xx/5xx
- DB insert time
- Narzędzia: Supabase Dashboard, Sentry

## 9. Kroki implementacji

### Struktura plików

```
src/
├── pages/api/offers/index.ts        # Dodać metodę POST do istniejącego pliku
├── services/offer.service.ts         # Dodać metodę createOffer()
├── schemas/offers.schema.ts          # Dodać createOfferSchema
└── utils/errors.ts                   # createErrorResponse (istniejący)
```

### 1. Schema (src/schemas/offers.schema.ts)

Dodaj do istniejącego pliku lub utwórz nowy:

```typescript
import { z } from 'zod';

export const ALLOWED_CITIES = [
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

export const createOfferSchema = z.object({
  title: z
    .string({
      required_error: "Pole 'title' jest wymagane",
      invalid_type_error: "Pole 'title' musi być tekstem",
    })
    .min(5, 'Tytuł musi mieć co najmniej 5 znaków')
    .max(100, 'Tytuł nie może przekraczać 100 znaków')
    .trim(),

  description: z
    .string({
      required_error: "Pole 'description' jest wymagane",
      invalid_type_error: "Pole 'description' musi być tekstem",
    })
    .min(10, 'Opis musi mieć co najmniej 10 znaków')
    .max(5000, 'Opis nie może przekraczać 5000 znaków')
    .trim(),

  image_url: z
    .string()
    .url('Nieprawidłowy format URL')
    .max(2048, 'URL nie może przekraczać 2048 znaków')
    .nullable()
    .optional()
    .transform((val) => (val === '' ? null : val)), // empty string → null

  city: z.enum(ALLOWED_CITIES, {
    required_error: "Pole 'city' jest wymagane",
    invalid_type_error: 'Nieprawidłowa nazwa miasta. Miasto musi być jednym z 16 dostępnych miast',
  }),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
```

### 2. Service (src/services/offer.service.ts)

Dodaj metodę do istniejącej klasy `OfferService`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types';
import type { CreateOfferCommand, CreateOfferResponse } from '../types';

export class OfferService {
  constructor(private supabase: SupabaseClient<Database>) {}

  // ... istniejące metody ...

  /**
   * Tworzy nową ofertę dla zalogowanego użytkownika
   * @param userId - ID zalogowanego użytkownika (z auth.uid())
   * @param input - Dane nowej oferty
   * @returns Utworzona oferta z pełnymi danymi
   */
  async createOffer(userId: string, input: CreateOfferCommand): Promise<CreateOfferResponse> {
    // Insert oferty
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

      // Check for RLS violation
      if (insertError.code === '42501') {
        throw new Error('RLS_VIOLATION');
      }

      // Check for constraint violation
      if (insertError.code === '23514') {
        throw new Error('CONSTRAINT_VIOLATION');
      }

      throw new Error('Nie udało się utworzyć oferty');
    }

    if (!newOffer) {
      throw new Error('Nie otrzymano danych utworzonej oferty');
    }

    // Map to response DTO
    const response: CreateOfferResponse = {
      id: newOffer.id,
      owner_id: newOffer.owner_id,
      owner_name: newOffer.users ? `${newOffer.users.first_name} ${newOffer.users.last_name}`.trim() : undefined,
      title: newOffer.title,
      description: newOffer.description,
      image_url: newOffer.image_url,
      city: newOffer.city,
      status: newOffer.status,
      created_at: newOffer.created_at,
      interests_count: 0, // nowa oferta, brak zainteresowań
      is_interested: false, // własna oferta
      message: 'Oferta dodana pomyślnie!',
    };

    return response;
  }
}
```

### 3. API Route (src/pages/api/offers/index.ts)

Dodaj metodę POST do istniejącego pliku (lub utwórz nowy):

```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createOfferSchema } from '../../../schemas/offers.schema';
import { createErrorResponse } from '../../../utils/errors';
import { OfferService } from '../../../services/offer.service';

// Istniejąca metoda GET...

export const POST: APIRoute = async ({ request, locals }) => {
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

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return createErrorResponse('VALIDATION_ERROR', 'Nieprawidłowe dane wejściowe', 400);
    }

    // Validate input
    let validatedInput;
    try {
      validatedInput = createOfferSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        const statusCode = firstError.code === 'too_small' || firstError.code === 'too_big' ? 422 : 400;

        return createErrorResponse('VALIDATION_ERROR', firstError.message, statusCode, {
          field: String(firstError.path[0] || 'unknown'),
          value: body[firstError.path[0]],
        });
      }
      throw error;
    }

    // Call service
    const offerService = new OfferService(supabase);

    let result;
    try {
      result = await offerService.createOffer(userId, validatedInput);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'RLS_VIOLATION') {
          return createErrorResponse('FORBIDDEN', 'Brak uprawnień do wykonania tej operacji', 403);
        }
        if (error.message === 'CONSTRAINT_VIOLATION') {
          return createErrorResponse('VALIDATION_ERROR', 'Dane nie spełniają wymagań bazy danych', 422);
        }
      }
      throw error;
    }

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[CREATE_OFFER_EXCEPTION]', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'Wystąpił błąd podczas tworzenia oferty. Spróbuj ponownie później',
      500,
    );
  }
};
```

### 4. Testowanie

```bash
# Test 1: Poprawne utworzenie oferty
curl -X POST http://localhost:4321/api/offers \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Laptop Dell Latitude",
    "description": "Sprawny laptop w bardzo dobrym stanie, idealny do pracy biurowej",
    "city": "Warszawa",
    "image_url": "https://example.com/laptop.jpg"
  }'
# Oczekiwane: 201 Created

# Test 2: Bez image_url (opcjonalny)
curl -X POST http://localhost:4321/api/offers \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Stary telefon",
    "description": "Działający telefon, wymienię na cokolwiek",
    "city": "Kraków"
  }'
# Oczekiwane: 201 Created

# Test 3: Błąd - title za krótki
curl -X POST http://localhost:4321/api/offers \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "abc",
    "description": "Opis wystarczająco długi",
    "city": "Gdańsk"
  }'
# Oczekiwane: 422 Unprocessable Entity - "Tytuł musi mieć co najmniej 5 znaków"

# Test 4: Błąd - description za krótki
curl -X POST http://localhost:4321/api/offers \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Laptop Dell",
    "description": "Krótki",
    "city": "Poznań"
  }'
# Oczekiwane: 422 Unprocessable Entity - "Opis musi mieć co najmniej 10 znaków"

# Test 5: Błąd - nieprawidłowe miasto
curl -X POST http://localhost:4321/api/offers \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Laptop Dell",
    "description": "Opis wystarczająco długi",
    "city": "Londyn"
  }'
# Oczekiwane: 422 Unprocessable Entity - "Nieprawidłowa nazwa miasta..."

# Test 6: Błąd - brak wymaganego pola
curl -X POST http://localhost:4321/api/offers \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Laptop Dell",
    "description": "Opis wystarczająco długi"
  }'
# Oczekiwane: 400 Bad Request - "Pole 'city' jest wymagane"

# Test 7: Błąd - nieprawidłowy URL
curl -X POST http://localhost:4321/api/offers \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Laptop Dell",
    "description": "Opis wystarczająco długi",
    "city": "Warszawa",
    "image_url": "not-a-url"
  }'
# Oczekiwane: 422 Unprocessable Entity - "Nieprawidłowy format URL"

# Test 8: Błąd - brak autoryzacji
curl -X POST http://localhost:4321/api/offers \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Laptop Dell",
    "description": "Opis wystarczająco długi",
    "city": "Warszawa"
  }'
# Oczekiwane: 401 Unauthorized

# Test 9: Błąd - nieprawidłowy JSON
curl -X POST http://localhost:4321/api/offers \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d 'invalid json'
# Oczekiwane: 400 Bad Request - "Nieprawidłowe dane wejściowe"
```

### 5. Checklist

- [ ] Zod schema `createOfferSchema` z walidacją wszystkich pól
- [ ] ALLOWED_CITIES z 16 miastami jako enum
- [ ] Metoda `createOffer()` w OfferService
- [ ] API route POST `/api/offers` z auth + walidacją
- [ ] owner_id automatycznie z auth.uid() (nie z body)
- [ ] status domyślnie 'ACTIVE'
- [ ] interests_count = 0 dla nowej oferty
- [ ] is_interested = false dla własnej oferty
- [ ] owner_name konkatenowany (first_name + last_name)
- [ ] Obsługa RLS_VIOLATION (403)
- [ ] Obsługa CONSTRAINT_VIOLATION (422)
- [ ] Kod 201 Created dla sukcesu
- [ ] Kod 400 dla brakujących pól
- [ ] Kod 422 dla walidacji długości/formatu
- [ ] Message "Oferta dodana pomyślnie!" w response
- [ ] Komunikaty po polsku
- [ ] Testy manualne przeszły

## 10. Dodatkowe uwagi

### Zgodność z PRD

Endpoint realizuje:

- **US-005**: Użytkownik może dodać nową ofertę wymiany
- Wymagane pola: title, description, city
- Opcjonalny image_url (upload do Supabase Storage osobny endpoint)
- Automatyczny status 'ACTIVE'

### Decyzje projektowe

1. **owner_id z auth context**: Nie może być podany w body, wymuszony z session.user.id
2. **status zawsze 'ACTIVE'**: Przy tworzeniu oferta jest zawsze aktywna (REMOVED tylko przez DELETE/UPDATE)
3. **interests_count = 0**: Nowa oferta, brak potrzeby query do interests
4. **is_interested = false**: Użytkownik nie może być zainteresowany własną ofertą (trigger `prevent_self_interest`)
5. **image_url opcjonalny**: Może być null, upload obrazka to osobny endpoint/flow
6. **Brak paginacji**: Endpoint zwraca pojedynczą ofertę (201 Created)
7. **Trim whitespace**: Automatyczne w Zod schema dla title i description

### Post-MVP rozszerzenia

**Priorytet 1**: Upload obrazka (Supabase Storage)

```typescript
// Osobny endpoint: POST /api/offers/upload-image
// Zwraca: { image_url: string }
// Następnie użytkownik podaje image_url w POST /api/offers
```

**Priorytet 2**: Draft mode

```typescript
// Dodać pole status: 'DRAFT' | 'ACTIVE'
// Oferty DRAFT widoczne tylko dla właściciela
// Publikacja: PATCH /api/offers/:id { status: 'ACTIVE' }
```

**Priorytet 3**: Walidacja image_url

```typescript
// Sprawdzenie czy URL prowadzi do obrazka (HEAD request)
// Weryfikacja czy plik istnieje w Supabase Storage
```

### Integracja z Supabase Storage

Typowy flow dla image_url:

1. Użytkownik wybiera plik w UI
2. Frontend wywołuje `POST /api/offers/upload-image` (multipart/form-data)
3. Backend uploaduje do Supabase Storage bucket 'offer-images'
4. Zwraca public URL: `https://[project].supabase.co/storage/v1/object/public/offer-images/[path]`
5. Frontend używa URL w `POST /api/offers`

Alternatywnie: Direct upload z frontendu do Supabase Storage (z Anon Key).

### Monitorowanie i alerty

Metryki do śledzenia:

- **Success rate**: % ofert utworzonych pomyślnie (target: > 95%)
- **Error rate by type**: 400/422/500
- **Response time**: P50/P95/P99
- **Offers per user**: Średnia liczba ofert per user
- **Popular cities**: Ranking miast (do analizy trendu)

Alerty:

- Error rate > 5% (5xx)
- Response time P95 > 1s
- Spike w 422 errors (może wskazywać na problem z validacją)

---

Plan zakłada implementację zgodną z db-plan.md, types.ts i backend.mdc. Endpoint gotowy do integracji z Supabase Storage dla upload obrazków (post-MVP).
