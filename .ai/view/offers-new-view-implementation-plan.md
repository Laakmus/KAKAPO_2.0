# Plan implementacji widoku Dodawanie oferty

## 1. Przegląd

Widok `/offers/new` umożliwia zalogowanemu użytkownikowi utworzenie nowej oferty barterowej zgodnie z walidacją backendu i wymaganiami PRD (US-008). Layout koncentruje się na formularzu z instrukcjami dotyczących długości pól, walidacją URL i widocznym komunikacie o stanie operacji, a po sukcesie przekierowuje na stronę szczegółów nowo dodanej oferty.

## 2. Routing widoku

Strona dostępna pod ścieżką `/offers/new`. Powinna być chroniona: w razie braku aktywnej sesji (401 z API) użytkownik trafia na ekran logowania, a sama strona może sprawdzać sesję np. w `onMount`/`page` loaderze lub podczas pierwszego submitu.

## 3. Struktura komponentów

```
OffersNewPage
├── NavigationLayout (globalny pasek nawigacji)
├── GlobalNotification (obszar komunikatów)
└── OfferForm
     ├── FormFieldWrapper + Input (tytuł)
     ├── FormFieldWrapper + Textarea (opis)
     ├── FormFieldWrapper + Input (URL zdjęcia)
     ├── CitySelect (Dropdown z 16 miastami)
     └── Button "Dodaj ofertę"
```

## 4. Szczegóły komponentów

### OffersNewPage

- Opis: strona Astro/React, która ładuje layout, inicjalizuje globalny kontekst powiadomień i wyświetla formularz; może sprawdzać status sesji przy renderze SSR/CSR.
- Główne elementy: nagłówek (np. `h1`), blok z instrukcjami walidacji, `GlobalNotification`, `OfferForm`.
- Obsługiwane interakcje: przekierowanie w przypadku sukcesu (`window.location.assign('/offers/' + result.id)` lub `useNavigate`), inicjalizacja powiadomienia.
- Obsługiwana walidacja: nie bezpośrednio, przekazuje z `OfferForm`.
- Typy: `OfferFormValues`, `CreateOfferResponse`, `NotificationMessage`.
- Propsy: brak – komponent strony zarządza logiką i przekazuje `onSuccess`, `onError`.

### OfferForm

- Opis: komponent z `react-hook-form` + `zod` resolverem, obsługuje wszystkie pola formularza, inline walidację i submit do API.
- Główne elementy: pola `Input` i `Textarea`, helpery z wymaganiami długości/formatu, statusowy `button`, `CitySelect`, `ImageUpload`.
- Obsługiwane interakcje: `onChange`/`onBlur` aktualizują stan formularza, `onSubmit` wywołuje `createOffer`, `setError` aktualizuje komunikaty, `reset` po sukcesie (opcjonalnie).
- Obsługiwana walidacja:
  - `title`: required, min 5, max 100, trim.
  - `description`: required, min 10, max 5000, trim.
  - `image_url`: optional, zwrócony przez ImageUpload po pomyślnym uploadzie.
  - `city`: required, musi być jedną z 16 wartości (enum).
- Typy: `OfferFormValues`, `CreateOfferCommand`, `ApiFieldError`.
- Propsy: `onSuccess(result: CreateOfferResponse)`, `onError(message: string)`, `showNotification(type: NotificationType, text: string)` (jeśli nie używa globalnego kontekstu).

### CitySelect

- Opis: dostępny dropdown z listą miast (przekazana lista `CityOption[]`), wysyła wybraną wartość do formularza.
- Główne elementy: `label`, `select` z `option` dla każdej miasta, placeholder "Wybierz miasto", helper text.
- Obsługiwane interakcje: `onChange` aktualizuje wartość w RHF, `onFocus` zarządza aria-describedby.
- Obsługiwana walidacja: `city` jest wymagane; błędy z RHF pokazują wskazówki.
- Typy: `CityName = typeof ALLOWED_CITIES[number]`, `CityOption = { label: string; value: CityName }`.
- Propsy: `value: CityName | ''`, `onChange(value: CityName)`, `error?: string`.

### ValidationHints

- Opis: blok tekstowy lub `ul` prezentujący wymagania długości (np. „Tytuł: 5–100 znaków”).
- Główne elementy: `ul` z `li` dla każdego warunku (wymagania z PRD).
- Obsługiwane interakcje: brak (informacyjny).
- Typy: brak.
- Propsy: `items: string[]`.

### ImageUpload

- Opis: komponent do wyboru i uploadu zdjęcia do Supabase Storage, zwraca URL publiczny.
- Główne elementy: input file, podgląd zdjęcia, przycisk upload, status (loading/error/success).
- Obsługiwane interakcje: wybór pliku, upload, usunięcie.
- Obsługiwana walidacja: format (JPG/PNG/WebP), rozmiar (max 10 MB), kompresja do 1920px, generowanie miniatury 400px.
- Typy: `ImageUploadProps`.
- Propsy: `onUploadComplete(url: string, thumbnailUrl?: string)`, `onUploadError(error: string)`, `currentImageUrl?: string`, `userId: string`.

### GlobalNotification (wbudowany)

- Opis: już istniejący komponent (np. w `src/components/GlobalNotification.tsx`), służy do wyświetlania sukcesów/błędów.
- Główne elementy: pasek z tekstem, ikona, przycisk zamknięcia.
- Obsługiwane interakcje: `onClose`, automatyczne zamknięcie po kilku sekundach.
- Obsługiwana walidacja: brak.
- Typy: `NotificationMessage`.
- Propsy: `message`, `type`, `onClose`.

## 5. Typy

- `OfferFormValues`:
  ```ts
  type OfferFormValues = {
    title: string;
    description: string;
    image_url?: string;
    city: CityName;
  };
  ```
  Przechowuje dane wejściowe formularza zgodne z backendowym `CreateOfferCommand`.
- `CityName`: `typeof ALLOWED_CITIES[number]` (enerum 16 nazw).
- `OfferFormFieldError`: `{ field: keyof OfferFormValues; message: string }` – do mapowania `ApiErrorResponse.details`.
- `CreateOfferCommand` (z `src/types.ts`): `Pick<OfferInsert, 'title' | 'description' | 'image_url' | 'city'>`.
- `CreateOfferResponse`: `OfferDetailDTO & { message?: string }` – zawiera `id`, `owner_id`, `owner_name`, `interests_count`, `is_interested`, `message`.
- `ApiErrorResponse` / `ApiFieldError`: use for error parsing (`error.details?.field`, `error.details?.value`).
- `NotificationMessage`: `{ type: 'success' | 'error'; text: string }` – do sterowania `GlobalNotification`.

## 6. Zarządzanie stanem

- Formularz zarządzany przez `react-hook-form` + `zodResolver(createOfferSchema)` (formularz dublujący backendową walidację).
- `useCreateOffer` (custom hook) z `useState` na `isLoading`, `serverError`, `setFieldError`. Hook przyjmuje `OfferFormValues` i:
  1. Wywołuje `fetch('/api/offers', { method: 'POST', body: JSON.stringify(values), headers: { 'Content-Type': 'application/json' }, credentials: 'include' })`.
  2. Zamienia odpowiedź w `CreateOfferResponse` lub rzuca `ApiErrorResponse`.
  3. Dla błędów pola (z `details`) wywołuje `setError`.
  4. Dla sukcesu zwraca `result` i obsługuje powiadomienie + redirect.
- Globalny stan powiadomień (np. w kontekście lub lokalnie w `OffersNewPage`) przechowuje `NotificationMessage | null`.

## 7. Integracja API

- Endpoint: `POST /api/offers`.
- Request:
  ```json
  {
    "title": "...",
    "description": "...",
    "image_url": "https://...",
    "city": "Warszawa"
  }
  ```
  (pola `title`, `description`, `city` wymagane; `image_url` opcjonalny).
- Headers: `Content-Type: application/json`, `credentials: 'include'` (żeby wysłać sesję Supabase).
- Response: `CreateOfferResponse` z `id`, `owner_id`, `owner_name`, `title`, `description`, `image_url`, `city`, `status`, `created_at`, `interests_count`, `is_interested`, `message`.
- Błędy:
  - 400/422: `ApiErrorResponse` z `error.details.field` i `message` (mapować na `setError`).
  - 401: wyświetlić komunikat „Brak autoryzacji” i przekierować do `/login`.
  - 403: pokazać „Brak uprawnień” (RLS).
  - 500: uniwersalny komunikat „Wystąpił błąd serwera…”, log i możliwość ponowienia.
- Po sukcesie: zapisać `result.id`, wyświetlić powiadomienie sukcesu („Oferta dodana pomyślnie!”) i przenieść na `/offers/{id}`.

## 8. Interakcje użytkownika

- Wczytanie strony pokazuje formularz z instrukcjami walidacji (lista długości, info o rozszerzeniach).
- Użytkownik wpisuje tytuł/opis, **wybiera zdjęcie** (ImageUpload waliduje format i rozmiar, kompresuje, uploaduje do Supabase Storage), wybiera miasto.
- ImageUpload wyświetla podgląd wybranego zdjęcia, status uploadu (loading/error/success), oraz przycisk usunięcia.
- Po udanym uploadzie URL zdjęcia jest automatycznie zapisywany w formularzu (`image_url`).
- Każde pole pokazuje walidację w momencie blur lub submit.
- Po kliknięciu „Dodaj ofertę" przycisk przechodzi w stan ładowania i blokuje kolejne kliknięcia.
- W przypadku błędu walidacji serwera pokazuje się komunikat pod konkretnym polem; przy błędzie ogólnym (np. 500) pojawia się globalny banner.
- Po sukcesie: widok wyświetla powiadomienie sukcesu i przekierowuje do `/offers/{id}` (np. `window.location.href`).

## 9. Warunki i walidacja

- `title`: wymagalny, 5–100 znaków, trim. Wskazówki: „5-100 znaków".
- `description`: wymagalny, 10–5000 znaków, trim. Pokazać licznik znaków (opcjonalnie).
- `image_url`: opcjonalny, zwrócony przez ImageUpload po pomyślnym uploadzie do Supabase Storage.
  - **ImageUpload waliduje**: format (JPG/PNG/WebP), rozmiar (max 10 MB).
  - **ImageUpload przetwarza**: kompresja do 1920px, generowanie miniatury 400px.
  - **ImageUpload uploaduje**: do Supabase Storage bucket `offers` w strukturze `{user_id}/{timestamp}-{filename}`.
- `city`: dropdown z 16 pozycji, `zod` używa `z.enum(ALLOWED_CITIES)`.
- Walidacja powinna odzwierciedlać backendowe komunikaty, np. `Tytuł musi mieć co najmniej 5 znaków`.
- Podczas submitu `zod` resolver uzupełnia `errors`; dodatkowe wiadomości z API (422) dopisują `setError(field, { message })`.

## 10. Obsługa błędów

- **Field errors (422)**: `error.details.field` mapowane do `setError`; komunikat z `error.message`.
- **Brak autoryzacji/SESJI**: `401` → powiadomienie typu `error`, przekierowanie do `/login` (można dodać query `?redirect=/offers/new`).
- **RLS / Forbidden (403)**: show global error „Brak uprawnień do wykonania tej operacji”.
- **Sieć/500**: `try/catch` w `useCreateOffer`, `console.error`, globalne powiadomienie „Wystąpił błąd serwera. Spróbuj ponownie później”.
- **Validation mismatch**: sprawdzić, czy `image_url` ma walidowane rozszerzenie; w przypadku 400 na `body` (invalid JSON) pokazać komunikat ogólny.
- **Timeout**: dodać `AbortController` (opcjonalnie) i umożliwić użytkownikowi ponowienie.

## 11. Kroki implementacji

1. Stworzyć nową stronę w `src/pages/offers/new.astro` lub `.tsx`, w której ładowany jest layout i `OfferForm`.
2. Korzystając z `react-hook-form` + `zodResolver(createOfferSchema)` zaimplementować `OfferForm` z polami i helperami walidacyjno-informacyjnymi.
3. Zaimplementować `CitySelect` z listą `ALLOWED_CITIES` (można przenieść enum z `schemas/offers.schema.ts`).
4. Utworzyć `useCreateOffer` (lub analogiczny handler), który wywołuje `POST /api/offers`, obsługuje response i błędy, mapuje `ApiErrorResponse.details` do `setError`, ustawia `notification`.
5. Zintegruj `GlobalNotification` (jeśli nie ma kontekstu, trzymamy `notification` w stanie strony).
6. Na sukces: wyświetl komunikat „Oferta dodana pomyślnie!” i przekieruj na `/offers/{id}`.
7. Dodaj zabezpieczenie sesji (jeśli odczytujemy sesję klienta, obsłużyć 401).
8. Przetestuj walidację (lokalnie z manualnym curl/emulator – testy z planu `offers-create-plan`).
9. Upewnij się, że UI spełnia wymagania PRD (instrukcje, inline validation, global notifications).
10. Zaktualizuj dokumentację / PRD planu, jeśli coś się zmieni.
