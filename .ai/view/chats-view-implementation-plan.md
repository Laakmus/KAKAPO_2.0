# Plan implementacji widoku Czaty

## 1. Przegląd

Widok **Czaty** (ścieżka `/chats`) pokazuje dwie kolumny: po lewej scrollowaną listę aktywnych czatów z ostatnią wiadomością, liczbą nieprzeczytanych i statusem, po prawej pełną historię wybranego czatu wraz z kontekstem wymiany i formularzem wysyłania wiadomości. Całość ma działać w kontekście mutual matchów (status ACCEPTED) i realizacji wymiany (przycisk „Zrealizowana” / „Anuluj potwierdzenie”). Widok musi być bezpieczny (tylko uczestnik), responsywny na desktop oraz spełniać walidacje z PRD (np. walidacja długości wiadomości).

## 2. Routing widoku

- `/chats` – domyślna lista czatów; po załadowaniu wybieramy pierwszy czat, jeśli istnieje.
- `/chats/:chat_id` – opcjonalna część ścieżki; kontroluje zaznaczenie czatu i ładowanie historii (może być synchronizowana z URL-em po stronie klienta).

## 3. Struktura komponentów

- `ChatsPage` (Astro + React island) – wrapper i punkt wejścia; ładuje dane, dostarcza kontekst (np. `AuthContext` i `ChatsViewContext`).
- `ChatsLayout` – grid dwukolumnowy z `ChatListColumn` i `ChatDetailColumn`.
- `ChatListColumn` – lista `ChatListItem`.
- `ChatDetailColumn` – nagłówek czatu, panel ofert (`OfferContextPanel`), historia wiadomości (`MessageList`), `MessageComposer`, `ChatActionsPane`.
- `StatusBanner`/`EmptyState` – pokazywane na bazie stanu (np. 403, brak czatów, błąd sieci).

## 4. Szczegóły komponentów

### ChatsPage

- **Opis**: logika ładowania danych (lista czatów + aktualny czat) oraz dostarczenie hooków `useChatsViewState`.
- **Elementy**: `ChatsLayout`, `StatusBanner`, `LoadingSkeleton`.
- **Zdarzenia**: `init` (fetch list), selekcja czatu (ustawienie `selectedChatId`), `refresh`.
- **Walidacja**: brak — przekazuje błędy do `StatusBanner`.
- **Typy**: `ChatsViewState`.
- **Propsy**: `initialChatId?`, `onChatSelected?`.

### ChatListColumn

- **Opis**: scrollowana kolumna z kartami czatów, button „Odśwież”, obsługa pustego stanu.
- **Elementy**: `RefreshButton`, `ChatListItem` x N, placeholder przy ładowaniu.
- **Zdarzenia**: `onSelect(chatId)`, `onRefresh`.
- **Walidacja**: brak (walidacja danych odbywa się fetch/DTO).
- **Typy**: `ChatSummaryViewModel`.
- **Propsy**:
  - `chats: ChatSummaryViewModel[]`
  - `selectedChatId?: string`
  - `onSelect(chatId: string)`
  - `onRefresh()`
  - `isLoading: boolean`

### ChatListItem

- **Opis**: pokazuje `other_user.name`, `last_message.body`, `created_at`, `unread_count`, `status`.
- **Elementy**: avatar/text, podtytuł z ostatnią wiadomością + data, badge status, notification badge (unread).
- **Zdarzenia**: `onClick`, `onKeyDown` (Enter/Space), `onFocus` (dla obsługi klawiatury).
- **Walidacja**: `other_user` musi być zdefiniowany, `last_message` optional.
- **Typy**: `ChatSummaryViewModel`.
- **Propsy**:
  - `chat: ChatSummaryViewModel`
  - `isActive: boolean`
  - `onSelect(chatId: string)`

### ChatDetailColumn

- **Opis**: prawa kolumna wyświetlająca nagłówek czatu, kontekst oferty, historię wiadomości, composer i akcje.
- **Elementy**: `ChatHeader` ( uczestnicy, status ), `OfferContextPanel` (oferty/interest), `MessageList`, `MessageComposer`, `ChatActionsPane`.
- **Zdarzenia**: `refreshMessages`, `sendMessage`, `realize`, `unrealize`.
- **Walidacja**: `selectedChat` musi istnieć; `messages` powiązane z `chat_id`.
- **Typy**: `ChatDetailViewModel`, `ChatMessageViewModel`, `InterestActionContext`.
- **Propsy**:
  - `chatDetail?: ChatDetailViewModel`
  - `messages: ChatMessageViewModel[]`
  - `isLoadingMessages: boolean`
  - `onRefreshMessages()`
  - `onSendMessage(message: string)`
  - `onRealize()`
  - `onUnrealize()`
  - `actionState: { isRealizing: boolean; isUnrealizing: boolean }`
  - `errorBanner?: { type: '403' | '404' | 'generic'; message: string }`

### MessageComposer

- **Opis**: formularz z textarea (1–2000 znaków) i przyciskiem „Wyślij”.
- **Elementy**: `textarea`, `send button`, `char counter`, `validation hint`.
- **Zdarzenia**: `onSubmit`, `onChange`.
- **Walidacja**: zod schema `body: string().min(1).max(2000)`.
- **Typy**: `CreateMessageCommand`.
- **Propsy**:
  - `isSending: boolean`
  - `onSend(message: string)`
  - `initialValue?: string`

### MessageList / MessageItem

- **Opis**: lista wiadomości posortowana rosnąco, każda wiadomość pokazuje `sender_name`, `body`, `created_at`.
- **Elementy**: `ul` z `MessageItem` (opis + meta), ewentualnie `empty state` („Brak wiadomości”).
- **Zdarzenia**: `scroll` (może przeskoczyć do dołu po wysłaniu), `onLoadMore` (jeśli paginacja).
- **Walidacja**: `created_at` w ISO, `sender_name` optional (fallback „Ty”).
- **Typy**: `ChatMessageViewModel`.
- **Propsy**:
  - `messages: ChatMessageViewModel[]`
  - `isLoading: boolean`
  - `highlightLast?: boolean`

### ChatActionsPane

- **Opis**: panel przycisków „Odśwież”, „Zrealizowana”, „Anuluj potwierdzenie” (tylko gdy można).
- **Elementy**: `Refresh`, `Realize`, `CancelRealize`, feedback.
- **Zdarzenia**: `onRealize`, `onUnrealize`, `onRefresh`.
- **Walidacja**: buttony aktywne tylko gdy `interestContext` dostępny i status odpowiedni.
- **Typy**: `InterestActionContext`.
- **Propsy**:
  - `interestContext?: InterestActionContext`
  - `isRealizing: boolean`
  - `isUnrealizing: boolean`
  - `onRealize()`
  - `onUnrealize()`
  - `onRefresh()`

## 5. Typy

- `ChatSummaryViewModel` (rozszerzenie `ChatListItemDTO`):
  - `id`, `status`, `created_at`
  - `other_user: { id: string; name: string }`
  - `last_message?: { body: string; sender_id: string; created_at: string }`
  - `unread_count: number`
  - `formattedLastMessageAt: string`
  - `interestId?: string`
- `ChatDetailViewModel` (dla headera i kontekstu):
  - `chatId`, `status`, `created_at`
  - `participants: { me: { id: string; name: string }; other: { id: string; name: string } }`
  - `offerContext?: { myOfferId: string; myOfferTitle: string; theirOfferId: string; theirOfferTitle: string }`
  - `interestId?: string`
  - `realizationStatus: 'ACCEPTED' | 'REALIZED' | 'PENDING'`
- `ChatMessageViewModel`: `id`, `chat_id`, `sender_id`, `sender_name`, `body`, `created_at`, `formattedTime`.
- `InterestActionContext`: `interestId`, `otherUserName`, `offerTitle`, `realizationStatus`.
- `ChatsViewState`: bundluje `chats`, `selectedChatId`, `selectedChat`, `messages`, loading/error flags, action states.

## 6. Zarządzanie stanem

- Stworzyć hook `useChatsViewState()`:
  - Fetch `GET /api/chats` -> `chats`.
  - Domyślnie ustawia `selectedChatId` na pierwszy chat lub z URL.
  - Na zmianę `selectedChatId` wywołuje `GET /api/chats/{chat_id}/messages` i (jeśli dostępne) `GET /api/chats/{chat_id}` lub rozszerzone dane (kontext oferty).
  - Przechowuje `messages`, `chatDetail`, `interestContext`, `actionState`, `errors` (kode 401/403/404/500).
  - Zapewnia metody: `refreshChats`, `refreshMessages`, `sendMessage`, `realizeInterest`, `unrealizeInterest`, `setMessageDraft`.
  - Zarządza `isSending`, `isLoadingChats`, `isLoadingMessages`.
  - Timeout 10s (przez `AbortController`) i obsługa `network error`.

## 7. Integracja API

- `GET /api/chats`:
  - Request: Authorization Bearer (handled globally), optional `status=ACTIVE`.
  - Response: `{ data: ChatListItemDTO[] }`.
  - Mapuje do `ChatSummaryViewModel`; zachowaj `other_user`, `last_message`, `created_at`, `unread_count`, `chat_id`.
- `GET /api/chats/{chat_id}/messages`:
  - Response: `ChatMessagesListDto` (data/pagination) albo `MessageDTO[]`.
  - Mapuje do `ChatMessageViewModel`.
  - Obsługuje paginację (limit, page) i chronologiczne sortowanie.
- `GET /api/chats/{chat_id}` (jeśli istnieje lub w planie):
  - Używany do pobrania większego kontekstu (participants, offers, interest_id).
  - Zapewnia dane dla `ChatDetailViewModel`.
- `POST /api/chats/{chat_id}/messages`:
  - Body: `{ body: string }`.
  - Walidacja 1-2000 znaków.
  - Po sukcesie append w `messages`.
- `PATCH /api/interests/{interest_id}/realize` i `/unrealize`:
  - Body: brak; ten endpoint zmienia status interesu.
  - Po sukcesie odśwież chat listę i historię.

## 8. Interakcje użytkownika

- Otwarcie `/chats` -> wywołanie `list` + selekcja pierwszego czatu (lub pusty stan).
- Kliknięcie czatu -> `selectedChatId`, fetch wiadomości, highlight.
- Kliknięcie „Odśwież” listy -> ponowny GET `/api/chats`.
- Kliknięcie „Odśwież” wiadomości -> refund `GET /api/chats/{chat_id}/messages`.
- Wpisanie wiadomości + „Wyślij” -> walidacja (1-2000) -> POST -> append -> scroll do dołu.
- Kliknięcie „Zrealizowana”/„Anuluj potwierdzenie” -> PATCH interest -> aktualizacja buttonów/ statusu.
- Nawigacja klawiaturą: strzałki ↑/↓ w `ChatList`, Enter selects, Tab w composer, aria-live dla nowych wiadomości.
- 403 w detail -> `StatusBanner` z tekstem „Brak uprawnień do tego czatu” i zablokowany composer.

## 9. Warunki i walidacja

- Lista czatów:
  - `status` enum (ACTIVE) – query default.
  - `chatId` z URL musi być UUID (po stronie routera/ hooka).
- Kompozytor wiadomości:
  - `body` string długość 1–2000.
  - Blokada przy pustym/za długim tekście (walidacja `zod` + disabled button).
- Akcje interesu:
  - `interestId` musi pochodzić z API (rozszerzyć odpowiedź w backendzie o ten identyfikator).
  - „Zrealizowana” dostępna tylko gdy `realizationStatus === 'ACCEPTED'`.
  - „Anuluj” tylko gdy `realizationStatus === 'PENDING'` (tj. jednostronne kliknięcie).
- API responses 403/404/401 – przekazywać do `StatusBanner`.

## 10. Obsługa błędów

- `401 Unauthorized`: przekieruj na logowanie / pokaż banner z „Zaloguj się ponownie”.
- `403 Forbidden`: banner „Brak uprawnień do tego czatu”, composer off, przycisk „Odśwież” listę oraz 403 retry.
- `404 Not Found`: informacja „Czat nie istnieje”, sugeruj powrót do listy i odświeżenie.
- `500` / network: banner „Coś poszło nie tak” + przycisk „Ponów”.
- Timeout (po 10s): analogiczny banner + `AbortController`.
- Walidacja `zod`: pokaz komunikat pod inputem `MessageComposer`.
- Brak czatów: w `ChatListColumn` tekst „Nie masz jeszcze żadnych czatów”.

## 11. Kroki implementacji

1. Dodać typy `ChatSummaryViewModel`, `ChatDetailViewModel`, `ChatMessageViewModel`, `InterestActionContext`, `ChatsViewState` w `src/types.ts` lub `src/types/chats.ts`.
2. Stworzyć hook `useChatsViewState` (fetch list, domyślny wybór, fetch wiadomości, akcje realize/unrealize, zarządzanie errorami/loading).
3. Zbudować komponenty `ChatListColumn`, `ChatListItem`, `ChatDetailColumn`, `MessageList`, `MessageComposer`, `ChatActionsPane`, `StatusBanner` zgodnie z opisem (Tailwind + shadcn/ui).
4. Zaimplementować dostęp do `/chats` route w `src/pages/chats/index.astro` i `src/pages/chats/[chat_id].astro` (lub jeden page z React islandem), wstrzyknąć `useChatsViewState`.
5. Obsłużyć API `GET /api/chats`, `GET /api/chats/{chat_id}/messages`, `POST /api/chats/{chat_id}/messages`, `PATCH /api/interests/:interest_id/(un)realize` w hooku (z fetch/`axios` + `AbortController`, 10s timeout).
6. Dodać UI dla pustej listy, error bannerów i `LoadingSkeleton`.
7. Zaimplementować walidację `MessageComposer` (zod/react-hook-form) i limit znaków/char counter.
8. Dodać keyboard navigation dla listy czatów (handle keydown, aria-activedescendant) i focus management na composerze.
9. Utworzyć mechanizm wyświetlania kontekstu ofert (data z API: `offerTitle`, `interestId`, `realizationStatus`); powiązać z `ChatActionsPane`.
10. Dodać testy jednostkowe/integracyjne (np. `vitest`): render listy, eventy `send`, błędy 403/500, realize flows.
11. Przetestować UX: 403 banner, pusty stan, walidacja, odświeżenia, retry, performance (ok. 2s load).
