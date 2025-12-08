# Plan implementacji widoku Edycja oferty (inline)

## 1. Przegląd
Widok umożliwia szybkie edytowanie własnej oferty bez opuszczania strony `/offers/my`. Użytkownik widzi dane oferty w miejscu karty, może przełączyć widok w tryb edycji, zmienić tytuł/opis/URL zdjęcia/miasto, a następnie zapisać lub anulować zmiany. Cel: pełna kontrola nad ofertą, zachowanie kontekstu listy i spójność z walidacją z PRD (taki sam poziom, komunikaty, ograniczenia miast).

## 2. Routing widoku
- Strona główna edycji: `src/pages/offers/my.astro` (lub komponent renderowany w `src/pages/offers/my`), obsługuje listę `GET /api/offers/my`.
- Opcjonalna ścieżka szczegółowa `/offers/:id/edit` powinna delegować na ten sam komponent listowy z prefetchowanym `offer_id`.

## 3. Struktura komponentów
- `MyOffersPage` (Astro page) → ładuje `MyOffersList`.
- `MyOffersList` → fetchuje dane, zarządza paginacją + stanem edytowanych wierszy.
- `OfferRow` → prezentuje dane oferty; gdy `isEditing` → renderuje `InlineOfferEditor`.
- `InlineOfferEditor` → formularz (react-hook-form + zod), obsługuje walidację, `Zapisz/Anuluj`.
- `OfferEditorControls` → status edycji, komunikaty (success/error), opcjonalny chip „Tryb edycji”.
- `PaginationControls` (jeśli lista paginowana) – zachowuje query `page`.

## 4. Szczegóły komponentów

### MyOffersList
- Opis: zarządza fetchowaniem `/api/offers/my`, trzyma `editingId`, `page`, `error`, `loading`.
- Główne elementy: nagłówek „Moje oferty”, pętla `OfferRow`, `PaginationControls`, `GlobalNotification`.
- Zdarzenia: `onEditStart(id)`, `onEditCancel()`, `onRefresh()`, `onPageChange`.
- Walidacja: brak; reaguje na błędy API (status 401/403/500).
- Typy: `OfferListItemDTO`, `Paginated<OfferListItemDTO>`, `ApiErrorResponse`.
- Propsy: `{ data: Paginated<OfferListItemDTO>, editingId?: string, onEditStart, onEditCancel, onSaveSuccess }`.

### OfferRow
- Opis: pokazuje podstawowe dane + przycisk „Edycja” (jeśli owner). W trybie edycji renderuje `InlineOfferEditor`.
- Elementy: tytuł, opis (skrócony), miasto, licznik zainteresowań, przyciski („Edycja”, „Usuń” opcjonalnie).
- Zdarzenia: `onEditClick`, `onCancelClick`.
- Walidacja: brak (tylko widok).
- Typy: `OfferListItemDTO & { isEditing?: boolean }`.
- Propsy: `{ offer, isEditing, onEdit, onCancel }`.

### InlineOfferEditor
- Opis: formularz z polami (tytuł, opis, upload zdjęcia, miasto) + „Zapisz/Anuluj". Używa `react-hook-form` + `zodResolver`.
- Elementy: `input` (tytuł), `textarea` (opis), `ImageUpload` (komponent uploadu), `select` (miasto), `button` (Zapisz), `button` (Anuluj), status message area.
- Zdarzenia: `onSubmit`, `onReset`, `onFieldBlur`.
- Walidacja: tytuł 5-100 znaków, opis 10-5000, `image_url` zwrócony przez ImageUpload (opcjonalny), miasto z listy 16 (w `z.enum`).
- Typy: `OfferEditFormValues`, `UpdateOfferCommand`, `ApiFieldError`, `OfferDetailDTO`.
- Propsy: `{ initialValues: OfferEditFormValues, onSave: (payload) => Promise<UpdateOfferResponse>, onCancel }`.

### OfferEditorControls
- Opis: prezentuje status zapisu, komunikaty success/error, wskaźnik „Tryb edycji”.
- Elementy: badge „Edycja”, tekst success/error, spinner (przy zapisie).
- Zdarzenia: brak (sterowane przez props).
- Walidacja: nie dotyczy.
- Typy: `{ isSaving: boolean; error?: string; success?: string; isDirty: boolean }`.
- Propsy: powyższe.

## 5. Typy
- `OfferEditFormValues`: `{ title: string; description: string; image_url?: string; city: OfferCity; }`.
- `OfferCity`: `z.enum` 16 miast (exportowany do wielokrotnego użytku). 
- `OfferEditViewState`: `{ isEditing: boolean; isSaving: boolean; error?: ApiFieldError | string; success?: string; isDirty: boolean; }`.
- `InlineOfferEditorProps`: see above.
- `UpdateOfferResponse`: z `src/types.ts` (odpowiedź z `OfferDetailDTO + message?`).
- `OfferWithEditState`: `OfferListItemDTO & OfferEditViewState`.
- `ApiFieldError` (ztypes) mapowany do `field` i `message` w formularzu.

## 6. Zarządzanie stanem
- `MyOffersList` przechowuje `editingId`, `page`, `offers`, `error`, `isLoading`.
- `useForm` (react-hook-form) w `InlineOfferEditor` obsługuje `dirtyFields`, `reset` do anulowania.
- `useOfferEditing` (custom hook) może inkapsulować: `startEditing(id, data)`, `submitEdit(payload)`, `cancel()`, `setError`, `setSuccess`.
- `GlobalNotification` (lub `useNotification`) do pokazania globalnych komunikatów sukcesu/błędu.
- Po zapisie: `offers` w `MyOffersList` uaktualnia konkretny wiersz (np. `setOffers` z `map`).
- `isSaving` blokuje przyciski i inputy.

## 7. Integracja API
- `GET /api/offers/my?status=ACTIVE` → pobiera listę (bazowe dane).
- `PATCH /api/offers/{offer_id}` (nowy endpoint) → body `UpdateOfferCommand` (title/description/image_url/city). Oczekiwane response `UpdateOfferResponse` (OfferDetailDTO + message). Backend: `OfferService.updateOffer(userId, offerId, data)` z walidacją Zod (ponownie `createOfferSchema`/`updateOfferSchema`).
- Przykład request: `fetch('/api/offers/{id}', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })`.
- Obsługa tokenu: request idzie przez Astro API, więc `locals.supabase` zapewnia autoryzację (Sesja Supabase).
- Po success: odśwież row bez pełnej listy (uaktualnij `offer` w stanie). Można opcjonalnie wykonać `GET /api/offers/{offer_id}` żeby mieć pewność, ale nie jest wymagane.

## 8. Interakcje użytkownika
- Klik „Edycja”: `OfferRow` zmienia `isEditing` (ustaw `editingId`), `InlineOfferEditor` renderowany.
- Edycja pól: walidacja w czasie rzeczywistym (zod + react-hook-form). Zarządzanie `aria` i focus.
- Klik „Zapisz”: `InlineOfferEditor` wykonuje `submit`, `isSaving=true`, wywołuje PATCH, po sukcesie wyświetla komunikat, resetuje `isDirty`, przełącza tryb widoku.
- Klik „Anuluj”: `reset(initialValues)`, `onCancel` ustawia `editingId = undefined`.
- Błędy walidacji (po stronie backendu lub frontend) są mapowane do `FieldError` i wyświetlane pod odpowiednimi inputami.
- W przypadku `network error` lub 500: `GlobalNotification` + opcja powtórzenia (np. button „Ponów zapis”).
- Zmiana strony paginacji: `editingId` resetowany (auto zastosuj `cancel`), nowa strona fetchowana.

## 9. Warunki i walidacja
- **Tytuł**: `z.string().trim().min(5).max(100)`, `required`.
- **Opis**: `z.string().trim().min(10).max(5000)`.
- **Upload zdjęcia**: Obsługiwany przez komponent `ImageUpload`:
  - Walidacja: format (JPG/PNG/WebP), rozmiar (max 10 MB).
  - Przetwarzanie: kompresja do 1920px, generowanie miniatury 400px.
  - Upload: do Supabase Storage bucket `offers` w strukturze `{user_id}/{timestamp}-{filename}`.
  - Zwraca: URL publiczny zdjęcia (`image_url`).
- **Miasto**: `z.enum([...16 miast])`.
- Frontend waliduje via `zodResolver(createOrUpdateOfferSchema)` (wyspecyfikowane w `src/schemas/offers.schema.ts`); back validation mirrored `createOfferSchema`.
- `InlineOfferEditor` blokuje `Zapisz` jeśli `!isDirty || !isValid`.
- `OfferRow` w trybie edycji pokazuje `aria-live` z informacją o błędach.

## 10. Obsługa błędów
- **400/422**: `ApiFieldError` + `message` z response. Pokazać pod polami, `GlobalNotification` z tekstem „Zweryfikuj pola w formularzu”.
- **401**: przekierowanie do `/login` lub wyświetlenie `GlobalNotification` „Zaloguj się ponownie”.
- **403**: komunikat „Nie masz uprawnień do edycji tej oferty” + wyjście z trybu edycji.
- **404**: poświadcz, że oferta mogła zostać usunięta; odśwież listę i pokaż toast.
- **500 / network**: `GlobalNotification` z „Nieoczekiwany błąd. Spróbuj ponownie” + przycisk „Ponów”.
- **Wyzwania i rozwiązania**:
  - _Brak dedykowanego endpointu PATCH_: implementacja w backendzie `OfferService.updateOffer` + `src/pages/api/offers/[offer_id].ts` obsługująca Zod, RLS, błędy. Frontend oczekuje `UpdateOfferResponse`.
  - _Zarządzanie modelem edycji inline na paginowanej liście_: `MyOffersList` śledzi `editingId`, resetuje po resecie/stronie. `InlineOfferEditor` używa `reset(initialValues)` i `isEditing` guard.
  - _Walidacja URL zdjęcia_: `zod` + helper regex w schema; `InlineOfferEditor` dostarcza `helper text` i `aria` status.
  - _Niezawodność sieci_: `offerService` `retry` w UI (przycisk), `fetch` z timeout (custom hook).

## 11. Kroki implementacji
1. Zdefiniować `OfferEditFormValues`, `OfferCity` i `OfferEditViewState` w plikach typów/komponentów (ponownie użyć `types.ts` i `schemas/offers.schema.ts`).
2. Dodać `updateOfferSchema` (z `z.object` + walidacja) i metodę `OfferService.updateOffer(userId, offerId, payload)` zwracającą `UpdateOfferResponse`.
3. Rozszerzyć `src/pages/api/offers/[offer_id].ts` o `PATCH` handler wykorzystujący Supabase, `OfferService.updateOffer` oraz `createErrorResponse`.
4. W `src/pages/offers/my.astro` utworzyć `MyOffersPage`/`MyOffersList` z fetchowaniem `GET /api/offers/my`, paginacją i zarządzaniem `editingId`.
5. Zaimplementować `OfferRow` (statyczny widok + przycisk „Edycja”) i `InlineOfferEditor` (formularz z `react-hook-form` + `zod`).
6. Dodać `OfferEditorControls` + `GlobalNotification` do komunikatów success/error oraz `PaginationControls`.
7. Obsłużyć interakcje: `onEditStart`, `onSave`, `onCancel`, `onPageChange`, `retry`.
8. Pokryć testami manualnymi: udana edycja, walidacje, błędy 400/403/500, anulowanie. Upewnić się o spójności komunikatów z PRD.
9. Zweryfikować działanie z backendem (RLS, auth) i zapewnić, że UI nie renderuje „Edycja” dla oferty nie należącej do zalogowanego użytkownika.

