# API Endpoint Implementation Plan: Wylogowanie (POST /auth/logout)

## 1. Przegląd punktu końcowego

Cel: Bezpiecznie zakończyć sesję uwierzytelnionego użytkownika powiązaną z tokenem dostępu, unieważnić sesję po stronie serwera (jeśli istnieje), oraz zwrócić potwierdzenie wylogowania.

Ten endpoint przyjmuje żądanie `POST` z nagłówkiem `Authorization: Bearer {token}` i powinien:

- weryfikować token,
- usuwać/odnawiać/oznakowywać sesję/refresh token w bazie danych (jeśli system przechowuje stan sesji),
- opcjonalnie wyrejestrowywać token z mechanizmów sesji (np. blacklist JWT, lista aktywnych sesji w DB, Supabase session revoke),
- zwracać `200 OK` z komunikatem potwierdzającym.

## 2. Szczegóły żądania

- Metoda HTTP: `POST`
- Struktura URL: `/auth/logout`
- Nagłówki:
  - `Authorization: Bearer {token}` (wymagany)
  - `Content-Type: application/json` (opcjonalny — brak body wymagany)
- Parametry:
  - Wymagane: brak w body; wymagany nagłówek `Authorization` (Bearer token).
  - Opcjonalne: brak (można rozważyć opcjonalne body z `allDevices: true` lub `sessionId` — jeśli system obsługuje wylogowanie wszystkich urządzeń lub konkretnej sesji).
- Request Body: nie przewidziano body w specyfikacji; jeśli zaimplementujemy rozszerzenie, struktura może być:

```json
{
  "allDevices": false,
  "sessionId": "string"
}
```

## 3. Wykorzystywane typy (DTO / Command modele)

- `LogoutCommand`:
  - token: string (pobrane z nagłówka Authorization; DTO może nie przekazywać tokenu bezpośrednio, lecz kontekst żądania)
  - sessionId?: string (opcjonalnie)
  - allDevices?: boolean (opcjonalnie)

- `LogoutResponseDTO`:
  - message: string

- (Jeżeli używany jest serwis sesji) `SessionRecord` (istniejący model bazy, używany do operacji UPDATE/DELETE).

Uwagi: typy powinny znajdować się w `src/types.ts` lub `src/db/database.types.ts` zgodnie z konwencją projektu — użyj istniejących typów sesji jeśli są dostępne.

## 4. Szczegóły odpowiedzi

- 200 OK

```json
{
  "message": "Wylogowano pomyślnie"
}
```

- 400 Bad Request — jeśli nagłówek Authorization jest niepoprawny lub body (jeśli wymagane) nie przejdzie walidacji.
- 401 Unauthorized — jeśli token jest nieważny/wygaśnięty lub nie podano nagłówka Authorization.
- 404 Not Found — jeśli operacja dotyczy konkretnej sesji, a `sessionId` nie istnieje.
- 500 Internal Server Error — przy błędach serwera (DB, zewnętrzne usługi).

Zgodnie z regułami: zwracać odpowiednie kody statusu i spójne ciało odpowiedzi, zawierające `message` i w razie błędu `error` lub `details`.

## 5. Przepływ danych

Przykładowy flow:

1. Middleware autoryzacji odczytuje nagłówek `Authorization`, ekstrahuje token.
2. Token jest weryfikowany (JWT verify lub sprawdzenie sesji u dostawcy np. Supabase).
3. Jeśli token jest poprawny:
   - jeśli system jest "stateless" (czysty JWT bez przechowywanej sesji): opcjonalnie dodać token do blacklisty (jeśli wymagana natychmiastowa unieważnienie).
   - jeśli system jest "stateful" (sesje w DB): znaleźć rekord sesji po `userId`/`sessionId` i ustawić `revoked = true` lub usunąć rekord sesji (DELETE).
   - jeśli refresh tokeny są przechowywane: usuń refresh token powiązany z sesją.
4. Zwróć `200 OK` z potwierdzeniem.

Integracje z bazą danych:

- Jeżeli istnieje tabela `sessions` / `user_sessions`, wykonać `UPDATE sessions SET revoked = true WHERE id = :sessionId` lub `DELETE FROM sessions WHERE id = :sessionId`.
- Jeśli używany Supabase Auth: wywołać odpowiednie API Supabase do usunięcia sesji/revoke token.

## 6. Względy bezpieczeństwa

- Autoryzacja: wymuszony nagłówek `Authorization`. Endpoint powinien uruchamiać weryfikację tokenu przed wykonaniem jakichkolwiek operacji.
- Unieważnienie tokenów:
  - Dla JWT bez przechowywanego stanu — jeśli wymagane natychmiastowe unieważnienie, wprowadzić mechanizm blacklisty (w DB/Redis) z TTL równym czasowi wygaśnięcia tokenu.
  - Dla sesji w DB — usuwać lub oznaczać sesję jako unieważnioną.
- CSRF: dla tokenów w nagłówku Bearer CSRF nie jest krytyczne, ale jeżeli tokeny są w cookie, dodać CSRF protection.
- Rate limiting: zastosować limit dla żądań wylogowania z jednego konta/IP, aby zapobiec nadużyciom.
- Logowanie działań: rejestrować zdarzenia wylogowania z meta (userId, sessionId, ip, userAgent) do systemu logów (nie zapisywać tokenów w logach).
- Bezpieczne usuwanie: nie ujawniać szczegółów, które mogłyby potwierdzać istnienie danych (np. równoczesne zwracanie 200 przy idempotentnych operacjach).

## 7. Obsługa błędów

- Scenariusze i odpowiedzi:
  - Brak lub niepoprawny Authorization header -> 401 Unauthorized
  - Token zweryfikowany, ale operacja na DB nie powiodła się -> 500 Internal Server Error (z logowaniem szczegółów do systemu logów)
  - Próba wylogowania nieistniejącej sesji (jeśli `sessionId` podane) -> 404 Not Found
  - Niepoprawne pole body (np. `allDevices` nie jest boolean) -> 400 Bad Request

- Logowanie błędów:
  - Rejestrować błędy operacyjne w centralnym loggerze (np. Sentry/Elastic), z identyfikatorem requestId.
  - Opcjonalnie zapisywać krytyczne błędy w tabeli `error_logs` z kolumnami: `id`, `user_id`, `endpoint`, `error_message`, `stack`, `meta`, `created_at`.
  - Nie logować treści tokena; logować jedynie skrót tokena (np. sha256(token) jeśli potrzebne).

## 8. Wydajność

- Operacje wylogowania są przeważnie lekkie (UPDATE/DELETE jednego rekordu). Potencjalne wąskie gardła:
  - Blacklisty JWT w DB — zależnie od ruchu, użyć szybkie pamięci podręcznej (Redis) zamiast DB.
  - Usuwanie wielu wpisów (allDevices) — batch delete; użyć transakcji.

- Rekomendacje:
  - Cache dla operacji weryfikacji tokenów tylko jeśli potrzebne.
  - Asynchroniczne usuwanie dodatkowych artefaktów (np. revoke w zewnętrznych serwisach) przy pomocy kolejki (background job) jeśli operacja trwa dłużej.

## 9. Kroki implementacji

1. Analiza i przygotowanie:
   - Sprawdź istniejące modele sesji w `src/db/database.types.ts` i `supabase` migrations, aby ustalić strukturę tabeli `sessions`.
   - Przejrzyj `src/types.ts` i istniejące endpointy auth (np. login/signup) by dopasować konwencje.

2. Typy i kontrakty:
   - Dodać/uzupełnić `LogoutCommand` i `LogoutResponseDTO` w `src/types.ts` (lub `src/api/dto`).

3. Service:
   - Jeśli istnieje `AuthService`, dodać metodę `logout(command: LogoutCommand): Promise<void>`; w przeciwnym razie utworzyć `AuthService` z metodami:
     - `verifyToken(token: string): Promise<VerifiedTokenPayload>`
     - `revokeSession(sessionId?: string, userId?: string, allDevices?: boolean): Promise<void>`
   - Logikę unieważnienia sesji wydzielić do `AuthService` (nie w kontrolerze).

4. Kontroler / Handler:
   - Utworzyć handler POST `/auth/logout` w warstwie routera:
     - Wyciągnąć token z nagłówka Authorization.
     - Wywołać `AuthService.verifyToken`.
     - Wywołać `AuthService.revokeSession` z odpowiednimi parametrami.
     - Zwrócić 200 z `{"message":"Wylogowano pomyślnie"}`.
   - Walidacja wejścia (jeśli body) powinna użyć schematu walidacji (np. z `zod` lub `class-validator`) zgodnie z konwencją projektu.

5. Middleware i zabezpieczenia:
   - Upewnić się, że middleware uwierzytelniający nie blokuje wylogowania (można sprawdzić token tylko dla autoryzacji).
   - Dodać rate limiting na endpoint jeśli globalne limity nie obowiązują.

6. Integracja z DB / Supabase:
   - Jeśli używane Supabase Auth, użyć SDK do końcowego usunięcia sesji (revoke).
   - Dla DB: wykonać odpowiednie UPDATE/DELETE na tabeli `sessions` w transakcji.

7. Logowanie i monitoring:
   - Dodać logging sukcesu/porażki (userId, sessionId, ip, userAgent).
   - W przypadku błędu wysyłać informacje do Sentry/Elastic.

8. Testy:
   - Jednostkowe testy `AuthService.logout` z mockiem DB/Supabase.
   - Integracyjne testy endpointu:
     - sukces wylogowania z prawidłowym tokenem,
     - 401 przy braku/niepoprawnym tokenie,
     - 404 przy nieistniejącej sesji (jeśli obsługiwane),
     - 500 przy błędzie DB (symulowany).

9. Dokumentacja:
   - Zaktualizować dokumentację API (OpenAPI/Swagger) z opisem endpointu i przykładami odpowiedzi.

10. Deployment i rollback:

- Wdrożyć zmiany na staging; uruchomić testy integracyjne; monitorować logi.
- Jeśli wprowadzono blacklistę/JWT stateful feature, przygotować migracje i rollout plan (migracja danych, mechanizm czyszczenia).

## 10. Przykładowa implementacja (pseudokod)

Controller (pseudokod):

```ts
// Extract token from header
const token = getBearerToken(req.headers.authorization);
const payload = await authService.verifyToken(token); // throws 401 if invalid
await authService.revokeSession({
  userId: payload.userId,
  sessionId: req.body?.sessionId,
  allDevices: req.body?.allDevices,
});
return res.status(200).json({ message: 'Wylogowano pomyślnie' });
```

AuthService.revokeSession (pseudokod):

```ts
if (allDevices) {
  await sessionsRepo.revokeAllForUser(userId);
} else if (sessionId) {
  const s = await sessionsRepo.findById(sessionId);
  if (!s) throw new NotFoundError();
  await sessionsRepo.revoke(sessionId);
} else {
  // revoke session related to token payload (sessionId from payload)
  await sessionsRepo.revoke(sessionIdFromPayload);
}
```

---

Plik planu utworzony. Proszę o potwierdzenie, jeśli chcesz, aby obok planu dodać szablon kontrolera/servisu w repozytorium (implementacja kodowa).
