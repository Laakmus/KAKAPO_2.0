# Plan implementacji widoku Szczegóły oferty

## 1. Przegląd
Widok `/offers/:offer_id` to osadzona w layout master–detail przestrzeń, która jednocześnie pokazuje listę ofert (po lewej) oraz szczegółową kartę wybranej oferty (po prawej). Celem jest zaprezentowanie pełnych danych oferty, metadanych (miasto, status, data, oferent) oraz umożliwienie wyrażenia/wycofania zainteresowania z widocznym stanem (liczba zainteresowanych + `is_interested`). Widok musi tolerować bezpośrednie wejście przez link, zachować spójną nawigację i pokazywać odpowiednie komunikaty dla błędów backendu.

## 2. Routing widoku
- Strona dostępna pod `/offers/:offer_id`.
- Astro page `src/pages/offers/[offer_id].astro` korzysta z `Layout` i wyrenderuje Reactową wyspę `OffersPageShell` ustawioną jako `client:load` lub `client:idle`, żeby mieć dostęp do fetchowanych danych z API po stronie klienta i zachować wymagania dotyczące sesji (Bearer token).  
- `params.offer_id` walidujemy jako UUID (z `zod` lub `offerIdParamsSchema`), a w przypadku nieprawidłowego formatu od razu pokazujemy fallback informujący o błędnym ID.
  
## 3. Struktura komponentów
- `OffersPageShell` – kontener master–detail; odpowiada za pobranie listy ofert, wybranej oferty i przekazywanie identyfikatora do panelu detalu.  
- `OffersListPanel` – komponent po lewej stronie z listą kart (paginacja 15) i wskazaniem aktualnie wybranej oferty.  
- `OfferDetailPanel` – górny komponent po prawej stronie: pokazuje obraz, tytuł, opis, metadane, button zainteresowania, linki do profilu i powrót do listy.  
- `MetaSection` – city, status (chip), sformatowana data oraz `OwnerLinks`.  
- `OwnerLinks` – dwa linki: do profilu (`/users/{owner_id}`) i do listy ofert oferenta (`/users/{owner_id}/offers`).  
- `InterestToggleCTA` – button „Jestem zainteresowany” / „Anuluj zainteresowanie” z loading state, ikonką, statusem, a także optionalną informacją o utworzeniu chatu.  
- `BackToListLink` – odnośnik „Wróć do listy” (breadcrumb).  
- `GlobalNotification` – pokazuje komunikaty sukcesu/błędu (reusing `NotificationMessage` z `types.ts`).

## 4. Szczegóły komponentów

### OffersPageShell
- **Opis**: reaguja na parametr `offer_id`, trzyma stan listy i szczegółów, koordynuje fetchy oraz notyfikacje.  
- **Główne elementy**: flex container z dwoma kolumnami; `OffersListPanel` po lewej, `OfferDetailPanel` po prawej; `GlobalNotification` widoczny nad panelem detalu.  
- **Zdarzenia**: `onSelectOffer(offerId)` – ustawiane przez listę; `onInterestChanged` – wywoływane przez `InterestToggleCTA` do przeładowania danych i aktualizacji listy.  
- **Walidacja**: sprawdzenie `offer_id` (UUID); obsługa scenariuszy 401/404; włączenie fallbacku gdy brak danych.  
- **Typy**: `OffersListQueryResult`, `OfferDetailViewModel`, `NotificationMessage`.  
- **Propsy**: `offerId: string`.

### OffersListPanel
- **Opis**: reusable list fetchująca `/api/offers` i pokazująca karty z highlightem aktualnie wybranej oferty; wspiera loading/skeleton.  
- **Główne elementy**: `ul` z kartami (tekst, miasto, owner_name, interests_count), paginacja (`Previous/Next`).  
- **Zdarzenia**: `onSelect` (klika w kartę) z `offer.id`.  
- **Walidacja**: stan ładowania, fallback „brak ofert”; sprawdzenie, że `interests_count` to number.  
- **Typy**: `OfferListItemDTO`, `Paginated<OfferListItemDTO>`.  
- **Propsy**: `selectedOfferId`, `onSelect`, `initialPage?`.

### OfferDetailPanel
- **Opis**: główny widok detalu; renderuje dane z `OfferDetailViewModel`.
- **Główne elementy**: **`OfferImage` z pełnym zdjęciem lub placeholderem**, tytuł, opis, `InterestToggleCTA`, `MetaSection`, `BackToListLink`, `OwnerLinks`, `GlobalNotification`.
- **Zdarzenia**: `onInterestToggle` (prop przekazujący `InterestActionPayload`).
- **Walidacja**: zablokowanie przycisku jeśli `isOwner`; fallback „Oferta niedostępna/404".
- **Typy**: `OfferDetailViewModel`, `NotificationMessage`.
- **Propsy**: `offer: OfferDetailViewModel | null`, `isLoading: boolean`, `error?: string`, `onRetry: () => void`, `onInterestChange: (payload) => void`.
- **Użycie OfferImage**: `<OfferImage imageUrl={offer.image_url} alt={offer.title} className="h-96 w-full rounded-lg" useThumbnail={false} />` (pełne zdjęcie, nie miniatura)

### InterestToggleCTA
- **Opis**: button sterujący zainteresowaniem.  
- **Główne elementy**: `button` z tekstem zależnym od `isInterested`, spinner (np. `aria-busy`).  
- **Zdarzenia**: `onClick` – wywołuje `expressInterest` lub `cancelInterest`.  
- **Walidacja**: disabled gdy `isOwner`, `isMutating`, `!offer` lub status REMOVED; nie pozwala wyrazić zainteresowania na własnej ofercie (frontend + backend).  
- **Typy**: `InterestActionState` (`isMutating`, `lastError`, `chatMessage`).  
- **Propsy**: `isInterested`, `isOwner`, `mutating`, `status`, `onExpress`, `onCancel`.

### MetaSection
- **Opis**: meta-dane (miasto, data, status chip).  
- **Główne elementy**: `span` dla miasta, `time` dla `createdAt`, `badge` dla `status`.  
- **Zdarzenia**: brak (statyczne).  
- **Walidacja**: `city` pochodzi z listy 16 miast (walidacja na backend).  
- **Typy**: `OfferMeta = { city: string; createdAt: string; status: 'ACTIVE' | 'REMOVED'; }`.  
- **Propsy**: `meta: OfferMeta`, `ownerName?: string`.

### OwnerLinks
- **Opis**: dwa linki do `/users/{owner_id}` oraz `/users/{owner_id}/offers`.  
- **Główne elementy**: anchor-y z `aria-label` (dla dostępności).  
- **Zdarzenia**: `onClick` – standardowa nawigacja.  
- **Walidacja**: ukryte/disabled gdy `owner_id` brak.  
- **Typy**: `OwnerLinkProps = { ownerId: string; ownerName?: string; }`.  
- **Propsy**: `ownerId`, `ownerName`.

### BackToListLink
- **Opis**: breadcrumb z linkiem do `/offers`.  
- **Główne elementy**: `a` (z ikoną) i tekst „Wróć do listy”.  
- **Zdarzenia**: `href` do `/offers`.  
- **Walidacja**: zawsze widoczny; zapewnia łatwe wyjście z direct linków.  
- **Typy/propsy**: brak dodatkowych.

## 5. Typy
- `OfferDetailDTO` (z `types.ts`) – rozszerzenie `OfferRow`.
- **Nowy typ `OfferDetailViewModel`**:
  - `id`, `title`, `description`, `image_url`, `city`, `status`, `created_at`, `interests_count`, `owner_id`, `owner_name?`, `is_interested`, `is_owner`, `current_user_interest_id?`, `statusLabel: string`, `formattedDate: string`.
  - `is_owner` obliczane po stronie backendu (porównanie `userId === owner_id`) lub w hooku na bazie profilu użytkownika.
  - `current_user_interest_id`: by móc anulować zainteresowanie (backend musi dołączyć zapytanie `SELECT id FROM interests WHERE offer_id = ? AND user_id = ?`).
- `InterestActionPayload = { offerId: string; interestId?: string; isInterested: boolean; }`.
- `InterestActionState = { mutating: boolean; error?: string; successMessage?: string; }`.
- `OffersListQueryResult = Paginated<OfferListItemDTO>`.
- `NotificationMessage` (globalny komponent).

## 6. Zarządzanie stanem
- `useOffersList` – hook fetchujący `/api/offers` z paginacją, `selectedOfferId`, `isLoading`, `error`.
- `useOfferDetail(offerId)` – fetch GET detail; exposes `data`, `isLoading`, `error`, `refresh`.
- `useInterestToggle` – przyjmuje `offerId`, `currentInterestId?`, `isInterested`, `isOwner`.
  - `expressInterest`: POST `/api/interests`, update `interests_count`, `isInterested`, zapisuje `currentInterestId`.
  - `cancelInterest`: DELETE `/api/interests/${currentInterestId}` (zabezpieczenie: jeśli brak `interestId`, ponów fetch `GET /api/interests/my?status=PROPOSED` i dopiero wtedy cancel).
- `useNotification` (lub `setNotification` w `OffersPageShell`) steruje `GlobalNotification`.
- Stany globalne: `selectedOfferId`, `offersListPagination`, `detailNotification`, `interestActionState`.

## 7. Integracja API
- `GET /api/offers?limit=15&page=X` → `Paginated<OfferListItemDTO>` (lista, `interests_count` per karta).  
- `GET /api/offers/{offer_id}` → `OfferDetailDTO` (rozszerzyć response o `is_owner` i `current_user_interest_id`). Typy: `OfferDetailDTO & { is_owner: boolean; current_user_interest_id?: string; }`.  
- `POST /api/interests` (body `{ offer_id }`) → `CreateInterestResponse` (z `id`, `message`, `chat_id`). Zwraca `interest_id`, który przypisujemy do `currentInterestId`.  
- `DELETE /api/interests/{interest_id}` → 200 + message. Potrzebujemy `interest_id` (wymaga stworzonego interest lub dodatkowego fetcha `GET /api/interests/my?status=PROPOSED|ACCEPTED`).  
- Wymagania: wszystkie requesty muszą dostarczać sesję (token Supabase w ciasteczku). Obsługa odpowiedzi 401/404/409/422/500 w hookach.  
- Dodatkowo: `GET /api/interests/my?status=PROPOSED` może posłużyć jako fallback, jeśli `current_user_interest_id` nie był zwrócony (np. po reloadzie, gdy `OfferDetailDTO` nie zawiera `interest_id`).

## 8. Interakcje użytkownika
- **Wejście na `/offers/:id`**: loader listy + detalu, `OffersPageShell` pokazuje skeletony, `GlobalNotification` reset.  
- **Kliknięcie karty**: `OffersListPanel` wyrzuca `onSelect`, `OfferDetailPanel` fetchuje nowy detail, `BackToListLink` pozostaje widoczny.  
- **Kliknięcie „Jestem zainteresowany”**: `InterestToggleCTA` przechodzi w `mutating`, POST, po success `isInterested` true, `interests_count++`, `GlobalNotification` pokazuje message (np. „Zainteresowanie zostało wyrażone”).  
- **Kliknięcie „Anuluj zainteresowanie”**: DELETE, `isInterested` false, `interests_count--`, show success message.  
- **Kliknięcie owner linków**: przekierowuje do `/users/{owner_id}` lub `/users/{owner_id}/offers`.  
- **Błąd 404/401**: panel detalu pokazuje komunikat „Oferta nie istnieje / brak dostępu” plus `BackToListLink`; optionally `OffersListPanel` pozostaje dostępny.  
- **Błąd sieci**: `GlobalNotification` z „Sprawdź połączenie” i przycisk retry (wywołuje `refresh`).  
- **Lista**: użytkownik może paginować; `selectedOfferId` pozostaje synchroniczne – po `Next` może automatycznie przeładować detail nowej oferty.

## 9. Warunki i walidacja
- `offer_id` walidujemy po stronie Astro (`offerIdParamsSchema`).  
- `InterestToggleCTA` disabled jeśli `isOwner` lub `interestActionState.mutating` lub `offer.status === 'REMOVED'`.  
- `current_user_interest_id` musi istnieć przed wywołaniem DELETE; w przeciwnym razie robimy dodatkowe GET `/api/interests/my` i wybieramy rekór odpowiadający `offer_id`.  
- `isOwner` obliczamy na podstawie danych z API (server sets `is_owner`) i/lub porównania `currentUser.id`.  
- `interests_count` zawsze >= 0; po togglu aktualizujemy lokalnie i ponawiamy `refresh` (by zachować spójność).  
- `image_url` renderujemy warunkowo – fallback (szary blok) gdy brak.

## 10. Obsługa błędów
- **401 Unauthorized**: informacja „Zaloguj się ponownie”; opcjonalne przekierowanie/otwarcie modalu logowania; `InterestToggleCTA` nie aktywny.  
- **404 Not Found / REMOVED**: detal pokazuje card „Oferta nie istnieje lub nie masz do niej dostępu”, button „Wróć do listy”.  
- **409 Duplicate / OWN_OFFER**: `GlobalNotification` i `InterestToggleCTA` pozostaje w poprzednim stanie.  
- **422/400 Validation**: pokazać `error.message` z API (np. „Nieprawidłowe ID”).  
- **500/Internal**: `GlobalNotification` + `Retry` button (odśwież detail).  
- **Network / timeout**: `GlobalNotification` z „Brak połączenia”, `OffersListPanel` i `OfferDetailPanel` w trybie error + retry.

## 11. Kroki implementacji
1. Utwórz `src/pages/offers/[offer_id].astro`, importuj `Layout` i renderuj `OffersPageShell client:load offerId={params.offer_id}` + `prerender = false`.  
2. Rozszerz backend (jeśli potrzeba) `OfferService.getOfferById` o pola `is_owner` i `current_user_interest_id`, zaktualizuj `OfferDetailDTO` w `src/types.ts`.  
3. Stwórz `OffersPageShell` (React component) z hookami `useOffersList`, `useOfferDetail`, `useInterestToggle` i przechowuj `notification`.  
4. Zaimplementuj `OffersListPanel` – fetch `/api/offers`, paginacja, highlight wybranej oferty; przekazuj `onSelect`.  
5. Zaimplementuj `OfferDetailPanel` z `OfferMedia`, `MetaSection`, `OwnerLinks`, `InterestToggleCTA`, `BackToListLink`, `GlobalNotification`.  
6. Zaimplementuj custom hooki: `useOfferDetail`, `useInterestToggle` (POST/DELETE), `useNotification`.  
7. Dodaj typy `OfferDetailViewModel`, `InterestActionState`, `OwnerLinkProps`.  
8. Podłącz `InterestToggleCTA`: expres jest w `mutating`, po success aktualizuje `OfferDetailPanel` (`setOffer`) i `notification`.  
9. Dodaj fallback UI dla error/empty states (404, network).  
10. Przetestuj scenariusze: wejście direct, togglowanie zainteresowania + licznik, owner wchodzi na własny detail, błędy 401/404/409.  
11. Upewnij się, że przycisk „Wróć do listy” i linki do profilu działają, a `GlobalNotification` pokazuje komunikaty z API.  
12. Wdróż visualny design (Tailwind + zgodnie z `shadcn/ui`) i dodaj ewentualne animacje loadingu/disabled states.

