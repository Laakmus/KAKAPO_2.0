# API Endpoint Implementation Plan: GET /api/chats

<!--
This file contains the implementation plan for the GET /api/chats endpoint.
It is written in Polish and follows the project's implementation rules and tech stack.
-->

## <analysis>

- Krótkie podsumowanie specyfikacji: endpoint `GET /api/chats` zwraca listę aktywnych czatów zalogowanego użytkownika. Autoryzacja przez `Authorization: Bearer {token}`. Opcjonalny query param `status` z wartościami `ACTIVE` (domyślnie) i `ARCHIVED`.
- Wymagane/opcjonalne parametry: wymagany header `Authorization`, opcjonalny `status` w query. Brak body (GET).
- Typy DTO/Command: `ChatSummaryDTO`, `UserDTO` (other_user), `MessageSummaryDTO` (last_message), optional `ListChatsQuery`.
- Logika serwisu: wydzielić do `ChatsService.listChats(userId, opts)` — serwis odpowiada za zapytania do DB, agregacje (`last_message`, `unread_count`), mapowanie do DTO i obsługę paginacji/limitów (jeśli później).
- Walidacja: sprawdzić header JWT/session (middleware), walidować `status` (enum), limit length/typów. Zwracać 400 przy niepoprawnych parametrach.
- Rejestrowanie błędów: zapisywać do centralnego loggera (np. `logger.error(...)`), krytyczne błędy opcjonalnie zapisywać do tabeli `error_logs` z kontekstem requesta (user_id, route, payload, error_stack).
- Zagrożenia bezpieczeństwa: brak autoryzacji, ujawnienie danych obcych użytkowników, SQL injection (używać klienta supabase/parametryzacji), brak RLS — upewnić się, że zapytania respektują RLS/polityki.
- Scenariusze błędów i statusy: 200 OK (lista), 400 Bad Request (invalid `status`), 401 Unauthorized (brak/nieprawidłowy token), 403 Forbidden (jeśli RLS/autoryzacja odmówi), 500 Internal Server Error.
  </analysis>

## 1. Przegląd punktu końcowego

Endpoint zwraca listę czatów użytkownika w formie zwięzłych wpisów (chat summary) zawierających: `id`, dane drugiego użytkownika (`other_user`), `last_message`, `unread_count`, `status` i `created_at`. Służy do wyświetlenia listy konwersacji w UI.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/api/chats`
- Headers:
  - `Authorization: Bearer {token}` — wymagane
- Query Parameters:
  - Wymagane: brak
  - Opcjonalne:
    - `status` (string) — dopuszczalne wartości: `ACTIVE`, `ARCHIVED`. Domyślnie `ACTIVE`.
    - (opcjonalnie w przyszłości) `limit`, `offset` lub `cursor` do paginacji
- Request Body: brak

## 3. Wykorzystywane typy

- ListChatsQuery (wewnętrzny)
  - `status?: "ACTIVE" | "ARCHIVED"`
  - `limit?: number`
  - `offset?: number`

- ChatSummaryDTO
  - `id: string` (uuid)
  - `other_user: UserDTO`
  - `last_message?: MessageSummaryDTO | null`
  - `unread_count: number`
  - `status: "ACTIVE" | "ARCHIVED"`
  - `created_at: string` (ISO)

- UserDTO
  - `id: string`
  - `name: string`

- MessageSummaryDTO
  - `body: string`
  - `sender_id: string`
  - `created_at: string` (ISO)

Uwagi: Typy umieścić w `src/types.ts` lub `src/types/chats.ts` zgodnie z konwencją projektu.

## 4. Szczegóły odpowiedzi

- Status 200 OK

```json
{
  "data": [
    {
      "id": "uuid",
      "other_user": { "id": "uuid", "name": "Anna Nowak" },
      "last_message": {
        "body": "Kiedy możemy się spotkać?",
        "sender_id": "uuid",
        "created_at": "2024-01-01T12:00:00Z"
      },
      "unread_count": 2,
      "status": "ACTIVE",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

- Inne statusy:
  - 400 Bad Request — invalid query parameter (np. niepoprawny `status`)
  - 401 Unauthorized — brak/nieprawidłowy token
  - 403 Forbidden — odmowa dostępu zgodnie z RLS/politykami
  - 500 Internal Server Error — błąd serwera/DB

## 5. Przepływ danych

1. Middleware/auth: ekstrakcja i weryfikacja tokena (JWT lub supabase session). Uzyskanie `userId`.
2. Kontroler/route handler (`src/pages/api/chats.ts` lub `src/pages/api/chats/index.ts`) parsuje query params i validuje `status`.
3. Wywołanie `ChatsService.listChats(userId, { status, limit, offset })`.
4. `ChatsService`:
   - Buduje zapytanie do DB (używając `supabase` client albo ORM), stosuje RLS/polityki.
   - Łączy tabele `chats`, `users` (dla `other_user`) oraz `messages` (dla `last_message`) albo używa podzapytań/agg:
     - Pobranie `last_message` per chat: najnowszy rekord w `messages` dla `chat_id`.
     - `unread_count`: liczba wiadomości w `messages` gdzie `chat_id` = chat.id AND `is_read` = false AND `receiver_id` = userId.
   - Mapuje wyniki do `ChatSummaryDTO`.
5. Handler zwraca 200 z payloadem `{ data: ChatSummaryDTO[] }`.

Uwagi wydajnościowe dla zapytań: używać indeksów na `messages(chat_id, created_at)`, `messages(receiver_id, is_read)`; ograniczyć liczbę podzapytan dzięki JOIN + lateral subquery lub użyć materializowanych widoków/denormalizacji (np. kolumna `last_message_id` w tabeli `chats`).

## 6. Względy bezpieczeństwa

- Uwierzytelnianie: wymaga tokena; weryfikacja w middleware. Jeśli projekt używa Supabase Auth — użyć `supabase.auth.api.getUserByCookie` lub serwerowego klienta z tokenem.
- Autoryzacja: upewnić się, że zapytanie zwraca tylko czaty, w których `userId` jest uczestnikiem (RLS albo WHERE condition).
- RLS: jeśli baza ma włączone RLS, użyć kontekstu sesji DB (service role token vs user token) ostrożnie — preferować wykonanie zapytania w kontekście użytkownika, by RLS go ograniczyła.
- Walidacja wejścia: allowlist dla `status` (enum). Ochrona przed injection przez użycie klienta supabase/parametryzowanych zapytań.
- Ochrona danych: nie zwracać wrażliwych pól (np. emaile, tokeny).

## 7. Obsługa błędów

- 400 Bad Request:
  - Niepoprawny `status` (zwrot: { error: "Invalid status value. Allowed: ACTIVE, ARCHIVED" })
  - Niepoprawne paginacja/limit
- 401 Unauthorized:
  - Brak lub niepoprawny Authorization header
- 403 Forbidden:
  - Użytkownik nie jest uczestnikiem czatu (jeżeli logika wymaga explicite sprawdzenia)
- 404 Not Found:
  - (opcjonalnie) jeśli chcemy sygnalizować brak czatów jako pustą listę — preferujemy 200 z pustą listą
- 500 Internal Server Error:
  - Błędy DB, nieoczekiwane wyjątki. Logować stack trace i request context.

Dodatkowo: zapisywać krytyczne błędy do tabeli `error_logs` z polami: `id, user_id, route, method, payload_snapshot, error_message, stack, created_at`.

## 8. Wydajność

- Indeksy: `messages(chat_id, created_at DESC)`, `messages(receiver_id, is_read)`, `chats(created_at)`.
- Paginacja: wprowadzić `limit`/`cursor` zamiast zwracania całej listy, page size domyślnie 20.
- Denormalizacja: opcjonalnie przechowywać `last_message_id` i `unread_count` w tabeli `chats`, aktualizowane przy wstawianiu wiadomości (triggery lub aplikacja).
- Cache: rozważyć cache wyników na frontendzie i krótkoterminowy cache po stronie serwera (Redis) dla hot-chats.
- Zapytania: minimalizować liczbę JOIN; użyć lateral/row_number window functions lub subqueries aby pobrać ostatnią wiadomość dla każdego chatu efektywnie.

## 9. Kroki implementacji

1. Dodaj typy: `src/types/chats.ts` z `ChatSummaryDTO`, `MessageSummaryDTO`, `UserDTO` i `ListChatsQuery`.
2. Utwórz serwis `src/services/chats.service.ts` z metodą `listChats(userId: string, opts: ListChatsQuery): Promise<ChatSummaryDTO[]>`.
   - Implementacja: użyj `supabase` client z `from('chats')` + join na `users` i podzapytanie dla `last_message` oraz `unread_count`.
3. Dodaj route handler `src/pages/api/chats.ts`:
   - Middleware autoryzujący (jeśli nie ma globalnego middleware): weryfikacja `Authorization` i ekstrakcja `userId`.
   - Parsowanie `status`, walidacja enum, ustawienie defaults.
   - Wywołanie `ChatsService.listChats` i zwrócenie odpowiedzi.
4. Pokryj logikę testami jednostkowymi/mokami:
   - Testy dla `ChatsService` (mock DB), testy integracyjne dla route (np. supertest).
5. Dodaj logowanie błędów w serwisie/handlerze i zapis do `error_logs` jeśli istnieje.
6. Przeprowadź code review i uruchom linter/typy (`npm run lint`, `npm run build`).
7. (Opcjonalnie) Dodaj paginację i testy obciążeniowe na backendzie.
8. Aktualizuj dokumentację API (OpenAPI/README) z przykładem odpowiedzi.

## 10. Przykładowe fragmenty implementacji (pseudokod)

- Handler (skrót):

```
GET /api/chats
  extract token -> userId
  parse status (default ACTIVE)
  validate status in enum
  data = await ChatsService.listChats(userId, { status })
  return 200 { data }
```

- Wytyczne SQL (pseudokod):

```
SELECT c.id, c.status, c.created_at,
       u.id as other_id, u.name as other_name,
       lm.body as last_body, lm.sender_id as last_sender_id, lm.created_at as last_created_at,
       (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id AND m.is_read = false AND m.receiver_id = :userId) as unread_count
FROM chats c
JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id != :userId
JOIN users u ON u.id = cm.user_id
LEFT JOIN LATERAL (
  SELECT body, sender_id, created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1
) lm ON true
WHERE EXISTS (SELECT 1 FROM chat_members cm2 WHERE cm2.chat_id = c.id AND cm2.user_id = :userId)
  AND c.status = :status
ORDER BY lm.created_at DESC NULLS LAST
LIMIT :limit OFFSET :offset
```

## 11. Zadania i przypisania (sugestia)

- Dev A: `ChatsService` + typy
- Dev B: route handler + middleware integracja
- Dev C: testy i dokumentacja

---

_Plik zapisany: `.ai/endpoints/chats-list-plan.md`_
