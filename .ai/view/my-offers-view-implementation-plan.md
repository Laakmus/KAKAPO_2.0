# Plan implementacji widoku Moje Oferty

## 1. Przegląd

Widok `/offers/my` to dedykowany dashboard właściciela ofert. Pokazuje wszystkie jego oferty (ACTIVE i REMOVED), umożliwia edycję, usuwanie oraz przegląd interesujących się osób. W przypadku braku ofert zachęca CTA „Dodaj nową ofertę”.

## 2. Routing widoku

Strona dostępna na ścieżce `/offers/my`. Powinna być zaimplementowana jako Astro Page (React island) zabezpieczona logiką sprawdzającą zalogowaną sesję Supabase (token w cookies). Nawigacja z górnego paska kieruje tu po kliknięciu „Moje oferty”.

## 3. Struktura komponentów

- `MyOffersPage` – kontener ładowania danych, status filter, CTA „Dodaj nową ofertę”, lista `OfferCard`, modale/panele.
- `OfferCard` – karta pojedynczej oferty z podstawowymi informacjami i toolbarami akcji (Edytuj, Usuń, Zainteresowani).
- `OfferEditForm` – inline panel formularza edycji (title, description, image_url, city) z walidacją zgodną z backendem.
- `DeleteConfirmationDialog` – globalny modal potwierdzający `DELETE /api/offers/:offer_id`.
- `InterestListPanel` – panel/modal listy zainteresowanych z paginacją `GET /api/offers/:offer_id/interests`.
- `EmptyState` – komunikat „Nie masz jeszcze żadnych ofert” z CTA.
- `NotificationToast` – informuje o sukcesie/błędzie (reshow po API).

## 4. Szczegóły komponentów

### MyOffersPage

- **Opis**: strona ściągająca `/api/offers/my`, zarządza filtrem statusu i stanem modali.
- **Elementy**: status filter dropdown, lista `OfferCard`, `EmptyState`, `AddOfferCTA`.
- **Interakcje**: zmiana statusu → refetch listy; klik „Dodaj nową ofertę” → nawigacja; przekazywanie callbacków edit/delete/interest.
- **Walidacja**: walidacja statusu dropdown (wyłącznie `'ACTIVE'` lub `'REMOVED'`); blokada akcji jeśli fetch się nie powiedzie.
- **Typy**: `MyOfferViewModel` (rozszerza `OfferListItemDTO` z flagami `isEditing`, `selectedInterestPage`); `MyOffersResponse = { data: OfferListItemDTO[] }`.
- **Props**: brak (strona z własnym hookiem `useMyOffers`).

### OfferCard

- **Opis**: wyświetla dane oferty, liczbę zainteresowanych, status, akcje.
- **Elementy**: **`OfferImage` z miniaturą lub placeholderem**, nagłówek (tytuł + status badge), opis (skrócony), meta (miasto, created_at), `OfferActions`, `OfferEditForm` (rozszerzony stan).
- **Interakcje**: `onEditToggle`, `onDeleteRequest`, `onViewInterests`.
- **Walidacja**: edycja tylko jeśli `status` z listy (ACTIVE/REMOVED) i jeśli użytkownik jest właścicielem (warunkowo renderuj toolbar).
- **Typy**:
  - `OfferCardProps = { offer: OfferListItemDTO; isEditing: boolean; onEditToggle: () => void; onDelete: () => void; onViewInterests: () => void; }`
  - `OfferCardState` (opcjonalnie `isSubmitting`).
- **Props**: `offer`, `isEditing`, `interestsCount`, `callbacks`.
- **Użycie OfferImage**: `<OfferImage imageUrl={offer.image_url} alt={offer.title} className="h-48 w-full" useThumbnail={true} />`

### OfferEditForm

- **Opis**: formularz inline w karcie (mozna użyć `react-hook-form` + `zodResolver`).
- **Elementy**: pola `title`, `description`, `image_url`, `city` (dropdown z `ALLOWED_CITIES`), przycisk „Zapisz”, „Anuluj”.
- **Interakcje**: submit → `PATCH /api/offers/:offer_id`, cancel → ukrywa formę.
- **Walidacja**:
  - `title` 5-100 znaków,
  - `description` 10-5000 znaków,
  - `image_url` walidowany jako URL lub pusty,
  - `city` z listy ALLOWED_CITIES.
- **Typy**:
  - `OfferEditPayload = Pick<CreateOfferCommand, 'title' | 'description' | 'image_url' | 'city'>`
  - `OfferEditFormProps = { initialValues: OfferEditPayload; onSubmit(payload): Promise<void>; onCancel(): void; isSubmitting: boolean; }`
- **Props**: dane początkowe, callback submit, cancel, loading flag.

### DeleteConfirmationDialog

- **Opis**: potwierdza usunięcie oferty.
- **Elementy**: treść ostrzegawcza, `Usuń` i `Anuluj`.
- **Interakcje**: `onConfirm` wywołuje `DELETE /api/offers/:offer_id`, `onClose` zamyka dialog.
- **Walidacja**: tylko owner widzi dialog; `DELETE` tylko przy `status` w `['ACTIVE', 'REMOVED']`.
- **Typy**: `DeleteDialogProps = { offerId: string; title: string; isOpen: boolean; onCancel: () => void; onConfirm: () => Promise<void>; isDeleting: boolean; }`

### InterestListPanel

- **Opis**: panel/modal z paginowaną listą zainteresowanych.
- **Elementy**: tabela/lista z `user_name`, `status`, `created_at`, linki do `/users/:user_id` i `/users/:user_id/offers`, paginacja (Next/Previous).
- **Interakcje**: zmiana strony → `GET /api/offers/:offer_id/interests?page=&limit=`
- **Walidacja**: weryfikuj błędy 403/404, status `status` (PROPOSED/ACCEPTED/REALIZED) z backendu.
- **Typy**:
  - `InterestListViewModel = Paginated<InterestListItemDTO>` z `formattedDate`, `profileLink`, `offersLink`.
  - `InterestPanelProps = { offerId: string; isOpen: boolean; onClose: () => void; }`

### EmptyState

- **Opis**: pokazuje gdy brak ofert, zawiera CTA do `/offers/new`.
- **Elementy**: ikona/status, tekst, przycisk.
- **Interakcje**: klik CTA → nawigacja.
- **Walidacja**: renderuj tylko jeśli `myOffers` pusty i `loading` false.

### NotificationToast

- **Opis**: pojedynczy komponent toast do success/error (np. `useNotification` hook).
- **Interakcje**: pojawia się po zapisie/usunięciu/błędzie fetch.
- **Typy**: `NotificationMessage = { type: 'success' | 'error'; text: string; }`

## 5. Typy

- `MyOfferViewModel`:
  - `id`, `owner_id`, `title`, `description`, `city`, `status`, `created_at`, `image_url` (z `OfferListItemDTO`).
  - `interests_count: number`.
  - `isEditing: boolean`.
  - `interestPanelOpen: boolean`.
  - `lastUpdatedAt?: string` (opcjonalnie do odświeżania).
- `OfferEditPayload` (patrz sekcja formularza).
- `InterestListItemView`:
  - `user_id`, `user_name`, `status`, `created_at`.
  - `profileLink = /users/${user_id}`.
  - `offersLink = /users/${user_id}/offers`.
- `PaginatedInterestState = { page: number; limit: number; total: number; total_pages: number; }`.
- `NotificationMessage`.

## 6. Zarządzanie stanem

- Hook `useMyOffers`:
  - Fetch `GET /api/offers/my?status=...`.
  - Exposes `offers`, `loading`, `error`, `refetch`, `setStatus`.
  - Autorefresh po edycji/usunięciu (swap `refetch` callback).
- Hook `useOfferActions`:
  - `editOffer` -> `PATCH /api/offers/:id`.
  - `deleteOffer` -> `DELETE /api/offers/:id`.
  - Zarządza loading per offer (map `isSubmittingById`).
- Hook `useInterestList` (per offer):
  - `fetchInterests(offerId, page)` -> sets `paginated` data.
  - Maintains `isLoading`, `error`, `page`.
- Hook `useNotification` lub lokalny state (np. `notificationMessage`).
- Zarządzanie inline editing:
  - `editingOfferId` w `MyOffersPage`.
  - `interestPanelOfferId`.

## 7. Integracja API

- `GET /api/offers/my?status=ACTIVE|REMOVED`:
  - request: `Authorization: Bearer {token}` (supabase handles via middleware).
  - response type `MyOffersResponse` as `{ data: OfferListItemDTO[] }`.
  - status filter optional.
- `PATCH /api/offers/:offer_id`:
  - body `OfferEditPayload`, `Content-Type: application/json`.
  - expect `OfferDetailDTO` or updated fields, update local list.
- `DELETE /api/offers/:offer_id`: expect 200 success, no body; remove from UI.
- `GET /api/offers/:offer_id/interests?page=&limit=`:
  - returns `Paginated<InterestListItemDTO>`.
  - use `limit` default 10-20 (matching backend `limit` default).
  - include query param `status` only if filtering (optional).

## 8. Interakcje użytkownika

- Zmiana statusu (ACTIVE/REMOVED) odświeża listę (refetch).
- Klik „Dodaj nową ofertę” kieruje do widoku dodawania (per PRD).
- Klik „Edytuj” rozwija `OfferEditForm`; submit wywołanie PATCH, toast success, update card.
- Klik „Usuń” otwiera dialog; potwierdzenie wysyła DELETE, toast success, usuwa kartę.
- Klik „Zainteresowani (X)” otwiera panel; ładowanie `GET /api/offers/:id/interests`, paginacja, linki do profili/ofert.
- W panelu: klik link profile naviguje do `/users/:id`, link ofert do `/users/:id/offers`.
- W przypadku braku ofert: widoczne `EmptyState` z CTA.
- Błędy fetch/validation pokazują toast lub banner z możliwością ponowienia.

## 9. Warunki i walidacja

- Status filter ograniczony do `ACTIVE` | `REMOVED`.
- Formularz edycji waliduje zgodnie z backendem (title 5-100, description 10-5000, url optional/valid, city z listy).
- Pola wymagane: title, description, city.
- Edit/delete dostępne tylko dla ownera (RLS) – w UI sprawdzamy `offer.owner_id === locals.user.id` lub token.
- Interest panel tylko dla ofert, gdzie backend potwierdza właścicielstwo (403).
- `Delete` confirm disabled podczas `isDeleting`.

## 10. Obsługa błędów

- 401/403: pokaz banner „Sesja wygasła” i opcja ponownego logowania.
- 400 (walidacja): show toast z `message` z API, highlight field (z `firstError.field`).
- 500+ (serwer): toast „Wystąpił błąd, spróbuj ponownie później”, opcja ponów.
- Błędy interest panel: toast error, zamknij panel jeśli 403.
- Problem z fetch listy: `EmptyState` + `Retry` button.
- Delete/Edit: spinner/disabled, revert changes on error.

## 11. Kroki implementacji

1. Utwórz stronę Astro `src/pages/offers/my.astro` wykorzystując React island `MyOffersPage`, zabezpiecz sesją Supabase (middleware).
2. Zaimplementuj hook `useMyOffers` do fetchowania `/api/offers/my`, obsłuż status filter i state `offers`, `loading`, `error`.
3. Zbuduj `OfferCard` z toolbarami, zainteresowaniami, edycją inline - przekazuj funkcje `onEditToggle`, `onDeleteRequest`, `onViewInterests`.
4. Dodaj `OfferEditForm` z `react-hook-form` + `zod` (walidacje zgodne z `createOfferSchema`/`myOffers`), integracja `PATCH /api/offers/:offer_id`.
5. Dodaj `DeleteConfirmationDialog` wyświetlany po kliknięciu „Usuń”, wykonujący `DELETE`, zarządzający loaderem i pelnymi toastami.
6. Zaimplementuj `InterestListPanel` (modal/panel) ładowany po kliknięciu „Zainteresowani”, paginacja, linki do profili.
7. Dodaj `EmptyState` i CTA „Dodaj nową ofertę”, link do `/offers/new`.
8. Dodaj `NotificationToast` lub wykorzystaj istniejący mechanizm do wyświetlania sukcesów/błędów.
9. Pokryj widok testami manualnymi (edytuj, usuwaj, error handling) i dodaj e2e/snapshot jeżeli istniejące testy.
10. Zweryfikuj dostępność (focus states, aria-labels w przyciskach, rola modala).
11. Przygotuj dokumentację w `.ai/my-offers-view-implementation-plan.md` (ten plik) i uzupełnij PRD o ewentualne dodatkowe wymagania.
12. Dodaj `read_lints` po edycji i napraw ewentualne błędy.
    </implementation_breakdown>
