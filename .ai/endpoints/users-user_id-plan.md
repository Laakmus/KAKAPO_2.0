# API Endpoint Implementation Plan: GET /api/users/{user_id}

## 1. Przegląd punktu końcowego

Endpoint `GET /api/users/{user_id}` umożliwia pobranie publicznego profilu dowolnego użytkownika w systemie. Zwraca podstawowe informacje: imię, nazwisko oraz liczbę aktywnych ofert użytkownika. Jest to endpoint do przeglądania profili innych użytkowników (np. przy wyświetlaniu szczegółów oferty lub czatu). Wymaga autoryzacji aby upewnić się, że żądanie pochodzi od zalogowanego użytkownika.

**Główne wymagania:**

- Metoda: `GET`
- Ścieżka: `/api/users/{user_id}`
- Zwraca 200 z danymi publicznymi użytkownika lub 404 gdy użytkownik nie istnieje

## 2. Szczegóły żądania

- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/users/{user_id}`
  - Przykład: `/api/users/550e8400-e29b-41d4-a716-446655440000`

- **Nagłówki**:
  - Wymagane: `Authorization: Bearer {token}`

- **Parametry**:
  - Wymagane:
    - `user_id` (path parameter) — UUID użytkownika którego profil chcemy pobrać
    - Token w nagłówku `Authorization` (Bearer)
  - Opcjonalne: brak

- **Request Body**: brak (GET)

### Walidacja parametru `user_id`

```typescript
import { z } from 'zod';

export const userIdParamSchema = z.object({
  user_id: z.string().uuid('Nieprawidłowy format ID użytkownika'),
});
```

## 3. Wykorzystywane typy (DTOs i Command Modele)

- **`PublicUserDTO`** (już istnieje w `src/types.ts`):

```typescript
type PublicUserDTO = {
  id: string;
  first_name: string;
  last_name: string;
  active_offers_count: number;
};
```

- **`GetUserByIdQuery`** (wewnętrzny typ dla service):

```typescript
type GetUserByIdQuery = {
  userId: string;
  requesterId?: string; // opcjonalnie dla audytu
};
```

## 4. Szczegóły odpowiedzi

### 200 OK (sukces)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "first_name": "Anna",
  "last_name": "Nowak",
  "active_offers_count": 3
}
```

**Opis pól:**

- `id` — UUID użytkownika
- `first_name` — Imię użytkownika (VARCHAR(100))
- `last_name` — Nazwisko użytkownika (VARCHAR(100))
- `active_offers_count` — Liczba aktywnych ofert użytkownika (obliczane dynamicznie)

### Błędy

- **400 Bad Request** — nieprawidłowy format `user_id`

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Nieprawidłowy format ID użytkownika",
    "details": { "field": "user_id" }
  }
}
```

- **401 Unauthorized** — brak lub nieprawidłowy token

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Brak autoryzacji"
  }
}
```

- **404 Not Found** — użytkownik nie istnieje

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Użytkownik nie istnieje"
  }
}
```

- **500 Internal Server Error** — błąd serwera

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Wystąpił błąd podczas pobierania profilu użytkownika"
  }
}
```

## 5. Przepływ danych

1. **Odbiór żądania**: Astro API route odbiera GET na `/api/users/{user_id}`, wyciąga parametr `user_id` z URL.

2. **Autoryzacja** (middleware):
   - Sprawdza obecność nagłówka `Authorization`
   - Weryfikuje token (Supabase Auth)
   - Wyciąga `userId` z tokena (requesterId) i przekazuje do `locals`
   - **Jeśli błąd**: Zwrot 401 Unauthorized

3. **Walidacja parametru `user_id`**:
   - Sprawdzenie czy `user_id` jest poprawnym UUID
   - **Jeśli błąd**: Zwrot 400 Bad Request

4. **Wywołanie UserService**:

   ```typescript
   const profile = await userService.getPublicProfile(user_id);
   ```

   **UserService.getPublicProfile wykonuje:**
   - Zapytanie do tabeli `users` z JOIN do zliczenia ofert:

   ```sql
   SELECT
     u.id,
     u.first_name,
     u.last_name,
     COUNT(CASE WHEN o.status = 'ACTIVE' THEN 1 END) as active_offers_count
   FROM users u
   LEFT JOIN offers o ON o.owner_id = u.id
   WHERE u.id = $1
   GROUP BY u.id, u.first_name, u.last_name;
   ```

   - Mapowanie wyniku na `PublicUserDTO`
   - Zwrot DTO lub `null` jeśli użytkownik nie istnieje

5. **Obsługa wyniku**:
   - **Jeśli `profile === null`**: Zwrot 404 Not Found
   - **Jeśli sukces**: Zwrot 200 OK z `PublicUserDTO`

6. **Zwrot odpowiedzi**: JSON z danymi użytkownika lub odpowiedni błąd HTTP.

## 6. Względy bezpieczeństwa

### Autoryzacja

- **Wymagaj tokena**: Endpoint wymaga autoryzacji mimo że zwraca dane publiczne
- **Cel**: Zapobiec scrapingowi danych przez boty, rate limiting per user
- **Nie weryfikuj uprawnień**: Każdy zalogowany użytkownik może zobaczyć profil innych

### User Enumeration

- **Potencjalne ryzyko**: Zwracanie 404 ujawnia czy użytkownik istnieje w systemie
- **Akceptowalne**: Dane są publiczne (profil widoczny dla zalogowanych), więc to nie jest problem
- **Rate limiting**: Ogranicz częstotliwość zapytań aby uniknąć zbiorczego scrapowania

### Ochrona danych

- **Zwracaj TYLKO dane publiczne**:
  - ✅ id, first_name, last_name, active_offers_count
  - ❌ email, created_at, last_login, password_hash
- **RLS**: Endpoint nie wymaga RLS (pobiera dane bezpośrednio z query, nie przez RLS policies)

### Rate Limiting

- **Limit**: 100 żądań / 5 minut / użytkownik
- **Cel**: Zapobiec masowemu pobieraniu profili wszystkich użytkowników
- **Implementacja**: Middleware Astro lub Supabase Edge Functions

### Token Security

- **Weryfikacja**: Supabase automatycznie weryfikuje JWT token
- **Nie logować tokenów**: W logach zapisywać tylko `requesterId` (UUID)

## 7. Obsługa błędów

### Tabela scenariuszy

| Scenariusz                  | Kod HTTP | Error Code       | Komunikat                             | Akcja klienta          |
| --------------------------- | -------- | ---------------- | ------------------------------------- | ---------------------- |
| Brak Authorization header   | 401      | UNAUTHORIZED     | "Brak autoryzacji"                    | Zalogować się ponownie |
| Token nieprawidłowy/wygasły | 401      | UNAUTHORIZED     | "Brak autoryzacji"                    | Odświeżyć token        |
| user_id nie jest UUID       | 400      | VALIDATION_ERROR | "Nieprawidłowy format ID użytkownika" | Poprawić URL           |
| Użytkownik nie istnieje     | 404      | NOT_FOUND        | "Użytkownik nie istnieje"             | Sprawdzić ID           |
| Błąd bazy danych            | 500      | INTERNAL_ERROR   | "Wystąpił błąd..."                    | Ponowić później        |

### Logowanie błędów

**Co logować:**

- ✅ Zapytania o nieistniejących użytkowników (requesterId + requested user_id) — opcjonalne
- ✅ Błędy bazy danych (z stack trace)
- ✅ Nieoczekiwane wyjątki
- ❌ **NIE** logować tokenów
- ❌ **NIE** logować nadmiernie 404 (mogą być legitne)

**Format logów:**

```typescript
console.error('[USER_PROFILE_ERROR]', {
  timestamp: new Date().toISOString(),
  requesterId: locals.userId,
  requestedUserId: user_id,
  error: error.message,
});
```

## 8. Wydajność

### Oczekiwany czas odpowiedzi

- **P50 (median)**: < 100ms
- **P95**: < 200ms
- **P99**: < 300ms

### Potencjalne wąskie gardła

1. **Query z COUNT i JOIN**:
   - LEFT JOIN na `offers` może być kosztowny dla użytkowników z dużą liczbą ofert
   - Rozwiązanie: Indeks `idx_offers_owner_status` już istnieje (z db-plan.md)

2. **Brak cachingu**:
   - Profile użytkowników zmieniają się rzadko (imię, nazwisko)
   - `active_offers_count` zmienia się częściej (przy tworzeniu/usuwaniu ofert)

### Strategie optymalizacji

#### 1. Wykorzystanie istniejących indeksów

Z `db-plan.md`:

```sql
CREATE INDEX idx_offers_owner_status ON offers(owner_id, status);
```

Ten indeks przyspiesza COUNT dla aktywnych ofert użytkownika.

#### 2. Cache'owanie (opcjonalne w MVP)

**Strategia cache:**

```typescript
// Redis lub in-memory cache
const cacheKey = `user_profile:${user_id}`;
const cached = await cache.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const profile = await fetchFromDB(user_id);
await cache.set(cacheKey, JSON.stringify(profile), { ttl: 300 }); // 5 minut
return profile;
```

**Kiedy invalidować cache:**

- Po aktualizacji profilu (first_name, last_name)
- Po utworzeniu/usunięciu oferty (zmiana `active_offers_count`)

**Dla MVP**: Nie implementować cache — query jest wystarczająco szybki.

#### 3. Optymalizacja query (zaawansowana)

Jeśli endpoint staje się bottleneckiem, rozważyć:

- Dodanie kolumny `active_offers_count` w tabeli `users` + trigger
- Materialized view dla profili z licznikami

### Monitoring

**Metryki do śledzenia:**

- Request rate (żądań/minutę)
- Response time (P50, P95, P99)
- Error rate (% 404, 500)
- Cache hit ratio (jeśli implementowany)
- Query execution time (DB level)

**Narzędzia:**

- Supabase Dashboard (query performance)
- Sentry / LogRocket
- Custom metrics w aplikacji

## 9. Kroki implementacji (szczegółowy rozkład zadań)

### 1. Przygotowanie struktury plików

```
src/
├── pages/api/users/
│   └── [user_id].ts          # Nowy - Astro API route
├── services/
│   └── user.service.ts       # Nowy lub rozszerzyć istniejący
├── schemas/
│   └── user.schema.ts        # Nowy - Zod schemas
├── utils/
│   └── errors.ts             # Użyć istniejącego (z auth/login)
└── types.ts                  # Istniejący - PublicUserDTO już obecne
```

### 2. Utworzenie Zod schema

**Plik**: `src/schemas/user.schema.ts`

```typescript
import { z } from 'zod';

export const userIdParamSchema = z.object({
  user_id: z.string({ required_error: 'ID użytkownika jest wymagane' }).uuid('Nieprawidłowy format ID użytkownika'),
});

export type UserIdParam = z.infer<typeof userIdParamSchema>;
```

### 3. Implementacja UserService

**Plik**: `src/services/user.service.ts`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types';
import type { PublicUserDTO } from '../types';

export class UserService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getPublicProfile(userId: string): Promise<PublicUserDTO | null> {
    try {
      // Pobierz użytkownika z tabeli users
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', userId)
        .single();

      if (userError) {
        if (userError.code === 'PGRST116') {
          // No rows returned - użytkownik nie istnieje
          return null;
        }
        throw userError;
      }

      if (!user) {
        return null;
      }

      // Policz aktywne oferty użytkownika
      const { count, error: countError } = await this.supabase
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .eq('status', 'ACTIVE');

      if (countError) {
        throw countError;
      }

      // Zwróć zmapowane DTO
      return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        active_offers_count: count ?? 0,
      };
    } catch (error) {
      console.error('[UserService.getPublicProfile] Error:', error);
      throw error;
    }
  }
}
```

### 4. Implementacja API route

**Plik**: `src/pages/api/users/[user_id].ts`

```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { userIdParamSchema } from '../../../schemas/user.schema';
import { createErrorResponse } from '../../../utils/errors';
import { UserService } from '../../../services/user.service';
import type { PublicUserDTO } from '../../../types';

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // 1. Autoryzacja (sprawdzenie czy użytkownik jest zalogowany)
    const supabase = locals.supabase;

    if (!supabase) {
      console.error('[GET_USER_PROFILE] Supabase client not found');
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    // Sprawdź czy użytkownik jest zalogowany
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return createErrorResponse('UNAUTHORIZED', 'Brak autoryzacji', 401);
    }

    // 2. Walidacja parametru user_id
    let validatedParams: { user_id: string };
    try {
      validatedParams = userIdParamSchema.parse({ user_id: params.user_id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return createErrorResponse('VALIDATION_ERROR', firstError.message, 400, { field: 'user_id' });
      }
      throw error;
    }

    // 3. Wywołanie UserService
    const userService = new UserService(supabase);
    const profile = await userService.getPublicProfile(validatedParams.user_id);

    // 4. Sprawdzenie czy użytkownik istnieje
    if (!profile) {
      return createErrorResponse('NOT_FOUND', 'Użytkownik nie istnieje', 404);
    }

    // 5. Zwrot sukcesu
    const responseBody: PublicUserDTO = profile;

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[GET_USER_PROFILE_EXCEPTION]', {
      timestamp: new Date().toISOString(),
      requestedUserId: params.user_id,
      error: error instanceof Error ? error.message : String(error),
    });

    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas pobierania profilu użytkownika', 500);
  }
};
```

### 5. Upewnienie się że middleware konfiguruje Supabase

**Sprawdzić**: `src/middleware/index.ts`

Upewnić się, że Supabase client jest dostępny w `locals.supabase`:

```typescript
import { defineMiddleware } from 'astro:middleware';
import { createServerClient } from '@supabase/ssr';
import type { Database } from './db/database.types';

export const onRequest = defineMiddleware(async (context, next) => {
  // Utwórz Supabase client dostępny w locals
  const supabase = createServerClient<Database>(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (key) => context.cookies.get(key)?.value,
        set: (key, value, options) => context.cookies.set(key, value, options),
        remove: (key, options) => context.cookies.delete(key, options),
      },
    },
  );

  context.locals.supabase = supabase;

  return next();
});
```

### 6. Aktualizacja definicji typów (jeśli potrzebne)

**Sprawdzić**: `src/env.d.ts`

```typescript
/// <reference types="astro/client" />

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './db/database.types';

declare namespace App {
  interface Locals {
    supabase: SupabaseClient<Database>;
  }
}
```

### 7. Testowanie endpointu

**Test 1**: Pobranie istniejącego użytkownika (sukces)

```bash
curl -X GET http://localhost:4321/api/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
# Oczekiwane: 200 OK + PublicUserDTO
```

**Test 2**: Brak autoryzacji

```bash
curl -X GET http://localhost:4321/api/users/550e8400-e29b-41d4-a716-446655440000
# Oczekiwane: 401 Unauthorized
```

**Test 3**: Nieprawidłowy format user_id (nie UUID)

```bash
curl -X GET http://localhost:4321/api/users/invalid-uuid \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
# Oczekiwane: 400 Bad Request
```

**Test 4**: Użytkownik nie istnieje

```bash
curl -X GET http://localhost:4321/api/users/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
# Oczekiwane: 404 Not Found
```

**Test 5**: Użytkownik z wieloma aktywnymi ofertami

```bash
# Utwórz testowego użytkownika z 5 aktywnymi ofertami
# Sprawdź czy active_offers_count = 5
curl -X GET http://localhost:4321/api/users/{user_with_offers_id} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
# Oczekiwane: 200 OK + active_offers_count: 5
```

**Test 6**: Użytkownik bez ofert

```bash
# Sprawdź użytkownika bez żadnych ofert
curl -X GET http://localhost:4321/api/users/{user_without_offers_id} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
# Oczekiwane: 200 OK + active_offers_count: 0
```

### 8. Code review checklist

- [ ] Walidacja UUID działa poprawnie (Zod schema)
- [ ] Autoryzacja wymusza zalogowanie (middleware + session check)
- [ ] UserService poprawnie liczy aktywne oferty
- [ ] 404 zwracany dla nieistniejących użytkowników
- [ ] Zwracane TYLKO dane publiczne (nie ma email, created_at itp.)
- [ ] Błędy obsługiwane zgodnie ze specyfikacją
- [ ] Komunikaty błędów po polsku i user-friendly
- [ ] Typy TypeScript zgodne z `types.ts` (PublicUserDTO)
- [ ] Poprawne kody statusu HTTP (200, 400, 401, 404, 500)
- [ ] Response headers: `Content-Type: application/json`
- [ ] Testy manualne przeszły (wszystkie 6 testów)
- [ ] Nie logujemy tokenów w błędach
- [ ] Service używa istniejącego Supabase client

### 9. Optymalizacje wydajnościowe (opcjonalne dla MVP)

#### Cache warstwa (przyszłość)

**Plik**: `src/services/user.service.ts` (rozszerzona wersja)

```typescript
import { Redis } from '@upstash/redis'; // przykład

export class UserService {
  private cache?: Redis;
  private CACHE_TTL = 300; // 5 minut

  constructor(
    private supabase: SupabaseClient<Database>,
    cache?: Redis,
  ) {
    this.cache = cache;
  }

  async getPublicProfile(userId: string): Promise<PublicUserDTO | null> {
    // Sprawdź cache
    if (this.cache) {
      const cached = await this.cache.get<PublicUserDTO>(`user:${userId}`);
      if (cached) return cached;
    }

    // Fetch z DB (jak wcześniej)
    const profile = await this.fetchProfileFromDB(userId);

    // Zapisz w cache (tylko jeśli istnieje)
    if (profile && this.cache) {
      await this.cache.set(`user:${userId}`, profile, { ex: this.CACHE_TTL });
    }

    return profile;
  }

  private async fetchProfileFromDB(userId: string): Promise<PublicUserDTO | null> {
    // ... (kod z wcześniejszej implementacji)
  }
}
```

**Invalidacja cache:**

```typescript
// Po aktualizacji profilu użytkownika
await cache.del(`user:${userId}`);

// Po utworzeniu/usunięciu oferty
await cache.del(`user:${ownerId}`); // invaliduj profil właściciela oferty
```

### 10. Monitoring i alerty

**Metryki w Supabase Dashboard:**

- Query performance dla `getPublicProfile`
- Request rate na `/api/users/{user_id}`
- Error rate (404 vs 500)

**Sentry / Error tracking:**

```typescript
import * as Sentry from '@sentry/astro';

try {
  // ... kod endpointu
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      endpoint: 'get_user_profile',
      requested_user_id: params.user_id,
    },
  });
  return createErrorResponse('INTERNAL_ERROR', '...', 500);
}
```

**Custom metrics (opcjonalnie):**

```typescript
// Tracking popularnych użytkowników (najczęściej wyświetlane profile)
await analytics.track('user_profile_viewed', {
  viewed_user_id: params.user_id,
  viewer_user_id: session.user.id,
});
```

## 10. Dodatkowe uwagi i rekomendacje

### Relacja z innymi endpointami

- **GET /api/users/me**: Zwraca profil zalogowanego użytkownika (rozszerzone dane)
- **GET /api/users/{user_id}**: Zwraca profil publiczny dowolnego użytkownika (dane ograniczone)
- **PATCH /api/users/me**: Aktualizacja własnego profilu

**Różnice:**

- `/me` może zwracać więcej danych (email, created_at)
- `/{user_id}` zwraca tylko dane publiczne

### Przyszłe rozszerzenia

1. **Rozszerzone profile**:
   - Avatar URL (Supabase Storage)
   - Bio/opis użytkownika (TEXT)
   - Statystyki: liczba zrealizowanych wymian
   - Rating/opinie od innych użytkowników

2. **Prywatność**:
   - Ustawienie widoczności profilu (public/private)
   - Blokowanie użytkowników
   - Ukrywanie liczby ofert

3. **Social features**:
   - Lista aktywnych ofert użytkownika (link do `/api/users/{user_id}/offers`)
   - Historia wymian (jeśli publiczna)
   - Badges/achievements

### Zgodność z GDPR

- **Dane publiczne**: first_name, last_name, active_offers_count są traktowane jako publiczne
- **Usuwanie danych**: Po usunięciu konta (DELETE /api/users/me) profil przestaje być dostępny (404)
- **Prawo do bycia zapomnianym**: Hard delete implementowany zgodnie z PRD

### Bezpieczeństwo danych

**Co NIE powinno być zwracane:**

- Email użytkownika
- Data rejestracji (created_at)
- Ostatnie logowanie
- Token/session info
- Nieaktywne/usunięte oferty

**Weryfikacja implementacji:**

```typescript
// ✅ Poprawne
return {
  id: user.id,
  first_name: user.first_name,
  last_name: user.last_name,
  active_offers_count: count,
};

// ❌ BŁĄD - NIE zwracać email
return {
  ...profile,
  email: user.email, // ← USUNĄĆ!
};
```

## 11. Diagram przepływu danych

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /api/users/{user_id}
       │ Authorization: Bearer {token}
       ↓
┌──────────────────────────────────┐
│  Astro Middleware                │
│  - Utwórz Supabase client        │
│  - Dodaj do locals.supabase      │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│  API Route Handler               │
│  /api/users/[user_id].ts         │
│                                  │
│  1. Sprawdź session (auth)       │
│  2. Waliduj user_id (UUID)       │
│  3. Wywołaj UserService          │
│  4. Obsłuż wynik                 │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│  UserService                     │
│  .getPublicProfile(userId)       │
│                                  │
│  1. SELECT user FROM users       │
│  2. COUNT offers WHERE active    │
│  3. Map do PublicUserDTO         │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│  Supabase (PostgreSQL)           │
│                                  │
│  - users table                   │
│  - offers table                  │
│  - indexes: idx_offers_owner...  │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│  Response                        │
│                                  │
│  200: PublicUserDTO              │
│  404: User not found             │
│  401/400/500: Errors             │
└──────────────────────────────────┘
```

## 12. Checklist wdrożenia produkcyjnego

### Pre-deployment

- [ ] Wszystkie testy manualne przeszły pomyślnie
- [ ] Code review wykonane i zatwierdzone
- [ ] Dokumentacja API zaktualizowana
- [ ] Environment variables skonfigurowane
- [ ] Error logging (Sentry) skonfigurowane
- [ ] Rate limiting zaimplementowane

### Deployment

- [ ] Deploy na staging environment
- [ ] Smoke tests na staging
- [ ] Performance testing (load test)
- [ ] Security audit (OWASP checklist)
- [ ] Deploy na production
- [ ] Verify w production (curl tests)

### Post-deployment

- [ ] Monitor Supabase Dashboard (query performance)
- [ ] Monitor error rates (Sentry)
- [ ] Monitor response times (P95/P99)
- [ ] Sprawdź logi aplikacyjne (pierwszy dzień)
- [ ] User feedback collection

---

**Plik zapisany**: `.ai/endpoints/users-user_id-plan.md`

**Status**: ✅ Gotowy do implementacji

**Szacowany czas implementacji**: 2-3 godziny (including tests)

**Priorytet**: Średni (potrzebny dla wyświetlania profili przy ofertach/czatach)

**Zależności**:

- Supabase Auth skonfigurowane
- Middleware (`src/middleware/index.ts`) działający
- Tabele `users` i `offers` w bazie danych
- Typy `PublicUserDTO` w `src/types.ts` (✅ już istnieje)
