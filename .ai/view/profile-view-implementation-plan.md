# Plan implementacji widoku Mój profil

## 1. Przegląd

Widok `/profile` to prywatny dashboard zalogowanego użytkownika, gdzie może przeglądać swoje dane (imię, nazwisko, email, data rejestracji, liczba aktywnych ofert), edytować podstawowe informacje oraz usunąć konto. Widok read-only przełącza się w tryb edycji po kliknięciu „Edytuj". Usunięcie konta wymaga weryfikacji hasłem i jest nieodwracalne (zgodnie z US-020).

## 2. Routing widoku

Strona dostępna na ścieżce `/profile`. Chroniona sesją Supabase (Bearer token via cookies), middleware weryfikuje autoryzację. Nawigacja z górnego paska kieruje tu po kliknięciu „Profil".

## 3. Struktura komponentów

- `ProfilePage` – kontener ładowania danych profilu, stan edycji, modal usunięcia.
- `ProfileHeader` – nagłówek z imieniem, nazwiskiem i opcjonalnym awatarem (placeholder).
- `ProfileStats` – sekcja ze statystykami (data rejestracji, liczba aktywnych ofert).
- `ProfileViewMode` – wyświetlenie danych w trybie read-only z przyciskiem „Edytuj".
- `ProfileEditForm` – inline formularz edycji (first_name, last_name) z walidacją i zapisem.
- `DeleteAccountDialog` – modal potwierdzenia usunięcia konta z polem hasła i ostrzeżeniem.
- `NotificationToast` – globalne powiadomienia sukces/błąd.

## 4. Szczegóły komponentów

### ProfilePage
- **Opis**: główny kontener strony, zarządza fetchem profilu z `GET /api/users/me`, stan edycji i modal usunięcia.
- **Elementy**: `ProfileHeader`, `ProfileStats`, `ProfileViewMode`/`ProfileEditForm` (warunkowe), `DeleteAccountDialog`, `NotificationToast`.
- **Interakcje**: toggle edycji (`isEditing`), otwarcie modalu usunięcia, refresh po zapisie/błędzie.
- **Walidacja**: sprawdzenie autoryzacji (401 → redirect `/login`); dane profilu muszą zawierać `id`, `first_name`, `last_name`, `email`, `created_at`.
- **Typy**: `UserProfileDTO` (z `GET /api/users/me`), `ProfilePageState = { profile: UserProfileDTO | null; isEditing: boolean; isDeleting: boolean; error?: string; }`.
- **Props**: brak (własny hook `useProfile`).

### ProfileHeader
- **Opis**: nagłówek z imieniem, nazwiskiem i placeholder dla awatara (przyszłość).
- **Elementy**: avatar placeholder, heading (h1) z imieniem i nazwiskiem.
- **Interakcje**: brak (statyczny).
- **Walidacja**: brak (otrzymuje zwalidowane dane).
- **Typy**: `ProfileHeaderProps = { firstName: string; lastName: string; avatarUrl?: string; }`.
- **Props**: `firstName`, `lastName`, opcjonalnie `avatarUrl`.

### ProfileStats
- **Opis**: sekcja z meta-danymi (email read-only, data rejestracji, liczba aktywnych ofert).
- **Elementy**: lista pól z etykietami i wartościami (email, `created_at` sformatowana, `active_offers_count`).
- **Interakcje**: link do `/offers/my` przy kliknięciu liczby ofert (opcjonalne).
- **Walidacja**: `created_at` formatowany jako lokalna data (np. `new Date(...).toLocaleDateString('pl-PL')`).
- **Typy**: `ProfileStatsProps = { email: string; createdAt: string; activeOffersCount: number; }`.
- **Props**: `email`, `createdAt`, `activeOffersCount`.

### ProfileViewMode
- **Opis**: widok read-only z danymi profilu i przyciskami „Edytuj" oraz „Usuń konto".
- **Elementy**: pola tekstowe (imię, nazwisko) jako statyczny tekst, przyciski akcji.
- **Interakcje**: `onEdit` otwiera formularz edycji, `onDeleteRequest` otwiera `DeleteAccountDialog`.
- **Walidacja**: brak (widok statyczny).
- **Typy**: `ProfileViewModeProps = { profile: UserProfileDTO; onEdit: () => void; onDeleteRequest: () => void; }`.
- **Props**: `profile`, `onEdit`, `onDeleteRequest`.

### ProfileEditForm
- **Opis**: inline formularz edycji imienia i nazwiska (email read-only zgodnie z Supabase Auth).
- **Elementy**: pola `first_name`, `last_name` (input), przyciski „Zapisz" i „Anuluj".
- **Interakcje**: submit → `PATCH /api/users/me`, cancel → powrót do `ProfileViewMode`.
- **Walidacja**: 
  - `first_name` 1-100 znaków (obowiązkowe).
  - `last_name` 1-100 znaków (obowiązkowe).
  - Frontend walidacja z `zod` + `react-hook-form`.
- **Typy**: 
  - `ProfileEditPayload = { first_name: string; last_name: string; }`.
  - `ProfileEditFormProps = { initialValues: ProfileEditPayload; onSubmit: (payload) => Promise<void>; onCancel: () => void; isSubmitting: boolean; }`.
- **Props**: `initialValues`, `onSubmit`, `onCancel`, `isSubmitting`.

### DeleteAccountDialog
- **Opis**: modal z ostrzeżeniem o nieodwracalności i polem hasła do re-autoryzacji.
- **Elementy**: tekst ostrzegawczy, input hasła, przyciski „Usuń konto" (destrukcyjny) i „Anuluj".
- **Interakcje**: submit → `DELETE /api/users/me` z `{ password }`, po sukcesie wylogowanie i redirect na `/login`.
- **Walidacja**: 
  - `password` wymagane (min 8 znaków, zgodnie z Supabase Auth).
  - Backend weryfikuje hasło przed usunięciem.
- **Typy**: 
  - `DeleteAccountPayload = { password: string; }`.
  - `DeleteAccountDialogProps = { isOpen: boolean; onCancel: () => void; onConfirm: (payload: DeleteAccountPayload) => Promise<void>; isDeleting: boolean; }`.
- **Props**: `isOpen`, `onCancel`, `onConfirm`, `isDeleting`.

### NotificationToast
- **Opis**: globalne powiadomienia (success przy zapisie, error przy błędzie).
- **Interakcje**: auto-dismiss po 5s lub ręczne zamknięcie.
- **Typy**: `NotificationMessage = { type: 'success' | 'error'; text: string; }`.

## 5. Typy

- `UserProfileDTO` (z `GET /api/users/me`):
  - `id: string`
  - `first_name: string`
  - `last_name: string`
  - `email: string` (dodane do response - zgodnie z PRD US-012)
  - `created_at: string` (ISO 8601)
  - `active_offers_count: number` (dodane do response)

- `ProfileEditPayload`:
  - `first_name: string`
  - `last_name: string`

- `DeleteAccountPayload`:
  - `password: string`

- `ProfilePageState`:
  - `profile: UserProfileDTO | null`
  - `isEditing: boolean`
  - `isDeleting: boolean`
  - `deleteDialogOpen: boolean`
  - `notification?: NotificationMessage`
  - `isLoading: boolean`
  - `error?: string`

- `ProfileStatsViewModel`:
  - `email: string`
  - `formattedCreatedAt: string` (np. "1 stycznia 2024")
  - `activeOffersCount: number`

## 6. Zarządzanie stanem

- Hook `useProfile`:
  - Fetch `GET /api/users/me` przy montowaniu.
  - Exposes `profile`, `isLoading`, `error`, `refetch`.
  - Autorefresh po edycji (wywołanie `refetch`).

- Hook `useProfileActions`:
  - `editProfile` → `PATCH /api/users/me`.
  - `deleteAccount` → `DELETE /api/users/me`, po sukcesie wylogowanie (`POST /auth/logout` lub clear Supabase session) i redirect `/login`.
  - Zarządza `isSubmitting`, `isDeleting`.

- Hook `useNotification` lub lokalny state:
  - Zarządza `notification` (toast message).
  - Auto-dismiss po 5s.

- Lokalny stan w `ProfilePage`:
  - `isEditing: boolean` (toggle między view/edit mode).
  - `deleteDialogOpen: boolean` (kontrola modalu).

## 7. Integracja API

- `GET /api/users/me`:
  - Request: `Authorization: Bearer {token}` (via cookies).
  - Response: `UserProfileDTO` (rozszerzone o `email` i `active_offers_count` zgodnie z PRD).
  - Błędy: 401 (redirect `/login`), 500 (toast error + retry).

- `PATCH /api/users/me`:
  - Request body: `ProfileEditPayload = { first_name, last_name }`.
  - Response: `UserProfileDTO` (zaktualizowane dane).
  - Błędy: 400 (walidacja), 401 (sesja wygasła), 500 (toast error).

- `DELETE /api/users/me`:
  - Request body: `DeleteAccountPayload = { password }`.
  - Response: 200 + `{ message: "Konto zostało usunięte" }`.
  - Błędy: 401 (nieprawidłowe hasło → toast "Nieprawidłowe hasło"), 500 (toast error).
  - Po sukcesie: wylogowanie i redirect na `/login`.

## 8. Interakcje użytkownika

- Wejście na `/profile` → fetch profilu (`GET /api/users/me`), wyświetlenie `ProfileViewMode`.
- Kliknięcie „Edytuj" → przełączenie na `ProfileEditForm` z aktualnymi danymi.
- Edycja pól → walidacja inline, kliknięcie „Zapisz" → `PATCH /api/users/me`, toast success, powrót do view mode.
- Kliknięcie „Anuluj" w formularzu → powrót do view mode bez zapisywania.
- Kliknięcie „Usuń konto" → otwarcie `DeleteAccountDialog`.
- Wpisanie hasła w modalu → kliknięcie „Usuń konto" → `DELETE /api/users/me`, po sukcesie wylogowanie i redirect.
- Kliknięcie „Anuluj" w modalu → zamknięcie bez akcji.
- Błędy fetch/submit → toast error z opcją ponowienia (refresh dla GET, retry dla PATCH/DELETE).

## 9. Warunki i walidacja

- Autoryzacja: widok chroniony middleware Supabase Auth, 401 → redirect `/login`.
- Formularz edycji:
  - `first_name` wymagane, 1-100 znaków.
  - `last_name` wymagane, 1-100 znaków.
  - Email read-only (nie edytowalne zgodnie z Supabase Auth policy).
- Modal usunięcia:
  - `password` wymagane, min 8 znaków (frontend).
  - Backend re-autoryzuje hasłem przed usunięciem (zgodnie z `DELETE /api/users/me`).
- Disabled states:
  - Przycisk „Zapisz" disabled podczas `isSubmitting`.
  - Przycisk „Usuń konto" w modalu disabled podczas `isDeleting`.
- Dane profilu z API muszą zawierać wszystkie pola `UserProfileDTO`, w przeciwnym razie wyświetl error state.

## 10. Obsługa błędów

- 401 Unauthorized (fetch profilu):
  - Toast „Sesja wygasła" + redirect `/login`.
- 401 Unauthorized (delete z nieprawidłowym hasłem):
  - Toast „Nieprawidłowe hasło", modal pozostaje otwarty.
- 400 Bad Request (walidacja):
  - Toast z `error.message` z API, highlight pola formularza z błędem.
- 500 Internal Server Error:
  - Toast „Wystąpił błąd serwera, spróbuj ponownie później".
  - Opcja „Ponów" dla fetch profilu.
- Błąd sieci:
  - Toast „Brak połączenia z internetem".
  - Przycisk „Ponów".
- Sukces:
  - Edycja → toast „Profil zaktualizowany pomyślnie".
  - Usunięcie konta → komunikat „Konto zostało usunięte" (na ekranie logowania po redirect).

## 11. Kroki implementacji

1. Utwórz stronę Astro `src/pages/profile.astro` z React island `ProfilePage`, zabezpiecz middleware.
2. Rozszerz `GET /api/users/me` o pola `email` i `active_offers_count` (jeśli nie ma) + zaktualizuj `UserProfileDTO` w `src/types.ts`.
3. Zaimplementuj hook `useProfile` do fetchowania profilu, zarządza stanem `profile`, `isLoading`, `error`.
4. Zbuduj `ProfileViewMode` z danymi read-only i przyciskami „Edytuj" / „Usuń konto".
5. Zbuduj `ProfileEditForm` z `react-hook-form` + `zod`, integracja `PATCH /api/users/me`.
6. Dodaj `DeleteAccountDialog` z polem hasła, wywołanie `DELETE /api/users/me`, wylogowanie po sukcesie.
7. Zaimplementuj `useProfileActions` do zarządzania `editProfile` i `deleteAccount`.
8. Dodaj `NotificationToast` dla komunikatów sukcesu/błędu.
9. Przetestuj scenariusze: fetch profilu, edycja, błędy walidacji, usunięcie konta z nieprawidłowym hasłem, błędy 401/500.
10. Zweryfikuj dostępność (focus states, aria-labels, keyboard navigation w modalu).
11. Dodaj dokumentację i przygotuj pull request.
