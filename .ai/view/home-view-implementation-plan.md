# Plan implementacji widoku Home – lista ofert

## 1. Przegląd

Widok Home (ścieżki `/` i `/offers`) prezentuje paginowaną listę aktywnych ofert z opcją filtrowania oraz sortowania. W głównej kolumnie wyświetlane są karty ofert (tytuł, skrócony opis, miniatura, miasto, imię oferenta, liczba zainteresowanych), a z prawej (desktop) lub jako overlay (mobile/ przyszłość) pokazujemy szczegóły wybranej oferty. Widok obsługuje stany loading, pustej listy, błędów i autoryzacji, oferując odświeżenie bez pełnego przeładowania strony.

## 2. Routing widoku

Widok dostępny pod `/` i `/offers`. Obie ścieżki renderują ten sam komponent strony (np. `src/pages/offers.astro` lub duplikacja przełączająca layout), który ustawia layout (Layout + główne elementy) i osadza Reactową „islandę” odpowiedzialną za interakcje listy ofert.

## 3. Struktura komponentów

- `HomeOffersPage` (root)  
  - `OffersFilterPanel`  
  - `OffersGrid` (z `OfferCard` lub `LoadingSkeletonGrid`/`EmptyState`)  
  - `PaginationControls`  
  - `OfferDetailsPanel` (desktop) / modal overlay  
  - `ErrorBanner` / `AuthErrorBanner`

## 4. Szczegóły komponentów

### HomeOffersPage
- Opis: strona, która orkiestruje fetch ofert, zarządza stanem paginacji/filtrowania/wczytywania i mapuje dane do kart/szczegółów.  
- Główne elementy: `OffersFilterPanel`, `OffersGrid`, `PaginationControls`, przycisk „Odśwież”, opcjonalny `AuthErrorBanner`, `OfferDetailsPanel`.  
- Obsługiwane interakcje: inicjalny fetch przy montażu, zmiana filtra/sortu/paginy → `useOffersList` re-fetch, kliknięcie „Odśwież” → reload, kliknięcie karty → `selectOffer`, obsługa retry po błędzie.  
- Obsługiwana walidacja: `page` >=1, limit 15, `city` z listy, `sort` ∈ {created_at,title}, `order` ∈ {asc,desc} (kontrola przed wysłaniem zapytania).  
- Typy: `OfferListItemViewModel[]`, `OffersPaginationMeta`, `HomeFilterState`, `ApiErrorResponse`.  
- Propsy: brak (renderowane przez Astro page z layout + sesją).

### OffersFilterPanel
- Opis: panel filtrujący po `city`, sortujący (data/tytuł) i pokazujący przycisk „Odśwież”.  
- Główne elementy: selekt miasta (lista 16), selekt sort (created_at/ title), selekt order (asc/desc? opcjonalnie), przyciski „Odśwież” + ewentualny przycisk wyczyść filtr.  
- Obsługiwane interakcje: wybór miasta/sortu → callback do rodzica `onFilterChange`, klik „Odśwież” → `onRefresh`.  
- Walidacja: tylko zdefiniowane wartości, nie pozwala wysłać pustego miasta (może być `undefined`).  
- Typy: `AllowedCity`, `HomeFilterState`.  
- Propsy: `values: HomeFilterState`, `onChange: (state) => void`, `onRefresh: () => void`, `isLoading?: boolean`.

### OfferCard
- Opis: pojedyncza karta oferty z podstawowymi danymi.
- Główne elementy: **`OfferImage` z miniaturą** (komponent z automatycznym placeholderem "Brak zdjęcia"), tytuł, skrócony opis (np. 120 znaków), meta (miasto, owner_name), licznik zainteresowanych.
- Interakcje: kliknięcie karty → `onSelect`, hover focus, opcjonalne CTA „Zobacz szczegóły".
- Walidacja: `title`/`description` niepuste, `interests_count` >=0, `owner_name` fallback „Nieznany oferent". Hide `interests_count` jeśli `isOwnOffer` === true.
- Typy: `OfferListItemViewModel`.
- Propsy: `offer: OfferListItemViewModel`, `isOwnOffer: boolean`, `onSelect: (id) => void`.
- **Użycie OfferImage**: `<OfferImage imageUrl={offer.image_url} alt={offer.title} className="h-48 w-full" useThumbnail={true} />`

### PaginationControls
- Opis: paginacja z info „Strona X z Y” oraz Previous/Next.  
- Elementy: btn Previous (disabled gdy page=1), btn Next (disabled gdy page >= total_pages), tekst.  
- Interakcje: klik `onPageChange`.  
- Walidacja: nie pozwala ustawić wartości poza zakresem (1..total_pages).  
- Typy: `OffersPaginationMeta`.  
- Propsy: `pagination`, `onPageChange`.

### OfferDetailsPanel
- Opis: panel boczny lub modal z rozszerzonymi danymi (tytuł, pełny opis, data, miasto, owner_name, interests_count). Zwraca link do szczegółów (ścieżka np. `/offers/{id}`).
- Elementy: header + close, **`OfferImage` z miniaturą lub placeholderem**, body z `OfferDetailSnippet`, CTA (np. „Zobacz szczegóły full page").
- Interakcje: klik `close`/klik poza panelem (w mobile).
- Walidacja: wyświetla placeholder „Wybierz ofertę" jeśli `selectedOffer` undefined.
- Typy: `OfferListItemViewModel`.
- Propsy: `selectedOffer?: OfferListItemViewModel`, `onClose`, `isMobile?: boolean`.
- **Użycie OfferImage**: `<OfferImage imageUrl={selectedOffer.image_url} alt={selectedOffer.title} className="h-64 w-full" useThumbnail={true} />`

### LoadingSkeletonGrid / EmptyState / ErrorBanner
- Opis: komponenty pomocnicze pokazujące odpowiednie stany.  
- Elementy: skeleton cards, tekst „Brak ofert”, banner błędu z przyciskiem Retry/linkiem do login.  
- Interakcje: `Retry` wywołuje `onRetry`.  
- Walidacja: n/d.  
- Typy: `ApiErrorResponse`.  
- Propsy: `message`, `onRetry`, `isAuthError?: boolean`.

## 5. Typy

- `OfferListItemViewModel` = `OfferListItemDTO` + `isOwnOffer: boolean`. Pola: `id`, `owner_id`, `title`, `description`, `image_url?`, `city`, `status`, `created_at`, `owner_name?`, `interests_count`, `isOwnOffer`.  
- `OffersPaginationMeta` = `{ page: number; limit: number; total: number; total_pages: number; }`.  
- `HomeFilterState` = `{ city?: AllowedCity; sort: 'created_at' | 'title'; order: 'desc' | 'asc'; }`. Domyślnie `{ sort: 'created_at', order: 'desc' }`.  
- `OffersListResponseViewModel` = `{ items: OfferListItemViewModel[]; pagination: OffersPaginationMeta; }`.  
- `AllowedCity` union 16 miast (z `offers.schema.ts` + PRD).  
- `ApiErrorViewModel` = `ApiErrorResponse & { status: number }`.

## 6. Zarządzanie stanem

- `useOffersList` hook (custom React hook) zarządza fetchowaniem i stanem: przyjmuje `HomeFilterState` + `page`, ładuje token z `useSupabaseClient`/`locals` (Astro) lub `useSession`. Zwraca `offers`, `pagination`, `isLoading`, `isRefreshing`, `error`, `refetch`. Hook filtruje odpowiedzi i oznacza `isOwnOffer` porównując `owner_id` z `currentUser.id`.  
- Dodatkowy stan `selectedOfferId` w `HomeOffersPage`. Hook `useOfferSelection` (może być prosty `useState`).  
- Lokalny stan filtra/pagination: `useState` + `useEffect` do synchronizacji z URL (`page` query string).  
- `useUrlPagination` (opcjonalne) – synchronizuje numer strony z URL (React Router? w Astro via `window.history.replaceState`).  
- Hook `useAuthRedirect` (na 401) – ustawia banner z linkiem do `/login`.

## 7. Integracja API

- Endpoint GET `/api/offers` (Astro API route) oczekuje autoryzacji (token via `supabase.auth.session` lub `fetch` z cookies).  
- Request: `fetch('/api/offers?page=X&limit=15&city=Warszawa&sort=created_at&order=desc', { headers: { Authorization: 'Bearer ' + accessToken } })`.  
- Response typ: `Paginated<OfferListItemDTO>` (header `Content-Type: application/json`). JSON zawiera `data` (array) i `pagination`.  
- Odpowiednio mapować do `OfferListItemViewModel` (ustaw `isOwnOffer`).  
- Błędy: `401/403` (session), `400` (walidacja), `500` (serwer). W UI: `401/403` → `AuthErrorBanner`, inne → `ErrorBanner`.  
- Timeout: 10s (zgodnie z user story). Można użyć fetch + `AbortController`.

## 8. Interakcje użytkownika

- Przeciągnięcie/klik karty → wyświetla szczegóły w panelu/modal.  
- Zmiana miasta/sortu/decz (panel) → odświeżenie listy, URL w sync.  
- Kliknięcie „Odśwież” → ponowny fetch z aktualnymi parametrami.  
- Kliknięcie Previous/Next → zmiana numeru strony, update URL (page query).  
- Kliknięcie Retry w bannerze błędu → ponowny fetch, jeśli 401 → zawrzeć link do `/login`.  
- Hover/focus w karcie → wizualna wskazówka (dostępność).  
- Gdy brak ofert → informacja „Brak aktywnych ofert” i CTA „Odśwież”.  
- 401/403 → komunikat „Wymagana jest autoryzacja” + `Link` do `/login`.

## 9. Warunki i walidacja

- `page` >= 1 (blokada Previous); `limit` = 15 (stałe).  
- `city` musi być jednym z 16 (listbox w panelu).  
- `sort` w {created_at, title}, `order` w {asc, desc}.  
- Front-end waliduje, nie wysyła nieprawidłowych wartości - ten sam `HomeFilterState` (uniony).  
- Na frontendzie `interests_count` ukrywane dla ofert, których `owner_id === currentUser.id`.  
- `OfferCard` skraca opis do 120 znaków, ale backend waliduje 10-5000.  
- Nie pokazujemy `interests_count` dla własnych ofert (UI filter).  
- Stany `loading`/`empty`/`error` blokują paginację/odświeżenie w trakcie fetch.

## 10. Obsługa błędów

- Brak sieci / timeout → `ErrorBanner` z wiadomością i `Retry`.  
- 401/403 → `AuthErrorBanner` z „Zaloguj się” linkiem i `setError`.  
- 400 (walidacja query) – rzadko, ale można wyświetlić informację z backendu (firstError.message).  
- 500 → log (Sentry), komunikat „Wystąpił błąd serwera” + retry.  
- Pusta lista → `EmptyState` informujący, że nie ma aktywnych ofert (może CTA „Odśwież”).  
- N+1 latencja: pokazać `LoadingSkeletonGrid` zamiast spinnera i wprowadzić `isRefreshing` flagę by zapobiec duplikacji fetcha.

## 11. Kroki implementacji

1. Utwórz/aktualizuj stronę `src/pages/offers.astro` (oraz `/index.astro` przekierowujący) i osadź Reactowy komponent `HomeOffersPage` w layoucie.  
2. Zaimplementuj `HomeOffersPage` + `useOffersList`, `useUrlPagination`, `useOfferSelection`, `useAuthRedirect` – zarządzanie filtrem/paginacją/sesją.  
3. Stwórz `OffersFilterPanel`, `OfferCard`, `PaginationControls`, `OfferDetailsPanel`, `LoadingSkeletonGrid`, `ErrorBanner`.  
4. Zaimplementuj typy `OfferListItemViewModel`, `OffersPaginationMeta`, `HomeFilterState`, `ApiErrorViewModel` w `src/types.ts` lub lokalnym module (export do komponentów).  
5. Dodaj `fetch` do `/api/offers` z `Authorization` (Supabase session) i mapuj odpowiedź (ustaw `isOwnOffer`).  
6. Obsłuż stany: loading skeleton, empty state, error banner, auth error z linkiem `/login`.  
7. Dodaj kontrolki paginacji z synchronizacją query string (page).  
8. Implementuj `OfferDetailsPanel` (desktop panel/wersja mobilna).  
9. Dodaj testy manualne: scenariusze 401/403, błąd 500, brak ofert, success.  
10. Uzupełnij dokumentację/przewodnik stylu (Tailwind, shadcn) i zweryfikuj zgodność z PRD (metryki UX/validation).  

