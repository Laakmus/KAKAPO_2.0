# API Endpoint Implementation Plan: Wyrażenie zainteresowania (POST /api/interests)

## 1. Przegląd punktu końcowego

Endpoint pozwala zalogowanemu użytkownikowi wyrazić zainteresowanie konkretną ofertą przez podanie `offer_id`. System zapisuje rekord "interest" ze statusem `PROPOSED`. Jeżeli wykryte zostanie wzajemne dopasowanie (mutual match), status powinien być `ACCEPTED`, chat zostaje utworzony, a odpowiedź zawiera `chat_id`.

Technologie: TypeScript, Astro (server-side endpoints), Supabase (Postgres) używany przez `src/db/supabase.client.ts`. Kod serwisowy w `src/services/`.

## 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/api/interests`
- Headers:
  - Wymagane: `Authorization: Bearer {token}`
- Parametry:
  - Wymagane:
    - `offer_id` (UUID) w body
  - Opcjonalne: brak
- Request Body:

```json
{
  "offer_id": "uuid"
}
```

Walidacja wejścia:

- Sprawdzić obecność i poprawność nagłówka Authorization (wyodrębnij `requesterId`).
- Walidować `offer_id` jako UUID.

## 3. Wykorzystywane typy (DTO / Command)

- InterestCreateDTO

```ts
type InterestCreateDTO = {
  offer_id: string;
};
```

- ExpressInterestCommand

```ts
type ExpressInterestCommand = {
  requesterId: string;
  offerId: string;
};
```

- InterestResponseDTO

```ts
type InterestResponseDTO = {
  id: string;
  offer_id: string;
  user_id: string;
  status: 'PROPOSED' | 'ACCEPTED';
  created_at: string;
  message: string;
  chat_id?: string;
};
```

## 4. Szczegóły odpowiedzi

- 201 Created — standardowy zwrot przy powodzeniu:

```json
{
  "id": "uuid",
  "offer_id": "uuid",
  "user_id": "uuid",
  "status": "PROPOSED",
  "created_at": "2024-01-01T10:00:00Z",
  "message": "Zainteresowanie zostało wyrażone"
}
```

- 201 Created — jeśli mutual match (z dodatkowym `chat_id`):

```json
{
  "id": "uuid",
  "offer_id": "uuid",
  "user_id": "uuid",
  "status": "ACCEPTED",
  "created_at": "2024-01-01T10:00:00Z",
  "message": "Wzajemne zainteresowanie! Chat został otwarty",
  "chat_id": "uuid"
}
```

- Błędy:
  - 400 Bad Request — "Nie możesz być zainteresowany własną ofertą"
  - 401 Unauthorized — brak/nieprawidłowy token
  - 404 Not Found — oferta nie istnieje
  - 409 Conflict — "Już wyraziłeś zainteresowanie tą ofertą"
  - 422 Unprocessable Entity — niepoprawne UUID
  - 500 Internal Server Error — nieoczekiwane błędy

## 5. Przepływ danych (szczegółowo)

Warstwy:

- API handler (`src/pages/api/interests.ts` lub `src/pages/api/interests/index.ts`) — parsowanie requestu, autoryzacja, mapowanie do `ExpressInterestCommand`, wywołanie `InterestsService`.
- `InterestsService.expressInterest(command)` — cała logika biznesowa i transakcje DB.
- Repozytorium / DB client (`src/db/supabase.client.ts`) — zapytania SQL/CRUD.

Operacje krok po kroku:

1. Parsowanie i autoryzacja: sprawdź token, pobierz `requesterId`.
2. Walidacja request body: `offer_id` jako UUID.
3. Pobierz ofertę z tabeli `offers` po `offer_id`.
   - Jeśli oferta nie istnieje -> 404.
4. Sprawdź właściciela oferty:
   - Jeśli `offer.owner_id === requesterId` -> 400.
5. Sprawdź istnienie istniejącego interest (unikalny rekord: offer_id + user_id).
   - Jeśli istnieje -> 409.
6. Wykryj wzajemne dopasowanie (mutual match):
   - Definicja propozycji: istnieje interest w odwrotną stronę — tzn. właściciel tej oferty wyraził zainteresowanie którejś ofercie należącej do requestera. Implementacyjnie:
     a) Pobierz listę `offer.id` gdzie `offers.user_id = requesterId`.
     b) Sprawdź, czy istnieje interest record gdzie `offer_id` IN (te oferty) i `user_id = offer.owner_id`.
   - Jeśli mutual match:
     - W transakcji: utwórz rekord chat w tabeli `chats`, ustaw status interest na `ACCEPTED`, zwróć `chat_id`.
   - Inaczej:
     - W transakcji: utwórz interest ze statusem `PROPOSED`.
7. Zwróć odpowiedni DTO z 201 Created.

Transakcje:

- Zawsze wykonywać inserty/aktualizacje będące częścią operacji mutual match w jednej transakcji DB, aby zachować spójność (insert interest + insert chat + ewentualne update statusów).

Indeksy / constraints:

- UNIQUE constraint (offer_id, user_id) w tabeli `interests` by wymusić unikalność i zwalniać logikę od race conditions na poziomie aplikacji (jednak nadal należy obsłużyć konflikt DB i zamienić go na 409).
- Index na `offers.user_id` oraz `interests.offer_id` i `interests.user_id`.

## 6. Względy bezpieczeństwa

- Autoryzacja:
  - Wymusić walidację tokena (JWT lub Supabase) po stronie serwera.
  - Używać `requesterId` z tokena zamiast przyjmować `user_id` w body.
- Autoryzacja operacji:
  - Nie pozwalać na działania niezgodne z zasadami (np. expresInterest dla własnej oferty).
- RLS i uprawnienia:
  - Jeśli używamy Supabase RLS, endpoint powinien korzystać z serwera pośredniczącego (service key) lub backendowego konta z odpowiednimi prawami i nie wykonywać operacji bezpośrednio z klienta.
- Input sanitization: używać parametrów zapytań, nie interpolować stringów do SQL.
- Rate limiting: dodać limit na ilość wyrażonych zainteresowań na minutę (w warstwie API lub reverse-proxy).
- Logging: nie logować całego tokena; logować user_id i offer_id.

## 7. Obsługa błędów

Mapowanie błędów do kodów HTTP:

- Walidacja tokena -> 401 Unauthorized
- Nieprawidłowy payload / UUID -> 422 Unprocessable Entity (lub 400 gdy to prosty błąd payloadu)
- Oferta nie istnieje -> 404 Not Found
- Zainteresowanie własną ofertą -> 400 Bad Request (treść: "Nie możesz być zainteresowany własną ofertą")
- Duplikat -> 409 Conflict (treść: "Już wyraziłeś zainteresowanie tą ofertą")
- Błąd transakcji/DB -> 500 Internal Server Error (logować szczegóły do Sentry/error_logs)

Format błędu (przykład):

```json
{
  "status": 409,
  "error": "Conflict",
  "message": "Już wyraziłeś zainteresowanie tą ofertą",
  "details": null
}
```

Rekomendacje:

- Zwracać krótkie, przyjazne komunikaty użytkownikowi. Szczegóły techniczne kierować do logów.
- Dla przypadków race condition (konflikt DB przy UNIQUE constraint) tłumaczyć błąd DB na 409.

## 8. Wydajność

- Indeksy i unikalny constraint (offer_id, user_id) minimalizują koszty sprawdzania duplikatów.
- Minimalizować liczbę zapytań DB:
  - Agregowane zapytania lub CTE do sprawdzania mutual match zamiast wielu zapytań.
  - Użyć transakcji i zwracać dane stworzone w ramach tej samej transakcji.
- Potencjalne wąskie gardła:
  - Operacje mutual match które wymagają sprawdzenia wielu ofert — optymalizować zapytania (LIMIT, joiny).
  - Locki DB przy dużej liczbie równoczesnych zapisów -> stosować unikalne ograniczenie i obsługę konfliktu.

## 9. Kroki implementacji (szczegółowy plan zadaniowy)

Przyjmuję, że repo zawiera `src/db/supabase.client.ts` i strukturę `src/pages/` dla endpointów oraz `src/services/` (jeśli brak — utwórz).

1. Utworzenie typów i DTO
   - Plik: `src/types/interests.ts` lub dopasuj do istniejącej struktury `src/types.ts`.
   - Zaimplementować: `InterestCreateDTO`, `ExpressInterestCommand`, `InterestResponseDTO`.

2. Service: `InterestsService`
   - Plik: `src/services/interests.service.ts`
   - Metoda: `async expressInterest(command: ExpressInterestCommand): Promise<InterestResponseDTO>`
   - Zadania wewnątrz:
     a) Walidacja UUID.
     b) Pobranie oferty: SELECT \* FROM offers WHERE id = $1.
     c) Sprawdzenie właściciela.
     d) Sprawdzenie istniejącego interest: SELECT 1 FROM interests WHERE offer_id=$1 AND user_id=$2.
     e) Wykrywanie mutual match:
     - Pobierz oferty requestera: SELECT id FROM offers WHERE user_id = requesterId.
     - SELECT 1 FROM interests WHERE offer_id IN (...) AND user_id = offer.owner_id LIMIT 1.
       f) W transakcji:
     - INSERT INTO interests(...).
     - Jeśli mutual: INSERT INTO chats(...) i UPDATE interest.status = 'ACCEPTED' (lub ustawienie odpowiednich rekordów).

3. Endpoint handler
   - Plik: `src/pages/api/interests.ts` (albo zgodnie z konwencją projektu)
   - Zadania:
     - Parsowanie request body.
     - Autoryzacja: użyj istniejącego middleware z `src/middleware/index.ts` lub manualnie wyciągnij `requesterId`.
     - Wywołanie `InterestsService.expressInterest`.
     - Mapowanie i zwrócenie 201 z JSON.
     - Obsługa błędów i mapowanie na odpowiednie statusy.

4. Testy
   - Jednostkowe testy dla `InterestsService`:
     - scenariusze: sukces PROPOSED, success ACCEPTED (mutual), 400 own offer, 409 duplicate, 404 offer missing.
   - Integracyjne testy endpointu (mock token, test DB lub testcontainer).

5. DB: constraints i migracje
   - Dodać migration:
     - UNIQUE INDEX (offer_id, user_id) on `interests`.
     - Index `offers.user_id`.
   - Ewentualna tabela `chats` (jeśli nie ma) i `error_logs` (opcjonalnie).

6. Logging i monitoring
   - Instrumentacja: Sentry lub inny logger dla wyjątków.
   - Logowanie zdarzeń: success/failed attempts (bez tokenów).

7. Dokumentacja
   - Zaktualizować API docs README, dodać przykład request/response.
   - Zaktualizować specyfikację wewnętrzną (OpenAPI jeśli używane).

8. Code review i CI
   - Linter i static types check (tsc, ESLint).
   - Uruchomić testy w CI i zająć się poprawkami.

9. Wdrożenie
   - Deploy na staging, manualne smoke tests.
   - Monitorowanie i deploy na production.

## 10. Przykładowe fragmenty zapytań (pseudo-SQL / Supabase)

- Sprawdzenie oferty:

```sql
SELECT id, user_id FROM offers WHERE id = $1;
```

- Sprawdzenie duplikatu interest:

```sql
SELECT 1 FROM interests WHERE offer_id = $1 AND user_id = $2 LIMIT 1;
```

- Sprawdzenie mutual match (optymalizowane):

```sql
WITH requester_offers AS (
  SELECT id FROM offers WHERE user_id = $2
)
SELECT 1 FROM interests i
JOIN requester_offers ro ON ro.id = i.offer_id
WHERE i.user_id = $3
LIMIT 1;
```

gdzie: $1 = targetOfferId, $2 = requesterId (owner of potential offers), $3 = offerOwnerId

## 11. Przyjęte założenia biznesowe (do potwierdzenia)

- Mutual match zdefiniowane jako: właściciel target oferty wcześniej wyraził zainteresowanie ofertą należącą do requestera. Jeśli wymóg jest inny, etap detekcji mutual match dostosować.
- Tabele `offers`, `interests`, `chats` już istnieją lub będą utworzone zgodnie z migracjami.

---

Zakończenie implementacji:

- Po zakończeniu wdrożenia zaktualizować dokumentację API i dodać testy end-to-end.
