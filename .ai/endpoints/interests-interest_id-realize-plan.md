# API Endpoint Implementation Plan: Potwierdzenie realizacji wymiany (PATCH /api/interests/{interest_id}/realize)

## 1. Przegląd punktu końcowego

Endpoint `PATCH /api/interests/{interest_id}/realize` pozwala zalogowanemu użytkownikowi potwierdzić, że wymiana dotycząca danego `interest` została zrealizowana z jego strony. Jeśli obie strony potwierdzą realizację — system finalizuje wymianę, ustawia status `REALIZED`, zapisuje timestamp `realized_at` i (opcjonalnie) tworzy wpis w tabeli `exchange_history`, zwracając `exchange_history_id`.

Tech stack: TypeScript, Astro API routes (server-side), Supabase (Postgres) jako DB + Supabase client (`src/db/supabase.client.ts`). Projekt wykorzystuje RLS w DB; endpoint wykonuje logikę po stronie serwera w serwisie aplikacyjnym.

## 2. Szczegóły żądania

- Metoda HTTP: `PATCH`
- Struktura URL: `/api/interests/{interest_id}/realize`
- Nagłówki:
  - `Authorization: Bearer {token}` — wymagane
- Parametry:
  - Wymagane:
    - `interest_id` (path) — identyfikator rekordu `interests` (UUID zgodnie z DB)
  - Opcjonalne:
    - brak body w specyfikacji (operacja idempotentna względem potwierdzenia ze strony danego użytkownika)

Walidacja wejścia:

- Sprawdzić format `interest_id` (UUID). Jeśli niepoprawny → 400 Bad Request.
- Upewnić się, że middleware autoryzacyjny dostarczył `request.user.id` (jeśli brak/niepoprawny token → 401 Unauthorized).

## 3. Wykorzystywane typy

- `RealizeInterestCommand`

```ts
type RealizeInterestCommand = {
  interestId: string;
  requestingUserId: string;
};
```

- `RealizeInterestResponseDTO`

```ts
type RealizeInterestResponseDTO = {
  id: string;
  status: 'REALIZED' | string;
  realized_at: string | null;
  message: string;
  exchange_history_id?: string;
};
```

- `InterestRecord` (DB read model — istotne pola)

```ts
type InterestRecord = {
  id: string;
  user_id: string;
  offer_id: string;
  status: 'PROPOSED' | 'ACCEPTED' | 'REALIZED';
  realized_at?: string | null;
  created_at: string;
};
```

## 4. Szczegóły odpowiedzi

- 200 OK — następujące ciała:

Standard — jeśli realizację potwierdza jedna strona:

```json
{
  "id": "uuid",
  "status": "REALIZED",
  "realized_at": "2024-01-05T10:00:00Z",
  "message": "Wymiana potwierdzona"
}
```

Jeśli obie strony potwierdziły i system utworzył wpis historii wymiany:

```json
{
  "id": "uuid",
  "status": "REALIZED",
  "realized_at": "2024-01-05T10:00:00Z",
  "message": "Wymiana została zrealizowana!",
  "exchange_history_id": "uuid"
}
```

- Błędy (mapowanie):
  - `400 Bad Request` — "Status musi być ACCEPTED aby potwierdzić realizację" (lub niepoprawny interest_id)
  - `401 Unauthorized` — brak/nieprawidłowy token
  - `403 Forbidden` — użytkownik nie ma uprawnień (nie jest uczestnikiem tej wymiany)
  - `404 Not Found` — interest nie istnieje
  - `409 Conflict` — np. próba potwierdzenia już finalnie zrealizowanego rekordu (opcjonalnie)
  - `500 Internal Server Error` — nieoczekiwany błąd serwera / DB

Zasada: odpowiedzi błędów powinny używać ujednoliconego envelope błędu `ApiErrorResponse` z kodem i krótkim message.

## 5. Przepływ danych (implementacja krok po kroku)

Warstwy:

- API route (Astro): `src/pages/api/interests/[interest_id]/realize.ts` (handler)
- Service: `InterestsService.realizeInterest(command)`
- Repo/DB: `src/db/supabase.client.ts` (Supabase client)
- Optional: triggers w DB (create_exchange_history_on_realized) — zachować spójność z triggerami istniejącymi w schemacie DB

Operacje:

1. Handler odbiera request, wyciąga `interest_id` z path i `requestingUserId` z kontekstu (middleware).
2. Walidacja: UUID, obecność usera.
3. Utworzenie `RealizeInterestCommand` i wywołanie `InterestsService.realizeInterest`.
4. W serwisie:
   - Pobierz rekord `interest` po `id` (SELECT ... FOR UPDATE / w transakcji jeśli DB wspiera).
   - Jeśli brak rekordu → throw NotFoundError → handler zwraca 404.
   - Sprawdź, że `interest.status === 'ACCEPTED'` (zgodnie ze specyfikacją) — jeśli nie → throw BadRequestError (400) z komunikatem "Status musi być ACCEPTED aby potwierdzić realizację".
   - Sprawdź, że `requestingUserId` jest jedną ze stron wymiany (czy jest użytkownikiem przypisanym do tego rekordu — np. `interest.user_id` albo jest właścicielem drugiej strony; szczegóły zależą od modelu danych). Jeśli nie → ForbiddenError (403).
   - Jeśli wszystko OK: w transakcji DB:
     a) Uaktualnić rekord `interest` ustawiając `status = 'REALIZED'` i `realized_at = now()` WHERE id = ...
     b) Sprawdzić, czy drugi interest (druga strona) dla tej samej wymiany (pary ofert) także ma `status = 'REALIZED'`. Jeśli tak: - Utworzyć wpis w `exchange_history` (jeśli nie jest tworzony przez trigger) i zapisać `exchange_history_id`. - Opcjonalnie oznaczyć powiązane oferty jako `REMOVED` lub inny status biznesowy (dopasować do reguł).
   - Commit transakcji.
5. Zwrócić `RealizeInterestResponseDTO` z polami `id`, `status`, `realized_at`, `message` i opcjonalnie `exchange_history_id`.

Transakcje i locking:

- Używać transakcji DB na poziomie serwisu, aby zapobiec race conditions — SELECT ... FOR UPDATE lub odpowiednie API transakcyjne Supabase.
- Obsłużyć konflikt, gdy druga strona potwierdzi równocześnie (skalowanie do 409 lub retry w transakcji).

Optymalizacje:

- Wywołać minimalną ilość zapytań — pobrać niezbędne pola w jednym SELECT (user_id, status, offer_id, realized_at) i pracować transakcyjnie.

## 6. Względy bezpieczeństwa

- Autoryzacja:
  - Wymagać tokena Bearer; middleware powinien wstawić `request.user` (w szczególności `id`).
  - Sprawdzić, że użytkownik jest uczestnikiem wymiany (np. `interest.user_id === requestingUserId` lub inna relacja w modelu); tylko wtedy pozwolić na realizację.

- Uprawnienia i RLS:
  - Jeśli baza korzysta z RLS, upewnić się, że serwis działa z odpowiednią rolą i/lub że logika aplikacji dopasowuje do polityk RLS; w razie wątpliwości wykonać walidację uprawnień w kodzie.

- Race conditions / concurrency:
  - Zabezpieczyć transakcją; rozważyć optimistic locking (wersja row) lub explicit locking.

- Informacje zwracane:
  - Nie ujawniać wewnętrznych informacji (np. stack trace). Zwracać krótkie komunikaty. Szczegóły błędów zapisywać w logach.

- Transport i tokeny:
  - Wymusić HTTPS w produkcji; nie logować tokenów lub haseł.

## 7. Obsługa błędów

Zdefiniowane wyjątki w serwisie i mapowanie w handlerze:

- `ValidationError` → 400 Bad Request (np. niepoprawny interest_id format)
- `NotFoundError` → 404 Not Found (interest nie istnieje)
- `ForbiddenError` → 403 Forbidden (użytkownik nie jest stroną wymiany)
- `BadRequestError` → 400 Bad Request (np. status != ACCEPTED)
- `ConflictError` → 409 Conflict (próba duplikatu lub konflikt transakcji)
- `InternalError` → 500 Internal Server Error

Przykład ujednoliconego błędu:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Brak uprawnień"
  }
}
```

Logowanie błędów:

- Wszystkie 5xx i krytyczne 4xx logować do centralnego loggera (np. Sentry). Zalecane pola: endpoint, method, user_id, interest_id, timestamp, error_code, stack.
- Opcjonalnie: wstaw rekord do tabeli `api_error_logs` z kontekstem (jeżeli projekt ma taką tabelę).

## 8. Wydajność

- Latency: operacja mutująca i transakcyjna — oczekiwany czas odpowiedzi < 300-500ms dla zwykłych warunków przy poprawnej konfiguracji Supabase.
- Indeksy: upewnić się, że `interests.id` jest PK i `interests.offer_id` / `interests.user_id` są zaindeksowane — już typowe w schemacie.
- Skalowanie: endpoint rzadko będzie hotspotem; jednak przy równoczesnych potwierdzeniach (wysoki concurrency) – konieczna transakcja i obsługa konfliktów.
- Cache: nie dotyczy (mutacja).

## 9. Kroki implementacji (zadaniowy plan)

0. Przygotowanie:

- Upewnić się, że `locals.supabase` i middleware autoryzacyjny dostępne. Sprawdzić `src/middleware/index.ts`.
- Potwierdzić format `interest.id` w `src/db/database.types.ts` (UUID).

1. Definicja typów (lokalnie):

- Dodać `RealizeInterestCommand` i `RealizeInterestResponseDTO` do `src/types.ts` lub `src/types/interests.ts`.

2. Serwis:

- Utworzyć/uzupełnić `src/services/interests.service.ts`:
  - Metoda: `async realizeInterest(command: RealizeInterestCommand): Promise<RealizeInterestResponseDTO>`
  - Implementacja:
    - Pobierz rekord interest (SELECT ... FOR UPDATE).
    - Walidacje: is exist, is participant, status === 'ACCEPTED' (jeśli nie -> throw BadRequestError).
    - W transakcji: UPDATE interest SET status='REALIZED', realized_at=now().
    - Sprawdź czy obie strony mają teraz status REALIZED (np. select drugi interest dla pary). Jeśli tak:
      - Utwórz wpis w `exchange_history` (jeśli trigger DB tego nie robi) i pobierz `exchange_history_id`.
    - Zwróć `RealizeInterestResponseDTO`.

3. Endpoint handler:

- Dodaj plik: `src/pages/api/interests/[interest_id]/realize.ts` (albo w konwencji projektu).
- Handler:
  - requireAuth middleware → uzyskaj `requestingUserId`.
  - Walidacja parametru `interest_id` (UUID).
  - Wywołaj `InterestsService.realizeInterest`.
  - Zmapuj wyjątki na odpowiednie HTTP statusy (użyj centralnego error mappera).

4. Mapowanie błędów i testy:

- Zaimplementować jednostkowe testy serwisu (scenariusze: success single confirm, success both confirm → exchange_history created, forbidden, bad status, not found, conflict).
- Integration test dla endpointu (mock lub test DB).

5. Logging i monitoring:

- Dodać Sentry capture dla 5xx.
- Logować sukcesy i błędy w centralnym loggerze (bez danych wrażliwych).

6. Dokumentacja:

- Zaktualizować dokumentację API (OpenAPI/README) — opisać success 200 oraz przypadek finalizacji z `exchange_history_id`.

7. CI i wdrożenie:

- Uruchomić linter (`npm run lint`) i testy (`npm test`) przed merge.
- Deploy na staging → testy manualne → deploy production.

## 10. Przykładowy pseudokod implementacji (skrócony)

```ts
// src/services/interests.service.ts
async function realizeInterest({ interestId, requestingUserId }: RealizeInterestCommand) {
  return db.transaction(async (tx) => {
    const interest = await tx('interests').select('*').where({ id: interestId }).first().forUpdate();
    if (!interest) throw new NotFoundError('Interest not found');
    if (!isParticipant(interest, requestingUserId)) throw new ForbiddenError('Brak uprawnień');
    if (interest.status !== 'ACCEPTED')
      throw new BadRequestError('Status musi być ACCEPTED aby potwierdzić realizację');

    await tx('interests')
      .where({ id: interestId })
      .update({ status: 'REALIZED', realized_at: new Date().toISOString() });

    // sprawdź czy druga strona również REALIZED — jeśli tak, utwórz exchange_history
    const otherSideRealized = await tx('interests')
      .where({
        /* warunek powiązania pary wymiany */
      })
      .andWhere({ status: 'REALIZED' })
      .first();

    let exchangeHistoryId;
    if (otherSideRealized) {
      const [history] = await tx('exchange_history')
        .insert({
          /* dane */
        })
        .returning('id');
      exchangeHistoryId = history.id;
    }

    return {
      id: interestId,
      status: 'REALIZED',
      realized_at: new Date().toISOString(),
      message: otherSideRealized ? 'Wymiana została zrealizowana!' : 'Wymiana potwierdzona',
      exchange_history_id: exchangeHistoryId,
    };
  });
}
```

## 11. Potencjalne ryzyka i zalecenia

- Race conditions przy równoczesnym potwierdzaniu po obu stronach → zabezpieczyć transakcją i obsłużyć konflikty (retry lub 409).
- Jeśli w projekcie już istnieją DB triggers tworzące `exchange_history` — NIE duplikować logiki. Ustalić jedno źródło prawdy: trigger lub aplikacja. Preferowane: trigger DB (atomic, niezależny od aplikacji) — wtedy serwis powinien tylko odczytać wynik lub ID historii, jeśli trigger zapisuje je gdzieś.
- Upewnić się, że `InterestService` nie ujawnia wewnętrznych błędów — mapować do ujednoliconych kodów API.

## 12. Checklista przed merge

- [ ] Typy DTO dodane i zaimportowane (`src/types.ts` lub `src/types/interests.ts`)
- [ ] `InterestsService.realizeInterest` zaimplementowana z transakcjami i testami
- [ ] Endpoint handler dodany w `src/pages/api/interests/[interest_id]/realize.ts`
- [ ] Walidacja UUID i autoryzacja middleware sprawdzona
- [ ] Mapowanie błędów poprawne (403/400/404/500)
- [ ] Linter i testy przechodzą
- [ ] Dokumentacja API zaktualizowana
