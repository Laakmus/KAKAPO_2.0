# API Endpoint Implementation Plan: GET /api/interests/my

## 1. Przegląd punktu końcowego

- **Cel**: Zwrócenie listy ofert, którymi zalogowany użytkownik jest zainteresowany (jego "interests"), z opcjonalnym filtrem po statusie zainteresowania.
- **Kontekst**: Backend TypeScript + Supabase (Postgres). Endpoint ma działać jako część istniejącego API serwera (Serverless/Edge lub Node), używając istniejącego middleware autoryzacyjnego (`Authorization: Bearer {token}`).

## 2. Szczegóły żądania

- Metoda HTTP: `GET`
- Struktura URL: `/api/interests/my`
- Nagłówki:
  - `Authorization: Bearer {token}` — wymagany
  - `Accept: application/json`
- Parametry zapytania:
  - Wymagane: brak
  - Opcjonalne:
    - `status` (string) — do filtrowania po statusie zainteresowania. Dozwolone wartości: `"PROPOSED"`, `"ACCEPTED"`, `"REALIZED"`.
- Body żądania: brak (GET)

## 3. Wykorzystywane typy (DTO i Command Modele)

- `GetMyInterestsQueryDTO`
  - `status?: "PROPOSED" | "ACCEPTED" | "REALIZED"`

- `InterestListItemDTO`
  - `id: string` (UUID) — id rekordu "interest"
  - `offer_id: string` (UUID)
  - `offer_title: string`
  - `offer_owner: string` — pełna nazwa właściciela oferty
  - `status: "PROPOSED" | "ACCEPTED" | "REALIZED"`
  - `created_at: string` (ISO 8601)

- `GetMyInterestsCommand` (service command)
  - `userId: string`
  - `status?: GetMyInterestsQueryDTO["status"]`
  - (opcjonalnie) `limit?: number`, `offset?: number` — jeśli dodamy paginację później

Uwagi dot. typów: Typy powinny być zdefiniowane w `src/types.ts` lub `src/db/database.types.ts` zgodnie z istniejącą konwencją projektu. Eksportować typy i używać w kontrolerze + serwisie.

## 4. Szczegóły odpowiedzi

- Success (200 OK)

```json
{
  "data": [
    {
      "id": "uuid",
      "offer_id": "uuid",
      "offer_title": "Rower górski",
      "offer_owner": "Jan Kowalski",
      "status": "ACCEPTED",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

- Kody statusów:
  - `200 OK` — zapytanie poprawne, zwrócono listę (może być pusty array)
  - `400 Bad Request` — niepoprawny parametr `status` (walidacja)
  - `401 Unauthorized` — brak/nieprawidłowy token
  - `403 Forbidden` — token prawidłowy, ale użytkownik zablokowany/nieaktywny (opcjonalnie)
  - `500 Internal Server Error` — nieoczekiwany błąd po stronie serwera

## 5. Przepływ danych

1. Middleware autoryzacyjny odszyfrowuje/zweryfikuje token i wstrzykuje `userId` do kontekstu żądania (np. `req.user.id` lub `context.userId`).
2. Kontroler (handler) endpointu:
   - Parsuje i waliduje query params (`status`) za pomocą prostego walidatora (np. `zod`/runtype lub ręczna walidacja zgodna z zasadami projektu).
   - Tworzy `GetMyInterestsCommand` z `userId` i opcjonalnym `status`.
   - Wywołuje `InterestsService.getMyInterests(command)`.
3. `InterestsService.getMyInterests`:
   - Buduje zapytanie do bazy (Supabase client / pg):
     - SELECT z tabeli `interests` powiązanej z `offers` i `users` w celu pobrania `offer_title` i `offer_owner`.
     - WHERE `interests.user_id = :userId`
     - JEŚLI `status` obecny → AND `interests.status = :status`
     - ORDER BY `interests.created_at` DESC (domyślnie)
     - (Opcjonalnie) limit/offset
   - Mapuje wynik DB na `InterestListItemDTO[]`.
4. Kontroler zwraca `200` z obiektem `{ data: [...] }`.

Przykład SQL logic (Supabase SDK pseudokod):

```ts
const { data } = await supabase
  .from('interests')
  .select(
    `
    id,
    offer_id,
    status,
    created_at,
    offers ( title, owner_id ),
    offers!inner.users ( full_name )
  `,
  )
  .eq('user_id', userId)
  .maybeEq('status', status)
  .order('created_at', { ascending: false });
```

Mapowanie: `offer_title = offers.title`, `offer_owner = offers.users.full_name` (dostosować do rzeczywistej struktury).

## 6. Walidacja danych wejściowych

- Walidacja nagłówków:
  - Sprawdzić obecność `Authorization` i że token jest typu Bearer.
  - Jeśli brak/niepoprawny → `401 Unauthorized`.

- Walidacja parametrów query:
  - `status` — jeśli obecny, sprawdzić, że jest jednym z: `PROPOSED`, `ACCEPTED`, `REALIZED`.
  - Jeśli nieprawidłowy → `400 Bad Request` z ciałem zawierającym przyczynę (np. `{ error: "Invalid status value" }`).

- Walidacja po stronie serwisu:
  - Guard: `userId` musi istnieć i być UUID.
  - Upewnić się, że mapping pól `offers.title` i `users.full_name` są dostępne — jeśli brakuje relacji, obsłużyć bezpiecznie (np. `offer_owner = null`).

## 7. Rejestrowanie błędów (error logging)

- Jeśli w projekcie istnieje tabela `errors` lub mechanizm logów:
  - Zarejestrować krytyczne błędy serwera z następującymi polami:
    - `id`, `user_id`, `route` (`GET /api/interests/my`), `error_message`, `stack_trace`, `metadata` (np. query params), `created_at`.
  - Dla błędów walidacji/logiki (400/401) wystarczy uprzednio skonfigurowany logger (np. console + zewnętrzny system).
- Nie logować pełnych tokenów lub danych wrażliwych; logować jedynie userId oraz zanonimizowane metadata.

## 8. Względy bezpieczeństwa

- Uwierzytelnianie:
  - Wymagany Bearer token. Sprawdzić poprawność tokena w middleware (JWT lub Supabase auth).

- Autoryzacja:
  - Ze względu na naturę endpointu (zwraca tylko własne zainteresowania), upewnić się, że `userId` pochodzi z tokena i nie może być nadpisany przez klienta.

- SQL Injection:
  - Korzystać z Supabase client / przygotowanych zapytań, nigdy nie składać ręcznych stringów z parametrami wejścia.

- Informacje w odpowiedzi:
  - Nie ujawniać wrażliwych danych (email, token, personal data). Zwracać tylko niezbędne pola.

- RLS / Policies:
  - Jeśli w DB włączone są RLS, upewnić się, że ustawienia pozwalają na selekcję `interests` przez serwer (service role) lub że polityki uwzględniają role użytkownika.

- Rate limiting / Abuse:
  - Rozważyć globalne lub per-user rate limiting, aby zapobiec eksfiltracji danych lub DoS.

## 9. Scenariusze błędów i kody odpowiedzi

- 200 OK
  - Zwrot listy zainteresowań (może być pusty).

- 400 Bad Request
  - `status` ma nieprawidłową wartość.
  - Przykład odpowiedzi:
    ```json
    { "error": "Invalid query parameter: status" }
    ```

- 401 Unauthorized
  - Brak nagłówka Authorization albo nieprawidłowy/wygaśnięty token.
  - Przykład:
    ```json
    { "error": "Unauthorized" }
    ```

- 403 Forbidden
  - Użytkownik zablokowany lub brak uprawnień (opcjonalne).

- 404 Not Found
  - Nie stosuje się do tej ścieżki (zwracamy 200 z pustą listą jeśli brak zainteresowań).

- 500 Internal Server Error
  - Błędy DB, błędy nieoczekiwane. Rejestrować w loggerze i w `errors` table.

## 10. Wydajność i skalowalność

- Indeksy DB:
  - Zapewnić indeksy na kolumnach `interests.user_id`, `interests.status`, `interests.created_at` — potrzebne do szybkiego filtrowania i sortowania.

- N+1 i JOINy:
  - Pobierać złożone dane przy pomocy pojedynczego zapytania z JOIN (lub Supabase `.select()` z relacjami), żeby uniknąć wielu zapytań per-interest.

- Paginacja:
  - Dla dużych list — dodać parametry `limit`/`offset` lub cursor-based pagination. Domyślnie zwracać pierwsze N wyników lub wszystkie, jeśli lista zwykle krótka.

- Cache:
  - Rozważyć cache po stronie serwera (np. in-memory lub Redis) jeśli zapytania są kosztowne i dane nie zmieniają się często.

## 11. Kroki implementacji (szczegółowy plan)

1. Przygotowanie typów
   - Dodać/zweryfikować `InterestListItemDTO` oraz `GetMyInterestsQueryDTO` w `src/types.ts` lub `src/db/database.types.ts`.

2. Walidacja i middleware
   - Upewnić się, że istnieje middleware dla `Authorization` (jeśli nie — użyć Supabase auth lub JWT middleware).
   - Dodać prosty walidator query (można użyć `zod` lub ręcznej walidacji zgodnie z regułami projektu).

3. Serwis
   - Jeśli istnieje `InterestsService`, dodać metodę `getMyInterests(command: GetMyInterestsCommand): Promise<InterestListItemDTO[]>`.
   - Jeśli nie istnieje — utworzyć `src/services/interests.service.ts` i zaimplementować tam logikę DB + mapping.

4. Kontroler/handler
   - Dodać handler w katalogu endpointów (np. `src/pages/api/interests/my.ts` lub zgodnie z konwencją projektu).
   - Handler:
     - Wyciąga `userId` z kontekstu (middleware).
     - Parsuje `status` z query, waliduje.
     - Wywołuje `InterestsService.getMyInterests`.
     - Zwraca `200` z `{ data }`.
     - Obsługuje błędy i mapuje je na odpowiednie kody statusu.

5. Testy jednostkowe/integracyjne
   - Testy walidacji query.
   - Testy serwisu z zamockowanym klientem DB (Supabase).
   - Test end-to-end sprawdzający `401`, `400` i `200`.

6. Logowanie błędów
   - Dodać logger w miejscach, gdzie łapiemy `500` i wysyłamy do `errors` table/centralnego logu.

7. Review i wdrożenie
   - Code review, sprawdzenie zgodności z zasadami projektu.
   - Wdrożenie na staging → smoke tests → produkcja.

## 12. Dodatkowe uwagi / kroki opcjonalne

- Paginacja i limit (implementować na żądanie).
- Filtrowanie rozszerzone (np. po date range) — przyszłe rozszerzenie API.
- Telemetria: dodać metrics (liczba wezwań, czas wykonania) dla tego endpointu.

---

Plik utworzony automatycznie: zapoznaj się z nim i dostosuj pola DB/relacje do rzeczywistej struktury schematu (np. nazwy kolumn w `offers` i `users`).
