# API Endpoint Implementation Plan: Anulowanie zainteresowania (DELETE /api/interests/{interest_id})

## 1. Przegląd punktu końcowego

Endpoint służy do anulowania (usunięcia) zgłoszonego przez użytkownika zainteresowania ofertą. Operacja wymaga uwierzytelnienia i autoryzacji: tylko właściciel zainteresowania (lub użytkownik z odpowiednimi uprawnieniami, np. admin) może je anulować.

Tech stack: TypeScript, Astro (API routes w `src/pages/api/`), Supabase jako DB i klient, istniejące middleware autoryzacyjne w `src/middleware/`.

## 2. Szczegóły żądania

- Metoda HTTP: DELETE
- Struktura URL: `/api/interests/{interest_id}`
- Headers:
  - `Authorization: Bearer {token}` — wymagane
- Parametry:
  - Wymagane:
    - `interest_id` (path) — identyfikator rekordu zainteresowania (UUID lub integer; dopasować do schematu DB)
  - Opcjonalne:
    - brak (nie ma body w specyfikacji)
- Request Body: brak

Walidacja wejścia:

- Sprawdzić obecność i format `interest_id` (UUID regex lub integer).
- Upewnić się, że middleware dostarczył `request.user` (po weryfikacji tokena).

## 3. Wykorzystywane typy (DTOs i Command Modele)

- `DeleteInterestCommand`:

```ts
type DeleteInterestCommand = {
  interestId: string; // lub number, zgodnie z DB
  requestingUserId: string;
};
```

- `MessageResponseDTO`:

```ts
type MessageResponseDTO = {
  message: string;
};
```

- `InterestRecord` (DB read model — przykład):

```ts
type InterestRecord = {
  id: string;
  user_id: string;
  offer_id: string;
  created_at: string;
  deleted_at?: string | null;
};
```

## 4. Szczegóły odpowiedzi

- 200 OK
  - Body:
  ```json
  { "message": "Zainteresowanie zostało anulowane" }
  ```
- 400 Bad Request — niepoprawny format `interest_id`.
- 401 Unauthorized — brak/nieprawidłowy token (zazwyczaj middleware).
- 403 Forbidden — użytkownik nie ma uprawnień do anulowania (np. nie jest właścicielem).
- 404 Not Found — `interest_id` nie istnieje.
- 409 Conflict — opcjonalnie, jeśli występuje konflikt logiczny.
- 500 Internal Server Error — nieoczekiwany błąd po stronie serwera.

Zasada: nie ujawniać stack trace'ów w body odpowiedzi; zwracać krótkie komunikaty i logować szczegóły.

## 5. Przepływ danych

1. Middleware autoryzacyjne (np. `src/middleware/index.ts`) weryfikuje token i ustawia `request.user = { id, roles, ... }`. Jeśli brak/nieprawidłowy token → 401.
2. Route handler odczytuje `interest_id` z path params i validuje format.
3. Utworzony `DeleteInterestCommand` z `interestId` i `requestingUserId`.
4. Wywołanie `InterestService.cancelInterest(command)`:
   - Serwis fetchuje rekord `interest` po `interestId`.
   - Jeśli brak rekordu → rzuca `NotFoundError`.
   - Sprawdza właściciela: jeśli `interest.user_id !== requestingUserId` i brak uprawnień → rzuca `ForbiddenError`.
   - Wykonuje usunięcie:
     - Jeśli polityka to soft-delete: UPDATE SET `deleted_at = now()` (może też ustawić `is_deleted`).
     - Jeśli hard-delete: DELETE FROM interests WHERE id = ...
   - Operacja powinna być w transakcji jeżeli więcej działań zależy od siebie.
5. Serwis zwraca sukces; handler mapuje wynik na 200 OK z `MessageResponseDTO`.

Przykładowe interakcje z Supabase:

- `const { data, error } = await supabase.from('interests').select('*').eq('id', interestId).single();`
- potem `await supabase.from('interests').update({ deleted_at: new Date().toISOString() }).eq('id', interestId);`

## 6. Względy bezpieczeństwa

- Uwierzytelnienie:
  - Wymaga tokena Bearer; korzystać z istniejącego middleware.
  - Dodatkowo sprawdzić ważność sesji / tokena (Supabase JWT lub inny).
- Autoryzacja:
  - Sprawdzenie własności rekordu (owner check) przed usunięciem.
  - Jeśli używacie RLS (Supabase), zapewnić, że zapytania wykonywane z kontekstem serwera trafiają na odpowiedni policy lub że sprawdzenie własności odbywa się w aplikacji.
- SQL Injection:
  - Korzystać z API Supabase lub query buildera (parametryzowane zapytania).
- Rate limiting / brute-force:
  - Rozważyć ograniczenie liczby żądań zmieniających stan (np. poprzez ogólny rate-limiter).
- Logging:
  - Logować operacje usuwania (kto, kiedy, interest_id).

## 7. Obsługa błędów

- Błędy serwisowe:
  - `NotFoundError` → mapować na 404.
  - `ForbiddenError` → mapować na 403.
  - `ValidationError` → 400 (z krótkim opisem).
  - Inne (DB, timeout) → 500 i logowanie.
- Mapowanie w handlerze:
  - Użyć centralnego error-mappera, np. `mapServiceErrorToHttp`.
- Rejestrowanie:
  - Logować wszystkie 5xx i krytyczne 4xx do centralnego loggera i (opcjonalnie) do tabeli `api_error_logs`.

Przykładowe odpowiedzi:

- 200:

```json
{ "message": "Zainteresowanie zostało anulowane" }
```

- 403:

```json
{ "message": "Brak uprawnień" }
```

- 404:

```json
{ "message": "Zainteresowanie nie istnieje" }
```

## 8. Wydajność

- Zapytania:
  - Zapytanie po `id` powinno korzystać z indeksu PK → bardzo szybkie (O(log n) lub O(1) w praktyce).
  - Unikać pełnych skanów tabeli.
- Transakcje:
  - Jeśli usuwanie wymaga dodatknych operacji (np. cascade manualny), wykonywać w transakcji by uniknąć niespójności.
- Skalowalność:
  - Endpoint rzadko będzie hotspotem; jeśli spodziewana wysoka częstotliwość operacji mutujących, skalować bazę i rozważyć batch processing dla kosztownych zadań powiązanych.
- Cache:
  - Nie dotyczy zwykle - po usunięciu trzeba unieważnić ewentualne cache (np. listing zainteresowań).

## 9. Kroki implementacji

1. (DEVELOP) Utworzyć lub zaktualizować DTO i Command:
   - `src/types.ts` lub `src/dto/interests.ts` → `DeleteInterestCommand`, `MessageResponseDTO`.
2. (DEVELOP) Dodać serwis `InterestService` (jeśli nie istnieje):
   - Plik: `src/services/interest.service.ts`
   - Metoda: `cancelInterest(command: DeleteInterestCommand): Promise<void>`
   - Implementacja:
     - Pobranie rekordu → sprawdzenie istnienia,
     - Sprawdzenie uprawnień (owner/admin),
     - Wykonanie soft-delete (preferowane) lub hard-delete,
     - Wywołanie loggera przy błędach.
3. (DEVELOP) Dodać handler routingu:
   - Plik (Astro API): `src/pages/api/interests/[interest_id].ts` lub `src/pages/api/interests/[interest_id].route.ts`
   - Handler:
     - Autoryzacja przez middleware (upewnić się, że `request.user` jest ustawione),
     - Walidacja `interest_id`,
     - Konstrukcja `DeleteInterestCommand` i wywołanie `InterestService.cancelInterest`,
     - Mapowanie błędów na odpowiedzi (403/404/400/500).
4. (DEVELOP) Middleware:
   - Upewnić się, że `src/middleware/index.ts` eksportuje funkcję, którą można użyć przy handlerze.
   - Jeżeli brak, dodać prostą funkcję `requireAuth` która weryfikuje token i ustawia `request.user`.
5. (DEVELOP) Testy jednostkowe i integracyjne:
   - Unit tests dla `InterestService.cancelInterest` (scenariusze: success, not found, forbidden, db error).
   - Integration tests dla endpointu (np. przy użyciu test DB lub mocka Supabase).
6. (DEVOPS) Migracje / indeksy:
   - Sprawdzić czy `interests.id` ma indeks (PK). Dodać indeksy jeżeli brak.
7. (QA) End-to-end testy i manualne testy bezpieczeństwa:
   - Przetestować uprawnienia, przypadki brzegowe i race conditions.
8. (DOCS) Zaktualizować dokumentację API (OpenAPI/README) o nowy endpoint i możliwe odpowiedzi.
9. (RELEASE) Uruchomić lintery i testy:
   - `npm run lint` / `npm test` / `npm run build`
10. (MONITORING) Po wdrożeniu:

- Monitorować logi i błędy 5xx, wprowadzić alerty dla regresji.

## 10. Przykładowy pseudokod handlera (wysoki poziom)

```ts
// src/pages/api/interests/[interest_id].ts
import { requireAuth } from 'src/middleware';
import { InterestService } from 'src/services/interest.service';
import { DeleteInterestCommand } from 'src/dto';

export default requireAuth(async function handler(req, res) {
  const { interest_id } = req.params;
  const userId = req.user.id;

  if (!isValidIdFormat(interest_id)) {
    return res.status(400).json({ message: 'Invalid interest_id' });
  }

  try {
    await InterestService.cancelInterest({ interestId: interest_id, requestingUserId: userId });
    return res.status(200).json({ message: 'Zainteresowanie zostało anulowane' });
  } catch (err) {
    return mapServiceErrorToHttp(err, res);
  }
});
```

## 11. Uwagi końcowe i decyzje do podjęcia przez zespół

- Soft-delete vs hard-delete: rekomenduję soft-delete (z `deleted_at`) by zachować historię i umożliwić przywrócenie.
- RLS (Supabase): jeśli używacie RLS, zdecydować, czy logika sprawdzania własności odbywa się w DB (policy) czy w aplikacji.
- Centralne logowanie i alertowanie: skonfigurować Sentry/Prometheus dla produkcyjnego monitoringu.

---

Powodzenia — ten plan zawiera wszystkie kroki i decyzje techniczne potrzebne zespołowi do bezpiecznego i zgodnego z regułami wdrożenia endpointu `DELETE /api/interests/{interest_id}`.
