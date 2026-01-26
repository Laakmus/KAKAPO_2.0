# Plan implementacji widoku Rejestracja

## 1. Przegląd

Widok `Rejestracja` pod adresem `/signup` umożliwia nowym osobom założenie konta, weryfikuje dane na poziomie formularza, wywołuje `POST /auth/signup`, wyświetla komunikaty sukcesu oraz błędy (400/422/500) i prowadzi użytkownika do potwierdzenia email.

## 2. Routing widoku

Ścieżka dostępu: `/signup`. Widok jest publiczny; jeśli aplikacja wykryje zalogowanego użytkownika, przekierowuje na `/offers` (referencja PRD). Można to zrobić w `layout` lub w `onMount`/serwerowo w Astro (redirect w `getStaticPaths` nie jest konieczny, bo widok server-side).

## 3. Struktura komponentów

- `SignupPage` (strona kontenera)
- `RegistrationForm` (formularz z polami, walidacją i submit)
- `FormField` (opcjonalny, abstrakt pola z labelką i error)
- `GlobalNotification` (aria-live area)
- `FooterLinks` (link do logowania)

## 4. Szczegóły komponentów

### SignupPage

- Opis komponentu: strona zawierająca layout (nagłówek, formularz, komunikaty) oraz logikę przekierowania zalogowanych użytkowników.
- Główne elementy: wrapper (np. `section`), `RegistrationForm`, `GlobalNotification`, `FooterLinks`.
- Obsługiwane interakcje: przy wejściu fokus na pierwsze pole, monitorowanie statusu logowania (jeśli istnieje kontekst auth), przekierowanie.
- Obsługiwana walidacja: niewymagana – delegowana do `RegistrationForm`.
- Typy: żadne nowe – używa typów formy (sekcja 5) oraz `RegisterUserCommand`.
- Propsy: może przyjąć `isAuthenticated:boolean` (jeśli logika jest w komponencie nadrzędnym) oraz callback `onAuthenticatedRedirect`.

### RegistrationForm

- Opis komponentu: zarządza formularzem rejestracji, walidacją inline (Zod), obsługą submitu i komunikatów. Po pozytywnym submitcie pokazuje komunikat o konieczności weryfikacji email.
- Główne elementy: `form`, cztery `input` (email, password, first_name, last_name), `Button` submit, `GlobalNotification` error/success (lub przekazuje dane do `SignupPage`).
- Obsługiwane interakcje: wpisywanie danych, walidacja onBlur/onChange, klik `Zarejestruj`, zamiana komunikatów w aria-live, focus na pierwszym błędnym polu.
- Obsługiwana walidacja:
  - Email: obowiązkowy, format, trim + lowercase.
  - Password: obowiązkowy, length ≥ 8 (zgodnie z backendem).
  - First/Last name: obowiązkowe, długość 1-100.
  - Błędy z API 400/422 mapowane do odpowiednich pól (email/ password) z message.
- Typy: `RegistrationFormValues` (sekcja 5), `SignupResponseDTO`.
- Propsy: `onSuccess(message:string)`, `onError(error: ApiErrorResponse | string)`, opcjonalny `initialValues`.

### FormField (lub repeated inline fields)

- Opis komponentu: pojedynczy input z labelką, error message oraz `aria-invalid`.
- Główne elementy: `label`, `input`, `span` error.
- Obsługiwane interakcje: focus/blur, odczyt error z form state.
- Obsługiwana walidacja: wyświetlanie błędów z `react-hook-form`.
- Typy: `FormFieldProps` (value, onChange, error).
- Propsy: `label`, `name`, `type`, `placeholder`, `register` (RHForm), `error`.

### GlobalNotification

- Opis komponentu: aria-live area pokazujący globalną informację (success/error) z response API.
- Główne elementy: `div` z `role="status"` i `aria-live="polite"`.
- Obsługiwane interakcje: pojawienie się message po akcji (np. success po rejestracji).
- Obsługiwana walidacja: brak.
- Typy: `NotificationType = 'success' | 'error'`, `NotificationMessage`.
- Propsy: `message`, `type`.

### FooterLinks

- Opis komponentu: link “Masz już konto? Zaloguj się” prowadzący na `/login`.
- Główne elementy: `p`, `a`.
- Obsługiwane interakcje: klik przekierowuje do `/login`.
- Warunki walidacji: brak.
- Propsy: `href` (domyślnie `/login`), opcjonalny `className`.

## 5. Typy

- `RegistrationFormValues`: { email: string; password: string; first_name: string; last_name: string; }
- `SignupResponseDTO`: { user: { id: string; email: string; email_confirmed_at: string | null }; message: string }
- `NotificationMessage`: { type: 'success' | 'error'; text: string }
- `ApiFieldError`: { field?: string; value?: unknown; message: string }
- `ApiErrorResponse` (już istnieje w `src/types.ts`) – wykorzystywane przez form do mapowania do `ApiFieldError`.
- `UseSignupState`: { isLoading: boolean; notification?: NotificationMessage }

## 6. Zarządzanie stanem

- Użycie `react-hook-form` z `zodResolver(signupSchema)` do walidacji i zarządzania błędami.
- Custom hook `useSignup`:
  1. `useMutation`-like (może `useState` + `fetch`) do `POST /auth/signup`.
  2. Zarządza `isLoading`, `notification`, `fieldErrors`.
  3. Obsługuje focus na polu w oparciu o `firstErrorField`.
- Hook `useAutofocusInvalidField` (custom): monitoruje `formState.errors`, ustawia focus na pierwszym invalid. Dodatkowo `useEffect` ustawia focus na email po mount.

## 7. Integracja API

1. Po walidacji `RegistrationFormValues` wysyłamy `POST /auth/signup` (ścieżka - absolutna lub alias `/api/auth/signup`).
2. Body: `JSON.stringify(values)`.
3. Nagłówki: `Content-Type: application/json`.
4. Oczekiwany success 201 w formacie `SignupResponseDTO`.
5. Błędy:
   - 400: { error } – w szczególności `Email już istnieje` – mapujemy do pola email.
   - 422: { error } – `Hasło za krótkie` – mapujemy do pola password.
   - 500/others: pokazujemy globalny błąd (message z API lub default).
6. Po sukcesie: pokazujemy message `Sprawdź swoją skrzynkę email w celu weryfikacji`, reset form lub disable submit.

## 8. Interakcje użytkownika

- `focus` na polu email po załadowaniu widoku.
- `onChange` w polu -> walidacja inline (zod via RHF).
- `submit` -> `useSignup`, `isLoading` disables button, show spinner.
- API error -> highlight field + `GlobalNotification`.
- Success -> `GlobalNotification` success + maybe CTA (np. "Przejdź do logowania").
- Link do logowania – redirect.

## 9. Warunki i walidacja

- Email: `required`, `format email`, `toLowerCase()`, `trim`.
- Password: `required`, `minLength 8`.
- First/Last name: `required`, `minLength 1`, `maxLength 100`.
- Field errors powiązane z response (400 email, 422 password) – mapowane i focus przeniesiony.
- `GlobalNotification` warunkuje button state (np. success -> disable form).

## 10. Obsługa błędów

- `400` (duplikat/format) – `form.setError('email', { message: 'Email już istnieje / nieprawidłowy format' })`.
- `422` – `form.setError('password', { message: 'Hasło musi mieć min 8 znaków' })`.
- `500` – `GlobalNotification` error + log w console.
- `network timeout` – generalny toast/error.
- `fetch` rejected – use try/catch returning default message.
- `focus` na pierwszym błędnym polu w `useEffect` (z `Object.keys(errors)[0]`).

## 11. Kroki implementacji

1. Dodać typ `SignupResponseDTO` i `RegistrationFormValues` do `src/types.ts` (lub dedykowanego pliku typów formularza).
2. Utworzyć `signupSchema` (już w `src/schemas/auth.schema.ts`).
3. Stworzyć komponenty (`SignupPage`, `RegistrationForm`, `GlobalNotification`, `FooterLinks`) w `src/components` (Astro + React).
4. Implementować `useSignup` hook (fetch z `/api/auth/signup`, obsługa statusu/warning).
5. Połączyć `react-hook-form` + `zodResolver` w `RegistrationForm`, mapować błędy API do `setError`.
6. Dodać focus management (`useAutofocusInvalidField` oraz focus on load).
7. Dodać aria-live area (`GlobalNotification`) i testować dostępność.
8. Dodać link “Masz już konto? Zaloguj się” w stopce i obsłużyć przekierowanie.
9. Dodać e2e/integra test (opcjonalnie) – mock fetch i sprawdzenie komunikatów oraz blokady przy zalogowanym.
10. Po implementacji przetestować walidację, handling błędów i success message (manual/automatyczne).

## Diagram drzewa komponentów

```
SignupPage
└── RegistrationForm
    ├── FormField*4
    └── Button (submit)
└── GlobalNotification
└── FooterLinks
```
