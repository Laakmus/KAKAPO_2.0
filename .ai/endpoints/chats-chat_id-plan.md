# API Endpoint Implementation Plan: GET /api/chats/{chat_id}

## 1. Przegląd punktu końcowego

Cel: Zaimplementować bezpieczny, czytelny i testowalny punkt końcowy REST zwracający szczegóły pojedynczego czatu identyfikowanego przez `chat_id`. Dostęp do zasobu ma tylko uczestnik czatu (user_a lub user_b). Punkt końcowy ma używać istniejącego klienta bazy (`supabase.client.ts`) i wymagać autoryzacji Bearer token.

Kluczowe wymagania:

- Metoda: `GET`
- Ścieżka: `/api/chats/{chat_id}`
- Tylko uczestnik czatu może pobrać dane (autoryzacja + uczestnictwo)
- Zwracany obiekt zawiera identyfikatory uczestników, ich krótkie dane (id, name), status i `created_at`.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/api/chats/{chat_id}`
- Nagłówki:
  - Wymagany: `Authorization: Bearer {token}`
  - Opcjonalne: `Accept: application/json`
- Parametry:
  - Wymagane:
    - `chat_id` (ścieżka) — UUID v4 identyfikujący czat
  - Opcjonalne:
    - brak (endpoint nie przyjmuje ciała request)
- Request Body: brak

Walidacja wejścia:

- Sprawdzić występowanie nagłówka `Authorization`.
- Sprawdzić poprawność formatu `chat_id` (UUID). Zwrócić 400 jeśli niepoprawny format.
- Autoryzacja tokena odbywa się przez istniejący mechanizm (middleware/auth). Jeśli token nieprawidłowy -> 401.

## 3. Wykorzystywane typy (DTO / Command modele)

- `GetChatParams`
  - chatId: string
- `UserSummaryDTO`
  - id: string
  - name: string
- `ChatResponseDTO`
  - id: string
  - user_a: UserSummaryDTO
  - user_b: UserSummaryDTO
  - status: 'ACTIVE' | 'INACTIVE' | string
  - created_at: string (ISO 8601)

Notatka: typy powinny zostać zdefiniowane/umieszczone w `src/types.ts` lub `src/db/database.types.ts` jeśli tam są inne powiązane definicje. Eksportować je tak, aby kontroler i serwis mogły ich użyć.

## 4. Szczegóły odpowiedzi

- 200 OK
  - Treść: `ChatResponseDTO` (zdefiniowane wyżej)

- Błędne przypadki:
  - 400 Bad Request — niepoprawny format `chat_id` (np. nie-UUID)
  - 401 Unauthorized — brak/nieprawidłowy token autoryzacji
  - 403 Forbidden — użytkownik uwierzytelniony, ale nie jest uczestnikiem czatu (wiadomość: "Brak uprawnień do tego czatu")
  - 404 Not Found — brak czatu o podanym `chat_id` (wiadomość: "Czat nie istnieje")
  - 500 Internal Server Error — nieoczekiwany błąd serwera

Przykładowy 200:

```json
{
  "id": "uuid",
  "user_a": { "id": "uuid", "name": "Jan Kowalski" },
  "user_b": { "id": "uuid", "name": "Anna Nowak" },
  "status": "ACTIVE",
  "created_at": "2024-01-01T10:00:00Z"
}
```

## 5. Przepływ danych (high-level)

1. Request dociera do routingu (np. `src/pages/api/chats/[chat_id].ts` albo do wspólnego routera Express/Fastify).
2. Middleware autoryzacyjne odczytuje i weryfikuje Bearer token -> otrzymujemy `requesterId` (user id).
3. Kontroler:
   - Waliduje `chat_id` (UUID).
   - Wywołuje serwis `ChatService.getChatById(chatId, requesterId)`.
4. Serwis `ChatService`:
   - Pobrać z repo (DB) rekord czatu po `chat_id` (selekcja pól: id, user_a_id, user_b_id, status, created_at).
   - Jeżeli brak rekordu -> rzucić NotFoundError.
   - Sprawdzić, czy `requesterId` === `user_a_id` || `user_b_id` -> jeśli nie to rzucić ForbiddenError.
   - Pobrać krótkie profile uczestników (id i name). Można to zrobić w jednym zapytaniu SQL z joinem na tabeli `users` lub w dwóch zapytaniach wybierając tylko `id` i `name`.
   - Zmapować wynik do `ChatResponseDTO`.
5. Kontroler zwraca 200 z DTO.

Interfejsy warstw:

- Kontroler: odpowiada za walidację formatów i mapowanie błędów na HTTP.
- Serwis: logika biznesowa (uprawnienia, transakcje, agregacja danych).
- Repo (data access): bezpośrednie zapytania do Supabase/DB.

## 6. Względy bezpieczeństwa

- Autoryzacja:
  - Wymagać poprawnego Bearer token; token weryfikowany przez centralny middleware.
  - Nie polegać tylko na danych przesłanych w zapytaniu.

- Ograniczenie ujawniania danych:
  - Zwracać tylko pola wymienione w specyfikacji.
  - Nie zwracać pól wrażliwych (email, phone, metadata) chyba że specyfikacja wymaga.

- SQL injection / query safety:
  - Używać przygotowanych zapytań / parametrów Supabase client (nie interpolować surowych wartości).

- RLS (Row Level Security):
  - Jeśli używane (Supabase), sprawdzić zgodność z aplikacyjną autoryzacją. Można polegać na RLS, ale nadal serwis powinien dodatkowo sprawdzać uczestnictwo, aby móc zwracać 403 z rozpoznawalną wiadomością.

- Rate limiting / brute force:
  - Rozważyć rate limiting na endpointy API; zapobiega to skanowaniu UUID.

- Logowanie:
  - Nie logować tokenów ani pełnych nagłówków Authorization.

## 7. Obsługa błędów

Zasady:

- Błędy kontrolowane (walidacja, auth, not found, forbidden) -> mapować na odpowiednie kody HTTP i czytelne komunikaty (w języku aplikacji).
- Nieujawnione błędy serwera -> zwracać ogólny komunikat i logować szczegóły wewnętrznie.

Potencjalne scenariusze i mapowanie:

- Brak/niepoprawny Authorization header -> 401 Unauthorized
- Niepoprawny format chat_id -> 400 Bad Request (body: { "error": "Invalid chat_id format" })
- Nie znaleziono czatu -> 404 Not Found (body: { "error": "Czat nie istnieje" })
- Użytkownik nie jest uczestnikiem czatu -> 403 Forbidden (body: { "error": "Brak uprawnień do tego czatu" })
- Błąd połączenia do DB / nieoczekiwany wyjątek -> 500 Internal Server Error (body: { "error": "Internal server error" })

Logowanie błędów do tabeli:

- Jeśli pracujemy z mechanizmem centralnego logowania błędów (np. tabela `errors`), zapisać:
  - timestamp, route, user_id (jeśli dostępny), chat_id (jeśli dotyczy), error_type, error_message, stack (truncated).
- Zapisywać tylko potrzebne informacje i nie przechowywać tokenów.

## 8. Wydajność

- Zapytanie DB:
  - Wykonywać selektywne zapytanie (tylko potrzebne kolumny).
  - Użyć join na tabeli `users` dla user_a/user_b, lub specjalnego widoku/materializowanego zapytania jeśli często używane.
  - Upewnić się, że kolumna `id` w `chats` jest indeksowana (primary key).

- Skalowalność:
  - Unikać N+1 — pobrać oba profile uczestników w jednym zapytaniu.
  - Cache'owanie rzadko zmieniających się pól (np. profil użytkownika) w warstwie aplikacji jeśli to konieczne.

## 9. Kroki implementacji (szczegółowy plan)

1. Przygotowanie zadań (już wykonane w TODO):
   - Utworzyć task planu i plik.

2. Dodanie typów:
   - Dodać `ChatResponseDTO`, `UserSummaryDTO`, `GetChatParams` w `src/types.ts` lub `src/db/database.types.ts`.

3. Serwis:
   - Utworzyć/rozszerzyć `src/services/ChatService.ts` (lub `src/services/chat.service.ts`) z metodą:
     - `async getChatById(chatId: string, requesterId: string): Promise<ChatResponseDTO>`
   - Implementacja:
     - Query: SELECT c.id, c.user_a_id, c.user_b_id, c.status, c.created_at, u_a.id as a_id, u_a.name as a_name, u_b.id as b_id, u_b.name as b_name FROM chats c LEFT JOIN users u_a ON c.user_a_id = u_a.id LEFT JOIN users u_b ON c.user_b_id = u_b.id WHERE c.id = $1
     - Sprawdzenie czy wynik istnieje; jeśli nie -> NotFoundError.
     - Sprawdzenie uprawnień: requesterId equal to user_a_id or user_b_id -> jeśli nie -> ForbiddenError.
     - Mapowanie do `ChatResponseDTO`.

4. Repozytorium (opcjonalne):
   - Wydzielić warstwę `src/repositories/chat.repository.ts` z metodą `findById(chatId)`.
   - Repo powinno używać `supabase.client.ts`.

5. Kontroler / route:
   - Dodać endpoint w `src/pages/api/chats/[chat_id].ts` (lub odpowiedniej strukturze backendu) z handlerem:
     - Odczytać `chat_id` z params.
     - Uzyskać `requesterId` z middleware/auth.
     - Walidacja formatu UUID.
     - Wywołać `ChatService.getChatById`.
     - Obsłużyć wyjątki i zwrócić odpowiednie kody.

6. Middleware / autoryzacja:
   - Upewnić się, że centralny middleware w `src/middleware/index.ts` zwraca `request.user.id` lub analogicznie.
   - Jeśli brak, dodać mechanizm do wydobywania `requesterId` z tokena w kontrolerze (jednak preferować centralny middleware).

7. Testy:
   - Unit testy dla `ChatService.getChatById`:
     - scenariusz poprawny (uczestnik A), zwrócony DTO zgodny ze schematem.
     - not found -> rzuca NotFoundError.
     - nie-uczestnik -> rzuca ForbiddenError.
   - Integracyjne / e2e testy dla endpointu:
     - brak tokenu -> 401
     - nieprawidłowy UUID -> 400
     - poprawny użytkownik -> 200 i oczekiwany payload
     - nie-uczestnik -> 403

8. Logging:
   - Dodać logowanie błędów w catch blokach z zapisem do systemu logów oraz (opcjonalnie) do tabeli `errors` z ograniczeniem na ilość przechowywanych danych.

9. Dokumentacja:
   - Zaktualizować dokument API (OpenAPI/Swagger jeśli jest) i dodać przykład odpowiedzi.

10. Code review i release:

- PR z implementacją, review zgodności z zasadami (`@backend.mdc`, `@coding_practices.mdc`) i CI tests.

## 10. Przykładowe mapowanie błędów w kodzie (pseudo)

- NotFoundError -> res.status(404).json({ error: "Czat nie istnieje" })
- ForbiddenError -> res.status(403).json({ error: "Brak uprawnień do tego czatu" })
- ValidationError -> res.status(400).json({ error: "Invalid chat_id format" })
- AuthError -> res.status(401).json({ error: "Unauthorized" })
- Unexpected -> res.status(500).json({ error: "Internal server error" })

## 11. Dodatkowe uwagi i decyzje do podjęcia

- Czy profil użytkownika (name) zawsze dostępny w tabeli `users`? Jeśli nie, ustalić fallback (np. null lub empty string).
- Uzgodnić format statusu czatu (czy są enumeracje w DB i typy w kodzie).
- Zadecydować o podejściu do RLS: aplikacyjna walidacja uprawnień powinna zostać zachowana niezależnie od RLS.

---

Plik zawiera kompletny plan implementacji endpointu GET /api/chats/{chat_id}. W następnych krokach zaktualizować TODO: oznaczam zadania jako ukończone.
