<analysis>
1) Podsumowanie kluczowych punktów specyfikacji:
- Endpoint: `POST /auth/login` — uwierzytelnienie użytkownika i zwrot tokenów sesji.
- Request body: `{ email, password }`.
- Success: 200 OK, payload zawiera `access_token`, `refresh_token` oraz `user` (id, email).
- Błędy: 401 (nieprawidłowe credentials), 403 (email niezweryfikowany), 400 (błąd walidacji), 500 (błąd serwera).

2) Wymagane i opcjonalne parametry:
- Wymagane: `email` (string, poprawny format), `password` (string, min 6 znaków).
- Opcjonalne: brak w specyfikacji MVP; przyszłość: 2FA token, remember_me flag.

3) Niezbędne typy DTO i Command Modele:
- `LoginUserCommand` — już istnieje w `src/types.ts`:
  - { email: string; password: string; }
- `AuthTokensResponse` — już istnieje w `src/types.ts`:
  - { access_token: string; refresh_token: string; user: { id: string; email: string; } }
- `ApiErrorResponse` — istnieje w `src/types.ts`.

4) Ekstrakcja logiki do service:
- Endpoint korzysta bezpośrednio z **Supabase Auth API**, więc nie wymaga dedykowanego service layer dla MVP.
- Logika w API route:
  - Walidacja danych wejściowych (zod schema)
  - Wywołanie `supabase.auth.signInWithPassword()`
  - Sprawdzenie czy email został zweryfikowany
  - Zwrócenie tokenów i danych użytkownika
- Przyszłość: rozważyć `AuthService` gdy dodamy 2FA, session management, login history.

5) Walidacja wejścia:
- Użyć `zod` do walidacji request body:
  - `email`: z.string().email().toLowerCase().trim()
  - `password`: z.string().min(6) — zgodnie z Supabase Auth minimum
- W przypadku błędów walidacji zwrócić `400 Bad Request` z opisem błędu.
- Nie ujawniać szczegółów które pole jest nieprawidłowe w błędach auth (security).

6) Rejestrowanie błędów:
- Endpoint Auth nie wymaga logowania w `audit_logs` — to operacja użytkownika, nie admin.
- Logować do console/monitoring tylko nieoczekiwane błędy (500).
- NIE logować haseł użytkowników w żadnych logach.
- Przyszłość: rozważyć audit log dla podejrzanych prób logowania (failed attempts tracking).

7) Zagrożenia bezpieczeństwa:
- **Rate limiting**: Konieczne — 10 żądań / 15 minut / IP (ochrona przed brute force).
- **Brute force attacks**: Implementacja opóźnień po nieudanych próbach (Supabase obsługuje).
- **Credential stuffing**: Monitoring nietypowych wzorców logowania.
- **Token security**: Access token krótkoterminowy (1h), refresh token długoterminowy (30 dni).
- **HTTPS obligatoryjne**: Hasła przesyłane w plain text w body (tylko TLS encryption).
- **Email verification**: Wymóg weryfikacji przed logowaniem (zgodnie z GDPR i PRD).
- **Error messages**: Nie ujawniać czy email istnieje w systemie — zawsze "Email lub hasło niepoprawne".
- **CORS**: Restrykcje do dozwolonych domen aplikacji.

8) Scenariusze błędów i kody odpowiedzi:
- 200 OK — pomyślne logowanie, zwrot access_token + refresh_token + user data.
- 400 Bad Request — nieprawidłowy format danych (brak pola, błędny format email, hasło za krótkie).
- 401 Unauthorized — email lub hasło niepoprawne (nie rozróżniamy które!).
- 403 Forbidden — email nie został zweryfikowany, instrukcja sprawdzenia skrzynki pocztowej.
- 429 Too Many Requests — przekroczono rate limit (10/15min).
- 500 Internal Server Error — błąd komunikacji z Supabase lub nieoczekiwany wyjątek.
</analysis>

# API Endpoint Implementation Plan: Logowanie użytkownika — `POST /auth/login`

## 1. Przegląd punktu końcowego

Endpoint `POST /auth/login` umożliwia uwierzytelnienie zarejestrowanego użytkownika poprzez weryfikację adresu email i hasła. Po pomyślnej weryfikacji zwraca JWT access token i refresh token, które umożliwiają autoryzację kolejnych żądań API. Endpoint jest krytyczny dla bezpieczeństwa aplikacji i wymaga szczególnej uwagi w zakresie ochrony przed atakami brute force oraz właściwej obsługi błędów bez ujawniania wrażliwych informacji.

## 2. Szczegóły żądania

- Metoda HTTP: `POST`
- Struktura URL: `/auth/login`
- Nagłówki:
  - `Content-Type: application/json`
  - (opcjonalnie) `X-Forwarded-For` — dla rate limiting per IP
- Parametry:
  - Wymagane:
    - `email` (string) — adres email użytkownika
    - `password` (string) — hasło użytkownika (min 6 znaków)
  - Opcjonalne:
    - brak w MVP; przyszłość: `totp_code` (2FA), `remember_me` (boolean)
- Request Body:

```json
{
  "email": "jan.kowalski@example.com",
  "password": "securePassword123"
}
```

### Walidacja (Zod Schema)

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email jest wymagany' })
    .email('Nieprawidłowy format adresu email')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Hasło jest wymagane' })
    .min(6, 'Hasło musi mieć minimum 6 znaków')
});
```

## 3. Wykorzystywane typy (DTOs i Command Modele)

- `LoginUserCommand` (użyj istniejącego z `src/types.ts`):
  - { email: string; password: string; }
- `AuthTokensResponse` (użyj istniejącego z `src/types.ts`):
  - { access_token: string; refresh_token: string; user: { id: string; email: string; } }
- `ApiErrorResponse` (używane przy błędach)

## 4. Szczegóły odpowiedzi

### 200 OK (sukces)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "v1.MRjRfNBGf3uxF8xGzXU0oA...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "jan.kowalski@example.com"
  }
}
```

**Opis pól:**
- `access_token`: JWT token do autoryzacji żądań API (krótkoterminowy: 1h)
- `refresh_token`: Token do odnowienia access_token (długoterminowy: 30 dni)
- `user.id`: UUID użytkownika w systemie
- `user.email`: Zweryfikowany adres email użytkownika

### Błędy

- **400 Bad Request** — nieprawidłowy format danych
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Nieprawidłowy format adresu email",
      "details": { "field": "email" }
    }
  }
  ```
  Przypadki: brak pola email/password, nieprawidłowy format email, hasło za krótkie.

- **401 Unauthorized** — nieprawidłowe credentials
  ```json
  {
    "error": {
      "code": "UNAUTHORIZED",
      "message": "Email lub hasło niepoprawne"
    }
  }
  ```
  **⚠️ Uwaga bezpieczeństwa**: Komunikat nie rozróżnia czy problem jest w emailu czy haśle.

- **403 Forbidden** — email niezweryfikowany
  ```json
  {
    "error": {
      "code": "FORBIDDEN",
      "message": "Email nie został zweryfikowany. Sprawdź swoją skrzynkę pocztową."
    }
  }
  ```

- **429 Too Many Requests** — rate limit exceeded
  ```json
  {
    "error": {
      "code": "RATE_LIMIT_EXCEEDED",
      "message": "Przekroczono limit prób logowania. Spróbuj ponownie za 15 minut"
    }
  }
  ```

- **500 Internal Server Error** — błąd serwera
  ```json
  {
    "error": {
      "code": "INTERNAL_ERROR",
      "message": "Wystąpił błąd podczas logowania. Spróbuj ponownie później"
    }
  }
  ```

## 5. Przepływ danych

1. **Odbiór żądania**: Astro API route odbiera POST na `/auth/login`, parsuje JSON body.

2. **Walidacja danych wejściowych**: 
   - Użycie Zod schema `loginSchema`
   - Sprawdzenie obecności wymaganych pól: `email`, `password`
   - Walidacja formatu email i długości hasła
   - **Jeśli błąd**: Zwrot 400 Bad Request

3. **Wywołanie Supabase Auth API**:
   ```typescript
   const { data, error } = await supabase.auth.signInWithPassword({
     email: validatedData.email,
     password: validatedData.password
   });
   ```
   **Supabase wykonuje**:
   - Sprawdzenie czy użytkownik istnieje w `auth.users`
   - Weryfikację hasła (bcrypt hash comparison)
   - Sprawdzenie `email_confirmed_at IS NOT NULL`
   - Generowanie JWT tokens i utworzenie sesji

4. **Obsługa odpowiedzi Supabase**:
   - **Sukces**: Ekstrakcja tokenów i danych użytkownika → 200 OK
   - **Invalid credentials**: 401 Unauthorized
   - **Email not confirmed**: 403 Forbidden
   - **Inny błąd**: Logowanie + 500 Internal Server Error

5. **Zwrot odpowiedzi**: JSON z tokenami lub odpowiedni błąd HTTP.

## 6. Względy bezpieczeństwa

### Rate Limiting
- **Limit**: 10 żądań / 15 minut / IP address
- **Implementacja**: Middleware Astro lub Supabase level
- **Po przekroczeniu**: 429 Too Many Requests
- **Cel**: Ochrona przed brute force i credential stuffing

### Email Verification
- **Wymóg**: Email musi być zweryfikowany przed logowaniem (GDPR compliance)
- **Mechanizm**: Supabase sprawdza `email_confirmed_at`
- **Jeśli niezweryfikowany**: 403 Forbidden z instrukcją

### Komunikaty błędów
**Zasada**: Nie ujawniaj informacji pomocnych dla atakujących
- ✅ "Email lub hasło niepoprawne" (nie wskazujemy które pole)
- ❌ "Email nie istnieje w systemie" (ujawnia info o kontach)
- ❌ "Nieprawidłowe hasło dla użytkownika X"

### HTTPS i Transport Security
- **Wymagane w produkcji**: Wszystkie żądania przez HTTPS
- **Dlaczego**: Hasła przesyłane w plain text w body
- **Dev environment**: HTTP dozwolone tylko lokalnie

### CORS
```typescript
const ALLOWED_ORIGINS = [
  'https://kakapo.app',
  'https://www.kakapo.app',
  process.env.DEV ? 'http://localhost:4321' : null
].filter(Boolean);
```

### Token Security
- **Access token**: Krótkoterminowy (1 godzina)
- **Refresh token**: Długoterminowy (30 dni)
- **Przechowywanie**: Secure HttpOnly cookies (rekomendowane) lub localStorage
- **Signature**: JWT podpisany kluczem `JWT_SECRET` w Supabase

### Walidacja i Sanityzacja
- **Email**: trim(), toLowerCase(), format validation
- **Password**: Walidacja długości, brak sanityzacji (hasła mogą zawierać special chars)
- **NIE** logować haseł w żadnych logach

## 7. Obsługa błędów

### Tabela scenariuszy

| Scenariusz | Kod HTTP | Error Code | Komunikat | Akcja klienta |
|-----------|----------|------------|-----------|---------------|
| Brak email/password | 400 | VALIDATION_ERROR | "Email jest wymagany" | Uzupełnić dane |
| Nieprawidłowy format email | 400 | VALIDATION_ERROR | "Nieprawidłowy format adresu email" | Poprawić format |
| Hasło za krótkie | 400 | VALIDATION_ERROR | "Hasło musi mieć minimum 6 znaków" | Użyć dłuższego hasła |
| Nieprawidłowe credentials | 401 | UNAUTHORIZED | "Email lub hasło niepoprawne" | Sprawdzić dane |
| Email niezweryfikowany | 403 | FORBIDDEN | "Email nie został zweryfikowany..." | Kliknąć link |
| Rate limit | 429 | RATE_LIMIT_EXCEEDED | "Przekroczono limit prób..." | Odczekać 15 min |
| Błąd Supabase | 500 | INTERNAL_ERROR | "Wystąpił błąd..." | Ponowić później |

### Mapowanie błędów Supabase

```typescript
if (error) {
  // Email niezweryfikowany
  if (error.message.includes('Email not confirmed')) {
    return createErrorResponse('FORBIDDEN', '...', 403);
  }
  
  // Nieprawidłowe credentials
  if (error.message.includes('Invalid login credentials')) {
    return createErrorResponse('UNAUTHORIZED', '...', 401);
  }
  
  // Inny błąd
  console.error('Supabase login error:', error);
  return createErrorResponse('INTERNAL_ERROR', '...', 500);
}
```

### Logowanie błędów

**Co logować:**
- ✅ Błędy Supabase (z stack trace)
- ✅ Nieoczekiwane wyjątki
- ✅ Rate limit violations (z IP dla analizy)
- ❌ **NIE** logować haseł użytkowników
- ❌ **NIE** logować pełnych credentials

## 8. Wydajność

### Oczekiwany czas odpowiedzi
- **P50 (median)**: < 200ms
- **P95**: < 500ms
- **P99**: < 1000ms

### Potencjalne wąskie gardła

1. **Weryfikacja hasła (bcrypt)**: ~100-200ms — to feature (security), nie bug
2. **Wywołania do Supabase Auth API**: 50-150ms latencja (zależnie od regionu)
3. **Generowanie JWT tokens**: ~10-50ms (zarządzane przez Supabase)

### Strategie optymalizacji

- **NIE** stosować cachingu dla `/auth/login` — każde żądanie musi być świeże
- Connection pooling zarządzane przez Supabase
- Endpoint już async — brak możliwości dodatkowej optymalizacji
- Stateless design — łatwa skalowalność

### Monitoring

**Metryki do śledzenia:**
- Request rate (żądań/minutę)
- Response time (P50, P95, P99)
- Error rate (% failed requests)
- Rate limit hits
- Failed login attempts per IP

**Narzędzia:**
- Supabase Dashboard (wbudowane metryki)
- Sentry / New Relic / LogRocket

## 9. Kroki implementacji (szczegółowy rozkład zadań)

Przed implementacją: upewnić się, że `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` są dostępne jako env.

### 1. Przygotowanie struktury plików

```
src/
├── pages/auth/
│   └── login.ts              # Nowy - Astro API route
├── schemas/
│   └── auth.schema.ts        # Nowy - Zod schemas
├── utils/
│   └── errors.ts             # Nowy - Error handling utilities
└── types.ts                  # Istniejący - typy już obecne
```

### 2. Utworzenie Zod schema

**Plik**: `src/schemas/auth.schema.ts`

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email jest wymagany' })
    .min(1, 'Email jest wymagany')
    .email('Nieprawidłowy format adresu email')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Hasło jest wymagane' })
    .min(6, 'Hasło musi mieć minimum 6 znaków')
});

export type LoginInput = z.infer<typeof loginSchema>;
```

### 3. Utworzenie utility funkcji do błędów

**Plik**: `src/utils/errors.ts`

```typescript
import type { ApiErrorResponse } from '../types';

export function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: { field?: string; value?: unknown }
): Response {
  const errorBody: ApiErrorResponse = {
    error: { code, message, ...(details && { details }) }
  };
  
  return new Response(JSON.stringify(errorBody), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function handleAuthError(error: { message: string }): Response {
  if (error.message.includes('Email not confirmed')) {
    return createErrorResponse(
      'FORBIDDEN',
      'Email nie został zweryfikowany. Sprawdź swoją skrzynkę pocztową.',
      403
    );
  }
  
  if (error.message.includes('Invalid login credentials')) {
    return createErrorResponse(
      'UNAUTHORIZED',
      'Email lub hasło niepoprawne',
      401
    );
  }
  
  console.error('[AUTH_ERROR]', error);
  return createErrorResponse(
    'INTERNAL_ERROR',
    'Wystąpił błąd podczas logowania. Spróbuj ponownie później',
    500
  );
}
```

### 4. Implementacja API route

**Plik**: `src/pages/auth/login.ts`

```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { loginSchema } from '../../schemas/auth.schema';
import { createErrorResponse, handleAuthError } from '../../utils/errors';
import type { LoginUserCommand, AuthTokensResponse } from '../../types';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Parsowanie request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return createErrorResponse('VALIDATION_ERROR', 'Nieprawidłowy format JSON', 400);
    }

    // 2. Walidacja danych wejściowych
    let validatedData: LoginUserCommand;
    try {
      validatedData = loginSchema.parse(requestBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return createErrorResponse(
          'VALIDATION_ERROR',
          firstError.message,
          400,
          {
            field: String(firstError.path[0] || 'unknown'),
            value: firstError.path[0] === 'password' ? undefined : requestBody?.[firstError.path[0]]
          }
        );
      }
      throw error;
    }

    // 3. Pobranie Supabase client
    const supabase = locals.supabase;
    if (!supabase) {
      console.error('[AUTH_LOGIN] Supabase client not found');
      return createErrorResponse('INTERNAL_ERROR', 'Błąd konfiguracji serwera', 500);
    }

    // 4. Uwierzytelnienie przez Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password
    });

    // 5. Obsługa błędów
    if (error) {
      return handleAuthError(error);
    }

    // 6. Sprawdzenie poprawności odpowiedzi
    if (!data.session || !data.user) {
      console.error('[AUTH_LOGIN] Invalid response from Supabase');
      return createErrorResponse('INTERNAL_ERROR', 'Wystąpił błąd podczas logowania', 500);
    }

    // 7. Konstrukcja odpowiedzi
    const responseBody: AuthTokensResponse = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email!
      }
    };

    // 8. Zwrot sukcesu
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[AUTH_LOGIN_EXCEPTION]', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    });
    
    return createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd', 500);
  }
};
```

### 5. Konfiguracja Supabase w middleware

**Sprawdzić**: `src/middleware/index.ts`

Upewnić się, że Supabase client jest dostępny w `locals.supabase` (zgodnie z `@backend.mdc` — używać z context locals).

### 6. Aktualizacja definicji typów

**Sprawdzić**: `src/env.d.ts`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './db/database.types';

declare namespace App {
  interface Locals {
    supabase: SupabaseClient<Database>;
  }
}
```

### 7. Testowanie endpointu

**Test 1**: Poprawne logowanie
```bash
curl -X POST http://localhost:4321/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# Oczekiwane: 200 OK + tokens
```

**Test 2**: Błąd walidacji - brak email
```bash
curl -X POST http://localhost:4321/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"password123"}'
# Oczekiwane: 400 Bad Request
```

**Test 3**: Nieprawidłowy format email
```bash
curl -X POST http://localhost:4321/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email","password":"password123"}'
# Oczekiwane: 400 Bad Request
```

**Test 4**: Nieprawidłowe credentials
```bash
curl -X POST http://localhost:4321/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}'
# Oczekiwane: 401 Unauthorized
```

**Test 5**: Email niezweryfikowany
```bash
# Użyć konta bez weryfikacji
# Oczekiwane: 403 Forbidden
```

### 8. Code review checklist

- [ ] Walidacja Zod działa dla wszystkich przypadków
- [ ] Błędy obsługiwane zgodnie ze specyfikacją
- [ ] Komunikaty błędów po polsku i user-friendly
- [ ] Hasła NIE są logowane
- [ ] Supabase client poprawnie w locals
- [ ] Typy TypeScript zgodne z `types.ts`
- [ ] Poprawne kody statusu HTTP
- [ ] Response headers: `Content-Type: application/json`
- [ ] Testy manualne przeszły
- [ ] Zmienne środowiskowe skonfigurowane

### 9. Monitoring i alerty

- Dodać Sentry capture dla 5xx errors
- Monitorować metryki w Supabase Dashboard:
  - Request rate
  - Response time
  - Error rate
  - Failed login attempts

### 10. Dokumentacja

- Zaktualizować API docs (OpenAPI/README) z przykładami request/response
- Dodać dokumentację dla zespołu frontend o strukturze odpowiedzi i błędów

## 10. Dodatkowe uwagi operacyjne

- **Rate limiting**: W MVP może być obsługiwane przez Supabase; przyszłość: dedykowany middleware.
- **Session management**: Rozważyć dashboard zarządzania sesjami (lista aktywnych, wylogowanie z urządzeń).
- **2FA**: Planować w roadmap — TOTP via Supabase, dodatkowe pole w request body.
- **Passwordless auth**: Magic links, Social OAuth (przyszłość).
- **Analytics**: Tracking failed attempts per IP, suspicious login detection.
- **Token refresh flow**: Oddzielny endpoint `/auth/refresh` (następny w kolejce implementacji).

---

Plik zapisany: `.ai/endpoints/auth-login-plan.md`
