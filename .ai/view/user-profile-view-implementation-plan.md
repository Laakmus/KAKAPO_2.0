# Plan implementacji widoku Profil innego użytkownika

## 1. Przegląd

Widok `/users/:user_id` umożliwia zalogowanym użytkownikom przeglądanie podstawowych informacji publicznych o innych użytkownikach platformy KAKAPO oraz ich aktywnych ofert. Jest to kluczowy element ułatwiający wzajemne poznanie się użytkowników przed nawiązaniem kontaktu w ramach wymiany. Widok jest stricte read-only, służy jako kontekst przy przeglądaniu zainteresowanych oraz przy podejmowaniu decyzji o wzajemnym zainteresowaniu (US-011, US-013, US-014).

## 2. Routing widoku

Ścieżka: `/users/:user_id` (parametr `user_id` jako UUID, walidowany).

Nawigacja do widoku:

- Z listy zainteresowanych w widoku "Moje Oferty" (US-013)
- Ze szczegółów oferty (link przy imieniu oferenta) (US-004)
- Z listy czatów (link do profilu drugiej osoby) (US-015)
- Bezpośrednie wejście przez URL

Ochrona trasy: widok wymaga autoryzacji (JWT token), brak tokenu → redirect `/login`.

## 3. Struktura komponentów

```
UserProfilePage (Astro page)
├── UserProfileHeader (imię, nazwisko, liczba aktywnych ofert)
├── UserOffersSection
│   ├── SectionHeader ("Aktywne oferty")
│   ├── OfferGrid (wielokrotne OfferCard)
│   └── EmptyState (gdy brak ofert)
├── LoadingState (podczas ładowania)
└── ErrorState (w przypadku błędów)
```

## 4. Szczegóły komponentów

### UserProfilePage

- **Opis**: główny komponent orkiestrujący pobieranie danych z API (`GET /api/users/{user_id}`, `GET /api/users/{user_id}/offers`), zarządzanie stanem ładowania/błędów.
- **Elementy**: `<main>` z podkomponentami, breadcrumb „Wróć", opcjonalnie przycisk „Odśwież".
- **Interakcje**: nawigacja wstecz, kliknięcie karty oferty → `/offers/:offer_id`, odświeżenie danych.
- **Walidacja**: UUID parametru `user_id` (Zod), sprawdzenie istnienia użytkownika (404), autoryzacja (401 → redirect).
- **Typy**: `UserProfilePageProps`, `PublicUserDTO`, `UserOffersResponse`.
- **Props**: brak (dane z Astro params + hook `useUserProfile`).

### UserProfileHeader

- **Opis**: nagłówek z imieniem, nazwiskiem, liczbą aktywnych ofert, placeholder awatara (przyszłość).
- **Elementy**: `<header>`, `<h1>`, statystyki.
- **Interakcje**: brak (statyczny).
- **Walidacja**: brak (otrzymuje zwalidowane dane).
- **Typy**: `UserProfileHeaderProps = { firstName: string; lastName: string; activeOffersCount: number; }`.
- **Props**: `firstName`, `lastName`, `activeOffersCount`.

### UserOffersSection

- **Opis**: sekcja z listą aktywnych ofert użytkownika lub `EmptyState` gdy brak.
- **Elementy**: `<section>`, nagłówek, siatka kart (`OfferGrid`) lub `EmptyState`.
- **Interakcje**: delegacja kliknięć do `OfferCard`, przyszłość: paginacja.
- **Walidacja**: brak (otrzymuje zwalidowane dane).
- **Typy**: `UserOffersSectionProps = { offers: UserOfferDTO[]; isLoading?: boolean; }`.
- **Props**: `offers`, `isLoading`.

### OfferCard (reużywalny)

- **Opis**: istniejący komponent karty oferty, w tym kontekście bez licznika zainteresowanych (zgodnie z API dla prywatności).
- **Elementy**: karta z obrazem, tytułem, opisem, miastem, link do szczegółów.
- **Interakcje**: kliknięcie → `/offers/:offer_id`.
- **Typy**: `OfferCardProps = { offer: UserOfferDTO; showInterestsCount?: boolean; }` (false dla tego widoku).
- **Props**: `offer`, `showInterestsCount`.

### LoadingState / ErrorState / EmptyState

- **LoadingState**: spinner z komunikatem „Ładowanie profilu...". Props: `message?: string`.
- **ErrorState**: tytuł, komunikat, przycisk „Spróbuj ponownie" (callback `onRetry`). Props: `title`, `message`, `errorCode?`, `onRetry?`.
- **EmptyState**: komunikat „Ten użytkownik nie ma jeszcze aktywnych ofert", ikona. Props: `message`, `icon?`.

## 5. Typy

```typescript
// DTO z API (src/types.ts - istniejące)
type PublicUserDTO = {
  id: string;
  first_name: string;
  last_name: string;
  active_offers_count: number;
};

type UserOffersResponse = {
  data: UserOfferDTO[];
};

type UserOfferDTO = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  city: string;
  created_at: string;
};

// Stan widoku
interface UserProfileState {
  profile: PublicUserDTO | null;
  offers: UserOfferDTO[];
  isLoadingProfile: boolean;
  isLoadingOffers: boolean;
  profileError: ApiError | null;
  offersError: ApiError | null;
}

interface ApiError {
  code: string;
  message: string;
  statusCode: number;
}
```

## 6. Zarządzanie stanem

- **Hook `useUserProfile(userId: string)`**: custom hook zarządzający fetchowaniem profilu i ofert.
  - Stan lokalny: `profile`, `offers`, `isLoadingProfile`, `isLoadingOffers`, `profileError`, `offersError`.
  - Funkcje: `fetchProfile()`, `fetchOffers()`, `refresh()` (ponowne pobranie obu).
  - Automatyczne pobieranie przy montowaniu i zmianie `userId` (useEffect).
  - Zwraca: `{ profile, offers, isLoading, hasError, profileError, offersError, refresh }`.

- Pomocnicza funkcja `getAuthToken()`: pobiera JWT z Supabase client lub localStorage.

- Przepływ stanu:
  1. Montowanie → fetch profilu i ofert → `LoadingState`.
  2. Sukces → dane w stanach → pełny widok.
  3. Błąd → `profileError`/`offersError` → `ErrorState` z retry.
  4. Odświeżanie → `refresh()` → powrót do kroku 1.

## 7. Integracja API

### GET /api/users/{user_id}

- **Request**: Bearer token, brak body.
- **Response (200)**: `PublicUserDTO` (id, first_name, last_name, active_offers_count).
- **Błędy**: 400 (UUID), 401 (token), 404 (użytkownik nie istnieje), 500 (serwer).

### GET /api/users/{user_id}/offers

- **Request**: Bearer token, brak body.
- **Response (200)**: `{ data: UserOfferDTO[] }` (tylko aktywne oferty, bez interests_count).
- **Błędy**: 400, 401, 404, 500.

### Obsługa tokenów

- Token z Supabase Auth (cookies) lub localStorage.
- Retry logic z exponential backoff (max 3 próby) przy błędach sieciowych.

## 8. Interakcje użytkownika

- **Wejście na `/users/:user_id`**: automatyczny fetch → `LoadingState` → wyświetlenie profilu i ofert lub `ErrorState`.
- **Kliknięcie karty oferty**: nawigacja do `/offers/:offer_id`.
- **Nawigacja wstecz**: breadcrumb „Wróć" → poprzedni widok lub `/offers`.
- **Odświeżenie**: przycisk „Odśwież" → `refresh()` → ponowny fetch.
- **Błąd 404/401**: `ErrorState` z odpowiednim komunikatem i akcją (retry lub login).

## 9. Warunki i walidacja

- **Parametr `user_id`**: musi być UUID (Zod validation), nieprawidłowy format → `ErrorState` bez retry.
- **Autoryzacja**: wymagany token, brak → redirect `/login`, wygasły (401) → `ErrorState` z „Zaloguj ponownie".
- **Istnienie użytkownika**: 404 z API → `ErrorState` „Użytkownik nie został znaleziony".
- **Brak ofert**: `offers.length === 0` → `EmptyState` z komunikatem.
- **Walidacja response**: opcjonalnie Zod schema dla `PublicUserDTO`, błędne dane → `ErrorState`.

## 10. Obsługa błędów

| Scenariusz              | Kod HTTP | Error Code       | Komunikat                                 | Akcja UI             |
| ----------------------- | -------- | ---------------- | ----------------------------------------- | -------------------- |
| Nieprawidłowy UUID      | 400      | VALIDATION_ERROR | „Nieprawidłowy identyfikator użytkownika" | ErrorState bez retry |
| Brak/wygasły token      | 401      | UNAUTHORIZED     | „Sesja wygasła. Zaloguj się ponownie."    | Redirect `/login`    |
| Użytkownik nie istnieje | 404      | USER_NOT_FOUND   | „Użytkownik nie został znaleziony"        | ErrorState + „Wróć"  |
| Błąd serwera            | 500      | INTERNAL_ERROR   | „Wystąpił błąd. Spróbuj ponownie."        | ErrorState + retry   |
| Błąd sieci              | N/A      | NETWORK_ERROR    | „Brak połączenia z internetem."           | ErrorState + retry   |

**Mapowanie błędów**: funkcja `getErrorMessage(error: ApiError): { title, message }` konwertuje kody na przyjazne komunikaty PL.

**Logowanie**: błędy 500+ i sieciowe → console.error + opcjonalnie Sentry. Nie logować 404/401 ani tokenów.

**Graceful degradation**: jeśli profil OK, ale oferty błąd → wyświetl profil + `ErrorState` tylko dla sekcji ofert z retry dla `fetchOffers()`.

## 11. Kroki implementacji

1. **Struktura plików**: utwórz `src/pages/users/[user_id].astro`, komponenty React w `src/components/` (UserProfileHeader, UserOffersSection), hook w `src/hooks/useUserProfile.ts`.

2. **Hook `useUserProfile`**: zaimplementuj stan lokalny, `fetchProfile()`, `fetchOffers()`, `refresh()`, useEffect, obsługa błędów i tokenów. Helper `getAuthToken()`.

3. **Komponenty UI**:
   - `UserProfileHeader` (nagłówek z danymi).
   - `UserOffersSection` (lista ofert lub EmptyState).
   - Reużyj/dostosuj `OfferCard` (props `showInterestsCount=false`).
   - `LoadingState`, `ErrorState`, `EmptyState` (nowe lub istniejące).

4. **Strona Astro**: `[user_id].astro` → walidacja UUID, render `UserProfileClient` (React island client:load) z `userId` z params.

5. **Komponent React główny**: `UserProfileClient` → wykorzystuje `useUserProfile`, warunkowe renderowanie (loading/error/success), breadcrumb, przycisk odśwież.

6. **Stylowanie**: Tailwind CSS, grid responsywny (sm:cols-2 lg:cols-3), spójność z resztą app, dostępność (aria-labels, focus states).

7. **Nawigacja**: dodaj linki do profilu w innych widokach (Szczegóły oferty, Moje Oferty → zainteresowani, Czaty).

8. **Testowanie**:
   - Manualne: valid/invalid UUID, 404, 401, brak ofert, odświeżanie, nawigacja.
   - Opcjonalnie: unit testy hooka, integration testy komponentu.

9. **Optymalizacja**: lazy loading obrazów, debounce przycisku odśwież, memoizacja (React.memo), sprawdź a11y (keyboard nav, WCAG kontrast).

10. **Deployment**: build production, testy na różnych przeglądarkach, monitoring (Sentry, Lighthouse), logi błędów.

---

## Dodatkowe uwagi

**Przyszłe rozszerzenia**:

- Avatar użytkownika (pole `avatar_url` + Supabase Storage).
- Paginacja ofert (query params `page`, `limit`).
- Filtrowanie/sortowanie ofert.
- Bio/opis użytkownika.
- Statystyki (zrealizowane wymiany, rating).

**Bezpieczeństwo**:

- Rate limiting API (ochrona przed enumeration attacks).
- Nie wyświetlać emaila, daty rejestracji (GDPR, prywatność).
- Sanityzacja danych z API (React domyślnie chroni przed XSS).

**Kompatybilność**:

- Spójność z widokiem „Mój profil" (`/profile`) — podobny layout, różne dane.
- Linki z innych widoków (Oferty, Moje Oferty, Czaty).

**Zgodność z PRD**:

- ✅ US-011: lista aktywnych ofert, podstawowe dane, liczba ofert.
- ✅ US-014: nawigacja z zainteresowanych, możliwość wyrażenia zainteresowania ich ofertami.

**Status**: ✅ Gotowy do implementacji  
**Czas**: ~6-8h (z testami)  
**Priorytet**: Średni  
**Zależności**: endpointy API (✅), typy `PublicUserDTO` (✅), layout, `OfferCard`, middleware auth.
