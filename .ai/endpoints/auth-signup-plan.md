<analysis>
1) Podsumowanie kluczowych punktów specyfikacji:
- Endpoint: `POST /auth/signup` — rejestracja nowego użytkownika z weryfikacją email.
- Request body: `{ email, password, first_name, last_name }`.
- Success: 201 Created, payload zawiera `user` (id, email, email_confirmed_at) oraz `message` informujący o konieczności weryfikacji email.
- Błędy: 400 (email istnieje, nieprawidłowy format), 422 (hasło za krótkie), 500 (błąd serwera).

2) Wymagane i opcjonalne parametry:
- Wymagane: `email` (string, poprawny format), `password` (string, min długość), `first_name` (string), `last_name` (string).
- Opcjonalne: brak w specyfikacji; ewentualne pola rozszerzające (captcha, utm) — opcjonalne do dodania później.

3) Niezbędne typy DTO i Command Modele:
- `RegisterUserCommand` — już istnieje w `src/types.ts`:
  - { email: string; password: string; first_name: string; last_name: string; }
- `SignupResponseDTO`:
  - { user: { id: string; email: string; email_confirmed_at: string | null }, message: string }
- `ApiErrorResponse` — istnieje w `src/types.ts`.

4) Ekstrakcja logiki do service:
- Stworzyć/rozszerzyć `AuthService` (np. `src/services/auth.service.ts`) z metodą `register(command: RegisterUserCommand): Promise<SignupResponseDTO>`.
  - Odpowiedzialności serwisu:
    - Walidacja (zod) — minimalne reguły (format email, password min length, imiona).
    - Wywołanie Supabase Auth `signUp`.
    - Obsługa błędów Supabase i mapowanie na kody HTTP.
    - (Opcjonalnie) zapis dodatkowych metadanych do `audit_logs`.
  - Interakcje z DB:
    - Supabase Auth utworzy wpis w `auth.users`; trigger w DB (wg db-plan) może utworzyć profil w `public.users`. Serwis jedynie odczytuje zwrócone `user` id/email.

5) Walidacja wejścia:
- Użyć `zod` lub `zod`-like do walidacji request body:
  - `email`: zod.string().email()
  - `password`: zod.string().min(8) — specyfikacja wyróżnia błąd 422 gdy za krótkie
  - `first_name`, `last_name`: zod.string().min(1).max(100)
- W przypadku błędów walidacji zwrócić `422 Unprocessable Entity` (dla hasła) lub `400 Bad Request` (dla ogólnych nieprawidłowości) — jasno rozgraniczyć komunikaty.

6) Rejestrowanie błędów:
- Dla krytycznych błędów serwera zapisać wpis w tabeli `audit_logs` (funkcja serwisowa używająca service_role w backend jobie) — np. gdy tworzenie użytkownika nie powiodło się z błędem 500.
- Nie zapisywać haseł ani danych wrażliwych w `audit_logs`.

7) Zagrożenia bezpieczeństwa:
- Brute-force / mass signup: na warstwie aplikacji wprowadzić rate limiting (np. per IP).
- Captcha: rozważyć dodanie CAPTCHA/recaptcha przy podejrzanych rejestracjach.
- Nie przechowywać `service_role` w frontendzie — backend (server route) używa env `SUPABASE_SERVICE_ROLE_KEY` tylko jeśli konieczne.
- Walidacja email, ograniczenie długości pól, sanitization (chociaż Supabase obsługuje).
- Logowanie minimalnych zdarzeń i monitorowanie nieudanych prób rejestracji.

8) Scenariusze błędów i kody odpowiedzi:
- 201 Created — pomyślnie utworzono, email wysłany do weryfikacji.
- 400 Bad Request — niepoprawny format danych (np. brak wymaganych pól).
- 422 Unprocessable Entity — hasło za krótkie (min 8) lub specyficzne walidacje.
- 409 Conflict (opcjonalnie) / 400 — email już istnieje (mapować błąd Supabase na 400 z komunikatem "Email już istnieje").
- 500 Internal Server Error — nieoczekiwany błąd serwera.
</analysis>

# API Endpoint Implementation Plan: Rejestracja użytkownika — `POST /auth/signup`

## 1. Przegląd punktu końcowego

Endpoint `POST /auth/signup` umożliwia rejestrację nowego użytkownika z automatycznym wysłaniem emaila weryfikacyjnego (supabase-managed). Celem jest bezpieczne utworzenie konta użytkownika, utworzenie profilu w DB (trigger/flow DB) i zwrócenie minimalnych informacji o nowo utworzonym użytkowniku oraz komunikatu informującego o weryfikacji email.

## 2. Szczegóły żądania

- Metoda HTTP: `POST`
- Struktura URL: `/auth/signup`
- Nagłówki:
  - `Content-Type: application/json`
  - (opcjonalnie) `X-Forwarded-For` — jeśli używany load balancer dla rate-limitingu
- Parametry:
  - Wymagane:
    - `email` (string) — poprawny adres email
    - `password` (string) — minimalna długość 8 (specyfikacja przewiduje 422 jeśli za krótkie)
    - `first_name` (string)
    - `last_name` (string)
  - Opcjonalne:
    - `captchaToken` (string) — jeśli wprowadzimy captcha/recaptcha
- Request Body:

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "first_name": "Jan",
  "last_name": "Kowalski"
}
```

## 3. Wykorzystywane typy (DTOs i Command Modele)

- `RegisterUserCommand` (użyj istniejącego z `src/types.ts`):
  - { email: string; password: string; first_name: string; last_name: string; }
- `SignupResponseDTO`:
  - { user: { id: string; email: string; email_confirmed_at: string | null }, message: string }
- `ApiErrorResponse` (używane przy błędach)

## 4. Szczegóły odpowiedzi

- 201 Created (sukces)
  - Body:
  ```json
  {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "email_confirmed_at": null
    },
    "message": "Sprawdź swoją skrzynkę email w celu weryfikacji"
  }
  ```

- Błędy:
  - 400 Bad Request
    - Powody: brak wymaganych pól, niepoprawny format (np. email), lub email już istnieje (można również użyć 409 Conflict; zgodnie ze specyfikacją mapujemy na 400).
    - Przykład body:
    ```json
    { "error": { "code": "BAD_REQUEST", "message": "Email już istnieje" } }
    ```
  - 422 Unprocessable Entity
    - Powód: hasło za krótkie lub inne szczegółowe reguły walidacyjne.
    - Przykład:
    ```json
    { "error": { "code": "VALIDATION_FAILED", "message": "Hasło za krótkie" } }
    ```
  - 500 Internal Server Error — nieoczekiwany błąd serwera.

## 5. Przepływ danych

1. API route (server-side) odbiera `POST /auth/signup` i parsuje JSON.
2. Wstępna walidacja danych (zod):
   - email format, password min length (8), first_name/last_name obecne i w dopuszczalnych długościach.
3. Zlecenie rejestracji do `AuthService.register(command)`:
   - `AuthService` używa Supabase clienta (z anon key po stronie serwera lub service role jeśli wymagane) i wywołuje `supabase.auth.signUp({ email, password }, { data: { first_name, last_name }})` lub najpierw `supabase.auth.signUp(...)` a profile tworzy trigger DB.
4. Supabase zwraca wynik:
   - Sukces: zwrócić `user.id`, `user.email`, `user.email_confirmed_at` (może być null).
   - Błąd (np. duplicate email): otrzymać z Supabase szczegóły błędu; mapować na 400/422/500 odpowiednio.
5. (Opcjonalnie) Serwis zapisuje wejście do `audit_logs` przy krytycznych błędach.
6. Zwrócić 201 z `SignupResponseDTO` i komunikatem o weryfikacji email.

Uwagi o DB: wg `db-plan.md` trigger synchronizuje `auth.users` → `public.users`, więc backend nie musi jawnie tworzyć `users` row. Jeśli trigger nie istnieje w konkretnej instancji, backend powinien wykonać insert do `public.users` zabezpieczony transakcją.

## 6. Względy bezpieczeństwa

- Rate limiting: implementować per-IP i per-email throttling (np. 10 prób rejestracji na godzinę) — edge / middleware (`src/middleware/index.ts`) lub zewnętrzny WAF.
- CAPTCHA: rozważyć recaptcha przy pewnej liczbie nieudanych prób.
- Nie logować haseł ani tokenów w logach i `audit_logs`.
- Environment: `SUPABASE_SERVICE_ROLE_KEY` tylko w bezpiecznych backend jobach; front-end używa jedynie `SUPABASE_ANON_KEY`.
- Walidacja i sanitization: ograniczyć długości pól, uniemożliwić złośliwe payloady.
- HTTPS obligatoryjne i HSTS w produkcji.
- E-mail verification: nie traktować konta jako w pełni aktywnego przed potwierdzeniem email, jeśli wymagane przez PRD.

## 7. Obsługa błędów

- Mapowanie błędów Supabase:
  - `UserAlreadyExists` → 400 (message: "Email już istnieje")
  - `InvalidEmail` / `Malformed` → 400
  - `WeakPassword` → 422
  - Pozostałe błędy → 500
- Błędy walidacji wejścia:
  - Zwrócić `422` dla detali walidacji (np. password), lub `400` dla ogólnych braków/formatów zależnie od polityki.
- Logowanie:
  - Wszystkie 5xx i nietypowe 4xx zapisywać do `audit_logs` (bez danych wrażliwych) oraz wysyłać alert do monitoring (Sentry).

## 8. Wydajność

- Rejestracja to operacja write-bound (auth + ewentualny insert do profilu). Oczekiwane niskie QPS na starcie; monitorować i skalować backend worker/edge.
- Unikać blokujących operacji synchronicznych — używać async/await i timeoutów połączeń do Supabase.
- Cache/DB: brak znaczącego cache dla signup; indeksy w `auth.users` i `users` wystarczą.

## 9. Kroki implementacji (szczegółowy rozkład zadań)

Przed implementacją: upewnić się, że `SUPABASE_URL`, `SUPABASE_ANON_KEY` i (jeśli potrzebny) `SUPABASE_SERVICE_ROLE_KEY` są dostępne jako env.

1. Utworzyć lub zaktualizować zadanie w backlogu: "Implement /auth/signup".
2. Stworzyć `AuthService`:
   - Plik: `src/services/auth.service.ts`
   - Metoda: `async register(command: RegisterUserCommand): Promise<SignupResponseDTO>`
   - Zawiera wywołanie do `supabase.auth.signUp(...)`, mapowanie błędów.
3. Walidacja:
   - Dodać schemat `zod` w `src/services/auth.service.ts` lub `src/validators/auth.validator.ts`.
4. Endpoint route:
   - Utworzyć route server-side: `src/pages/api/auth/signup.ts` (lub zgodnie z konwencją projektu).
   - Parsowanie ciała, uruchomienie walidacji, wywołanie `AuthService.register`.
   - Mapowanie odpowiedzi HTTP i zwrócenie odpowiedniego statusu.
5. Obsługa błędów i logowanie:
   - W middleware lub w handlerze złapać nieobsłużone wyjątki i zwrócić 500, zapisać do `audit_logs` (jeśli krytyczne).
6. Testy:
   - Unit tests dla `AuthService.register` (mock Supabase client).
   - Integration tests dla route (end-to-end) — sprawdzić: prawidłowy 201, 400 dla duplikatów, 422 dla krótkich haseł.
7. Monitoring i alerty:
   - Dodać Sentry (lub inny) capture dla 5xx.
8. Dokumentacja:
   - Zaktualizować API docs (OpenAPI/README) z przykładami request/response i listą błędów.
9. Rollout:
   - Deploy na staging, przeprowadzić testy manualne i automatyczne, potem deploy na prod.

## 10. Dodatkowe uwagi operacyjne

- Jeśli `db-plan.md` zawiera trigger tworzący profil w `public.users`, użyć tego flow; w przeciwnym razie dodać w `AuthService` bezpieczny insert do `public.users`.
- Rozważyć wysyłanie dodatkowego emaila powitalnego po weryfikacji lub link aktywacyjny w warstwie Supabase (konfiguracja SMTP).
- Konsystencja komunikatów: API powinno zwracać przetłumaczone (PL) komunikaty zgodnie z UX spec.

---

Plik zapisany: `.ai/endpoints/auth-signup-plan.md`


