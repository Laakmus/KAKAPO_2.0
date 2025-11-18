# API Endpoint Implementation Plan: Exchange History

## 1. Przegląd punktu końcowego

- Cel: Zwrócenie paginowanej listy zrealizowanych wymian (transakcji/wymian) dla aktualnie zalogowanego użytkownika. Każdy rekord zawiera identyfikator wymiany, dane drugiej strony (name + id), informacje o ofercie użytkownika (mojej) i ofercie drugiej strony oraz datę realizacji.
- Użytkownicy mogą przeglądać swoją historię wymian; endpoint nie tworzy ani nie modyfikuje danych.

## 2. Szczegóły żądania

- Metoda HTTP: `GET`
- Struktura URL: `/api/exchange-history`
- Nagłówki:
  - `Authorization: Bearer {token}` — wymagany (JWT / Supabase session token)
- Parametry zapytania:
  - Wymagane: brak (autoryzacja obowiązkowa w headerze)
  - Opcjonalne:
    - `page` (number) — numer strony, domyślnie `1`
    - `limit` (number) — rekordy na stronę, domyślnie `20`, maksymalnie `50`
- Request Body: brak (GET)

## 3. Wykorzystywane typy (DTO / Command Models)

- `ExchangeHistoryQueryDTO`
  - `page: number` (>=1)
  - `limit: number` (1..50)

- `ExchangeHistoryItemDTO`
  - `id: string` (uuid)
  - `other_user: { id: string; name: string }`
  - `my_offer: { id: string; title: string }`
  - `their_offer: { id: string; title: string }`
  - `realized_at: string` (ISO 8601)

- `PaginationDTO`
  - `page: number`
  - `limit: number`
  - `total: number`
  - `total_pages: number`

- `ExchangeHistoryResponseDTO`
  - `data: ExchangeHistoryItemDTO[]`
  - `pagination: PaginationDTO`

Uwagi: DTO definiujemy w `src/types.ts` lub dedykowanym `src/api/dto/exchangeHistory.ts`. Wszystkie pola typowane w TypeScript oraz walidowane po stronie serwera.

## 4. Przepływ danych

1. Middleware/uwierzytelnianie:
   - Middleware autoryzacyjny (`src/middleware/index.ts`) wyciąga i weryfikuje token z `Authorization` i wstawia `req.user` (lub `context.user`) z `userId`.
2. Kontroler / route handler (`src/pages/api/exchange-history.ts` lub odpowiedni backend route):
   - Parsowanie i walidacja query params (`page`, `limit`).
   - Wywołanie serwisu: `ExchangeHistoryService.getExchangeHistory(userId, page, limit)`.
3. Serwis (`src/services/exchangeHistoryService.ts`):
   - Buduje zapytanie do DB (Supabase client z `src/db/supabase.client.ts`).
   - Filtruje rekordy: tylko zrealizowane wymiany, w których uczestniczy `userId`.
   - Dołącza/wybiera niezbędne pola z tabel ofert i użytkowników (JOIN-like select w Supabase).
   - Pobiera łączną liczbę wyników (count) do paginacji (używając Supabase `select(..., { count: 'exact' })` lub osobnego zapytania - zależnie od wydajności).
   - Mapuje wynik DB do `ExchangeHistoryItemDTO[]` i oblicza `total_pages`.
4. Kontroler zwraca 200 z ustrukturyzowaną odpowiedzią zgodnie z DTO.

Przykładowe zapytanie DB (pseudokod, Supabase):

```sql
-- logic: exchanges table posiada user_a_id, user_b_id, my_offer_id, their_offer_id, realized_at, status
SELECT e.id, e.realized_at,
       CASE WHEN e.user_a_id = :userId THEN u_b.id ELSE u_a.id END as other_user_id,
       CASE WHEN e.user_a_id = :userId THEN u_b.name ELSE u_a.name END as other_user_name,
       CASE WHEN e.user_a_id = :userId THEN o_a.id ELSE o_b.id END as my_offer_id,
       -- map titles similarly
FROM exchanges e
JOIN users u_a ON u_a.id = e.user_a_id
JOIN users u_b ON u_b.id = e.user_b_id
JOIN offers o_a ON o_a.id = e.user_a_offer_id
JOIN offers o_b ON o_b.id = e.user_b_offer_id
WHERE (e.user_a_id = :userId OR e.user_b_id = :userId) AND e.status = 'realized'
ORDER BY e.realized_at DESC
LIMIT :limit OFFSET :offset
```

Uwaga: implementacja powinna korzystać z Supabase JS client API (bez surowych SQL, chyba że stosujemy RPC).

## 5. Względy bezpieczeństwa

- Uwierzytelnianie: `Authorization: Bearer` — wymagane. Handler powinien odrzucać żądanie bez aktywnego użytkownika (401).
- Autoryzacja: zwracane rekordy muszą być filtrowane tak, aby użytkownik widział tylko wymiany, w których jest uczestnikiem. Nie ujawniać ofert/ danych osób trzecich poza `other_user` (id + name) i tylko pól dozwolonych.
- SQL Injection: używać Supabase SDK / parametrów zapytań, nie interpolować surowego SQL.
- Ograniczenie danych: nie zwracać poufnych pól (email, phone, itp.) — tylko `id` i `name` dla `other_user`.
- Rate limiting: rozważyć globalny rate-limit lub per-user (np. 60 req/min) aby zapobiec scrapingowi historii.
- RLS (Row-Level Security): jeśli DB korzysta z RLS, upewnić się, że polityki pozwalają tylko na odczyt wymian dla uczestników.
- Logging and monitoring: anonimizować w logach tokeny/ciastka.

## 6. Obsługa błędów

- 200 OK — pomyślne zwrócenie danych.
- 400 Bad Request — niepoprawne parametry (np. `page` < 1, `limit` poza zakresem lub nie-number).
  - Response: { error: "InvalidParameter", message: "limit must be between 1 and 50" }
- 401 Unauthorized — brak lub niepoprawny token / brak `req.user`.
  - Response: { error: "Unauthorized", message: "Authentication required" }
- 403 Forbidden — (opcjonalnie) użytkownik poprawny, ale naruszenie zasad autoryzacji — zwykle niepotrzebne, bo filtrujemy wyniki.
- 404 Not Found — (rzadko) jeśli strona przekracza zakres i chcemy zwrócić puste `data` z paginationem zamiast 404 (preferowane).
- 429 Too Many Requests — jeżeli rate-limit został przekroczony.
- 500 Internal Server Error — nieoczekiwane błędy serwera / DB.

Logowanie błędów:

- Krótkoterminowo: korzystać z istniejącego loggera (Konsola lub winston). Rejestrować:
  - userId (jeśli dostępny), endpoint, query params (bez tokenów), timestamp, error.message, error.stack
- Długoterminowo: zapisywać wpisy błędów do tabeli `error_logs` lub wysyłać do Sentry. Schemat tabeli `error_logs`:
  - id, route, user_id, payload_summary, error_message, stack, created_at

## 7. Wydajność

- Paginacja: wymuszać limit maksymalny 50; preferować offset/limit lub technikę "keyset pagination" (jeśli użytkownik ma bardzo dużo rekordów).
- Indeksy DB: indeksy na `realized_at`, `user_a_id`, `user_b_id`, oraz na kolumnach filtrujących (status).
- Selectivity: wybierać tylko potrzebne kolumny (avoid SELECT \*).
- Liczenie total: `count` w Supabase może być kosztowne; rozważyć:
  - opcję `select(..., { count: 'exact' })` jeśli liczba użytkowników ma umiarkowaną wielkość,
  - lub zwracać `total` przybliżone lub robić osobne zapytanie typu `COUNT(*)` w tle, cache'ować wyniki.
- Cache: krótkoterminowy cache (per-user, TTL krótkie) może pomóc, ale trzeba dbać o spójność (po realizacji wymiany).

## 8. Kroki implementacji

Przyjmując strukturę projektu (Astro + TypeScript + Supabase) — proponowane pliki i zmiany:

1. Przygotowanie DTO i typów
   - Dodaj `src/api/dto/exchangeHistory.ts` (albo do `src/types.ts`) z definicjami `ExchangeHistoryQueryDTO`, `ExchangeHistoryItemDTO`, `PaginationDTO`, `ExchangeHistoryResponseDTO`.

2. Serwis
   - Stwórz `src/services/exchangeHistoryService.ts`.
   - Publiczny interfejs: `async function getExchangeHistory(userId: string, page: number, limit: number): Promise<{ items: ExchangeHistoryItemDTO[]; total: number }>`
   - Implementacja: użyj `supabaseClient` z `src/db/supabase.client.ts` do złożenia zapytania; zastosuj paginację i dokładny count (albo osobne zapytanie).
   - Mapowanie wyników DB -> DTO (usuń sensitive fields).

3. Route handler / Kontroler
   - Dodaj plik `src/pages/api/exchange-history.ts` (lub `src/pages/api/exchange-history/index.ts`) z handlerem GET.
   - Integracja z autoryzacyjnym middleware (jeżeli istnieje). Jeśli middleware ustawia `context.user`, niech handler pobiera `userId` z tamtej warstwy.
   - Parsowanie i walidacja `page` i `limit`:
     - domyślnie `page = 1`, `limit = 20`
     - cast to int, sprawdzić `page >= 1`, `1 <= limit <= 50`
     - przy błędach walidacji zwrócić 400
   - Wywołanie `ExchangeHistoryService.getExchangeHistory(userId, page, limit)` i zwrócenie odpowiedzi 200.

4. Walidacja
   - Proponowane narzędzie: `zod` (jeśli już używane w projekcie) albo ręczne sprawdzenie typów i zakresów.
   - Walidować tylko `page` i `limit` (i obecność `userId`).

5. Testy
   - Unit testy dla `exchangeHistoryService` — test mappingu, paginacji i edge-cases.
   - Integration test dla endpointu (mock Supabase) sprawdzający:
     - brak tokena → 401
     - niepoprawne parametry → 400
     - paginacja działa, limit narzucony
     - user widzi tylko swoje wymiany

6. Migracje / Indeksy DB (jeżeli kontrolujesz DB)
   - Upewnić się, że istnieją indeksy na `realized_at`, `user_a_id`, `user_b_id`, `status`.
   - Jeżeli nie, dodać migrację SQL do katalogu `supabase/migrations/`.

7. Monitoring i logi
   - Dodaj logi sukcesów i błędów (info + error) w serwisie i handlerze.
   - Utwórz alerty (Sentry / opentracing) dla powtarzających się błędów 5xx.

8. QA i deployment
   - Uruchomić linter, type-check, unit/integration tests.
   - Staging deploy → manualne testy (różne przypadki paginacji).
   - Release do produkcji.

9. Dokumentacja
   - Zaktualizować dokumentację API (OpenAPI / markdown) z przykładowymi request/response.

10. Utrzymanie

- Rewizja limitów paginacji po 1 miesiącu użycia.
- Analiza wydajności zapytań i ewentualne przejście na keyset pagination jeśli offset staje się wąskim gardłem.

## Przykładowe odpowiedzi

- Sukces (200):

```json
{
  "data": [
    {
      "id": "uuid",
      "other_user": { "id": "uuid", "name": "Anna Nowak" },
      "my_offer": { "id": "uuid", "title": "Laptop Dell" },
      "their_offer": { "id": "uuid", "title": "Rower górski" },
      "realized_at": "2024-01-05T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "total_pages": 1
  }
}
```

- Błąd walidacji (400):

```json
{ "error": "InvalidParameter", "message": "limit must be between 1 and 50" }
```

- Brak autoryzacji (401):

```json
{ "error": "Unauthorized", "message": "Authentication required" }
```

## Checklista implementacyjna (zadania deweloperskie)

1. Dodać DTO w `src/api/dto/exchangeHistory.ts` — DONE/REVIEW
2. Stworzyć `src/services/exchangeHistoryService.ts` — implementacja zapytań i mapowania
3. Dodać route handler `src/pages/api/exchange-history.ts` integrujący middleware
4. Dodać walidację `page` i `limit` (zod lub ręcznie)
5. Dodać/zweryfikować indeksy DB w `supabase/migrations/`
6. Napisać unit + integration tests
7. Dodać logowanie błędów i integrację z Sentry (opcjonalnie)
8. Zaktualizować dokumentację API
9. Deploy -> staging -> prod

---

Plik z planem został zapisany jako `.ai/exchange-history-plan.md`.
