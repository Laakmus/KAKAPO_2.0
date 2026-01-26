# Plan implementacji widoku Szczegóły czatu

## 1. Przegląd

Widok „Szczegóły czatu” pod `/chats/:chat_id` pozwala uczestnikowi wymiany przeglądać chronologiczną historię wiadomości, wysyłać nowe wiadomości oraz zarządzać statusem wymiany (potwierdzenie „Zrealizowana” i cofnięcie), w obrębie layoutu z listą czatów po lewej stronie.

## 2. Routing widoku

Widok powinien być dostępny pod ścieżką bazową `/chats/:chat_id`, gdzie `chat_id` to UUID czatu. Domyślnie ładuje layout z listą czatów po lewej i traktuje całą sekcję jako React Island w Astro (profil/owa kontrola state).

## 3. Struktura komponentów

```
ChatDetailsPage
├── ChatHeader (nazwa drugiej osoby + status + refresh)
├── MessagesList
│   └── MessageBubble (own vs other)
├── ChatStatusControls (Zrealizowana / Anuluj)
└── MessageComposer (textarea + Wyślij)
```

W razie potrzeby podkomponenty: `OfferInfo`, `RefreshButton`, `ApiErrorBanner`.

## 4. Szczegóły komponentów

### ChatDetailsPage

- **Opis:** React Island odpowiedzialny za orchestrację fetchowania danych czatu i wiadomości, trzymanie stanów loading/error oraz przekazywanie propsów do pozostałych komponentów. Wpisany jako komponent w `src/pages/chats/[chat_id].astro`.
- **Główne elementy:** `useEffect` fetchujący `/api/chats/:chat_id` i `/api/chats/:chat_id/messages`, layout z headerem, listą, panelem akcji i composerem.
- **Obsługiwane zdarzenia:** `onRefresh` (ponowne pobranie danych), `onSend` (przekazuje body do POST), `onRealize`, `onUnrealize`.
- **Walidacja:** `chat_id` już zwalidowany w ścieżce (UUID); komponent waliduje, czy backend nie zwrócił 403/404 (wtedy pokazuje komunikat i link do listy czatów).
- **Typy:** `ChatDetailsViewModel`, `ChatMessagesApiResponse`, `ApiErrorInfo`.
- **Propsy:** `chatId: string`.

### ChatHeader

- **Opis:** Pokazuje drugą osobę, status wymiany (np. „ACCEPTED”, „REALIZED”) oraz powiązane oferty.
- **Główne elementy:** nazwa, badge statusu, opis mutualnej oferty, `RefreshButton`.
- **Obsługiwane interakcje:** `onRefresh` (przycisk odświeżania wywołuje `ChatDetailsPage` refetch).
- **Walidacja:** brak dodatkowej.
- **Typy:** `ParticipantInfo`, `OfferSummary`.
- **Propsy:** `{ otherUserName: string; statusLabel: string; onRefresh: () => void; offers?: OfferSummary }`.

### MessagesList

- **Opis:** Scrollowana lista wiadomości ułożona chronologicznie.
- **Główne elementy:** `MessageBubble` dla każdego wpisu, wrapper z `overflow-y-auto`, ewentualny placeholder „Brak wiadomości”.
- **Obsługiwane zdarzenia:** `ref` do automatycznego scrollowania na dół przy nowych wiadomościach.
- **Walidacja:** `messages` biorą dane z API, ale kontynuujemy tylko gdy `body` nie jest pusty.
- **Typy:** `MessageViewModel[]`, `PaginationInfo`.
- **Propsy:** `{ messages: MessageViewModel[]; currentUserId: string }`.

### MessageBubble

- **Opis:** Prezentuje pojedynczą wiadomość z imieniem nadawcy i timestampem, wyróżniając własne wiadomości.
- **Główne elementy:** sender name, `body`, `created_at`, tło zależne od nadawcy.
- **Obsługiwane interakcje:** brak.
- **Walidacja:** `body` przyjmowane w komponencie musi zawierać tekst (trim) — inne wartości nie renderujemy.
- **Typy:** `MessageViewModel`.
- **Propsy:** `{ message: MessageViewModel; isOwn: boolean }`.

### ChatStatusControls

- **Opis:** Panel z przyciskiem „Zrealizowana” lub „Anuluj potwierdzenie”, zależnie od aktualnego statusu interesu i realizacji.
- **Główne elementy:** status tekstowy, `Button` z `shadcn/ui`, ewentualny `Tooltip` z informacją o wymaganiach.
- **Obsługiwane interakcje:** `onRealize`, `onUnrealize`.
- **Walidacja:** aktywacja przycisków tylko gdy backend zwróci `currentInterestStatus` w odpowiednim stanie (np. przy `ACCEPTED` button Realize aktywny; przy `REALIZED` przycisk Anuluj aktywny tylko jeśli `otherUserConfirmed === false`).
- **Typy:** `InterestRealizationState`.
- **Propsy:** `{ state: InterestRealizationState; onRealize: () => Promise<void>; onUnrealize: () => Promise<void>; isProcessing: boolean }`.

### MessageComposer

- **Opis:** Formularz z textarea i przyciskiem „Wyślij” sterowany przez `react-hook-form` + `zod`.
- **Główne elementy:** `Textarea` (1–2000 znaków), `Send` button, inline error message, licznik znaków.
- **Obsługiwane interakcje:** `onSubmit -> onSend(body)`; `onChange` aktualizuje formę i walidację.
- **Walidacja:** `zod` schema `body: string().trim().min(1).max(2000)`, disable submit button gdy invalid lub `isSending`.
- **Typy:** `SendMessageFormValues`.
- **Propsy:** `{ onSend: (body: string) => Promise<void>; isSending: boolean }`.

## 5. Typy

- `MessageViewModel`: `{ id; chat_id; sender_id; sender_name; body; created_at; isOwn: boolean }`.
- `ChatDetailsViewModel`: `{ id: string; status: string; interestId: string; otherInterestId?: string; currentUserId: string; currentInterestStatus: 'PROPOSED'|'ACCEPTED'|'REALIZED'; otherInterestStatus?: string; otherUser: { id; name }; relatedOffers?: { my: OfferSummary; their: OfferSummary }; realizedAt?: string | null }`.
- `ChatMessagesApiResponse`: `{ data: MessageViewModel[]; pagination: { page: number; limit: number; total: number; total_pages: number } }`.
- `InterestRealizationState`: `{ canRealize: boolean; canUnrealize: boolean; otherConfirmed: boolean; status: 'ACCEPTED' | 'REALIZED' | string; message?: string }`.
- `OfferSummary`: `{ id: string; title: string }`.
- `ApiErrorInfo`: `{ code: string; message: string; field?: string }`.
- `SendMessageFormValues`: `{ body: string }`.

## 6. Zarządzanie stanem

Widok będzie oparty na kilku custom hookach:

- `useChatDetails(chatId)`: fetchuje `/api/chats/:chat_id`, przechowuje `chatMeta`, `loading`, `error`, `refetch`. Aktualizuje `InterestRealizationState`.
- `useChatMessages(chatId, options)`: ładuje `/api/chats/:chat_id/messages` (page=1, limit=100, order=asc), stan `messages`, `pagination`, `isLoading`, `refresh`.
- `useRealizationActions(interestId)`: wywołuje PATCH `/api/interests/:interest_id/realize` i `/unrealize`, zwraca `isMutating`, `actionError`, `refreshMetdata`.
- `useComposerState`: integrates `react-hook-form` + validation; na sukces wywołuje `messagesRefresh` i `chatDetailsRefetch`.

## 7. Integracja API

- `GET /api/chats/:chat_id`: oczekujemy `ChatDetailsViewModel` (id, status, participants, interestId, statusy, relatedOffers). W odpowiedzi mapujemy `status` i `interest_id` do komponentów oraz pobieramy `otherInterestStatus`.
- `GET /api/chats/:chat_id/messages?page=1&limit=100&order=asc`: zwraca `ChatMessagesApiResponse`. Używamy do renderowania listy (kolejność chronologiczna).
- `POST /api/chats/:chat_id/messages` (body `{ body }`): walidacja 1-2000. Po sukcesie (201) wywołujemy `messagesRefresh` i scroll do dołu. W przypadku 400/422/403/404/500 pokazujemy toast/banners.
- `PATCH /api/interests/:interest_id/realize`: wywoływany po kliknięciu „Zrealizowana”. Oczekujemy `RealizeInterestResponse` (status REALIZED, message, realized_at, exchange_history_id). Po sukcesie refresh metadata + komunikat.
- `PATCH /api/interests/:interest_id/unrealize`: działa tylko jeśli drugi użytkownik nie potwierdził; zwraca status ACCEPTED, realized_at null. Po sukcesie update stanu i powiadomienie.
- Każdą odpowiedź błędu mapujemy na `ApiErrorInfo` i pokazujemy w `ApiErrorBanner` / toastach. W 403/404 proponujemy redirect do listy czatów.

## 8. Interakcje użytkownika

- Po wejściu na `/chats/:chat_id` ładowane są szczegóły czatu i historia; w przypadku błędu 403/404 pojawia się komunikat z linkiem do `/chats`.
- Kliknięcie „Odśwież”: ponowne pobranie metadata/messages.
- Wysłanie wiadomości: textarea walidowana (1-2000), „Wyślij” wywołuje POST, przy poprawnym response historia odświeża się, przewijamy na dół, pokazujemy success notification. Przy błędzie (np. 400) pokazujemy inline; przy 403/404 naciskamy „Powrót do czatów”.
- Kliknięcie „Zrealizowana”: po potwierdzeniu statusu (ACCEPTED) wywołanie PATCH; animacja/ładowanie na buttonie; po obu stronach (treść exchange_history_id) pokazujemy komunikat „Wymiana została zrealizowana” i sugerujemy powrót do listy lub automatyczne przekierowanie.
- Kliknięcie „Anuluj potwierdzenie”: jeśli tylko użytkownik potwierdził (status REALIZED, otherConfirmed = false) button odwołuje status; po success reset UI.

## 9. Warunki i walidacja

- `MessageComposer`: `body` musi mieć 1–2000 znaków; przy dłuższym wejściu walidacja zod (max length) wyświetla komunikat; button „Wyślij” wyłączony.
- `ChatStatusControls`: Realize dostępny tylko gdy `currentInterestStatus === 'ACCEPTED'`, unrealize tylko gdy `state.canUnrealize === true` (czyli user już potwierdził, drugi jeszcze nie). W trakcie mutacji przyciski blokowane.
- `chat_id` walidowany w routingu (UUID); jeżeli backend zwróci 400/403/404, komponent przechodzi w balans i udostępnia przycisk powrotu.
- API validate: `limit` <= 100, `page` >= 1, `order` ∈ {asc, desc} – w fetchach ustawiamy stałe wartości.

## 10. Obsługa błędów

- Brak autoryzacji (401) wyświetla banner z info „Zaloguj się ponownie” i opcję redirect do `/login`.
- 403/404 przy fetchu danych czatu -> `ApiErrorBanner` z komunikatem („Brak dostępu do czatu” albo „Czat nie istnieje”) i przyciskiem „Wróć do listy czatów”.
- 400/422 przy wysyłaniu wiadomości -> inline error w komponencie `MessageComposer`.
- 409 (konflikt realizacji) -> toast z wiadomością z backendu, refetch statusów, status button (np. Realize/Cancel) recalculates.
- 500 -> ogólny komunikat i zachęta do ponowienia/odświeżenia (button odśwież).
- Błędy sieciowe (timeout) – toast „Nie udało się połączyć, spróbuj ponownie”, retry przyciskiem lub `RefreshButton`.

## 11. Kroki implementacji

1. Ustawić stronę `src/pages/chats/[chat_id].astro` tak, aby renderowała React Island `ChatDetailsPage` z przekazanym `chat_id`.
2. Zaimplementować hook `useChatDetails` + backendową ścieżkę (jeśli brak) `GET /api/chats/:chat_id`, która zwraca metadata z interesującymi polami (participants, interestId, statusy, related offers). Zapewnić obsługę 403/404.
3. Zaimplementować `useChatMessages` i komponent `MessagesList` oraz `MessageBubble`, korzystając z endpointu GET `/api/chats/:chat_id/messages`.
4. Zbudować `MessageComposer` z `react-hook-form` + `zod`; po wysłaniu POST `/api/chats/:chat_id/messages` refetchuje wiadomości.
5. Dodać `ChatStatusControls` z przyciskami Realize/Unrealize, integrując `useRealizationActions` z PATCH `/api/interests/:interest_id/realize` i `/unrealize`, update stanu `ChatDetails`.
6. Stworzyć `ChatHeader` z nazwą drugiej osoby, badge statusu i `RefreshButton` refetchującym dane + message list.
7. Obsłużyć warunki błędów: `ApiErrorBanner` plus redirect do `/chats` na 403/404 oraz toast notifications dla operacji mutujących.
8. Napisać testy integracyjne: symulować fetch, wysyłkę, realizację i anulowanie; upewnić się, że walidacja wiadomości działa.
9. Sprawdzić zgodność z UI (Tailwind + shadcn), dostępność (focus, aria), oraz uruchomić `npm run lint`/`typecheck`.
10. Zaktualizować dokumentację (np. plan w `.ai/..`) i dodać ewentualne noty w README/changelog.
