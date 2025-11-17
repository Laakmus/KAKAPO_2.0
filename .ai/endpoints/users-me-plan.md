# API Endpoint Implementation Plan: DELETE /api/users/me

## 1. Przegląd punktu końcowego

Cel: Bezpieczne i atomowe usunięcie (hard delete) konta aktualnie zalogowanego użytkownika. Endpoint wymaga uwierzytelnienia Bearer tokenem i dodatkowej weryfikacji hasła podanego w treści żądania, aby zapobiec przypadkowym lub złośliwym usunięciom.

Główne wymagania:
- Metoda: `DELETE`
- Ścieżka: `/api/users/me`
- Zwraca 200 przy sukcesie z komunikatem potwierdzającym usunięcie.

## 2. Szczegóły żądania

- Metoda HTTP: `DELETE`
- Struktura URL: `/api/users/me`
- Nagłówki:
  - `Authorization: Bearer {token}` — token JWT lub inny schemat używany przez projekt (Supabase JWT lub sesja).

- Parametry:
  - Wymagane:
    - token w nagłówku `Authorization` (Bearer)
    - body.password: string
  - Opcjonalne: brak

- Request Body (JSON):

```json
{
  "password": "securePassword123"
}
```

Wymagania dodatkowe dla pola `password`:
- Obecne w specyfikacji: wymagane.
- Zalecane dodatkowe założenia walidacyjne (ustawione w serwisie): typ `string`, długość >= 8 znaków. Jednak endpoint powinien akceptować hasła zgodnie z regułami istniejącego systemu (nie wymuszać nowych reguł).

## 3. Wykorzystywane typy (DTO / Command modele)

- `DeleteAccountRequestDTO`
  - `password: string`

- `DeleteUserCommand`
  - `userId: string`
  - `password: string`
  - `requestIp?: string`
  - `performedBy?: string` (opcjonalnie — przydatne do audit logu)

- `DeleteAccountResponseDTO`
  - `message: string` (np. "Konto zostało usunięte")

Użyj istniejących typów z `src/types.ts` i `src/db/database.types.ts` tam gdzie to możliwe (np. `User`/`UserId`).

## 4. Przepływ danych

1. Middleware autoryzacyjny (np. `src/middleware/index.ts`) waliduje `Authorization` i ustawia `req.user` z `userId`.
2. Endpoint `DELETE /api/users/me`:
   - Parsuje i waliduje body do `DeleteAccountRequestDTO`.
   - Wywołuje serwis: `userService.deleteUser(DeleteUserCommand)`.
3. `userService.deleteUser` (logika serwisowa):
   - Załóż transakcję DB (jeśli DB to wspiera) lub użyj atomicznych operacji.
   - Pobierz usera (ID z tokena) i jego hash hasła z bazy (`SELECT password_hash FROM users WHERE id = $1`).
   - Porównaj hash z podanym `password` używając `bcrypt.compare` (lub innej biblioteki zgodnej z hashowaniem użytym przy rejestracji).
   - Jeśli weryfikacja się nie powiodła → zwróć błąd autoryzacji (401).
   - Jeśli weryfikacja powiodła:
     - Usuń rekord użytkownika z tabeli `users`. Jeśli istnieją powiązane zasoby: użyj transakcji albo deleguj ciężkie usuwanie do job queue. Preferowane: ON DELETE CASCADE lub mechanizm soft-delete->background cleanup, ale spec wymaga hard delete — w planie uwzględnić konsekwencje.
     - Usuń/inkasuj sesje/refresh tokens (np. w Supabase usuń użytkownika z Auth lub unieważnij sesje).
     - Wstaw wpis do `audit_logs` / `user_events` z informacją o usunięciu konta (kto, kiedy, ip).
4. Zwróć 200 z `{"message":"Konto zostało usunięte"}`.

Zależności: `src/db/supabase.client.ts` (lub inny DB client), `src/services/user.service.ts` (nowy lub istniejący), `src/middleware/index.ts`.

## 5. Względy bezpieczeństwa

- Autoryzacja:
  - Wymagaj ważnego Bearer tokena. Token powinien zawierać `userId`.
  - Endpoint powinien nie akceptować żadnych operacji bez tokena.

- Re-autoryzacja:
  - Wymagana weryfikacja hasła (podanego w body).
  - Porównanie hasła powinno używać bezpiecznego `bcrypt.compare` (chroniąc przed timing attacks).

- Uprawnienia:
  - Tylko właściciel konta może usunąć swoje konto (porównaj `userId` z tokena z `userId` w komendzie).

- Ochrona danych:
  - Usunięcie powinno usunąć PII z tabel powiązanych, zgodnie z polityką prywatności i zgodnością (jeśli wymagane).
  - Jeśli używa się `service_role` lub klucza z szerokimi uprawnieniami, przechowuj go wyłącznie w ENV i używaj tylko po stronie serwera.

- Rate limiting / Brute force:
  - Ogranicz liczbę prób usunięcia konta (np. 5 prób na godzinę) na użytkownika/IP, aby zapobiec brute-force atakom na hasło.

- CSRF:
  - Dla API z Bearer tokenem CSRF to niższe ryzyko, ale zachować standardowe zabezpieczenia jeżeli endpoint dostępny też z przeglądarki.

## 6. Obsługa błędów

Mapowanie scenariuszy na statusy i komunikaty:
- 200 OK
  - Treść: `{"message":"Konto zostało usunięte"}`

- 400 Bad Request
  - Przy niepoprawnym body (brak `password` lub nieprawidłowy typ) — treść powinna zawierać walidacyjne błędy pola.

- 401 Unauthorized
  - Brak/nieprawidłowy token lub podane nieprawidłowe hasło.
  - Komunikat: `"Nieprawidłowe hasło"` lub `"Brak autoryzacji"`.

- 404 Not Found
  - Gdy userId z tokena nie odpowiada istniejącemu użytkownikowi (opcjonalne, można mapować jako 401/404 zależnie od polityki ujawniania informacji).

- 500 Internal Server Error
  - Błędy serwera (DB, zewnętrzne API). Komunikat: `"Błąd podczas usuwania konta"`.

Mechanika logowania błędów:
- Krytyczne błędy i nieudane próby weryfikacji (podejrzana aktywność) → zapisz w `audit_logs` lub dedykowanej tabeli `error_logs` z polami: `user_id`, `route`, `error_message`, `stack`, `ip`, `created_at`.
- Logi aplikacyjne → użyj istniejącego loggera (np. `pino`, `winston`) z poziomami `info`, `warn`, `error`. Nie zapisuj haseł w logach.

## 7. Wydajność

- Potencjalne wąskie gardła:
  - Masowe usuwanie powiązanych rekordów (np. postów, plików) może być kosztowne.
  - Skomplikowane kaskady → długie transakcje blokujące tabele.

- Rekomendacje:
  - Użyj transakcji dla integralności, ale dla ciężkich operacji rozważ soft-delete i background job do finalnego usunięcia.
  - Jeżeli baza ma ON DELETE CASCADE poprawnie zdefiniowane FK, usunięcie może być względnie szybkie.
  - Dodaj indeksy jeśli zapytania wyszukują powiązane dane do usunięcia.
  - Ogranicz rozmiar pojedynczej transakcji i deleguj masowe operacje do job queue (np. Bull, Worker).

## 8. Kroki implementacji (szczegółowy plan)

1. Przygotowanie DTO i modeli
   - Utwórz `DeleteAccountRequestDTO` w `src/types.ts` (lub osobny plik DTO).
   - Utwórz `DeleteUserCommand` (w `src/services/user.service.ts` lub `src/commands/`).

2. Serwis użytkownika
   - Jeśli nie istnieje, utwórz `src/services/user.service.ts`.
   - Dodaj metodę `async deleteUser(cmd: DeleteUserCommand): Promise<void>`:
     - Pobierz `user` i `password_hash`.
     - Porównaj hasła (`bcrypt.compare`).
     - Jeżeli weryfikacja zakończy się błędem → rzuć wyjątek `UnauthorizedError`.
     - Wykonaj usunięcie w DB w transakcji:
       - Usuń rekord z `users`.
       - Usuń sesje / refresh tokens.
       - Dodaj wpis do `audit_logs`.
       - Commit/Rollback.
     - W przypadku użycia Supabase Auth: użyj serwera (service key) do usunięcia użytkownika w Auth API (w razie potrzeby).

3. Endpoint API
   - Utwórz plik `src/pages/api/users/me.ts` (Astro server endpoint) lub `src/pages/api/users/me/index.ts` zależnie od struktury projektu.
   - Middleware: użyj istniejącego `auth` middleware (`src/middleware/index.ts`) aby uzyskać `userId`.
   - Parsuj body i waliduj (np. `zod`, `yup` lub ręczna walidacja).
   - Wywołaj `userService.deleteUser(...)`.
   - Zwróć odpowiedni kod i body JSON.

4. Walidacja i testy
   - Dodaj testy jednostkowe dla `userService.deleteUser` (scenariusze: poprawne hasło, niepoprawne hasło, DB error).
   - Dodaj testy integracyjne dla endpointu `DELETE /api/users/me` (użyj mocka DB lub testowej bazy).

5. Logowanie i monitoring
   - Wstaw logiczne zapisy do `audit_logs` oraz logi aplikacyjne przy błędach.
   - Upewnij się, że telemetry/metryki (np. Sentry/Prometheus) raportują błędy 5xx.

6. Dokumentacja
   - Zaktualizuj OpenAPI / dokumentację API: dodać opis endpointu, request/response, statusy i przykłady.
   - Dodaj changelog entry i instrukcje migracji jeżeli usunięcie wpływa na inne systemy.

7. Review & Deploy
   - Code review (PR), sprawdź zgodność z `eslint`, `prettier`, uruchom testy.
   - Po wdrożeniu: przetestuj na staging (również rollback scenariusz).

## Dodatkowe uwagi i decyzje projektowe

- Hard delete vs soft delete:
  - Spec wymaga hard delete. Jeśli projekt posiada politykę przywracania kont, rozważyć soft-delete z background job do ostatecznego usunięcia oraz endpointem do trwałego usunięcia.

- Usuwanie powiązanych zasobów:
  - Jeśli usunięcie ma skasować pliki na zewnętrznym storage (S3), usuwać je asynchronicznie lub jako część transakcji z retry/backoff.

- Uprawnienia administracyjne:
  - Endpoint nie powinien pozwalać administratorowi usuwać konta innego bez dodatknego endpointu i uprawnień.

---

Plików i lokalizacji implementacyjnych sugerowane przez plan:
- `src/pages/api/users/me.ts` — endpoint HTTP
- `src/services/user.service.ts` — logika usuwania
- `src/middleware/index.ts` — autoryzacja/wyciągnięcie userId
- `src/db/supabase.client.ts` — klient DB / Supabase
- `src/types.ts` lub `src/types/users.d.ts` — DTO i typy
- `supabase/migrations/` — (opcjonalnie) migracje zmieniające FK cascade lub dodające `audit_logs`

Zgodność z kodem projektu:
- Upewnij się, że implementacja używa istniejącego klienta DB (`src/db/supabase.client.ts`) i istniejących typów (`src/db/database.types.ts`) gdzie to możliwe.

Koniec planu.

# API Endpoint Implementation Plan: GET /api/users/me

## <analysis>
1. Podsumowanie kluczowych punktów specyfikacji:
   - Endpoint: `GET /api/users/me` — zwraca profil zalogowanego użytkownika.
   - Autoryzacja: nagłówek `Authorization: Bearer {token}` wymagany; jeśli brak/niepoprawny token → 401.
   - Sukces (200): zwraca JSON z polami `id`, `first_name`, `last_name`, `created_at`.

2. Wymagane i opcjonalne parametry:
   - Wymagane: Header `Authorization: Bearer {token}`.
   - Opcjonalne: brak parametrów URL/body (GET).

3. Niezbędne typy DTO i Command Modele:
   - `UserProfileDTO`:
     - id: string (UUID)
     - first_name?: string | null
     - last_name?: string | null
     - created_at: string (ISO timestamp)
   - `AuthToken` (wewnętrzny typ do walidacji/parsowania tokenu): { userId: string, exp?: number, ... }

4. Wyodrębnienie logiki do service:
   - Utworzyć/wykorzystać `UserService` z metodą `getProfileById(userId: string): Promise<UserProfileDTO | null>`.
   - Logika endpointu: autoryzacja (middleware/shared util) → ekstrakcja userId → `UserService.getProfileById` → mapowanie na DTO → response.
   - Token verification/parse: użyć istniejącego klienta Supabase auth jeśli projekt używa Supabase, albo wspólnego utila JWT.

5. Walidacja danych wejściowych:
   - Sprawdzić obecność i format nagłówka Authorization.
   - Walidacja tokena: poprawność podpisu, brak wygaśnięcia, obecność `sub`/`userId`.
   - Walidacja wyniku DB: jeśli brak użytkownika → 404 (opcjonalnie, ale trzymać się specyfikacji — można też zwracać 401 jeśli sesja nieważna).

6. Rejestrowanie błędów:
   - Krytyczne błędy serwera i nieoczekiwane wyjątki: log do centralnego loggera (np. Sentry) oraz zapis do tabeli `error_logs` jeśli dostępna.
   - Próby autoryzacji nieudane: zapisywać krótką informację z ip/nagłówkami (bez tokena) do audit logów, ograniczając wrażliwe dane.

7. Potencjalne zagrożenia bezpieczeństwa:
   - Wyciekanie tokenów lub innych wrażliwych danych w logach — unikać logowania pełnego tokena.
   - Brute-force / replay tokenów — stosować rate limiting oraz sprawdzać exp w tokenie.
   - Nieprawidłowa weryfikacja tokena → ujawnienie danych innych użytkowników.
   - Niewystarczające uprawnienia: upewnić się, że `userId` w tokenie jest jedyną wartością używaną do pobrania profilu (nie warto ufać parametrom URL).

8. Scenariusze błędów i kody statusu:
   - 200 OK — profil znaleziony i zwrócony.
   - 401 Unauthorized — brak headera Authorization, niepoprawny lub wygasły token.
   - 404 Not Found — użytkownik nie istnieje (opcjonalne; można zamiast tego zwracać 401 jeśli sesja nieważna).
   - 400 Bad Request — niepoprawny format nagłówka Authorization (np. brak prefiksu Bearer).
   - 500 Internal Server Error — nieoczekiwane błędy serwera / DB.
</analysis>

## 1. Przegląd punktu końcowego
Endpoint `GET /api/users/me` zwraca profil aktualnie zalogowanego użytkownika identyfikowanego za pomocą tokena przesłanego w nagłówku `Authorization: Bearer {token}`. Celem jest prosty, bezpieczny dostęp do podstawowych pól profilu użytkownika potrzebnych w kliencie (UI).

## 2. Szczegóły żądania
- Metoda HTTP: GET
- Struktura URL: `/api/users/me`
- Nagłówki:
  - Wymagane: `Authorization: Bearer {token}`
- Parametry:
  - Wymagane: brak poza nagłówkiem `Authorization`
  - Opcjonalne: brak
- Request Body: brak (GET)

## 3. Wykorzystywane typy
- `UserProfileDTO` (response):
```ts
type UserProfileDTO = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  created_at: string; // ISO 8601
};
```
- `AuthToken` (wewnętrzny typ po parsowaniu tokena):
```ts
type AuthToken = {
  userId: string;
  exp?: number;
  iat?: number;
  // inne pola zależne od implementacji auth (np. role)
};
```

## 4. Szczegóły odpowiedzi
- 200 OK
```json
{
  "id": "uuid",
  "first_name": "Jan",
  "last_name": "Kowalski",
  "created_at": "2024-01-01T10:00:00Z"
}
```
- 400 Bad Request — niepoprawny format nagłówka Authorization
- 401 Unauthorized — brak/niepoprawny/wygasły token
- 404 Not Found — użytkownik nie istnieje (opcjonalne)
- 500 Internal Server Error — błąd serwera

## 5. Przepływ danych
1. Request trafia do routingu serwera (np. `src/pages/api/users/me.ts` lub ekwiwalent w frameworku).
2. Middleware/shared util:
   - Sprawdza obecność nagłówka `Authorization`.
   - Parsuje i weryfikuje token (np. przez Supabase Auth client lub JWT verify).
   - Wyciąga `userId` (np. z `sub`) i przekazuje dalej (req.context.userId lub param do handlera).
3. Handler endpointa wywołuje `UserService.getProfileById(userId)`:
   - `UserService` używa `src/db/supabase.client.ts` (lub innego DB clienta) do zapytania do tabeli `users`.
   - Mapuje wynik DB na `UserProfileDTO`.
4. Handler zwraca 200 z DTO lub odpowiedni błąd (401/404/500).

Przykładowe zapytanie DB (pseudo):
```sql
SELECT id, first_name, last_name, created_at
FROM users
WHERE id = $1
LIMIT 1;
```

## 6. Względy bezpieczeństwa
- Autoryzacja:
  - Wymagaj nagłówka `Authorization: Bearer {token}`.
  - Weryfikuj token (signature + exp) używając bezpiecznych bibliotek (np. `@supabase/supabase-js` lub `jsonwebtoken` z publicznym kluczem).
  - Nie polegaj na parametrach URL do identyfikacji użytkownika.
- Audyt i logowanie:
  - Loguj nieudane próby autoryzacji (okrojone informacje, bez tokena).
  - Dla krytycznych wyjątków użyj Sentry/centralnego loggera.
- Ochrona danych:
  - Nie zwracaj w odpowiedzi pól wrażliwych (email, password_hash, last_login_ip) — zwróć tylko dozwolone pola.
  - Nie zapisuj tokenów w logach.
- Rate limiting:
  - Na endpointach auth-sensitive zastosować limit na poziomie API/gateway.

## 7. Obsługa błędów
- Brak Authorization header:
  - Response: 401 Unauthorized
  - Body: { "error": "Brak autoryzacji" }
- Nieprawidłowy format headera (np. brak `Bearer`):
  - Response: 400 Bad Request
  - Body: { "error": "Niepoprawny nagłówek Authorization" }
- Token nieważny/wygasły:
  - Response: 401 Unauthorized
  - Body: { "error": "Brak autoryzacji" }
- Użytkownik nie znaleziony:
  - Response: 404 Not Found
  - Body: { "error": "Użytkownik nie znaleziony" }
- Błąd serwera / DB:
  - Response: 500 Internal Server Error
  - Body: { "error": "Wewnętrzny błąd serwera" }
  - Dodatkowo: logowanie błędu do Sentry i (opcjonalnie) tabela `error_logs`.

## 8. Wydajność
- Zapytanie DB jest proste — pojedyncze SELECT po PK (id), więc powinno być szybkie przy prawidłowo zindeksowanym polu `id`.
- Cache (opcjonalne):
  - Można cache'ować krótkotrwale profile w Redis/Memory (TTL krótki, np. 30s) jeśli endpoint jest bardzo często wywoływany.
- Skalowanie:
  - Upewnić się, że połączenia do DB są poolowane i że klient Supabase jest singletonem lub konfigurowany zgodnie z zaleceniami frameworka.

## 9. Kroki implementacji
1. (Kod) Dodaj/upewnij się, że `UserProfileDTO` jest zdefiniowany w `src/types.ts` lub `src/db/database.types.ts`.
2. (Kod) Utwórz/zmodyfikuj `src/services/user.service.ts`:
   - Eksportuj `getProfileById(userId: string): Promise<UserProfileDTO | null>`.
   - Wykorzystaj `src/db/supabase.client.ts` do zapytania.
3. (Kod) Dodaj/shared util `src/middleware/auth.ts` (lub użyj istniejącego `src/middleware/index.ts`):
   - Funkcja `authenticateRequest(req): Promise<{ userId } | throw 401/400>`.
4. (Kod) Utwórz endpoint handler `src/pages/api/users/me.ts` (lub zgodnie z konwencją projektu):
   - Wywołuje `authenticateRequest`, następnie `UserService.getProfileById`.
   - Mapuje wynik na `UserProfileDTO` i zwraca 200 lub odpowiedni błąd.
5. (Testy) Napisz testy jednostkowe/integracyjne:
   - Brak header → 401
   - Niepoprawny token → 401
   - Poprawny token, użytkownik istnieje → 200 + poprawna struktura JSON
   - Poprawny token, użytkownik nie istnieje → 404 (jeśli stosowane)
6. (Logging) Zaimplementuj logging błędów do Sentry/centralnego loggera i opcjonalnie zapis do `error_logs`.
7. (Deployment) Przetestuj na środowisku staging; zweryfikuj zachowanie z prawdziwym tokenem Supabase (lub z mockiem JWT).
8. (Dokumentacja) Zaktualizuj dokumentację API (OpenAPI/README) z przykładem request/response i opisem kodów statusu.

## 10. Dodatkowe uwagi i rekomendacje
- Jeżeli projekt używa Supabase Auth, preferować jego metody weryfikacji sesji zamiast ręcznego dekodowania JWT (mniej podatne na błędy).
- Zachować separację odpowiedzialności: handler endpointu jedynie orkiestruje autoryzację i wywołanie serwisu; logika dostępu do DB w `UserService`.
- Jeśli istnieje globalny middleware uwierzytelniający, wykorzystać go i tylko czytać `req.context.userId`.

---
Plik planu zapisany jako `.ai/endpoints/users-me-plan.md`. Postępuj zgodnie z kroki implementacji; w razie pytań mogę przygotować przykładową implementację (service + handler + testy).


