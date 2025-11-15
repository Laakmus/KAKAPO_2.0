# Dokument wymagań produktu (PRD) - KAKAPO

## 1. Przegląd produktu

### Nazwa produktu

KAKAPO

### Opis ogólny

KAKAPO to platforma wymiany (barter) opartą na bazie danych, która umożliwia użytkownikom wymianę produktów i usług między sobą. Aplikacja łączy osoby z komplementarnymi potrzebami i umożliwia bezpośrednią komunikację poprzez wbudowany system czatu.

### Wizja

Stworzyć prosty, intuicyjny system wymiany, który eliminuje potrzebę pieniędzy i wspomaga lokalną wymianę towarów między mieszkańcami miast.

### Wartość dla użytkownika

- Możliwość otrzymania potrzebnych produktów bez wydawania pieniędzy
- Przejrzysty proces poszukiwaniao i oferowania produktów
- Bezpośrednia komunikacja z innymi wymieniającymi się
- Pełna kontrola nad swoimi danymi i ofertami
- Bezpieczeństwo i weryfikacja za pośrednictwem emaila

### Platforma docelowa

Desktop tylko (brak aplikacji mobilnej w MVP)

### Stack techniczny

- Frontend: Astro + React + TypeScript + Tailwind
- Backend: Supabase (PostgreSQL)
- Autentykacja: Supabase Auth z weryfikacją emaila
- Hosting: GitHub Actions + DigitalOcean

---

## 2. Problem użytkownika

### Główne bóle użytkownika

1. Trudność w znalezieniu osób chętnych do wymiany produktów w bezpieczny i zorganizowany sposób
2. Brak platformy dedykowanej do wymiany bez pieniędzy w środowisku lokalnym
3. Konieczność wymiany kontaktów (email, telefon) przed potwierdzeniem zainteresowania
4. Brak przejrzystego systemu śledzenia statusu wymiany
5. Brak pewności, czy druga osoba jest zainteresowana przed włożeniem wysiłku w komunikację

### Segment docelowy

- Użytkownicy zainteresowani ekonomią współdzielenia
- Osoby szukające alternatywnych form wymiany
- Mieszkańcy miast polskich (początkowy zasięg)
- Wiek: 18+, aktywni online

### Problemy rozwiązywane przez KAKAPO

- Centralizacja procesu odkrywania produktów do wymiany
- Automatyczne łączenie osób z wzajemnym zainteresowaniem
- Bezpieczna wymiana danych kontaktowych poprzez chat w aplikacji
- Śledzenie statusu wymian w jednym miejscu

---

## 3. Wymagania funkcjonalne

### 3.1 Core Features (Muszą być w MVP)

#### Autentykacja i zarządzanie kontem

- Rejestracja nowych użytkowników (email, hasło, imię, nazwisko)
- Weryfikacja adresu email
- Logowanie przy użyciu email i hasła
- Wylogowanie
- Usunięcie konta (hard delete z GDPR compliance)
- Sesje użytkownika z JWT tokenami

#### Zarządzanie ofertami

- Dodawanie nowych ofert (tytuł, opis, opcjonalne zdjęcie, miasto)
- Przeglądanie wszystkich aktywnych ofert z wszystkich miast
- Przeglądanie szczegółów oferty (oferent, wszystkie dane)
- Usuwanie własnej oferty
- Wyświetlanie liczby zainteresowanych na kazdej ofercie
- Edycja własnej oferty (tytuł, opis, zdjęcie, miasto)

#### System zainteresowania

- Kliknięcie przycisku "Jestem zainteresowany" na ofercie
- Status zainteresowania: PROPOSED (przed potwierdzeniem oferenta)
- Oferent widzi listę osób zainteresowanych jego ofertą
- Oferent może kliknąć na zainteresowanego i zobaczyć jego profil
- Oferent może zobaczyć oferty zainteresowanego użytkownika
- Anulowanie zainteresowania przez zainteresowanego użytkownika

#### System dopasowania (Matching)

- Automatyczne wykrywanie wzajemnego zainteresowania (mutual match)
- Gdy User A jest zainteresowany ofertą User B i vice versa → status zmienia się na ACCEPTED
- Po wykryciu wzajemnego zainteresowania (mutual match) czat dla obydwu użytkowników staje się dostępny (pojawia się w rozdziale "czaty" na profilach obu użytkowników)

#### System czatu

- Chat pojawia się TYLKO gdy istnieje wzajemne zainteresowanie (status ACCEPTED)
- Wysyłanie wiadomości tekstowych
- Historia wiadomości
- Każdy może wysyłać wiadomości
- Oznaczenie wymiany jako "Zrealizowana" (wymaga potwierdzenia obydwu)
- Po obu potwierdzeniach → status REALIZED i chat się zamyka

#### Profil użytkownika

- Wyświetlanie imienia i nazwiska
- Wyświetlanie liczby aktywnych ofert
- Wyświetlanie daty rejestracji

#### Przeglądanie moich ofert

- Lista wszystkich moich ofert (aktywnych)
- Liczba zainteresowanych na każdą ofertę
- Przycisk edytowania oferty
- Przycisk usunięcia oferty

### 3.2 Ograniczenia i walidacje

#### Pola oferty

- Tytuł: 5-100 znaków, obowiązkowe
- Opis: 10-5000 znaków, obowiązkowe
- Zdjęcie: URL (JPG, PNG, WebP), opcjonalne, walidacja URL frontend
- Miasto: Wybór z 10 miast z dropdown'u, obowiązkowe

#### Wiadomości

- Maksymalnie 2000 znaków
- Nie może być pusta
- Frontend i backend validation

#### Email

- Format email
- Unikalność w bazie danych
- Weryfikacja przez Supabase Auth

#### Hasło

- Minimum wymagania Supabase Auth
- Bezpieczne haszowanie

### 3.3 Miasta dostępne (MVP)

1. Warszawa
2. Kraków
3. Wrocław
4. Poznań
5. Gdańsk
6. Szczecin
7. Łódź
8. Lublin
9. Białystok
10. Olsztyn
11. Rzeszów
12. Opole
13. Zielona Góra
14. Gorzów Wielkopolski
15. Kielce
16. Katowice

---

## 4. Granice produktu

### Co NIE jest częścią MVP

- Rating i opinie użytkowników
- Komentarze na ofertach
- Powiadomienia (email, push, in-app)
- Zaawansowane filtry i wyszukiwarka
- Kategorie produktów
- Strony informacyjne (O nas, Kontakt, Polityka)
- Notyfikacje real-time
- Historia wymian (archiwum)
- Aplikacja mobilna
- Weryfikacja użytkowników poza emailem
- Blokowanie użytkowników
- Follow, like, social features
- Edycja profilu poza imieniem/nazwiskiem
- Data wygaśnięcia oferty
- Ograniczenie liczby ofert dziennie

### Założenia techniczne

- Bez real-time WebSocket - prosty pull/refresh dla chatu
- RLS (Row Level Security) dla bezpieczeństwa danych
- Każdy widzi tylko swoje dane wrażliwe
- Oferty widoczne dla wszystkich zalogowanych użytkowników

---

## 5. Historyjki użytkowników

### US-001: Rejestracja nowego użytkownika

Jako potencjalny użytkownik aplikacji,
chcę się zarejestrować podając email, hasło, imię i nazwisko,
aby móc korzystać z platformy KAKAPO.

Kryteria akceptacji:

- Użytkownik widzi formularz rejestracji z polami: Email, Hasło, Imię, Nazwisko
- Walidacja frontend: email w prawidłowym formacie, hasło wymagane, imię i nazwisko wymagane
- Po kliknięciu "Zarejestruj" dane wysyłane do Supabase Auth
- Supabase weryfikuje email wysyłając link potwierdzający
- Użytkownik widzi komunikat "Sprawdź swoją skrzynkę email"
- Po kliknięciu linku w emailu konto jest aktywne
- Użytkownik jest automatycznie logowany po weryfikacji
- W przypadku błędu (email już istnieje, błąd serwera) wyświetlany jest komunikat błędu
- Hasło jest bezpiecznie haszowane w Supabase

---

### US-002: Logowanie do aplikacji

Jako zarejestrowany użytkownik,
chcę się zalogować używając emailu i hasła,
aby uzyskać dostęp do mojego konta i aplikacji.

Kryteria akceptacji:

- Użytkownik widzi formularz logowania z polami: Email, Hasło
- Walidacja frontend: email i hasło wymagane
- Po kliknięciu "Zaloguj" dane weryfikowane przez Supabase
- W przypadku poprawnych danych użytkownik jest logowany i przenoszony na stronę główną
- W przypadku błędnych danych wyświetlany jest komunikat "Email lub hasło niepoprawne"
- JWT token jest przechowywany w sesji
- Użytkownik pozostaje zalogowany po odświeżeniu strony
- Istnieje przycisk "Wyloguj" dostępny z każdej strony

---

### US-003: Wyświetlenie strony głównej z listą ofert

Jako zalogowany użytkownik,
chcę zobaczyć listę wszystkich aktywnych ofert od wszystkich użytkowników,
aby znaleźć produkty, które mogą mnie zainteresować.

Kryteria akceptacji:

- Strona główna wyświetla listę ofert w formacie karty/grid
- Każda karta zawiera: tytuł, opis (skrócony), zdjęcie (jeśli dostępne), miasto, imię oferenta
- Karty są sortowalne: od najnowszych lub alfabetycznie
- Liczba zainteresowanych wyświetlona na karcie
- Po kliknięciu na kartę użytkownik przenoszony jest do szczegółów oferty
- Oferty są paginowane (15 ofert na stronę) lub lazy-loaded
- Lista odświeża się bez przeładowania strony
- Nieaktywne oferty (usunięte) nie wyświetlają się
- Użytkownik nie widzi liczby zainteresowanych na swoich własnych ofertach w głównej liście

---

### US-004: Przeglądanie szczegółów oferty

Jako zalogowany użytkownik,
chcę zobaczyć pełne szczegóły oferty,
aby podjąć decyzję czy mnie interesuje.

Kryteria akceptacji:

- Strona szczegółów wyświetla: tytuł, pełny opis, zdjęcie (jeśli dostępne), miasto, imię i nazwisko oferenta
- Data dodania oferty jest widoczna
- Przycisk "Jestem zainteresowany" jest dostępny (jeśli nie jesteś oferentem)
- Po kliknięciu "Jestem zainteresowany" przycisk zmienia się na "Anuluj zainteresowanie"
- Jeśli już kliknąłem "Jestem zainteresowany" na tej ofercie - przycisk pokazuje "Anuluj zainteresowanie"
- Link do profilu oferenta (może pokazać jego imię i nazwisko jako link)
- Przycisk "Wróć do listy" lub breadcrumb nawigacji

---

### US-005: Kliknięcie "Jestem zainteresowany"

Jako przeglądający użytkownik,
chcę kliknąć "Jestem zainteresowany" na ofercie,
aby wyrazić zainteresowanie produktem oferenta.

Kryteria akceptacji:

- Przycisk "Jestem zainteresowany" jest klikowany
- Status zainteresowania zmienia się na PROPOSED w bazie danych
- Przycisk zmienia się na "Anuluj zainteresowanie"
- Oferent widzi w swoich ofertach że jest 1 zainteresowany
- Jeśli obie osoby wyrażą zainteresowanie swoimi ofertami (mutual match), chat staje się dostępny dla nich obydwu w sekcji "Czaty" na profilu użytkownika
- Status zainteresowania zmienia się na ACCEPTED
- Wyświetlany jest komunikat "Czat został otwarty!"
- W przypadku błędu (brak internetu, błąd serwera) wyświetlany jest komunikat błędu

---

### US-006: Anulowanie zainteresowania

Jako zainteresowany użytkownik,
chcę anulować moje zainteresowanie na ofercie,
aby wycofać się z potencjalnej wymiany.

Kryteria akceptacji:

- Przycisk zmienia się na "Anuluj zainteresowanie"
- Po kliknięciu zainteresowanie jest usuwane z bazy danych
- Przycisk wraca do "Jestem zainteresowany"
- Liczba zainteresowanych u oferenta zmniejsza się o 1
- Oferent nie widzi już tego zainteresowania

---

### US-007: Przeglądanie moich ofert

Jako oferent,
chcę zobaczyć listę moich wszystkich aktywnych ofert,
aby zarządzać nimi.

Kryteria akceptacji:

- Strona "Moje Oferty" wyświetla listę wszystkich moich aktywnych ofert
- Każda oferta zawiera: tytuł, opis (skrócony), liczbę zainteresowanych
- Dla każdej oferty dostępne są przyciski: Edycja, Usunięcie
- Po kliknięciu na ofertę widać jej szczegóły
- Liczba zainteresowanych kliknąć aby zobaczyć listę osób zainteresowanych
- Jeśli nie mam żadnych ofert, wyświetlany jest komunikat "Nie masz jeszcze żadnych ofert"
- Przycisk "Dodaj nową ofertę" jest dostępny na tej stronie

---

### US-008: Dodawanie nowej oferty

Jako zalogowany użytkownik,
chcę dodać nową ofertę (tytuł, opis, opcjonalne zdjęcie, miasto),
aby inni użytkownicy mogli widzieć co chciałbym wymienić.

Kryteria akceptacji:

- Formularz zawiera pola: Tytuł (5-100 znaków), Opis (10-5000 znaków), URL Zdjęcia (opcjonalne), Miasto (dropdown)
- Walidacja frontend dla każdego pola
- URL zdjęcia jest walidowany (JPG, PNG, WebP)
- Po kliknięciu "Dodaj ofertę" dane są wysyłane do backend
- Backend waliduje dane ponownie
- Oferta jest dodawana do bazy danych z statusem ACTIVE
- Użytkownik widzi komunikat "Oferta dodana pomyślnie!"
- Użytkownik jest przenoszony do strony szczegółów nowej oferty
- W przypadku błędu wyświetlany jest komunikat błędu

---

### US-009: Edycja własnej oferty

Jako oferent,
chcę edytować moją ofertę (tytuł, opis, zdjęcie, miasto),
aby zaktualizować informacje.

Kryteria akceptacji:

- Przycisk "Edycja" na ofercie lub stronie szczegółów
- Formularz edycji zawiera aktualne dane oferty
- Użytkownik może zmienić tytuł, opis, URL zdjęcia, miasto
- Walidacja identyczna jak przy dodawaniu
- Po kliknięciu "Zapisz" zmiany są wysyłane na backend
- Oferta jest aktualizowana w bazie danych
- Użytkownik widzi komunikat "Oferta zaktualizowana pomyślnie!"
- Zmiany są widoczne dla innych użytkowników natychmiast

---

### US-010: Usunięcie własnej oferty

Jako oferent,
chcę usunąć moją ofertę,
aby wycofać ją z obrotu.

Kryteria akceptacji:

- Przycisk "Usuń" na ofercie lub stronie szczegółów
- Pojawia się dialog potwierdzenia "Czy na pewno chcesz usunąć tę ofertę?"
- Po potwierdzeniu oferta jest usuwana z bazy danych
- Wszystkie zainteresowania na tej ofercie są usuwane
- Wszystkie powiązane czaty są zamykane
- Oferta znika z listy dla wszystkich użytkowników
- Użytkownik widzi komunikat "Oferta usunięta pomyślnie!"

---

### US-011: Przeglądanie ofert innego użytkownika

Jako zalogowany użytkownik,
chcę zobaczyć wystawione oferty innego użytkownika,
aby poznać dostępne produkty, które oferuje.

Kryteria akceptacji:

- Po kliknięciu na profil innego użytkownika wyświetla się lista wszystkich jego aktywnych ofert
- Żadne inne dane (imię, nazwisko, data rejestracji) nie są widoczne
- Liczba aktywnych ofert jest wyświetlana
- Mogę kliknąć na ofertę, aby zobaczyć jej szczegóły
- Widok dostępny z listy ofert, czatu lub bezpośredniego linku

---

### US-012: Przeglądanie mojego profilu

Jako zalogowany użytkownik,
chcę zobaczyć mój profil,
aby sprawdzić swoje dane i oferty.

Kryteria akceptacji:

- Strona "Profil" wyświetla moje imię i nazwisko
- Wyświetlana jest data rejestracji
- Liczba moich aktywnych ofert
- Przycisk "Usuń konto" dostępny z tej strony
- Moje dane są ukryte przed innymi użytkownikami (jeśli mają inne hasło)

---

### US-013: Przeglądanie listy zainteresowanych na mojej ofercie

Jako oferent,
chcę zobaczyć listę osób zainteresowanych moją ofertą,
aby móc wybrać osobę do wymiany.

Kryteria akceptacji:

- Na stronie "Moje Oferty" przycisk "Liczba zainteresowanych" jest klikablewny
- Po kliknięciu wyświetlana jest lista osób zainteresowanych
- Każda osoba zawiera: imię, nazwisko, datę zainteresowania
- Dla każdej osoby jest link do jej profilu
- Poprzez profil mogę zobaczyć jej oferty

---

### US-014: Oferent klika "Jestem zainteresowany" na ofercie zainteresowanego użytkownika

Jako oferent zainteresowany produktem innego użytkownika,
chcę kliknąć "Jestem zainteresowany" na jego ofercie,
aby wyrazić wzajemne zainteresowanie.

Kryteria akceptacji:

- Oferent może przeglądać profile zainteresowanych użytkowników
- Oferent widzi ich oferty
- Oferent może kliknąć "Jestem zainteresowany" na ich ofercie
- System automatycznie wykrywa wzajemne zainteresowanie
- Status obydwu zainteresowań zmienia się na ACCEPTED
- Chat automatycznie się otwiera dla obydwu użytkowników
- Obydwaj widzą nowy czat w liście czatów
- Wysyłany jest komunikat "Wzajemne zainteresowanie! Chat został otwarty"

---

### US-015: Otwieranie czatu

Jako uczestnik wymiany z wzajemnym zainteresowaniem,
chcę zobaczyć czat,
aby komunikować się z drugą osobą.

Kryteria akceptacji:

- Czat otwiera się TYLKO gdy istnieje wzajemne zainteresowanie (status ACCEPTED)
- Strona "Chat" wyświetla listę aktywnych czatów
- Każdy czat zawiera: imię i nazwisko drugiej osoby, ostatnia wiadomość, data
- Po kliknięciu na czat widać historię wiadomości
- Wiadomości są posortowane chronologicznie (od najstarszych do najnowszych)
- Informacja o mnie i drugiej osobie (która oferta nas łączy)

---

### US-016: Wysyłanie wiadomości w czacie

Jako uczestnik czatu,
chcę wysłać wiadomość do drugiej osoby,
aby komunikować się na temat wymiany.

Kryteria akceptacji:

- Pole tekstowe na dole czatu do wpisania wiadomości
- Przycisk "Wyślij" obok pola tekstowego
- Wiadomość musi mieć 1-2000 znaków
- Po wysłaniu wiadomość pojawia się w historii (po stronie wysyłającego)
- Wiadomość pojawia się w historii dla drugiej osoby bez odświeżania (lub po odświeżeniu)
- Imię wysyłającego jest widoczne przy wiadomości
- Data i godzina wiadomości są widoczne
- Nie mogę wysłać pustej wiadomości

---

### US-017: Przeglądanie historii czatu

Jako uczestnik czatu,
chcę zobaczyć całą historię wiadomości,
aby przypomnieć sobie poprzednią komunikację.

Kryteria akceptacji:

- Historia czatu zawiera wszystkie wiadomości od początku
- Wiadomości są posortowane chronologicznie
- Każda wiadomość zawiera: imię wysyłającego, treść, datę i godzinę
- Historia jest widoczna dla obydwu uczestników
- Historia pozostaje widoczna nawet po zamknięciu czatu (archiwum)

---

### US-018: Oznaczenie wymiany jako "Zrealizowana"

Jako uczestnik czatu po wymianie,
chcę kliknąć "Zrealizowana" aby potwierdzić że wymiana się odbyła,
aby zamknąć wymianę i czat.

Kryteria akceptacji:

- Przycisk "Zrealizowana" dostępny w czacie
- Po kliknięciu moje zainteresowanie zmienia status na "REALIZOWANI" (pending)
- Druga osoba widzi komunikat "Druga osoba potwierdza że wymiana się odbyła"
- Druga osoba może kliknąć "Zrealizowana" aby potwierdzić
- Gdy obydwaj klikną "Zrealizowana" status zmienia się na REALIZED dla obydwu
- Chat się zamyka (nie pojawia się w liście aktywnych czatów)
- Obydwaj widzą komunikat "Wymiana została zrealizowana!"
- Jeśli tylko jedna osoba kliknie, chat pozostaje otwarty

---

### US-019: Anulowanie potwierdzenia "Zrealizowana"

Jako użytkownik,
chcę anulować moje potwierdzenie "Zrealizowana" jeśli się pomyliłem,
aby powrócić do aktywnego czatu.

Kryteria akceptacji:

- Jeśli kliknąłem "Zrealizowana" ale druga osoba jeszcze nie - mogę anulować
- Po kliknięciu "Anuluj" mój status wraca do ACCEPTED
- Chat pozostaje otwarty
- Druga osoba widzi że anulowałem potwierdzenie

---

### US-020: Usunięcie konta

Jako zalogowany użytkownik,
chcę usunąć moje konto,
aby całkowicie wycofać się z aplikacji.

Kryteria akceptacji:

- Przycisk "Usuń konto" dostępny na stronie profilu
- Pojawia się dialog potwierdzenia z ostrzeżeniem "Ta akcja jest nieodwracalna"
- Muszę wpisać moje hasło aby potwierdzić
- Po potwierdzeniu konto jest usuwane z Supabase Auth
- Wszystkie moje dane (profil, oferty) są usuwane z bazy danych
- Wszystkie moje zainteresowania są usuwane
- Wszystkie moje czaty są usuwane
- Historia wiadomości jest usuwana (GDPR compliance)
- Jestem wylogowywany
- Wyświetlany jest komunikat "Konto zostało usunięte"

---

### US-021: Wylogowanie

Jako zalogowany użytkownik,
chcę się wylogować,
aby opuścić aplikację.

Kryteria akceptacji:

- Przycisk "Wyloguj" dostępny z każdej strony (górny pasek nawigacji)
- Po kliknięciu JWT token jest usuwany z sesji
- Użytkownik jest przenoszony na stronę logowania
- Nie mogę wróć do stron aplikacji bez ponownego logowania

---

### US-022: Nawigacja między stronami

Jako zalogowany użytkownik,
chcę łatwo poruszać się między różnymi stronami aplikacji,
aby efektywnie korzystać z jej funkcji.

Kryteria akceptacji:

- Górny pasek nawigacji zawiera: Home | Moje Oferty | Profil | Chat | Wyloguj
- Każdy link w nawigacji prowadzi do właściwej strony
- Aktywna strona jest wyróżniona w nawigacji
- Logo/nazwa aplikacji w lewym rogu prowadzi do Home
- Nawigacja jest dostępna z każdej strony
- Na urządzeniach mobilnych (przyszłość) menu może być zwinięte

---

### US-023: Bezpieczny dostęp do danych innego użytkownika

Jako system bezpieczeństwa,
chcę zapewnić że każdy użytkownik może dostęp tylko do swoich danych,
aby chronić prywatność użytkowników.

Kryteria akceptacji:

- RLS (Row Level Security) policies są skonfigurowane w bazie danych
- Użytkownik nie może edytować/usuwać ofert innego użytkownika
- Użytkownik nie może czytać prywatnych danych innego użytkownika
- Użytkownik nie może wysyłać wiadomości w czacie jeśli nie jest uczestnikiem
- JWT token weryfikowany dla każdego żądania
- Nieautoryzowane żądania zwracają błąd 403 Forbidden

---

### US-024: Paginacja listy ofert

Jako użytkownik przeglądający wiele ofert,
chcę aby lista była paginowana,
aby aplikacja ładowała się szybko.

Kryteria akceptacji:

- Strona główna wyświetla 15 ofert na stronę
- Przyciski Previous/Next do nawigacji między stronami
- Informacja "Strona X z Y" jest wyświetlana
- URL zmienia się z parametrem page=X

---

### US-025: Obsługa błędów sieciowych

Jako użytkownik z niestabilnym internetem,
chcę aby aplikacja gracefully obsługiwała błędy sieciowe,
aby wiedzieć co się stało.

Kryteria akceptacji:

- Gdy request się nie powiedzie wyświetlany jest komunikat błędu
- Przycisk "Ponów" pozwala spróbować jeszcze raz
- Aplikacja nie zwisa ani nie czaruje informacji
- Timeout żądań to 10 sekund

---

## 6. Metryki sukcesu

### Metryki funkcjonalności

- Wszystkie 25 historii użytkownika zaimplementowane i testowalne: 100%
- API endpoints działające dla CRUD operacji: 20/20
- RLS policies skonfigurowane i działające: 5/5 tabel
- Autentykacja i weryfikacja emaila funkcjonalne: 100%

### Metryki techniczne

- Time to First Paint (TTL): < 2 sekundy
- Load time strony głównej: < 3 sekundy
- Brak critical linter errors w Production build
- Code coverage: min 80% dla core funkcji

### Metryki UX

- Każde akcja użytkownika potwierdzana komunikatem (success/error): 100%
- Validacja na frontend przed wysłaniem (UX): 100%
- Validacja na backend (bezpieczeństwo): 100%
- Nawigacja intuitywna i znalezienie wszystkich głównych funkcji < 2 minuty dla nowego użytkownika

### Metryki bezpieczeństwa

- Wszystkie hasła haszowane przez Supabase: 100%
- JWT tokens są przechowywane bezpiecznie: Secure cookies
- Brak hardcoded sensitywnych danych w kodzie frontend
- GDPR compliance: hard delete konta i danych: Funkcjonalne

### Metryki wydajności

- Rejestracja i logowanie: < 2 sekundy
- Dodanie oferty: < 1 sekunda
- Wysłanie wiadomości: < 500ms
- Ładowanie listy ofert: < 2 sekundy

### Metryki biznesowe

- Liczba scen testowych: 30+
- Dokumentacja: Kompletna i czytelna
- Timeline: 4 tygodni (5-10 godzin/tydzień)
- Deployment: Live i dostępny publiczne

---

## Dodatek: Mapowanie stron i funkcji

### Strona 1: Rejestracja

- Formularz rejestracji (US-001)
- Weryfikacja emaila

### Strona 2: Logowanie

- Formularz logowania (US-002)

### Strona 3: Home

- Lista wszystkich ofert (US-003)
- Paginacja (US-024)
- Kliknięcie "Jestem zainteresowany" (US-005)

### Strona 4: Szczegóły oferty

- Wyświetlenie szczegółów (US-004)
- Przycisk "Jestem zainteresowany" (US-005)
- Link do profilu oferenta

### Strona 5: Moje Oferty

- Lista moich ofert (US-007)
- Edycja oferty (US-009)
- Usunięcie oferty (US-010)
- Lista zainteresowanych (US-013)
- Przycisk "Dodaj ofertę" (US-008)

### Strona 6: Profil

- Mój profil (US-012)
- Przycisk "Usuń konto" (US-020)

### Strona 7: Chat

- Lista czatów (US-015)
- Historia wiadomości (US-017)
- Wysyłanie wiadomości (US-016)
- Przycisk "Zrealizowana" (US-018)

### Strona 8: Dodawanie oferty

- Formularz dodawania oferty (US-008)
- Walidacja pól

### Komponenty

- Górny pasek nawigacji (US-022, US-021)
- Karta oferty
- Dialog potwierdzenia
- Komunikaty błędów (US-025)
