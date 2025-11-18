# API Endpoint Implementation Plan: Wysyłanie wiadomości (POST /api/chats/{chat_id}/messages)

## 1. Przegląd punktu końcowego

- Cel: Umożliwić uczestnikowi czatu wysłanie wiadomości do istniejącego czatu. Punkt końcowy przyjmuje treść wiadomości, weryfikuje uprawnienia nadawcy (czy jest uczestnikiem czatu), zapisuje wiadomość w bazie danych i zwraca reprezentację zasobu z kodem 201 Created.
- Zakres funkcjonalny: walidacja długości treści (1–2000 znaków), autoryzacja Bearer token, zapis wiadomości, zwrócenie meta danych (id, chat_id, sender_id, sender_name, body, created_at).

## 2. Szczegóły żądania

- Metoda HTTP: `POST`
- Struktura URL: `/api/chats/{chat_id}/messages`
- Nagłówki:
  - `Authorization: Bearer {token}` — wymagany
  - `Content-Type: application/json`
- Parametry ścieżki:
  - Wymagane:
    - `chat_id` (UUID) — identyfikator czatu
  - Opcjonalne: brak
- Parametry zapytania: brak
- Request Body (JSON):

```json
{
  "body": "Kiedy możemy się spotkać?"
}
```

- Walidacja wejściowa:
  - `body` — wymagane, typ string, długość od 1 do 2000 znaków
  - `chat_id` — musi być poprawnym UUID
  - Token w headerze musi być obecny i poprawny (JWT/opaque zgodnie ze stackiem)

## 3. Wykorzystywane typy (DTO i Command Modele)

- Request DTO:
  - `SendMessageRequest`
    - `body: string`

- Command / Domain Model:
  - `SendMessageCommand`
    - `chatId: string` (UUID)
    - `senderId: string` (UUID) — uzyskane z tokena
    - `body: string`

- Response DTO:
  - `MessageResponse`
    - `id: string`
    - `chat_id: string`
    - `sender_id: string`
    - `sender_name: string`
    - `body: string`
    - `created_at: string` (ISO 8601 UTC)

- Database Model (istniejący / powiązany):
  - `messages` table columns: `id (uuid PK)`, `chat_id (uuid FK)`, `sender_id (uuid FK)`, `body (text)`, `created_at (timestamptz)`
  - opcjonalnie `sender_name` może być denormalizowany polem w `messages` albo pobierane przez join z `users`.

## 4. Szczegóły odpowiedzi

- Sukces:
  - Status: `201 Created`
  - Body: `MessageResponse` (patrz wyżej)
  - Header `Location`: `/api/chats/{chat_id}/messages/{id}` (opcjonalnie)

- Błędy (przykładowe):
  - `401 Unauthorized` — brak tokena lub niepoprawny token
  - `403 Forbidden` — użytkownik nie jest uczestnikiem czatu ("Brak uprawnień do tego czatu")
  - `400 Bad Request` — niewłaściwy format JSON lub `body` pusty ("Wiadomość nie może być pusta")
  - `422 Unprocessable Entity` — `body` za długie (>2000) ("Wiadomość może mieć maksymalnie 2000 znaków")
  - `404 Not Found` — `chat_id` nie istnieje (opcjonalnie)
  - `500 Internal Server Error` — nieoczekiwany błąd serwera

## 5. Przepływ danych

1. Autoryzacja
   - Middleware uwierzytelniający odczytuje `Authorization` i dekoduje token, ustawia `req.user = { id, name, ... }`.
2. Przyjęcie żądania i wstępna walidacja
   - Parsowanie JSON, schema validation `SendMessageRequest` (schema: `body: string, minLength:1, maxLength:2000`).
3. Weryfikacja uprawnień
   - Service `ChatService.isParticipant(chatId, userId)` sprawdza, czy `userId` należy do uczestników czatu.
   - Jeżeli false → zwróć `403 Forbidden`.
4. Tworzenie zasobu
   - Utworzenie `SendMessageCommand` i przekazanie do `MessageService.createMessage(command)`.
   - `MessageService`:
     - Generuje `id` (UUID) lub zleca DB wygenerowanie.
     - Wstawia wiersz do `messages` z `chat_id`, `sender_id`, `body`, `created_at`.
     - Opcjonalnie dba o denormalizację `sender_name` albo fetchuje `users.name` i zapisuje.
5. Zwrócenie odpowiedzi
   - Zwróć `201 Created` z `MessageResponse`.
6. Post-processing (asynchroniczne działania)
   - Emitowanie eventu (np. `message.created`) do WebSocket/real-time/notifications.
   - Aktualizacja statystyk czatu, indeksów full-text, notyfikacje push/email (asynchronicznie).

## 6. Względy bezpieczeństwa

- Autoryzacja:
  - Wymaga `Authorization: Bearer {token}`; middleware weryfikuje token oraz jego ważność i poprawność.
  - Po uwierzytelnieniu należy potwierdzić, że `req.user.id` jest uczestnikiem czatu (`ChatService.isParticipant`).

- Walidacja:
  - Strict JSON schema validation przed dalszym przetwarzaniem (Reject na dodatkowe pola jeśli polityka tego wymaga).
  - Limit długości `body` (1–2000).

- Ochrona przed XSS i SQL Injection:
  - Zabezpieczyć renderowanie po stronie klienta (serwer dobrze trzyma surową treść, escaping przy renderze).
  - Używać parametrów zapytań / prepared statements ORM (nie składać zapytań SQL ze stringów).

- Rate limiting / Abuse:
  - Rozważyć per-user rate limit (np. 10 wiadomości/sek w realtime; 1000/dzień) aby zapobiec spamowi.

- Audyt i logi:
  - Logowanie zdarzeń autoryzacji i odmów (403) z minimalnymi danymi (user_id, chat_id, timestamp).
  - Nie logować treści wiadomości w pełnym brzmieniu w logach produkcyjnych bez specjalnego uzasadnienia.

## 7. Obsługa błędów

- Błędy walidacji:
  - Brak/niepoprawne body: 400 Bad Request — body: "Wiadomość nie może być pusta"
  - Długość > 2000: 422 Unprocessable Entity — body: "Wiadomość może mieć maksymalnie 2000 znaków"

- Autoryzacja / autentykacja:
  - Brak/niepoprawny token: 401 Unauthorized
  - Brak uprawnień do czatu: 403 Forbidden — body: "Brak uprawnień do tego czatu"

- Zasób nie znaleziony:
  - Nie istnieje `chat_id`: 404 Not Found (opcjonalnie, zależnie od konwencji)

- Konflikty i ograniczenia:
  - Jeżeli istnieją polityki RLS lub inne reguły DB powodujące odmowę: mapować odpowiednio na 403 lub 409; logować szczegóły wewnętrznie.

- Błędy wewnętrzne:
  - Nieobsłużone wyjątki: 500 Internal Server Error; zwrócić ustandaryzowany body z request_id.
  - Rejestrować szczegóły w systemie logów i (opcjonalnie) w tabeli `error_logs` z polami: `id`, `request_id`, `user_id`, `chat_id`, `operation`, `error_message`, `stack`, `created_at`.

## 8. Wydajność

- Potencjalne wąskie gardła:
  - Wstawianie do bazy przy bardzo dużym natężeniu wiadomości (możliwe blokady, IO).
  - Synchronne pobieranie `sender_name` w tym samym zapytaniu może dodawać opóźnienia.

- Strategie optymalizacji:
  - Batch/async processing dla zadań post-procesowych (notyfikacje, indeksy full-text).
  - Denormalizacja `sender_name` podczas zapisu, aby uniknąć joinów w hot path.
  - Indeks na `messages.chat_id` (już istnieją w migrations).
  - Użycie szybkich insertów (prepared statements / ORM bulk if needed).
  - W przypadku dużego RPS: rozważ sharding/writing into a message queue (Kafka/Rabbit) i asynchroniczne trwałe zapisywanie.

## 9. Etapy wdrożenia (konkretne kroki dla zespołu)

1. Przygotowanie typów i struktur
   - Dodać `SendMessageRequest`, `SendMessageCommand`, `MessageResponse` do `src/types` lub odpowiedniego modułu typów.

2. Walidacja schematu
   - Dodać JSON schema / zdefiniować z użyciem biblioteki walidacyjnej (np. Zod / Joi / ajv) zgodnie ze stackiem.

3. Service layer
   - Jeżeli istnieje `MessageService`, dodać `createMessage(command)`. Jeśli nie — stworzyć `MessageService` z metodą `createMessage`.
   - Upewnić się, że `ChatService.isParticipant(chatId, userId)` istnieje; jeśli nie — dodać ją.

4. Endpoint / Controller
   - Dodać routę `POST /api/chats/:chat_id/messages` w warstwie routera.
   - Middleware auth powinien ustawić `req.user`.
   - Kontroler:
     - Parsuje i waliduje body.
     - Konwertuje do `SendMessageCommand`.
     - Wywołuje `ChatService.isParticipant`.
     - Wywołuje `MessageService.createMessage`.
     - Zwraca `201 Created` z `MessageResponse`.

5. Baza danych
   - Sprawdzić migracje (`supabase/migrations`) czy tabela `messages` ma wymagane kolumny i indeksy.
   - Dodać/zmodyfikować migracje jeśli brakuje kolumn (`sender_name` jeśli chcemy denormalizować).

6. Asynchroniczne rozszerzenia
   - Dodać emitowanie eventów po zapisie (np. `message.created`) do systemu real-time.
   - Dodać enqueue dla notyfikacji.

7. Testy
   - Unit tests dla `MessageService.createMessage` — walidacja, błędne wejścia, tworzenie wpisu.
   - Integration tests dla endpointu:
     - Sukces (201) dla uczestnika czatu.
     - 403 dla nieuczestnika.
     - 400/422 dla walidacji.
     - 401 przy braku tokena.
   - Testy end-to-end (opcjonalnie) sprawdzające propagację eventów.

8. Monitoring i logowanie
   - Dodać logowanie operacji (INFO) przy tworzeniu wiadomości z `request_id`.
   - Dodać alarmy dla wysokiej raty błędów 4xx/5xx.

9. PR / Code review
   - Przygotować PR z opisem (zmiany w service, controller, testy, migracje jeśli potrzebne).
   - Review: bezpieczeństwo (uwierzytelnienie, RLS), walidacja, sposób logowania treści.

10. Deployment

- Wdrażać na staging, uruchomić testy integracyjne, obserwować logi i metryki (latency, error rate).
- Po akceptacji, wdrożyć na production z monitorowaniem.

## 10. Mapowanie błędów na response (krótkie)

- Validation: 400 / 422 (z listą błędów walidacji)
- Unauthorized: 401
- Forbidden: 403 (treść: "Brak uprawnień do tego czatu")
- Not Found: 404 (chat nie istnieje)
- Internal: 500 (z `request_id` dla diagnostyki)

---

Plik ten opisuje szczegółowo implementację endpointu `POST /api/chats/{chat_id}/messages` zgodnie z dostarczoną specyfikacją i standardami implementacji. Zespół powinien wykonać kroki z sekcji Etapy wdrożenia po kolei, uruchomić testy i wdrożyć najpierw na staging.

# API Endpoint Implementation Plan: GET /api/chats/{chat_id}/messages

## 1. Przegląd punktu końcowego

- Cel: Zwrócenie listy wiadomości dla zadanego czatu. Endpoint ma być dostępny wyłącznie dla uczestników czatu (autoryzacja i weryfikacja uczestnictwa). Obsługuje stronicowanie i sortowanie chronologiczne.
- Użytkownicy: frontend (klienci), konsumenci API (mobile/web), serwisy wewnętrzne.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/api/chats/{chat_id}/messages`
- Nagłówki:
  - `Authorization: Bearer {token}` — obowiązkowy
- Parametry ścieżki:
  - `chat_id` (uuid) — wymagany
- Query parameters:
  - `page` (number, default: 1) — opcjonalny; numer strony, >=1
  - `limit` (number, default: 50, max: 100) — opcjonalny; liczba wiadomości na stronę
  - `order` (string, default: "asc", enum: ["asc","desc"]) — opcjonalny; sposób sortowania (chronologicznie)
- Request body: Brak (GET)

Wymagane parametry:

- `chat_id` w ścieżce
- `Authorization` header

Opcjonalne parametry:

- `page`, `limit`, `order`

## 3. Wykorzystywane typy (DTO i Command Modele)

- Request DTOs / Query:
  - GetChatMessagesQuery
    - chatId: string
    - page: number
    - limit: number
    - order: 'asc' | 'desc'

- Response DTO:
  - ChatMessageDto
    - id: string
    - chat_id: string
    - sender_id: string
    - sender_name: string
    - body: string
    - created_at: string (ISO 8601 UTC)

  - ChatMessagesListDto
    - data: ChatMessageDto[]
    - pagination:
      - page: number
      - limit: number
      - total: number
      - total_pages: number

- Command / Service input model:
  - FetchMessagesCommand
    - chatId: string
    - userId: string (wynik weryfikacji tokena)
    - page: number
    - limit: number
    - order: 'asc'|'desc'

## 4. Szczegóły odpowiedzi

- 200 OK

```json
{
  "data": [
    /* ChatMessageDto[] */
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 120,
    "total_pages": 3
  }
}
```

- 403 Forbidden: "Brak uprawnień do tego czatu" — gdy user nie jest uczestnikiem czatu lub token nie uprawnia
- 404 Not Found: "Czat nie istnieje" — gdy chat_id nie istnieje
- 400 Bad Request: przy błędnych parametrach zapytania (np. limit > 100, page < 1, niepoprawny order)
- 401 Unauthorized: brak/nieprawidłowy token
- 500 Internal Server Error: nieoczekiwany błąd serwera

Format dat: używać ISO 8601 w UTC (`created_at`).

## 5. Przepływ danych

1. Przyjmij żądanie, sparsuj nagłówek `Authorization`, zweryfikuj token (np. JWT lub Supabase session).
2. Wyodrębnij `userId` z tokena.
3. Waliduj parametry query (`page`, `limit`, `order`) i `chat_id` (UUID).
4. Service orchestration:
   - Wywołaj `ChatService.fetchMessages(command)`:
     - `ChatService` wykona:
       1. Sprawdzenie istnienia czatu (SELECT id FROM chats WHERE id = $chatId).
       2. Sprawdzenie uczestnictwa użytkownika (SELECT 1 FROM chat_participants WHERE chat_id = $chatId AND user_id = $userId). Jeśli brak -> 403.
       3. Pobranie łącznej liczby wiadomości do paginacji (COUNT) — uwzględnić RLS/filtry jeśli obowiązują.
       4. Pobranie wiadomości z tabeli `messages` z odpowiednim ORDER BY `created_at` i limitem/offsetem.
       5. Mapowanie wyników na `ChatMessageDto` (dołączyć `sender_name` przez JOIN na users).
5. Zbuduj i zwróć odpowiedź z `data` i `pagination`.

Uwaga: SQL powinien być przygotowany i parametryzowany, używać indeksów na `chat_id` i `created_at`.

## 6. Względy bezpieczeństwa

- Uwierzytelnianie: wymagany `Authorization: Bearer` token; weryfikować poprawność i ważność tokena.
- Autoryzacja: sprawdzać, czy `userId` należy do uczestników czatu (zabezpieczenie biznesowe).
- RLS: Jeśli baza używa polityk RLS (Supabase), sprawdzić, czy są zgodne z regułami; serwer może dodatkowo walidować uczestnictwo.
- Walidacja wejścia: zabezpieczać przed SQL injection (parametryzowane zapytania), walidować UUID i limity.
- Ograniczenie ujawniania danych: nie zwracać wrażliwych pól (np. adres email nadawcy) chyba że wymagane.
- Rate limiting: rozważyć ograniczenie zapytań na endpoint (np. 10 req/s per-user) by przeciwdziałać nadużyciom.
- Logowanie zdarzeń bezpieczeństwa: nieprawidłowe tokeny, próby dostępu do nieautoryzowanych czatów — zapisać do logów.

## 7. Obsługa błędów

- Walidacja wejścia:
  - 400 Bad Request — odpowiedź JSON z polem `error` oraz listą validation errors.

- Autoryzacja i dostęp:
  - 401 Unauthorized — gdy brak/niepoprawny token
  - 403 Forbidden — gdy user nie jest uczestnikiem czatu
  - 404 Not Found — gdy `chat_id` nie istnieje

- Błędy serwera:
  - 500 Internal Server Error — nieoczekiwane błędy (zalogować szczegóły)

- Logowanie błędów:
  - Jeżeli projekt ma tabelę błędów: zapisywać krytyczne wyjątki i incydenty bezpieczeństwa do `errors` (kolumny: id, endpoint, user_id, chat_id, error_code, message, meta JSON, created_at).
  - Dla błędów walidacji lub 4xx — logować krótkie zdarzenia debugowe (opcjonalnie).

## 8. Wydajność

- Indeksy: upewnić się, że istnieje indeks na `messages(chat_id, created_at)` oraz indeks na `chat_participants(chat_id, user_id)`.
- Pagination strategy: offset/limit jest prosty, ale przy dużych kolekcjach należy rozważyć keyset pagination (cursor) dla skalowalności; w krótkiej perspektywie implementować offset/limit z limitem 100.
- LIMIT maksymalny: 100 — jeśli większe żądanie, zwrócić 400.
- SELECT COUNT(\*) może być kosztowny dla bardzo dużych tabel; rozważyć szacunkowe metryki lub cache counts (opcjonalnie).
- Batch loading: przy pobieraniu sender_name używać JOIN zamiast N+1 zapytań.
- Cache: rozważyć cache po stronie serwera dla często odczytywanych czatów (np. ostatnie 100 wiadomości).

## 9. Kroki implementacji (detaliczny plan)

1. Przygotowanie środowiska i konwencji
   - Sprawdzić istniejące serwisy/auth utilities (`supabase.client.ts`, middleware auth).
   - Ustalić gdzie umieszczamy endpointy backendowe w projekcie (np. `src/middleware` lub `src/api/`).

2. DTO / Typy
   - Dodać w `src/types.ts` lub `src/db/database.types.ts` definicje `ChatMessageDto`, `ChatMessagesListDto`, `GetChatMessagesQuery`, `FetchMessagesCommand`.

3. Serwis / Logika biznesowa
   - Jeśli istnieje `ChatService`, dodać metodę `fetchMessages(cmd: FetchMessagesCommand): Promise<ChatMessagesListDto>`.
   - Jeśli nie istnieje, utworzyć `src/services/chat.service.ts` z `fetchMessages`.
   - Implementacja serwisu:
     - Walidacja istnienia czatu.
     - Sprawdzenie uczestnictwa.
     - Pobranie total count (COUNT) i paginacja (OFFSET).
     - Pobranie wiadomości z JOIN na users dla `sender_name`.
     - Mapowanie wyników.

4. Endpoint / Controller
   - Utworzyć handler HTTP `GET /api/chats/:chat_id/messages` (np. w `src/pages/api/chats/[chat_id]/messages.ts` albo zgodnie z konwencją projektu).
   - Krok po kroku:
     1. Parsowanie i weryfikacja tokenu (middleware auth lub lokalnie).
     2. Parsowanie `chat_id` i query params; walidacja (UUID, page>=1, 1<=limit<=100, order ∈ {asc,desc}).
     3. Zbudować `FetchMessagesCommand` i wywołać `ChatService.fetchMessages`.
     4. Zwrócić 200 z `ChatMessagesListDto`.
     5. Obsłużyć błędy i tłumaczyć wyjątki na odpowiednie statusy (401/403/404/400/500).

5. Walidacja
   - Użyć centralnej biblioteki walidacyjnej (z projektu) lub prostego zestawu walidatorów:
     - `chat_id` UUID
     - `page` number → parseInt, min 1
     - `limit` number → parseInt, 1..100
     - `order` → only "asc" or "desc"
   - Zwracać 400 z listą błędów przy nieprawidłowych parametrach.

6. Testy
   - Unit tests dla `ChatService.fetchMessages`:
     - przypadek prawidłowy, przypadek gdy chat nie istnieje (404), przypadek gdy user nie jest uczestnikiem (403), walidacja parametrów.
   - Integration tests / e2e:
     - Autoryzacja: brak tokena → 401
     - Nie uczestnik → 403
     - Paginate & order → sprawdzić kolejność i liczby
   - Testy wydajnościowe dla dużej liczby wiadomości (opcjonalnie).

7. Logowanie i monitoring
   - Dodać logi na poziomie INFO dla wywołań endpointu (userId, chatId, page, limit).
   - Dodać logi ERROR z tracebackiem dla wyjątków 5xx oraz zapisać krytyczne info do tabeli błędów (jeśli istnieje).

8. Dokumentacja
   - Zaktualizować dokumentację API (OpenAPI / Postman kolekcja) z przykładami.
   - Dodać wpis w `docs/` lub `README` o pagination i limitach.

9. Review i deploy
   - PR review: sprawdzić testy i bezpieczeństwo (autoryzacja, RLS).
   - Po mergu: monitorować błędy i opóźnienia.

## 10. Przykładowe SQL (parametryzowane)

-- Sprawdzenie uczestnictwa i pobranie count + messages (przykład, użyć parametryzacji)
-- COUNT
SELECT COUNT(1) AS total
FROM messages
WHERE chat_id = $1;

-- Messages with sender name (offset/limit)
SELECT m.id, m.chat_id, m.sender_id, u.display_name AS sender_name, m.body, m.created_at
FROM messages m
JOIN users u ON u.id = m.sender_id
WHERE m.chat_id = $1
ORDER BY m.created_at {ORDER}
LIMIT $2 OFFSET $3;

## 11. Mierniki sukcesu

- Endpoint zwraca poprawne dane ze zgodną paginacją.
- Testy jednostkowe i integracyjne przechodzą.
- Brak regresji bezpieczeństwa (autoryzacja).
- Akceptowalna latencja (<200-300ms dla typowych zapytań; zależne od bazy).

---

Plik ten zawiera szczegółowy plan dla zespołu implementującego endpoint `GET /api/chats/{chat_id}/messages`. Postępuj według kolejnych kroków implementacji, dodając testy i dokumentację przed wdrożeniem.
