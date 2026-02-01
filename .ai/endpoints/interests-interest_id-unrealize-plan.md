# API Endpoint Implementation Plan: PATCH /api/interests/{interest_id}/unrealize

## 1. Przegląd punktu końcowego

Cel: Zaimplementować endpoint, który anuluje potwierdzenie realizacji wymiany zainteresowania (interest) pod warunkiem, że druga strona jeszcze nie potwierdziła. Endpoint aktualizuje rekord `interests` zmieniając status na `ACCEPTED` i ustawia `realized_at` na `null`, zwracając potwierdzenie anulowania.

Kluczowe zachowanie:

- Autoryzacja wymagana (Bearer token).
- Tylko uprawniony użytkownik (inicjator) może anulować potwierdzenie, jeśli wymiana nie została zrealizowana przez obie strony.
- Gdy wymiana jest już zrealizowana (np. `realized_at` nie jest null lub status to `COMPLETED`), zwrócić `400 Bad Request` z odpowiednim komunikatem.
- Przy braku uprawnień zwrócić `403 Forbidden`.

## 2. Szczegóły żądania

- Metoda HTTP: PATCH
- Struktura URL: `/api/interests/{interest_id}/unrealize`
- Nagłówki:
  - `Authorization: Bearer {token}` (wymagane)
  - `Content-Type: application/json` (opcjonalne, brak body)
- Parametry:
  - Wymagane:
    - `interest_id` (UUID) — path parameter identyfikujący rekord `interest`.
  - Opcjonalne:
    - brak body; cała operacja opiera się na ścieżce i autoryzacji.
- Request Body: brak (PATCH bez treści). Jeśli zespół preferuje, można użyć pustego obiektu `{}`.

## 3. Wykorzystywane typy

- DTOs i Command Modele:
  - `UnrealizeInterestCommand`:
    - `interestId: string` (UUID)
    - `actorId: string` (UUID) — ID użytkownika wykonującego akcję (opcjonalnie dostarczone przez middleware)
  - `InterestDto` (schemat istniejący w `types.ts`/`db/database.types.ts`): użyć istniejącego typu, w razie potrzeby rozszerzyć o pola `status`, `realized_at`, `initiator_id`, `counterparty_id`.
  - `UnrealizeResponseDto`:
    - `id: string`
    - `status: string` (np. `ACCEPTED`)
    - `realized_at: string | null`
    - `message: string`

## 4. Szczegóły odpowiedzi

- 200 OK
  - Body:

```json
{
  "id": "uuid",
  "status": "ACCEPTED",
  "realized_at": null,
  "message": "Potwierdzenie anulowane"
}
```

- 400 Bad Request
  - Scenariusze: rekord nie istnieje, `interest` już zrealizowany (np. `realized_at` != null lub `status` wskazuje zrealizowaną wymianę).
  - Body: { "error": "Nie można anulować - wymiana już została zrealizowana" }
- 403 Forbidden
  - Scenariusze: użytkownik nie jest inicjatorem ani nie ma uprawnień administracyjnych.
  - Body: { "error": "Brak uprawnień" }
- 401 Unauthorized
  - Scenariusze: brak lub nieważny token.
- 404 Not Found
  - Scenariusze: `interest_id` nie istnieje.
- 500 Internal Server Error
  - Scenariusze: nieoczekiwane błędy serwera lub DB.

## 5. Przepływ danych

1. Middleware uwierzytelniające odczytuje token i ustawia `req.user` (zawierające `userId`, role) — istniejący mechanizm w `middleware/index.ts`.
2. Router/Controller (`/api/interests/[interest_id]/unrealize`) pobiera `interest_id` z path i `actorId` z `req.user`.
3. Zainicjować `UnrealizeInterestCommand` i wywołać metodę serwisu `interestsService.unrealizeInterest(command)`.
4. Serwis:
   - Pobiera rekord `interest` z bazy po `interestId`.
   - Waliduje, że rekord istnieje.
   - Waliduje uprawnienia: `actorId` === `initiator_id` OR posiada role admin/moderator zgodnie z polityką.
   - Sprawdza warunki biznesowe: `realized_at` === null i `status` nie jest `COMPLETED`.
   - Wykonuje atomową aktualizację (transakcja) ustawiając `status` na `ACCEPTED` i `realized_at` na `null` (jeśli wcześniej ustawione), oraz zapisuje audit/trace.
   - Zwraca zaktualizowany DTO.
5. Controller formatuje odpowiedź (200) i zwraca `UnrealizeResponseDto`.

Transakcje i izolacja: aktualizacja powinna odbyć się w transakcji DB aby uniknąć race conditions (np. podwójne potwierdzenie w równoległych żądaniach). Jeśli używany jest Supabase/Postgres, użyć SELECT ... FOR UPDATE lub krótkiej transakcji.

## 6. Walidacja danych wejściowych

- Path param `interest_id`: sprawdzić, że jest poprawnym UUID. Jeśli nie — 400.
- Uwierzytelnienie: sprawdzić obecność `req.user.userId` — jeśli brak — 401.
- Uprawnienia: sprawdzić, że `actorId` ma prawo do anulowania — jeśli brak — 403.
- Stan biznesowy: jeśli `realized_at` !== null lub `status` wskazuje zrealizowaną wymianę — 400.
- Dodatkowo: chronić przed SQL injection używając parametrów zapytań i ORM/klienta DB.

## 7. Rejestrowanie błędów

- Krytyczne błędy serwera i wyjątki powinny być logowane przez centralny logger (np. `logger.error`) z metadanymi: `actorId`, `interestId`, traceId.
- Jeśli projekt ma tabelę `error_logs` lub `api_errors`, zapisz tam wpisy dla 500 Internal Server Error z stack trace (bez wrażliwych danych).
- Błędy biznesowe (400/403/404) logować na poziomie `warn` z krótkim komunikatem i identyfikatorami.

## 8. Zagrożenia bezpieczeństwa

- Nieprawidłowa autoryzacja: upewnić się, że tylko uprawnione osoby mogą anulować akcję.
- Race conditions: jednoczesne żądania mogą spowodować sprzeczne zmiany stanu — użyć transakcji i blokad.
- Wycieki informacji: nie ujawniać w komunikatach błędów szczegółów wewnętrznych (stack trace, pełne dane użytkownika).
- Token replay / expired tokens: upewnić się, że tokeny są walidowane i sprawdzone pod kątem wygasania.
- Insufficient logging: brak audytu operacji — dodać audit trail (kto anulował i kiedy).

## 9. Scenariusze błędów i kody stanu

- 200 OK — powodzenie (anulowano potwierdzenie)
- 400 Bad Request — nieprawidłowy `interest_id` lub wymiana już zrealizowana
- 401 Unauthorized — brak/nieprawidłowy token
- 403 Forbidden — brak uprawnień (użytkownik nie jest inicjatorem ani adminem)
- 404 Not Found — `interest_id` nie istnieje
- 409 Conflict — opcjonalnie dla race conditions lub konfliktu stanu
- 500 Internal Server Error — nieoczekiwane błędy

## 10. Wydajność

- Operacja mutująca powinna być optymalizowana przez indeksy na `interests.id` (PK).
- Transakcje powinny być krótkie i zwięzłe, aby minimalizować lock contention.
- Rate limiting: rozważyć limity per-user dla operacji mutujących.

## 11. Kroki implementacji

1. Przygotowanie:
   - Sprawdzić middleware autoryzacyjny w `src/middleware/index.ts`.
   - Potwierdzić typy `InterestDto` w `src/types.ts` lub `src/db/database.types.ts`.

2. Definicja typów:
   - Dodać `UnrealizeInterestCommand` i `UnrealizeResponseDto` do `src/types/interests.ts`.

3. Serwis:
   - Utworzyć/uzupełnić `src/services/interests.service.ts`:
     - Metoda: `async unrealizeInterest(command: UnrealizeInterestCommand): Promise<UnrealizeResponseDto>`
     - Implementacja:
       - Pobierz rekord interest (SELECT ... FOR UPDATE).
       - Walidacje: exists, permissions, business rules.
       - W transakcji: UPDATE interest SET status='ACCEPTED', realized_at=null.
       - Zwróć `UnrealizeResponseDto`.

4. Endpoint handler:
   - Dodaj plik: `src/pages/api/interests/[interest_id]/unrealize.ts`.
   - Handler:
     - requireAuth middleware → uzyskaj `actorId`.
     - Walidacja parametru `interest_id` (UUID).
     - Wywołaj `InterestsService.unrealizeInterest`.
     - Zmapuj wyjątki na odpowiednie HTTP statusy.

5. Testy:
   - Jednostkowe testy serwisu (success, forbidden, not found, bad request).
   - Integration test dla endpointu.

6. Logging i monitoring:
   - Dodać Sentry capture dla 5xx.
   - Logować operacje (audit trail).

7. Dokumentacja:
   - Zaktualizować dokumentację API.

8. CI i wdrożenie:
   - Uruchomić linter i testy przed merge.
   - Deploy na staging → testy → production.

## 12. Checklista przed merge

- [ ] Typy DTO dodane i zaimportowane
- [ ] `InterestsService.unrealizeInterest` zaimplementowana z transakcjami
- [ ] Endpoint handler dodany w `src/pages/api/interests/[interest_id]/unrealize.ts`
- [ ] Walidacja UUID i autoryzacja middleware sprawdzona
- [ ] Mapowanie błędów poprawne (400/401/403/404/500)
- [ ] Linter i testy przechodzą
- [ ] Dokumentacja API zaktualizowana

---

Powodzenia z implementacją!
