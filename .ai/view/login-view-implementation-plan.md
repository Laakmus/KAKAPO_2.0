# Plan implementacji widoku Logowanie

## 1. Przegląd
Widok `Logowanie` `/login` umożliwia zalogowanie istniejącego użytkownika przez podanie emaila i hasła, wyświetla błędy zgodnie z PRD (401/403/429/500) i zarządza przekierowaniem do `/offers` po otrzymaniu tokenów JWT z `POST /api/auth/login`. Wspiera dostępność przez `aria-live` dla globalnych komunikatów oraz bezpieczne przechowywanie tokenów (opisane w tech stacku).

## 2. Routing widoku
- Ścieżka: `/login` w pliku `src/pages/login.astro`.
- `export const prerender = false` (tak jak w innych API/stronach auth).
- Wrap wewnątrz `Layout` z tytułem „Logowanie — KAKAPO”.
- Po stronie serwera/po stronie klienta można sprawdzić `Astro.locals.user` i jeśli istnieje użytkownik -> `Astro.redirect('/offers')`, a po stronie React (np. `useEffect`) zapewnić dodatkową ochronę (np. `if (session) navigate('/offers')`).
- Strona powinna korzystać z `client:load` dla `LoginPage`, by mieć dostęp do browser APIs (focus, localStorage, redirect).

## 3. Struktura komponentów
- `LoginPage` (kontener widoku, układ + metadane, przekierowanie jeśli już zalogowany)
- `LoginForm` (formularz, walidacja, submit, GlobalNotification)
- `GlobalNotification` (aria-live area, rozszerzenie o CTA „Zaloguj ponownie” w sytuacjach UNAUTHORIZED)
- `FooterLinks` (link do `/signup`)

Diagram drzewa komponentów:
```
LoginPage
├── Layout (meta + tytuł)
└── Section (centralny kontener)
    ├── Header (tytuł + opis)
    ├── LoginForm
    │   ├── GlobalNotification (aria-live)
    │   ├── Input (email)
    │   ├── Input (password)
    │   └── Button (submit)
    └── FooterLinks (link do rejestracji)
```

## 4. Szczegóły komponentów

### LoginPage
- **Opis**: Astro + Reactowy komponent kontenerowy. Odpowiada za layout, tytuł strony, redirect gdy użytkownik ma już sesję (sprawdzany z `Astro.locals.user` i ewentualnie z `useLogin`/`localStorage`), przekazuje callbacki do `LoginForm`.
- **Główne elementy**: `Layout`, `section`/`div` tworzące centrowany panel, `LoginForm`, `FooterLinks`.
- **Obsługiwane interakcje**: weryfikacja istnienia aktywnej sesji (podczas SSR i w `useEffect`), przekazanie `onSuccess`, `onError` do `LoginForm`, ewentualna zmiana focusu.
- **Obsługiwana walidacja**: brak — delegowana do `LoginForm`, ale komponent może zablokować render jeśli użytkownik już zalogowany.
- **Typy**: `LoginPageProps` (opcjonalnie `isAuthenticated?: boolean`, `redirectTarget?: string`).
- **Propsy**: `initialValues?: LoginFormValues` (np. z query `?email=`, `?reason=unauthorized`), `onLoginSuccess(tokens)` (przekierowuje do `/offers`, zapisuje tokeny), `onLoginError(error)` (ustawia `GlobalNotification`).

### LoginForm
- **Opis**: Reactowy formularz istniejący wewnątrz `LoginPage`. Używa `react-hook-form` + `zodResolver(loginSchema)` i `GlobalNotification` do komunikatów, integruje się z `useLogin`.
- **Główne elementy**: `form`, `Input` (email), `Input` (password), `Button` submit, `GlobalNotification`, `FooterLinks`.
- **Obsługiwane interakcje**:
  - wpisywanie emaila/hasła (walidacja inline),
  - submit (`onSubmit` wywołuje `useLogin.login(values)`),
  - focus na pierwszym błędnym polu (efekt `useEffect` reagujący na `formState.errors`),
  - `GlobalNotification` pokazuje status (błąd/odświeżenie) i opcjonalnie CTA „Zaloguj ponownie”.
- **Obsługiwana walidacja**:
  - email: required, format, trim, lowercase,
  - password: required, min 6 znaków (wg backendu),
  - API: `(setError)` dla 400 + message z `details.field` (jeśli mail/hasło),
  - 401/403/429/500: ustawienie `notification`.
- **Typy**: `LoginFormValues` (sekcja 5), `LoginUserCommand`, `ApiErrorResponse`, `LoginNotificationMessage`.
- **Propsy**:
  - `onSuccess?: (tokens: AuthTokensResponse) => void`,
  - `onError?: (error: ApiErrorResponse | string) => void`,
  - `initialValues?: Partial<LoginFormValues>`,
  - `showFooterLink?: boolean` (domyślnie true, by pokazać `FooterLinks`).

### GlobalNotification (rozszerzone użycie)
- **Opis**: Komponent aria-live z `role="status"` (już istnieje) – dla logowania potrzebujemy dodatkowego CTA w treści (np. `actionLabel` / `actionHref`).
- **Główne elementy**: `div` z ikoną, tekst, opcjonalna `button`/`a` dla akcji „Zaloguj ponownie” (przy UNAUTHORIZED lub gdy serwer sugeruje ponowne uwierzytelnienie).
- **Obsługiwane interakcje**: pojawienie się i zniknięcie komunikatu po błędzie, CTA wykonujący `onClick`/przekierowanie.
- **Obsługiwana walidacja**: brak, ale powinien reagować na typ komunikatu (error/success).
- **Typy**: `LoginNotificationMessage` (extenda `NotificationMessage` z polami `actionLabel?: string`, `actionHref?: string`, `actionOnClick?: () => void`).
- **Propsy**: `message?: LoginNotificationMessage`, `className?: string`.

### FooterLinks
- **Opis**: Link spod formularza przenoszący do `/signup`.
- **Główne elementy**: `p` + `a` (Tailwind, focus).
- **Obsługiwane interakcje**: klik przekierowuje do rejestracji.
- **Obsługiwana walidacja**: brak.
- **Typy**: `FooterLinksProps` (już istnieje, wystarczy `href?: string`, `className?: string`).
- **Propsy**: przekazać `href="/signup"` i ewentualnie `className="mt-6"`.

## 5. Typy
- `LoginFormValues` (ViewModel dla `LoginForm`):
  - `email: string`
  - `password: string`
  - powiązany z `LoginUserCommand` (request body)
- `LoginNotificationMessage` (rozszerzenie `NotificationMessage`):
  - `type: 'success' | 'error'`
  - `text: string`
  - `actionLabel?: string` (np. „Zaloguj ponownie”)
  - `actionHref?: string` (np. `/login?reason=unauthorized`) lub `actionOnClick?: () => void` (np. `window.location.reload`)
- `UseLoginState` (stan hooka `useLogin`):
  - `isLoading: boolean`
  - `notification?: LoginNotificationMessage`
- `UseLoginResult` (wynik `login(values)`):
  - `success: true; data: AuthTokensResponse`
  - `success: false; error: ApiErrorResponse | string`
- `LoginPageProps` (opcjonalny):
  - `isAuthenticated?: boolean`
  - `redirectTarget?: string` (domyślnie `/offers`)
  - `initialValues?: Partial<LoginFormValues>`

## 6. Zarządzanie stanem
- `useLogin` (custom hook):
  - `useState<UseLoginState>` z `isLoading`, `notification`.
  - `login(values: LoginFormValues)` wysyła `POST /api/auth/login`.
  - Na success: zapisuje `access_token` i `refresh_token` (np. `localStorage` lub `document.cookie`), wywołuje `onSuccess` i `window.location.assign('/offers')`.
  - Na błąd: ustawia `notification` z `actionLabel`, `text` i `type`.
  - `clearNotification()` do resetowania komunikatów (przy focusie, przy zamykaniu alertu).
- `react-hook-form` w `LoginForm` ma `mode: 'onBlur'` i `resolver: zodResolver(loginSchema)`.
- Focus: `useEffect` monitorujący `errors`, przy pierwszym polu invalid ustawia focus (mapa `ref`).
- Tokeny: planujemy middleware `Authorization` w requestach (np. `fetchWrapper` pobierający `access_token` z `localStorage` i dodający header).
- `LoginPage` może przechowywać `initialNotification` (np. `?reason=unauthorized`), przekazując do `useLogin` w `notification` startowej (CTA „Zaloguj ponownie”).

## 7. Integracja API
1. Endpoint: `POST /api/auth/login` (Astro API route `src/pages/api/auth/login.ts`).
2. Request body: `LoginUserCommand` = `{ email: string; password: string; }`.
3. Nagłówki: `Content-Type: application/json`.
4. Success 200: `AuthTokensResponse` zawierające `access_token`, `refresh_token`, `user { id, email }`.
5. Obsługiwane błędy:
   - 400 VALIDATION_ERROR (np. niepoprawny email): mapować do `setError` na konkretnym polu.
   - 401 UNAUTHORIZED: ustawić `notification` z tekstem „Email lub hasło niepoprawne” i CTA „Zaloguj ponownie”.
   - 403 FORBIDDEN: `notification` z instrukcją „Email nie został zweryfikowany”.
   - 429 RATE_LIMIT_EXCEEDED: globalny alert „Odczekaj 15 minut” + link „Ponów”.
   - 500 INTERNAL_ERROR / inne: `notification` z ogólnym komunikatem.
6. `useLogin` powinien rzucać `ApiErrorResponse` w `error` (żeby `LoginForm` mógł wyciągnąć `details.field`).
7. Po sukcesie: `useLogin` zapisuje tokeny i ewentualnie ustawia `document.cookie = `? to do wewnątrz hooka (w planie wyjaśnić preferowany mechanizm z tech stacku — `httpOnly cookie` w przyszłości, teraz np. `localStorage`).

## 8. Interakcje użytkownika
- focus na polu email po załadowaniu (z `useEffect` + `ref`).
- wysyłanie wartości (email/hasło) → walidacja Zod + `react-hook-form`.
- klik „Zaloguj”:
  - disable button (isLoading),
  - `useLogin` wywołuje API,
  - w razie błędu (401/403/429/500) pokazuje `GlobalNotification`,
  - w przypadku 200: redirect `/offers`, tokeny zapisane i notyfikacja sukcesu (opcjonalnie).
- `GlobalNotification` informuje o stanie (np. „Email niezweryfikowany”), CTA „Zaloguj ponownie” odsyła do `/login?reason=unauthorized`.
- Link „Nie masz konta? Zarejestruj się” (komponent `FooterLinks`) przenosi pod `/signup`.
- `ESC`/`Enter` w formularzu (standardowa obsługa form): `Enter` submit, `Esc` może zamknąć globalny alert (jeśli w `GlobalNotification` dodamy `onClose`).

## 9. Warunki i walidacja
- Email:
  - `required`.
  - `zod` sprawdza format i lowercase/trim (jak backend).
  - Błędne formaty -> `errors.email`.
- Password:
  - `required`.
  - `minLength 6`.
  - `zod`/`react-hook-form` -> `errors.password`.
- API:
  - 400/422 -> mapowanie do `setError`.
  - 401 -> `notification`, button z `actionOnClick`.
  - 403 -> `notification` informujące o weryfikacji email.
  - 429 -> `notification` z komunikatem `rate limit`.
  - 500 -> `general notification`.
- Formularz `noValidate` i walidacja klienta (zod) zapewnia spójność przed wysłaniem.

## 10. Obsługa błędów
- 400 VALIDATION_ERROR -> `setError` (email/password) + `GlobalNotification` z `details`.
- 401 UNAUTHORIZED -> `notification` z `actionLabel: 'Zaloguj ponownie'`, `actionHref: '/login'`, `type: 'error'`.
- 403 FORBIDDEN -> `notification` „Email nie został zweryfikowany. Sprawdź skrzynkę.”, CTA „Wyślij link ponownie” (może to być placeholder do przyszłego flow).
- 429 TooManyRequests -> `notification` „Przekroczono limit prób logowania. Spróbuj za 15 minut.”, w `GlobalNotification` dodać `actionLabel: 'Ponów'` (wywołanie `login` ponownie).
- 500 / network errors -> `notification` z fallbackowym `text`, `console.error`.
- Timeout/sieć -> `notification` i `clearNotification` (z `useLogin`), button `Zaloguj` odblokowany.

## 11. Kroki implementacji
1. Dodać lub odświeżyć `loginSchema` (już jest w `src/schemas/auth.schema.ts`) i upewnić się, że eksportuje `LoginInput`.
2. Zaplanować `LoginPage` (Astro) z `Layout`, `LoginPage` React component importowany z `client:load`, `prerender = false`.
3. Stworzyć `LoginPage` React z logiką redirectu (`Astro.locals.user`, `useEffect`).
4. W `src/components` zbudować `LoginForm` z `react-hook-form`, `zodResolver`, `GlobalNotification`, `FooterLinks`.
5. Utworzyć hook `useLogin` (stan `isLoading`, `notification`, `login(values)`).
6. Rozszerzyć `NotificationMessage`/`GlobalNotification`, dodając `actionLabel/actionHref` dla CTA (reakcja na UNAUTHORIZED/429).
7. Zapewnić focus management (ref do email/password, useEffect na `errors`).
8. Obsłużyć zapisywanie tokenów (np. `localStorage.setItem('access_token', ...)`) i przygotować `fetch` helper do dodawania `Authorization`.
9. Po sukcesie `login` -> `window.location.assign('/offers')` lub `navigate`.
10. Dodać `FooterLinks` z `href="/signup"` i opcjonalną sekcją „Nie masz konta?”.
11. Przetestować doświadczenia: walidacje, błędy 401/403/429/500, komunikaty, redirect, CTA „Zaloguj ponownie”.
12. Upewnić się, że przy `przekierowaniu UNAUTHORIZED` inne widoki (np. middleware) mogą przekazywać query `?reason=unauthorized` do `LoginPage` i że `GlobalNotification` wyświetla zachęcający link.

