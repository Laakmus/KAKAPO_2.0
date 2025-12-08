## Architektura UI dla KAKAPO

### 1. Przegląd struktury UI

Interfejs użytkownika KAKAPO jest zorganizowany wokół głównych zasobów domenowych i API: `offers`, `users`, `interests`, `chats`, `messages` (plus przyszłościowe `exchange-history`). Architektura jest desktop-first, z prostymi, rozszerzalnymi layoutami, które można w przyszłości zaadaptować do widoków mobilnych. 

Główne sekcje aplikacji:

- **Auth**: Rejestracja (`/signup`) i logowanie (`/login`) oparte na Supabase Auth.
- **Home / Oferty globalne**: Lista wszystkich aktywnych ofert (`/offers` lub `/`) z wbudowanym widokiem szczegółów oferty (lista + detal, deep-link `/offers/:id`).
- **Moje Oferty**: Zarządzanie ofertami zalogowanego użytkownika (`/offers/my`).
- **Profil**: Widok profilu zalogowanego użytkownika z możliwością edycji oraz usunięcia konta (`/profile`).
- **Czaty**: Dwukolumnowy widok lista czatów + wiadomości (`/chats`, `/chats/:id`).
- **Profil innego użytkownika i jego oferty**: Minimalny widok publiczny (`/users/:id`) oraz lista jego ofert (`/users/:id/offers`).

Całość opiera się na podejściu „fetch on mount + ręczne odświeżanie” z przyciskami **„Odśwież”**, jawnymi stanami **ładowania**, **błędów** i **pustych danych**, oraz jasnym mapowaniem stanów domeny (np. `PROPOSED` / `ACCEPTED` / `REALIZED`) na czytelne oznaczenia w UI. Architektura uwzględnia dostępność (etykiety formularzy, inline walidacja, aria-live dla komunikatów) oraz bezpieczeństwo (obsługa `UNAUTHORIZED`/`FORBIDDEN`, ukrywanie akcji, do których użytkownik nie ma uprawnień).

---

### 2. Lista widoków

#### 2.1 Widok: Rejestracja

- **Nazwa widoku**: Rejestracja
- **Ścieżka widoku**: `/signup`
- **Główny cel**: Umożliwić nowemu użytkownikowi utworzenie konta na podstawie emaila, hasła, imienia i nazwiska, z jasnym komunikatem o konieczności potwierdzenia emaila.
- **Kluczowe informacje do wyświetlenia**:
  - Formularz rejestracji: email, hasło, imię, nazwisko.
  - Informacja o konieczności potwierdzenia adresu email.
  - Komunikaty sukcesu/błędu (np. email już istnieje, nieprawidłowy format).
- **Kluczowe komponenty widoku**:
  - **Formularz rejestracji** (pola: email, hasło, imię, nazwisko).
  - **Przycisk „Zarejestruj"**.
  - **Link do logowania** („Masz już konto? Zaloguj się").
  - **Obszar komunikatów globalnych** (success/error, aria-live).
- **UX, dostępność i względy bezpieczeństwa**:
  - Walidacja inline: format email, wymagane pola, hasło minimum 8 znaków (zgodnie z Supabase i endpoint auth-signup-plan.md).
  - Komunikat sukcesu po poprawnym wywołaniu `POST /auth/signup` („Sprawdź swoją skrzynkę email w celu weryfikacji").
  - Wyświetlanie błędów z mapowaniem kodów HTTP: `400` (email już istnieje, nieprawidłowy format), `422` (hasło za krótkie).
  - Focus management: po wejściu na widok focus na pierwszym polu; po błędzie focus na pierwszym błędnym polu.
  - Brak logiki autoryzacji (widok publiczny) – ale blokada wejścia dla zalogowanego (opcjonalne przekierowanie na `/offers`).

**Powiązane historyjki użytkownika**:
- **US-001 Rejestracja**: Widok Rejestracja (`/signup`).

#### 2.2 Widok: Logowanie

- **Nazwa widoku**: Logowanie
- **Ścieżka widoku**: `/login`
- **Główny cel**: Umożliwić zalogowanie istniejącego użytkownika przy użyciu emaila i hasła oraz utworzenie sesji (JWT).
- **Kluczowe informacje do wyświetlenia**:
  - Formularz: email, hasło.
  - Komunikaty o błędach logowania (np. „Email lub hasło niepoprawne", „Email nie został zweryfikowany").
  - Link do rejestracji.
- **Kluczowe komponenty widoku**:
  - **Formularz logowania**.
  - **Przycisk „Zaloguj"**.
  - **Link „Nie masz konta? Zarejestruj się"**.
  - **Obszar komunikatów globalnych** (aria-live).
- **UX, dostępność i względy bezpieczeństwa**:
  - Walidacja: wymagane pola, prosty check formatu email przed wysłaniem.
  - Po sukcesie (200 z `POST /auth/login`) przekierowanie na `/offers`.
  - Przy `401 UNAUTHORIZED` i `403 FORBIDDEN` czytelne komunikaty.
  - Bezpieczne przechowywanie tokenów (wysokopoziomowo – UI dostosowany do mechanizmu cookies/localStorage).
  - Możliwość powrotu do logowania, gdy inne widoki dostaną `UNAUTHORIZED` (np. link „Zaloguj ponownie").

**Powiązane historyjki użytkownika**:
- **US-002 Logowanie do aplikacji**: Widok Logowanie (`/login`) + shell (przekierowanie po sukcesie).

#### 2.3 Widok: Home / Lista globalnych ofert

- **Nazwa widoku**: Home – lista ofert
- **Ścieżka widoku**: `/` oraz `/offers`
- **Główny cel**: Wyświetlenie listy wszystkich aktywnych ofert, z możliwością paginacji, prostego filtrowania/sortowania oraz otwierania szczegółów oferty w tym samym layoutcie.
- **Kluczowe informacje do wyświetlenia**:
  - Karty ofert: tytuł, skrócony opis, miniatura (jeśli istnieje), miasto, imię oferenta, liczba zainteresowanych.
  - Uwaga: Liczba zainteresowanych jest zwracana przez backend dla wszystkich ofert; Frontend decyduje czy ją wyświetlać (może ukryć dla własnych ofert użytkownika).
  - Informacja o liczbie ofert i aktualnej stronie (paginacja).
  - Stany pustej listy (brak ofert).
- **Kluczowe komponenty widoku**:
  - **Siatka kart ofert** (np. `OfferCard`).
  - **Panel filtra/sortowania** (opcjonalnie: miasto, sortowanie po dacie/tytule).
  - **Kontrolki paginacji** („Poprzednia", „Następna", „Strona X z Y").
  - **Przycisk „Odśwież"**.
  - **Obszar szczegółów oferty** jako panel boczny lub modal (widok 2.4).
- **UX, dostępność i względy bezpieczeństwa**:
  - Desktop-first: lista w głównej kolumnie, panel szczegółów po prawej lub modal.
  - Tryb mobile-friendly w przyszłości: karty w jednej kolumnie, szczegóły jako pełnoekranowy overlay.
  - Stany ładowania (szkielety kart lub spinner) i błędów (np. brak połączenia, błąd serwera).
  - Obsługa `401/403`: jasna informacja i link do `/login`.

**Powiązane historyjki użytkownika**:
- **US-003 Wyświetlenie strony głównej z listą ofert**: Widok Home / Lista globalnych ofert (`/offers`).
- **US-024 Paginacja listy ofert**: Widok Home / Lista globalnych ofert (`/offers`).

#### 2.4 Widok: Szczegóły oferty (lista + detal / deep-link)

- **Nazwa widoku**: Szczegóły oferty
- **Ścieżka widoku**: `/offers/:offer_id` (przy zachowaniu layoutu lista + detal)
- **Główny cel**: Umożliwić użytkownikowi zapoznanie się ze szczegółami wybranej oferty oraz wyrażenie/anulowanie zainteresowania.
- **Kluczowe informacje do wyświetlenia**:
  - Tytuł, pełny opis, miasto, imię i nazwisko oferenta, data dodania, zdjęcie (jeśli istnieje), status oferty.
  - Liczba zainteresowanych oraz flaga `is_interested` (czy zalogowany użytkownik jest zainteresowany).
  - Przycisk **„Jestem zainteresowany"** / **„Anuluj zainteresowanie"** w zależności od `is_interested`.
  - Link do profilu oferenta oraz jego ofert.
- **Kluczowe komponenty widoku**:
  - **Panel szczegółów oferty** (master–detail obok listy lub modal).
  - **Przycisk „Jestem zainteresowany" / „Anuluj zainteresowanie"**.
  - **Sekcja meta-danych** (miasto, data, oferent).
  - **Link „Wróć do listy"** (dla wejścia bezpośrednio przez deep-link).
- **UX, dostępność i względy bezpieczeństwa**:
  - Wyraźne CTA „Jestem zainteresowany", z disabled state podczas zapytania.
  - Po kliknięciu – optymistyczna aktualizacja (opcjonalnie) lub widoczny stan ładowania.
  - Obsługa błędów `400/409` przy zainteresowaniu (np. próba zainteresowania własną ofertą).
  - Bezpośrednie wejście na `/offers/:id` ładuje zarówno szczegóły, jak i listę (dla spójności nawigacji).

**Powiązane historyjki użytkownika**:
- **US-004 Przeglądanie szczegółów oferty**: Widok Szczegóły oferty (`/offers/:id`).
- **US-005 Kliknięcie „Jestem zainteresowany"**: Akcja w widoku Szczegóły oferty + karta oferty (Home).
- **US-006 Anulowanie zainteresowania**: Ten sam kontekst co US-005 – przycisk zmieniający stan.

#### 2.5 Widok: Moje Oferty (lista + inline edycja)

- **Nazwa widoku**: Moje Oferty
- **Ścieżka widoku**: `/offers/my`
- **Główny cel**: Umożliwić zalogowanemu użytkownikowi przeglądanie, dodawanie, edytowanie i usuwanie jego ofert, a także przeglądanie listy zainteresowanych daną ofertą.
- **Kluczowe informacje do wyświetlenia**:
  - Lista ofert danego użytkownika (min. tytuł, skrócony opis, miasto, liczba zainteresowanych, status: ACTIVE lub REMOVED).
  - Komunikat, gdy użytkownik nie ma żadnych ofert.
  - Lista zainteresowanych dla danej oferty pobierana z `GET /api/offers/:offer_id/interests` (id, user_name, status, created_at) — paginowana.
- **Kluczowe komponenty widoku**:
  - **Lista kart „moich ofert"** z wyróżnieniem, że to oferty właściciela.
  - **Toolbar akcji na ofercie**: „Edycja", „Usuń", „Zainteresowani (X)".
  - **Inline formularz edycji oferty** (stan rozwijany w obrębie karty lub panelu).
  - **Dialog potwierdzenia usunięcia**.
  - **Przycisk „Dodaj nową ofertę"** (otwiera widok 2.6).
  - **Panel/lista zainteresowanych** (np. modal lub panel boczny).
- **UX, dostępność i względy bezpieczeństwa**:
  - Akcje edycji i usuwania dostępne tylko dla właściciela (RLS + warunkowe renderowanie).
  - **Usunięcie oferty**: Wywołuje `DELETE /api/offers/:offer_id` (hard delete zgodnie z api-plan.md). Po sukcesie oferta jest usunięta z bazy i znika z listy. Wyświetlenie komunikatu sukcesu.
  - **Edycja oferty**: Wywołuje `PATCH /api/offers/:offer_id` z nowymi danymi (tytuł, opis, image_url, miasto). Po sukcesie aktualizacja widoku oraz komunikat sukcesu.
  - Wyraźny komunikat przy braku ofert z CTA „Dodaj nową ofertę".
  - Lista zainteresowanych z linkami do profili (`/users/:user_id`) i ich ofert (`/users/:user_id/offers`), z zachowaniem zasad prywatności.

**Powiązane historyjki użytkownika**:
- **US-007 Przeglądanie moich ofert**: Widok Moje Oferty (`/offers/my`).
- **US-009 Edycja własnej oferty**: Widok Edycja oferty (inline w `/offers/my`).
- **US-010 Usunięcie własnej oferty**: Widok Moje Oferty – akcja „Usuń" + dialog potwierdzenia.
- **US-013 Przeglądanie listy zainteresowanych na mojej ofercie**: Widok Moje Oferty – panel „Zainteresowani".

#### 2.6 Widok: Dodawanie oferty

- **Nazwa widoku**: Dodawanie oferty
- **Ścieżka widoku**: `/offers/new`
- **Główny cel**: Umożliwić użytkownikowi utworzenie nowej oferty zgodnie z wymaganiami walidacji.
- **Kluczowe informacje do wyświetlenia**:
  - Formularz: tytuł, opis, URL zdjęcia (opcjonalnie), miasto (dropdown).
  - Informacja o wymaganiach długości i formatu pól.
  - Komunikaty sukcesu/błędu.
- **Kluczowe komponenty widoku**:
  - **Formularz oferty**.
  - **Dropdown wyboru miasta** z predefiniowaną listą miast.
  - **Przycisk „Dodaj ofertę"**.
  - **Obszar komunikatów globalnych**.
- **UX, dostępność i względy bezpieczeństwa**:
  - Inline walidacja długości tytułu i opisu, formatu URL (oraz rozszerzeń JPG/PNG/WebP).
  - Po sukcesie przekierowanie na szczegóły nowej oferty (widok 2.4) z komunikatem.
  - Obsługa `422` z mapowaniem na błędy pól.

**Powiązane historyjki użytkownika**:
- **US-008 Dodawanie nowej oferty**: Widok Dodawanie oferty (`/offers/new`).

#### 2.7 Widok: Edycja oferty (stan w „Moich Ofertach")

- **Nazwa widoku**: Edycja oferty (inline)
- **Ścieżka widoku**: stan wewnętrzny w `/offers/my` oraz ewentualnie `/offers/:id/edit`
- **Główny cel**: Pozwolić na szybkie zaktualizowanie danych oferty bez opuszczania listy.
- **Kluczowe informacje do wyświetlenia**:
  - Aktualne dane oferty w formularzu edycji.
  - Informacje o błędach walidacji.
- **Kluczowe komponenty widoku**:
  - **Inline formularz oferty** (tytuł, opis, URL zdjęcia, miasto).
  - **Przyciski „Zapisz" / „Anuluj"**.
- **UX, dostępność i względy bezpieczeństwa**:
  - Jasne odróżnienie stanu edycji od stanu odczytu.
  - Możliwość anulowania zmian bez utraty danych widocznych na liście.
  - Walidacja jak przy dodawaniu oferty.

**Powiązane historyjki użytkownika**:
- **US-009 Edycja własnej oferty**: Widok Edycja oferty (inline w `/offers/my`).

#### 2.8 Widok: Profil użytkownika (mój profil)

- **Nazwa widoku**: Mój profil
- **Ścieżka widoku**: `/profile`
- **Główny cel**: Umożliwić użytkownikowi przeglądanie swoich danych (imię, nazwisko, data rejestracji, liczba aktywnych ofert) oraz ich aktualizację, a także usunięcie konta.
- **Kluczowe informacje do wyświetlenia**:
  - Imię i nazwisko.
  - Email (zwracany przez `GET /api/users/me`).
  - Data rejestracji (`created_at`).
  - Liczba aktywnych ofert (zwracana przez `GET /api/users/me` jako `active_offers_count`).
  - Przycisk „Usuń konto".
- **Kluczowe komponenty widoku**:
  - **Widok tylko-do-odczytu** danych profilowych.
  - **Przycisk „Edytuj"** przełączający w stan edycji.
  - **Formularz edycji profilu** (imię, nazwisko; email read-only zgodnie z bezpieczeństwem Supabase Auth).
  - **Przyciski „Zapisz" / „Anuluj"** w stanie edycji.
  - **Dialog potwierdzenia usunięcia konta** z polem hasła.
  - **Obszar komunikatów globalnych** (aria-live).
- **UX, dostępność i względy bezpieczeństwa**:
  - Wyraźne rozróżnienie trybu odczytu i edycji.
  - **Edycja profilu**: Wywołuje `PATCH /api/users/me` z body `{ first_name, last_name }`. Po sukcesie komunikat i powrót do widoku read-only.
  - Inline walidacja długości imienia/nazwiska (1-100 znaków zgodnie z api-plan.md sekcja 4.1).
  - **Usunięcie konta**: Wywołuje `DELETE /api/users/me` z body `{ password }` do re-autoryzacji. Hard delete z CASCADE (zgodnie z api-plan.md sekcja 4.2.8). Po sukcesie wylogowanie i przekierowanie na `/login`.
  - Dane profilowe innych użytkowników nie są tu eksponowane – dotyczy wyłącznie zalogowanego użytkownika.

**Powiązane historyjki użytkownika**:
- **US-012 Przeglądanie mojego profilu**: Widok Mój profil (`/profile`).
- **US-020 Usunięcie konta**: Widok Mój profil – przycisk „Usuń konto" + dialog.

#### 2.9 Widok: Profil innego użytkownika + jego oferty

- **Nazwa widoku**: Profil innego użytkownika
- **Ścieżka widoku**: `/users/:user_id`
- **Główny cel**: Umożliwić zapoznanie się z podstawowymi danymi innego użytkownika (imię, nazwisko) oraz jego aktywnymi ofertami, bez ujawniania danych wrażliwych.
- **Kluczowe informacje do wyświetlenia**:
  - Imię i nazwisko (jeśli dozwolone).
  - Liczba aktywnych ofert.
  - Lista aktywnych ofert danego użytkownika (karty ofert).
- **Kluczowe komponenty widoku**:
  - **Nagłówek profilu** (imię i nazwisko).
  - **Sekcja „Aktywne oferty"** – używa `OfferCard`.
- **UX, dostępność i względy bezpieczeństwa**:
  - Brak edycji – czysty widok read-only.
  - Dane ograniczone do minimum, zgodnie z PRD (bez daty rejestracji, emaila itp.).
  - Brak akcji administracyjnych; tylko przejścia do szczegółów ofert.

**Powiązane historyjki użytkownika**:
- **US-011 Przeglądanie ofert innego użytkownika**: Widok Profil innego użytkownika (`/users/:id` + `/users/:id/offers`).
- **US-014 Oferent klika „Jestem zainteresowany" na ofercie zainteresowanego użytkownika**: Widok Szczegóły oferty + linkowanie z listy zainteresowanych.

#### 2.10 Widok: Czaty (lista + szczegóły)

- **Nazwa widoku**: Czaty
- **Ścieżka widoku**: `/chats` (lista) oraz `/chats/:chat_id` (wybrany czat w detalu)
- **Główny cel**: Umożliwić przeglądanie aktywnych czatów, wybór konkretnego czatu oraz komunikację w ramach wybranej rozmowy.
- **Kluczowe informacje do wyświetlenia**:
  - Lista czatów pobierana z `GET /api/chats`: imię i nazwisko drugiej osoby (`other_user.name`), ostatnia wiadomość (`last_message.body`), data ostatniej wiadomości, liczba nieprzeczytanych (`unread_count`), status czatu (ACTIVE/ARCHIVED).
  - Dla wybranego czatu: historia wiadomości, uczestnicy.
  - **Kontekst wymiany** (jakie oferty są powiązane): Wymagane rozszerzenie response `GET /api/chats` i `GET /api/chats/:chat_id/messages` o informacje o powiązanych ofertach lub osobne zapytanie.
  - Przycisk „Zrealizowana" (wywołuje `PATCH /api/interests/:interest_id/realize`) oraz ewentualnie „Anuluj potwierdzenie" (wywołuje `PATCH /api/interests/:interest_id/unrealize`).
- **Kluczowe komponenty widoku**:
  - **Dwukolumnowy layout**:
    - lewa kolumna: lista czatów (scrollowana lista).
    - prawa kolumna: historia wiadomości wybranego czatu (widok 2.11).
  - **Przycisk „Odśwież"** zarówno dla listy czatów, jak i wiadomości.
  - **Stany pustej listy** („Nie masz jeszcze żadnych czatów").
- **UX, dostępność i względy bezpieczeństwa**:
  - Prosta logika: wejście na `/chats` wybiera pierwszy czat (jeśli istnieje) lub pokazuje pusty stan.
  - Wyraźne zaznaczenie aktywnego czatu na liście.
  - Możliwość poruszania się klawiaturą między czatami i wiadomościami.
  - Dane widoczne tylko dla uczestników czatu; przy `403` komunikat „Brak uprawnień do tego czatu".

**Powiązane historyjki użytkownika**:
- **US-015 Otwieranie czatu**: Widok Czaty (`/chats`) + wybór czatu w liście.

#### 2.11 Widok: Szczegóły czatu / historia wiadomości

- **Nazwa widoku**: Szczegóły czatu
- **Ścieżka widoku**: `/chats/:chat_id` (w ramach layoutu z listą po lewej)
- **Główny cel**: Umożliwić czytanie historii wiadomości i wysyłanie nowych wiadomości w ramach danego czatu oraz oznaczanie wymiany jako „Zrealizowana".
- **Kluczowe informacje do wyświetlenia**:
  - Nazwa/imię i nazwisko drugiej osoby.
  - Lista wiadomości pobierana z `GET /api/chats/:chat_id/messages` w kolejności chronologicznej (sender_id, sender_name, body, created_at). Paginowana (page, limit, order).
  - **Informacja o powiązanych ofertach**: Wymaga rozszerzenia response endpointu lub osobnego zapytania (np. pobranie interests dla obu użytkowników i znalezienie mutual match).
  - Status wymiany (PROPOSED, ACCEPTED, REALIZED) — dostępny przez odpowiednie `interest` rekordy.
- **Kluczowe komponenty widoku**:
  - **Lista wiadomości** (scrollowana, z wyraźnym rozróżnieniem wiadomości własnych i drugiej osoby).
  - **Pole tekstowe wiadomości** i przycisk „Wyślij".
  - **Przycisk „Zrealizowana"** oraz ewentualnie „Anuluj potwierdzenie" (gdy status jest w stanie pośrednim).
  - **Przycisk „Odśwież"** dla wiadomości.
- **UX, dostępność i względy bezpieczeństwa**:
  - Prosty model: wysłanie wiadomości (`POST /api/chats/:chat_id/messages` z body `{ body }`) wywołuje ponowne pobranie listy wiadomości, bez real-time.
  - Walidacja: wiadomość 1-2000 znaków (zgodnie z api-plan.md sekcja 4.1). Blokada wysłania pustej wiadomości (front + obsługa `400/422`).
  - W przypadku `403` (nie jesteś uczestnikiem) lub `404` (czat nie istnieje) przy pobieraniu – komunikat i powrót do listy czatów.
  - **Realizacja wymiany**: Przycisk „Zrealizowana" wywołuje `PATCH /api/interests/:interest_id/realize` (wymaga status ACCEPTED). Gdy obie strony potwierdzą, tworzy się wpis w `exchange_history` i status zmienia się na REALIZED.
  - **Anulowanie potwierdzenia**: Przycisk „Anuluj" wywołuje `PATCH /api/interests/:interest_id/unrealize` (tylko jeśli druga strona jeszcze nie potwierdziła).

**Powiązane historyjki użytkownika**:
- **US-016 Wysyłanie wiadomości w czacie**: Widok Szczegóły czatu (`/chats/:chat_id`).
- **US-017 Przeglądanie historii czatu**: Widok Szczegóły czatu (lista wiadomości).
- **US-018 Oznaczenie wymiany jako „Zrealizowana"**: Widok Szczegóły czatu – przycisk „Zrealizowana".
- **US-019 Anulowanie potwierdzenia „Zrealizowana"**: Ten sam widok – przycisk „Anuluj".

#### 2.12 Widok: Nawigacja globalna / Shell aplikacji

- **Nazwa widoku**: Główny layout aplikacji
- **Ścieżka widoku**: Shell dla wszystkich tras chronionych (`/offers*`, `/profile`, `/chats*`, `/users/*`)
- **Główny cel**: Zapewnić spójny układ, globalną nawigację i obsługę stanu autoryzacji.
- **Kluczowe informacje do wyświetlenia**:
  - Pasek nawigacji z linkami: Home, Moje Oferty, Profil, Chat, Wyloguj.
  - Nazwa/logo aplikacji (link do Home).
- **Kluczowe komponenty widoku**:
  - **Górny pasek nawigacji**.
  - **Kontener treści głównej** (renderuje aktualny widok).
  - **Globalny obszar komunikatów (toast/alert)**.
- **UX, dostępność i względy bezpieczeństwa**:
  - Pasek nawigacji widoczny na wszystkich stronach po zalogowaniu.
  - Aktywna sekcja wyróżniona wizualnie.
  - Przycisk „Wyloguj" zawsze dostępny; po kliknięciu wywołuje `POST /auth/logout`, czyści sesję i przekierowuje na `/login`.
  - Dla widoków chronionych brak ważnego JWT skutkuje przekierowaniem na `/login` lub wyświetleniem komunikatu z CTA.

**Powiązane historyjki użytkownika**:
- **US-021 Wylogowanie**: Główny layout – przycisk „Wyloguj".
- **US-022 Nawigacja między stronami**: Główny layout – pasek nawigacji.
- **US-023 Bezpieczny dostęp do danych innego użytkownika**: Wszystkie widoki chronione poprzez RLS i obsługę błędów.
- **US-025 Obsługa błędów sieciowych**: Wszystkie widoki z fetchowaniem – spójny wzorzec błędów i przycisk „Ponów".

---

### 3. Mapa podróży użytkownika

#### 3.1 Główny przypadek użycia: od rejestracji do zrealizowanej wymiany

1. **Wejście do aplikacji (gość)**:
   - Użytkownik trafia na `/login` lub `/signup` (np. z landing page poza MVP).
2. **Rejestracja (US-001)**:
   - Użytkownik wypełnia formularz w widoku Rejestracja, wysyła dane do `POST /auth/signup`.
   - Otrzymuje komunikat „Sprawdź swoją skrzynkę email”, po kliknięciu linku aktywacyjnego konto jest tworzone.
3. **Logowanie (US-002)**:
   - Użytkownik przechodzi na `/login`, podaje email i hasło, po sukcesie przechodzi na Home (`/offers`).
4. **Przeglądanie listy ofert (US-003, US-024)**:
   - Na Home widzi listę ofert (pobraną z `GET /api/offers`), używa paginacji i ewentualnie filtrów.
5. **Otwieranie szczegółów oferty (US-004)**:
   - Kliknięcie karty otwiera panel szczegółów oferty (lub modal); adres może przejść na `/offers/:id`.
6. **Wyrażenie zainteresowania (US-005)**:
   - Użytkownik klika „Jestem zainteresowany” – wysłanie `POST /api/interests`.
   - UI aktualizuje przycisk na „Anuluj zainteresowanie” oraz liczbę zainteresowanych po stronie oferenta.
7. **Oferent sprawdza swoje oferty (US-007, US-013)**:
   - Oferent przechodzi do „Moje Oferty” (`/offers/my`), widzi listę oraz liczbę zainteresowanych.
   - Klikając licznik, otwiera panel z listą zainteresowanych; z panelu może przejść do profili tych osób i ich ofert.
8. **Wzajemne zainteresowanie (US-014)**:
   - Oferent przegląda ofertę osoby zainteresowanej (Profile innego użytkownika + szczegóły jej oferty).
   - Klika „Jestem zainteresowany” na jej ofercie – po mutual match powstaje czat.
9. **Rozpoczęcie czatu (US-015, US-016, US-017)**:
   - Użytkownik przechodzi do zakładki „Chat” (`/chats`), widzi nowy czat w liście.
   - Wybiera czat, ogląda historię wiadomości (początkowo pustą), wysyła wiadomości.
10. **Zakończenie wymiany (US-018, US-019)**:
   - Po dokonaniu wymiany jedna osoba klika „Zrealizowana” w panelu czatu.
   - Druga osoba widzi komunikat i również klika „Zrealizowana”; status zmienia się na REALIZED, czat może zostać ukryty z listy aktywnych (lub oznaczony jako zrealizowany).

#### 3.2 Zarządzanie ofertami

1. **Dodanie oferty (US-008)**:
   - Z widoku „Moje Oferty” użytkownik klika „Dodaj nową ofertę” (przejście do `/offers/new`).
   - Po poprawnym utworzeniu oferty jest przekierowany na szczegóły oferty lub z powrotem do „Moich Ofert”.
2. **Edycja oferty (US-009)**:
   - W widoku „Moje Oferty” kliknięcie „Edycja” rozwija inline formularz, użytkownik aktualizuje dane i klika „Zapisz”.
3. **Usunięcie oferty (US-010)**:
   - W „Moich Ofertach” kliknięcie „Usuń” otwiera dialog potwierdzenia; po potwierdzeniu oferta znika z listy.

#### 3.3 Podróż związana z profilem i kontem

1. **Przegląd profilu (US-012)**:
   - Użytkownik z dowolnego widoku klikając „Profil” w nawigacji trafia na `/profile`.
2. **Edycja profilu**:
   - Kliknięcie „Edytuj” przełącza w tryb edycji, użytkownik aktualizuje imię/nazwisko, zapisuje zmiany.
3. **Usunięcie konta (US-020)**:
   - Kliknięcie „Usuń konto” otwiera dialog; po podaniu hasła i potwierdzeniu konto jest usuwane, następuje wylogowanie.

#### 3.4 Błędy, wygasła sesja i wylogowanie

- Przy `401/UNAUTHORIZED`:
  - Widoki chronione pokazują komunikat („Sesja wygasła, zaloguj się ponownie”) z przyciskiem do `/login`.
- Przy `403/FORBIDDEN`:
  - Widok informuje o braku uprawnień do zasobu; np. w czacie „Nie masz dostępu do tego czatu”.
- **Wylogowanie (US-021)**:
  - Dostępne z każdego widoku za pomocą przycisku „Wyloguj” w górnej nawigacji.

---

### 4. Układ i struktura nawigacji

#### 4.1 Główna nawigacja (desktop-first)

- **Górny pasek nawigacji** (widoczny na wszystkich stronach po zalogowaniu):
  - **Logo / nazwa „KAKAPO”**: link do Home (`/offers`).
  - **Home**: `/offers` (lista ofert).
  - **Moje Oferty**: `/offers/my`.
  - **Profil**: `/profile`.
  - **Chat**: `/chats`.
  - **Wyloguj**: akcja wylogowania (bez trasy).
- **Zachowanie**:
  - Aktywny link jest wyróżniony (np. podkreślenie, inny kolor).
  - Na węższych ekranach menu można w przyszłości zwinąć do hamburgera (architektura nie utrudnia takiej zmiany).

#### 4.2 Hierarchia tras i layoutów

- **Shell autoryzacji**:
  - Trasy publiczne: `/login`, `/signup`.
  - Trasy chronione: wszystko pod `/offers*`, `/profile`, `/chats*`, `/users/*`.
- **Trasy i powiązane layouty**:
  - `/offers` – layout lista ofert + opcjonalny panel szczegółów.
  - `/offers/:offer_id` – ten sam layout z aktywnym panelem szczegółów powiązanego id.
  - `/offers/my` – layout listy własnych ofert z toolbarami akcji.
  - `/offers/new` – formularz dodawania oferty w standardowym layoucie.
  - `/profile` – widok profilu w layoucie formularza dwell/edytuj.
  - `/users/:user_id` – prosty layout z nagłówkiem profilu i listą ofert.
  - `/chats` – dwukolumnowy layout lista czatów + placeholder detalu.
  - `/chats/:chat_id` – ten sam layout, ale prawa kolumna wypełniona historią wiadomości.

#### 4.3 Wzorce nawigacji wewnętrznej

- **Linki kontekstowe**:
  - Z karty oferty do szczegółów (`/offers/:id`).
  - Ze szczegółów oferty do profilu oferenta (`/users/:id`).
  - Z listy zainteresowanych (w „Moich Ofertach”) do profilu zainteresowanego użytkownika.
  - Z czatu do powiązanych ofert (np. otwarcie szczegółów w nowej karcie).
- **Przyciski „Wróć” / breadcrumb**:
  - Na widokach otwieranych bezpośrednio (np. `/offers/:id` bez poprzedniej nawigacji) dostępny mały breadcrumb do listy ofert.

---

### 5. Kluczowe komponenty

#### 5.1 Layout i nawigacja

- **`AppShell`**:
  - Odpowiada za globalny układ: górny pasek nawigacji, kontener widoku, globalne komunikaty.
  - Wymusza sprawdzenie, czy użytkownik jest zalogowany (guard dla tras chronionych).
- **`MainNav`**:
  - Pasek nawigacji z linkami Home, Moje Oferty, Profil, Chat, Wyloguj.
  - Dba o dostępność (role `navigation`, odpowiednie aria-labels).

#### 5.2 Oferty

- **`OfferCard`**:
  - Prezentuje podstawowe informacje o ofercie (tytuł, skrócony opis, miasto, miniatura, imię oferenta, liczba zainteresowanych).
  - Zawiera CTA do otwarcia szczegółów.
- **`OfferList`**:
  - Siatka / lista kart ofert z paginacją i opcjonalnym filtrowaniem.
  - Wykorzystuje `GET /api/offers` (lub odpowiednio dla `my`/`user`).
- **`OfferDetailPanel`**:
  - Master–detail panel z pełnymi informacjami o ofercie.
  - Zawiera przycisk „Jestem zainteresowany” / „Anuluj zainteresowanie” oraz meta-informacje.
- **`OfferForm`**:
  - Reużywalny formularz do dodawania oraz edycji oferty (pola, walidacja, wyświetlanie błędów).

#### 5.3 Zainteresowania i statusy wymiany

- **`InterestToggleButton`**:
  - Przycisk obsługujący wysłanie `POST /api/interests` lub `DELETE /api/interests/:id` w zależności od stanu.
  - Prezentuje różne etykiety i style w zależności od statusu (`PROPOSED`, `ACCEPTED`, `REALIZED` – gdy dotyczy).
- **`InterestedUsersList`**:
  - Lista zainteresowanych użytkowników w kontekście konkretnej oferty (Moje Oferty).
  - Każdy element zawiera imię, nazwisko, datę zainteresowania i link do profilu/ofert.

#### 5.4 Profil i konto

- **`ProfileSummary`**:
  - Widok tylko-do-odczytu danych użytkownika (imię, nazwisko, email, data rejestracji, liczba ofert).
- **`ProfileForm`**:
  - Formularz edycji profilu z walidacją inline i komunikatami błędów.
- **`DeleteAccountDialog`**:
  - Dialog z polem hasła i ostrzeżeniem o nieodwracalności akcji.

#### 5.5 Czaty i wiadomości

- **`ChatList`**:
  - Lista czatów w lewej kolumnie widoku `Czaty`.
  - Każdy element zawiera nazwę drugiej osoby, fragment ostatniej wiadomości, datę, status.
- **`ChatMessages`**:
  - Lista wszystkich wiadomości w danym czacie.
  - Odpowiednie style dla wiadomości własnych i cudzych; zachowanie przewijania.
- **`MessageInput`**:
  - Pole tekstowe + przycisk „Wyślij” z walidacją długości.
- **`RealizationControls`**:
  - Przyciski „Zrealizowana” / „Anuluj potwierdzenie” wraz z informacją o aktualnym stanie wymiany.

#### 5.6 Wspólne komponenty UX / a11y / błędy

- **`LoadingState` / `Skeleton`**:
  - Uniwersalny komponent prezentujący stan ładowania dla list i paneli.
- **`EmptyState`**:
  - Komponent wyświetlający komunikat o braku danych (np. brak ofert, brak czatów) z opcjonalnym CTA.
- **`ErrorState`**:
  - Prezentuje przyjazny komunikat błędu, kody błędów mogą być mapowane na krótsze komunikaty („Coś poszło nie tak”, „Brak uprawnień”, „Sesja wygasła”).
  - Zawiera przycisk „Ponów” do ponownego wykonania żądania (US-025).
- **`RefreshButton`**:
  - Standardowy przycisk „Odśwież” używany w widokach list i czatów zgodnie z założeniem „fetch on mount + ręczne odświeżanie”.
- **`FormField`**:
  - Komponent łączący label, pole wejściowe, opis pomocniczy i komunikat błędu (z poprawnymi atrybutami aria).
- **`Toast` / `Alert`**:
  - Globalny komponent do prezentacji komunikatów sukcesu i błędów (aria-live).

---

### 6. Kwestie wymagające wyjaśnienia i rozszerzenia

Poniższe elementy zostały zidentyfikowane jako wymagające doprecyzowania lub rozszerzenia przed pełną implementacją UI:

#### 6.1 Informacje o powiązanych ofertach w czatach

**Problem**: Widoki Czaty (2.10) i Szczegóły czatu (2.11) wymagają wyświetlania informacji o tym, które oferty są powiązane z daną wymianą (np. "Twoja oferta X i oferta Y drugiej osoby").

**Obecny stan**: Endpointy `GET /api/chats` i `GET /api/chats/:chat_id/messages` nie zwracają tych informacji zgodnie z planami w `.ai/endpoints/`.

**Możliwe rozwiązania**:
1. Rozszerzyć response `GET /api/chats` o pole `related_offers: { my_offer: {...}, their_offer: {...} }`
2. Dodać osobny endpoint `GET /api/chats/:chat_id/context` zwracający powiązane oferty i statusy interests
3. Frontend może wykonać dodatkowe zapytania do `GET /api/interests/my` i przefiltrować po statusie ACCEPTED/REALIZED dla danego użytkownika

**Zalecenie**: Rozszerzyć response `GET /api/chats` (opcja 1) dla najlepszego UX i wydajności.

#### 6.2 Identyfikacja interest_id dla przycisków realizacji w czacie

**Problem**: Przyciski „Zrealizowana" i „Anuluj potwierdzenie" w widoku Szczegóły czatu (2.11) wymagają `interest_id` do wywołania `PATCH /api/interests/:interest_id/realize` oraz `PATCH /api/interests/:interest_id/unrealize`.

**Obecny stan**: Response z `GET /api/chats/:chat_id/messages` nie zawiera `interest_id`.

**Możliwe rozwiązania**:
1. Rozszerzyć response `GET /api/chats/:chat_id` o informacje o powiązanych interests (interest_id, status)
2. Frontend może pobrać `interest_id` z wcześniejszego zapytania do `GET /api/chats` (jeśli zostanie rozszerzone)
3. Dodać nowy endpoint `GET /api/chats/:chat_id/interests` zwracający oba interest rekordy dla danego czatu

**Zalecenie**: Rozszerzyć response `GET /api/chats/:chat_id` (opcja 1) lub wykorzystać rozszerzenie z punktu 6.1.

#### 6.3 Zmienne środowiskowe Supabase (WYMAGANE)

**Ważne**: W Astro zmienne środowiskowe dostępne po stronie klienta (browser) **muszą** mieć prefix `PUBLIC_`.

**Wymagane zmienne w `.env`**:
```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_KEY=your-anon-key
```

**Konfiguracja TypeScript** (`src/env.d.ts`):
```typescript
interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_KEY: string;
}
```

**Użycie w kodzie**:
```typescript
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY;
```

**Bezpieczeństwo**: **NIGDY** nie eksponuj `SUPABASE_SERVICE_ROLE_KEY` po stronie klienta. Używaj tylko `PUBLIC_SUPABASE_KEY` (anon key).

#### 6.4 Lista miast w formularzu oferty

**Stan**: Lista 16 miast jest spójna we wszystkich plikach planowania (api-plan.md, offers-plan.md, offers-create-plan.md). UI powinien używać tej samej listy.

**Miasta**: Warszawa, Kraków, Wrocław, Poznań, Gdańsk, Szczecin, Łódź, Lublin, Białystok, Olsztyn, Rzeszów, Opole, Zielona Góra, Gorzów Wielkopolski, Kielce, Katowice.

**Implementacja**: Dropdown/select w formularzach dodawania (2.6) i edycji oferty (2.7) powinien zawierać dokładnie te miasta.

#### 6.5 Widoczność liczby zainteresowanych dla właściciela oferty

**Obecny stan**: Backend (`GET /api/offers`) zwraca `interests_count` dla wszystkich ofert bez warunkowej logiki.

**Decyzja UI**: Frontend decyduje czy wyświetlać liczbę zainteresowanych. Może ukryć ją dla ofert, gdzie `owner_id === logged_user_id`.

**Zalecenie**: Pozostawić logikę po stronie Frontendu dla elastyczności. Backend nie powinien filtrować tego pola.

#### 6.6 Brakujące plany endpointów

Następujące endpointy są opisane w `api-plan.md` ale brakuje szczegółowych planów implementacyjnych w `.ai/endpoints/`:

- `PATCH /api/offers/:offer_id` (edycja oferty)
- `DELETE /api/offers/:offer_id` (usunięcie oferty)
- `DELETE /api/interests/:interest_id` (anulowanie zainteresowania)
- `PATCH /api/interests/:interest_id/unrealize` (anulowanie potwierdzenia realizacji)
- `PATCH /api/users/me` (edycja profilu)
- `POST /auth/refresh` (odświeżenie tokenu)

**Zalecenie**: Stworzyć plany implementacyjne dla tych endpointów przed rozpoczęciem implementacji UI.

#### 6.7 Endpoint GET /api/users/me — brakujące pola

**Problem**: Widok Mój profil (2.8) wymaga wyświetlenia `email` i `active_offers_count`, ale plan `users-me-plan.md` nie zawiera tych pól w response.

**Zalecenie**: Zaktualizować plan `users-me-plan.md` aby response zawierał:
```json
{
  "id": "uuid",
  "first_name": "Jan",
  "last_name": "Kowalski",
  "email": "user@example.com",
  "created_at": "2024-01-01T10:00:00Z",
  "active_offers_count": 3
}
```

---

Ta architektura UI jest ściśle dopasowana do PRD, planu API i ustaleń z sesji planowania, zapewniając prosty, spójny i rozszerzalny interfejs, który pokrywa wszystkie historyjki użytkownika, dba o dostępność i bezpieczeństwo oraz pozostawia przestrzeń na przyszłe rozszerzenia (mobile, real-time, rozbudowany stan globalny).

**Uwaga**: Kwestie wymienione w sekcji 6 powinny zostać rozwiązane przed rozpoczęciem implementacji odpowiednich widoków UI.


