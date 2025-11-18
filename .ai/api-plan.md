# Plan API REST - KAKAPO

## 1. Zasoby

### Główne zasoby API

1. **users** - Profile użytkowników (tabela `users`)
2. **offers** - Oferty wymiany (tabela `offers`)
3. **interests** - Zainteresowania ofertami (tabela `interests`)
4. **chats** - Rozmowy między użytkownikami (tabela `chats`)
5. **messages** - Wiadomości w czatach (tabela `messages`)
6. **exchange-history** - Historia zrealizowanych wymian (tabela `exchange_history`)

---

## 2. Punkty końcowe API

### 2.1 Auth (Supabase Auth)

#### Rejestracja użytkownika

- **Metoda**: `POST`
- **Ścieżka**: `/auth/signup`
- **Opis**: Rejestracja nowego użytkownika z weryfikacją email
- **Request Body**:

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "first_name": "Jan",
  "last_name": "Kowalski"
}
```

- **Response (201 Created)**:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "email_confirmed_at": null
  },
  "message": "Sprawdź swoją skrzynkę email w celu weryfikacji"
}
```

- **Błędy**:
  - `400 Bad Request`: "Email już istnieje" lub "Nieprawidłowy format danych"
  - `422 Unprocessable Entity`: "Hasło za krótkie"

#### Logowanie

- **Metoda**: `POST`
- **Ścieżka**: `/auth/login`
- **Opis**: Logowanie użytkownika
- **Request Body**:

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

- **Response (200 OK)**:

```json
{
  "access_token": "jwt_token",
  "refresh_token": "refresh_token",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

- **Błędy**:
  - `401 Unauthorized`: "Email lub hasło niepoprawne"
  - `403 Forbidden`: "Email nie został zweryfikowany"

#### Wylogowanie

- **Metoda**: `POST`
- **Ścieżka**: `/auth/logout`
- **Opis**: Wylogowanie użytkownika
- **Headers**: `Authorization: Bearer {token}`
- **Response (200 OK)**:

```json
{
  "message": "Wylogowano pomyślnie"
}
```

---

### 2.2 Users

#### Pobranie profilu zalogowanego użytkownika

- **Metoda**: `GET`
- **Ścieżka**: `/api/users/me`
- **Opis**: Zwraca profil zalogowanego użytkownika
- **Headers**: `Authorization: Bearer {token}`
- **Response (200 OK)**:

```json
{
  "id": "uuid",
  "first_name": "Jan",
  "last_name": "Kowalski",
  "created_at": "2024-01-01T10:00:00Z"
}
```

- **Błędy**:
  - `401 Unauthorized`: "Brak autoryzacji"

#### Aktualizacja profilu

- **Metoda**: `PATCH`
- **Ścieżka**: `/api/users/me`
- **Opis**: Aktualizacja imienia i nazwiska zalogowanego użytkownika
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:

```json
{
  "first_name": "Jan",
  "last_name": "Nowak"
}
```

- **Response (200 OK)**:

```json
{
  "id": "uuid",
  "first_name": "Jan",
  "last_name": "Nowak",
  "created_at": "2024-01-01T10:00:00Z"
}
```

- **Błędy**:
  - `401 Unauthorized`: "Brak autoryzacji"
  - `400 Bad Request`: "Imię i nazwisko są wymagane"

#### Usunięcie konta

- **Metoda**: `DELETE`
- **Ścieżka**: `/api/users/me`
- **Opis**: Usunięcie konta zalogowanego użytkownika (hard delete)
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:

```json
{
  "password": "securePassword123"
}
```

- **Response (200 OK)**:

```json
{
  "message": "Konto zostało usunięte"
}
```

- **Błędy**:
  - `401 Unauthorized`: "Nieprawidłowe hasło"
  - `500 Internal Server Error`: "Błąd podczas usuwania konta"

#### Pobranie profilu innego użytkownika

- **Metoda**: `GET`
- **Ścieżka**: `/api/users/{user_id}`
- **Opis**: Zwraca podstawowe informacje o użytkowniku (imię, nazwisko, liczba aktywnych ofert)
- **Headers**: `Authorization: Bearer {token}`
- **Response (200 OK)**:

```json
{
  "id": "uuid",
  "first_name": "Anna",
  "last_name": "Nowak",
  "active_offers_count": 3
}
```

- **Błędy**:
  - `404 Not Found`: "Użytkownik nie istnieje"

---

### 2.3 Offers

#### Lista wszystkich aktywnych ofert

- **Metoda**: `GET`
- **Ścieżka**: `/api/offers`
- **Opis**: Zwraca listę wszystkich aktywnych ofert
- **Headers**: `Authorization: Bearer {token}`
- **Query Parameters**:
  - `page` (number, default: 1): Numer strony
  - `limit` (number, default: 15, max: 50): Liczba ofert na stronę
  - `city` (string, optional): Filtrowanie po mieście
  - `sort` (string, default: "created_at", values: "created_at", "title"): Sortowanie
  - `order` (string, default: "desc", values: "asc", "desc"): Kierunek sortowania
- **Response (200 OK)**:

```json
{
  "data": [
    {
      "id": "uuid",
      "owner_id": "uuid",
      "owner_name": "Jan Kowalski",
      "title": "Laptop Dell",
      "description": "Sprawny laptop...",
      "image_url": "https://...",
      "city": "Warszawa",
      "interests_count": 5,
      "created_at": "2024-01-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 15,
    "total": 100,
    "total_pages": 7
  }
}
```

- **Błędy**:
  - `400 Bad Request`: "Nieprawidłowe parametry zapytania"

#### Szczegóły oferty

- **Metoda**: `GET`
- **Ścieżka**: `/api/offers/{offer_id}`
- **Opis**: Zwraca szczegóły pojedynczej oferty
- **Headers**: `Authorization: Bearer {token}`
- **Response (200 OK)**:

```json
{
  "id": "uuid",
  "owner_id": "uuid",
  "owner_name": "Jan Kowalski",
  "title": "Laptop Dell",
  "description": "Sprawny laptop w bardzo dobrym stanie...",
  "image_url": "https://...",
  "city": "Warszawa",
  "status": "ACTIVE",
  "interests_count": 5,
  "is_interested": false,
  "created_at": "2024-01-01T10:00:00Z"
}
```

- **Błędy**:
  - `404 Not Found`: "Oferta nie istnieje"

#### Lista moich ofert

- **Metoda**: `GET`
- **Ścieżka**: `/api/offers/my`
- **Opis**: Zwraca listę ofert zalogowanego użytkownika
- **Headers**: `Authorization: Bearer {token}`
- **Query Parameters**:
  - `status` (string, default: "ACTIVE", values: "ACTIVE", "REMOVED"): Filtrowanie po statusie
- **Response (200 OK)**:

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Laptop Dell",
      "description": "Sprawny laptop...",
      "image_url": "https://...",
      "city": "Warszawa",
      "status": "ACTIVE",
      "interests_count": 5,
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

#### Lista ofert innego użytkownika

- **Metoda**: `GET`
- **Ścieżka**: `/api/users/{user_id}/offers`
- **Opis**: Zwraca listę aktywnych ofert innego użytkownika
- **Headers**: `Authorization: Bearer {token}`
- **Response (200 OK)**:

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Rower górski",
      "description": "Rower w dobrym stanie...",
      "image_url": "https://...",
      "city": "Kraków",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

#### Tworzenie oferty

- **Metoda**: `POST`
- **Ścieżka**: `/api/offers`
- **Opis**: Tworzy nową ofertę
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:

```json
{
  "title": "Laptop Dell",
  "description": "Sprawny laptop w bardzo dobrym stanie, wymienię na rower",
  "image_url": "https://...",
  "city": "Warszawa"
}
```

- **Walidacja**:
  - `title`: 5-100 znaków, wymagane
  - `description`: 10-5000 znaków, wymagane
  - `image_url`: prawidłowy URL, opcjonalne
  - `city`: jedna z 16 dostępnych miast, wymagane
- **Response (201 Created)**:

```json
{
  "id": "uuid",
  "owner_id": "uuid",
  "title": "Laptop Dell",
  "description": "Sprawny laptop...",
  "image_url": "https://...",
  "city": "Warszawa",
  "status": "ACTIVE",
  "created_at": "2024-01-01T10:00:00Z",
  "message": "Oferta dodana pomyślnie!"
}
```

- **Błędy**:
  - `400 Bad Request`: "Nieprawidłowe dane wejściowe"
  - `422 Unprocessable Entity`: "Tytuł musi mieć 5-100 znaków"

#### Aktualizacja oferty

- **Metoda**: `PATCH`
- **Ścieżka**: `/api/offers/{offer_id}`
- **Opis**: Aktualizuje ofertę (tylko właściciel)
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:

```json
{
  "title": "Laptop Dell (zaktualizowane)",
  "description": "Nowy opis...",
  "image_url": "https://...",
  "city": "Kraków"
}
```

- **Response (200 OK)**:

```json
{
  "id": "uuid",
  "title": "Laptop Dell (zaktualizowane)",
  "description": "Nowy opis...",
  "image_url": "https://...",
  "city": "Kraków",
  "status": "ACTIVE",
  "updated_at": "2024-01-02T10:00:00Z",
  "message": "Oferta zaktualizowana pomyślnie!"
}
```

- **Błędy**:
  - `403 Forbidden`: "Brak uprawnień do edycji tej oferty"
  - `404 Not Found`: "Oferta nie istnieje"

#### Usunięcie oferty

- **Metoda**: `DELETE`
- **Ścieżka**: `/api/offers/{offer_id}`
- **Opis**: Usuwa ofertę (tylko właściciel)
- **Headers**: `Authorization: Bearer {token}`
- **Response (200 OK)**:

```json
{
  "message": "Oferta usunięta pomyślnie!"
}
```

- **Błędy**:
  - `403 Forbidden`: "Brak uprawnień do usunięcia tej oferty"
  - `404 Not Found`: "Oferta nie istnieje"

---

### 2.4 Interests

#### Lista zainteresowanych dla oferty

- **Metoda**: `GET`
- **Ścieżka**: `/api/offers/{offer_id}/interests`
- **Opis**: Zwraca listę użytkowników zainteresowanych ofertą (tylko dla właściciela oferty)
- **Headers**: `Authorization: Bearer {token}`
- **Response (200 OK)**:

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "user_name": "Anna Nowak",
      "status": "PROPOSED",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

- **Błędy**:
  - `403 Forbidden`: "Brak uprawnień do przeglądania zainteresowań"
  - `404 Not Found`: "Oferta nie istnieje"

#### Moje zainteresowania

- **Metoda**: `GET`
- **Ścieżka**: `/api/interests/my`
- **Opis**: Zwraca listę ofert, którymi jestem zainteresowany
- **Headers**: `Authorization: Bearer {token}`
- **Query Parameters**:
  - `status` (string, optional, values: "PROPOSED", "ACCEPTED", "REALIZED"): Filtrowanie po statusie
- **Response (200 OK)**:

```json
{
  "data": [
    {
      "id": "uuid",
      "offer_id": "uuid",
      "offer_title": "Rower górski",
      "offer_owner": "Jan Kowalski",
      "status": "ACCEPTED",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

#### Wyrażenie zainteresowania

- **Metoda**: `POST`
- **Ścieżka**: `/api/interests`
- **Opis**: Wyraża zainteresowanie ofertą
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:

```json
{
  "offer_id": "uuid"
}
```

- **Response (201 Created)**:

```json
{
  "id": "uuid",
  "offer_id": "uuid",
  "user_id": "uuid",
  "status": "PROPOSED",
  "created_at": "2024-01-01T10:00:00Z",
  "message": "Zainteresowanie zostało wyrażone"
}
```

- **Jeśli mutual match**:

```json
{
  "id": "uuid",
  "offer_id": "uuid",
  "user_id": "uuid",
  "status": "ACCEPTED",
  "created_at": "2024-01-01T10:00:00Z",
  "message": "Wzajemne zainteresowanie! Chat został otwarty",
  "chat_id": "uuid"
}
```

- **Błędy**:
  - `400 Bad Request`: "Nie możesz być zainteresowany własną ofertą"
  - `409 Conflict`: "Już wyraziłeś zainteresowanie tą ofertą"

#### Anulowanie zainteresowania

- **Metoda**: `DELETE`
- **Ścieżka**: `/api/interests/{interest_id}`
- **Opis**: Anuluje zainteresowanie ofertą
- **Headers**: `Authorization: Bearer {token}`
- **Response (200 OK)**:

```json
{
  "message": "Zainteresowanie zostało anulowane"
}
```

- **Błędy**:
  - `403 Forbidden`: "Brak uprawnień"
  - `404 Not Found`: "Zainteresowanie nie istnieje"

#### Potwierdzenie realizacji wymiany

- **Metoda**: `PATCH`
- **Ścieżka**: `/api/interests/{interest_id}/realize`
- **Opis**: Potwierdza realizację wymiany
- **Headers**: `Authorization: Bearer {token}`
- **Response (200 OK)**:

```json
{
  "id": "uuid",
  "status": "REALIZED",
  "realized_at": "2024-01-05T10:00:00Z",
  "message": "Wymiana potwierdzona"
}
```

- **Jeśli obie strony potwierdziły**:

```json
{
  "id": "uuid",
  "status": "REALIZED",
  "realized_at": "2024-01-05T10:00:00Z",
  "message": "Wymiana została zrealizowana!",
  "exchange_history_id": "uuid"
}
```

- **Błędy**:
  - `403 Forbidden`: "Brak uprawnień"
  - `400 Bad Request`: "Status musi być ACCEPTED aby potwierdzić realizację"

#### Anulowanie potwierdzenia realizacji

- **Metoda**: `PATCH`
- **Ścieżka**: `/api/interests/{interest_id}/unrealize`
- **Opis**: Anuluje potwierdzenie realizacji (jeśli druga strona jeszcze nie potwierdziła)
- **Headers**: `Authorization: Bearer {token}`
- **Response (200 OK)**:

```json
{
  "id": "uuid",
  "status": "ACCEPTED",
  "realized_at": null,
  "message": "Potwierdzenie anulowane"
}
```

- **Błędy**:
  - `403 Forbidden`: "Brak uprawnień"
  - `400 Bad Request`: "Nie można anulować - wymiana już została zrealizowana"

---

### 2.5 Chats

#### Lista moich czatów

- **Metoda**: `GET`
- **Ścieżka**: `/api/chats`
- **Opis**: Zwraca listę aktywnych czatów zalogowanego użytkownika
- **Headers**: `Authorization: Bearer {token}`
- **Query Parameters**:
  - `status` (string, default: "ACTIVE", values: "ACTIVE", "ARCHIVED"): Filtrowanie po statusie
- **Response (200 OK)**:

```json
{
  "data": [
    {
      "id": "uuid",
      "other_user": {
        "id": "uuid",
        "name": "Anna Nowak"
      },
      "last_message": {
        "body": "Kiedy możemy się spotkać?",
        "sender_id": "uuid",
        "created_at": "2024-01-01T12:00:00Z"
      },
      "unread_count": 2,
      "status": "ACTIVE",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

#### Szczegóły czatu

- **Metoda**: `GET`
- **Ścieżka**: `/api/chats/{chat_id}`
- **Opis**: Zwraca szczegóły czatu (tylko uczestnik)
- **Headers**: `Authorization: Bearer {token}`
- **Response (200 OK)**:

```json
{
  "id": "uuid",
  "user_a": {
    "id": "uuid",
    "name": "Jan Kowalski"
  },
  "user_b": {
    "id": "uuid",
    "name": "Anna Nowak"
  },
  "status": "ACTIVE",
  "created_at": "2024-01-01T10:00:00Z"
}
```

- **Błędy**:
  - `403 Forbidden`: "Brak uprawnień do tego czatu"
  - `404 Not Found`: "Czat nie istnieje"

---

### 2.6 Messages

#### Lista wiadomości w czacie

- **Metoda**: `GET`
- **Ścieżka**: `/api/chats/{chat_id}/messages`
- **Opis**: Zwraca wiadomości z czatu (tylko uczestnik)
- **Headers**: `Authorization: Bearer {token}`
- **Query Parameters**:
  - `page` (number, default: 1): Numer strony
  - `limit` (number, default: 50, max: 100): Liczba wiadomości na stronę
  - `order` (string, default: "asc", values: "asc", "desc"): Kierunek sortowania (chronologicznie)
- **Response (200 OK)**:

```json
{
  "data": [
    {
      "id": "uuid",
      "chat_id": "uuid",
      "sender_id": "uuid",
      "sender_name": "Jan Kowalski",
      "body": "Cześć, interesuje mnie twoja oferta",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 120,
    "total_pages": 3
  }
}
```

- **Błędy**:
  - `403 Forbidden`: "Brak uprawnień do tego czatu"
  - `404 Not Found`: "Czat nie istnieje"

#### Wysyłanie wiadomości

- **Metoda**: `POST`
- **Ścieżka**: `/api/chats/{chat_id}/messages`
- **Opis**: Wysyła wiadomość w czacie (tylko uczestnik)
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:

```json
{
  "body": "Kiedy możemy się spotkać?"
}
```

- **Walidacja**:
  - `body`: 1-2000 znaków, wymagane
- **Response (201 Created)**:

```json
{
  "id": "uuid",
  "chat_id": "uuid",
  "sender_id": "uuid",
  "sender_name": "Jan Kowalski",
  "body": "Kiedy możemy się spotkać?",
  "created_at": "2024-01-01T12:00:00Z"
}
```

- **Błędy**:
  - `403 Forbidden`: "Brak uprawnień do tego czatu"
  - `400 Bad Request`: "Wiadomość nie może być pusta"
  - `422 Unprocessable Entity`: "Wiadomość może mieć maksymalnie 2000 znaków"

---

### 2.7 Exchange History

#### Moja historia wymian

- **Metoda**: `GET`
- **Ścieżka**: `/api/exchange-history`
- **Opis**: Zwraca historię zrealizowanych wymian zalogowanego użytkownika
- **Headers**: `Authorization: Bearer {token}`
- **Query Parameters**:
  - `page` (number, default: 1): Numer strony
  - `limit` (number, default: 20, max: 50): Liczba rekordów na stronę
- **Response (200 OK)**:

```json
{
  "data": [
    {
      "id": "uuid",
      "other_user": {
        "id": "uuid",
        "name": "Anna Nowak"
      },
      "my_offer": {
        "id": "uuid",
        "title": "Laptop Dell"
      },
      "their_offer": {
        "id": "uuid",
        "title": "Rower górski"
      },
      "realized_at": "2024-01-05T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "total_pages": 1
  }
}
```

---

## 3. Uwierzytelnianie i autoryzacja

### Mechanizm uwierzytelniania

**Supabase Auth + JWT Tokens**

1. **Rejestracja i logowanie**:
   - Wszystkie operacje auth obsługiwane przez Supabase Auth API
   - Po pomyślnym logowaniu zwracany jest JWT access token i refresh token
   - Access token ma krótki czas życia (1 godzina), refresh token dłuższy (30 dni)

2. **Autoryzacja requestów**:
   - Każdy request do API (poza `/auth/*`) wymaga headera: `Authorization: Bearer {access_token}`
   - Token jest walidowany przez Supabase middleware
   - `auth.uid()` ekstrahowane z tokenu używane w RLS policies

3. **Row Level Security (RLS)**:
   - Wszystkie tabele mają włączone RLS
   - Policies automatycznie filtrują dane na podstawie `auth.uid()`
   - Użytkownik nie potrzebuje dodatkowych uprawnień - RLS zapewnia dostęp tylko do własnych danych

4. **Refresh token flow**:
   - Gdy access token wygaśnie, frontend wysyła refresh token do `/auth/refresh`
   - Supabase zwraca nowy access token
   - Frontend przechowuje tokeny w secure cookie lub localStorage (zalecane: httpOnly cookie)

5. **Wylogowanie**:
   - Invalidacja tokenów po stronie Supabase
   - Czyszczenie localStorage/cookies po stronie klienta

### Poziomy autoryzacji

1. **Publiczne** (brak autoryzacji):
   - `/auth/signup`
   - `/auth/login`

2. **Zalogowany użytkownik** (wymaga JWT):
   - Wszystkie endpointy `/api/*`

3. **Właściciel zasobu** (RLS):
   - Edycja/usunięcie oferty: tylko owner_id
   - Edycja/usunięcie zainteresowania: tylko user_id
   - Wysyłanie wiadomości: tylko uczestnik czatu

---

## 4. Walidacja i logika biznesowa

### 4.1 Warunki walidacji

#### Users

- `first_name`: wymagane, 1-100 znaków
- `last_name`: wymagane, 1-100 znaków
- `email`: wymagane, prawidłowy format email, unikalny
- `password`: wymagane, min. 6 znaków (walidacja Supabase)

#### Offers

- `title`: wymagane, 5-100 znaków
- `description`: wymagane, 10-5000 znaków
- `image_url`: opcjonalne, prawidłowy URL (JPG, PNG, WebP)
- `city`: wymagane, jedna z 16 dostępnych miast:
  - Warszawa, Kraków, Wrocław, Poznań, Gdańsk, Szczecin, Łódź, Lublin, Białystok, Olsztyn, Rzeszów, Opole, Zielona Góra, Gorzów Wielkopolski, Kielce, Katowice

#### Messages

- `body`: wymagane, 1-2000 znaków

### 4.2 Logika biznesowa

#### 1. Blokada self-interest (US-005)

- **Reguła**: Użytkownik nie może być zainteresowany własną ofertą
- **Implementacja**: Trigger `prevent_self_interest` w bazie danych
- **Endpoint**: `POST /api/interests`
- **Błąd**: `400 Bad Request` - "Nie możesz być zainteresowany własną ofertą"

#### 2. Wykrywanie mutual match (US-014)

- **Reguła**: Gdy dwa użytkownicy są wzajemnie zainteresowani swoimi ofertami, status zmienia się na ACCEPTED i tworzy się czat
- **Implementacja**: Trigger `create_chat_on_mutual_match` w bazie danych
- **Endpoint**: `POST /api/interests`
- **Rezultat**: Status ACCEPTED, tworzenie rekordu w tabeli `chats`, response z `chat_id`

#### 3. Tworzenie czatu (US-015)

- **Reguła**: Czat tworzy się automatycznie przy mutual match
- **Implementacja**: Trigger w bazie danych
- **Ograniczenie**: Jeden czat na parę użytkowników (UNIQUE constraint na user_a, user_b)
- **Reużywanie**: Czat pozostaje ACTIVE nawet po zrealizowaniu wymiany

#### 4. Potwierdzanie realizacji wymiany (US-018, US-019)

- **Reguła**: Wymiana jest zrealizowana gdy obie strony potwierdzą (status REALIZED)
- **Implementacja**:
  - `PATCH /api/interests/{id}/realize` - ustawia status na REALIZED dla jednego użytkownika
  - Trigger `create_exchange_history_on_realized` tworzy wpis w `exchange_history` gdy oba zainteresowania mają status REALIZED
- **Anulowanie**: `PATCH /api/interests/{id}/unrealize` - zmienia status z REALIZED na ACCEPTED (tylko jeśli druga strona jeszcze nie potwierdziła)

#### 5. Historia wymian

- **Reguła**: Automatyczne tworzenie wpisu w `exchange_history` gdy wymiana zostanie zrealizowana
- **Implementacja**: Trigger w bazie danych
- **Przechowywanie**: Kopie tytułów ofert (zachowuje historię nawet gdy oferty zostaną usunięte)
- **Endpoint**: `GET /api/exchange-history`

#### 6. Paginacja (US-024)

- **Reguła**: Lista ofert paginowana (15 ofert na stronę)
- **Implementacja**: Query parameters `page` i `limit`
- **Endpoints**: `GET /api/offers`, `GET /api/chats/{id}/messages`, `GET /api/exchange-history`

#### 7. RLS - bezpieczeństwo danych (US-023)

- **Reguła**: Użytkownik może modyfikować tylko własne dane
- **Implementacja**: Row Level Security policies w Supabase:
  - `users`: SELECT/UPDATE tylko dla auth.uid() = id
  - `offers`: SELECT wszystkie aktywne, INSERT/UPDATE/DELETE tylko dla owner_id = auth.uid()
  - `interests`: SELECT dla user_id lub owner_id oferty, INSERT/UPDATE/DELETE dla user_id = auth.uid()
  - `chats`: SELECT/UPDATE tylko dla uczestników (user_a lub user_b = auth.uid())
  - `messages`: SELECT/INSERT tylko dla uczestników czatu
  - `exchange_history`: SELECT tylko dla user_a lub user_b = auth.uid()

#### 8. Usunięcie konta (US-020)

- **Reguła**: Hard delete z GDPR compliance
- **Implementacja**:
  - Kaskadowe usuwanie: DELETE FROM users WHERE id = auth.uid()
  - Automatyczne usunięcie: offers, interests, messages (CASCADE)
  - Archiwum: exchange_history zachowane z NULL w user_id (ON DELETE SET NULL)
- **Weryfikacja**: Wymagane potwierdzenie hasłem
- **Endpoint**: `DELETE /api/users/me`

---

## 5. Kody odpowiedzi HTTP

### Sukces

- `200 OK` - Żądanie zakończone sukcesem (GET, PATCH, DELETE)
- `201 Created` - Zasób utworzony (POST)
- `204 No Content` - Żądanie zakończone sukcesem, brak treści do zwrócenia

### Błędy klienta

- `400 Bad Request` - Nieprawidłowe dane wejściowe
- `401 Unauthorized` - Brak autoryzacji lub nieprawidłowy token
- `403 Forbidden` - Brak uprawnień do zasobu
- `404 Not Found` - Zasób nie istnieje
- `409 Conflict` - Konflikt (np. duplikat zainteresowania)
- `422 Unprocessable Entity` - Błąd walidacji

### Błędy serwera

- `500 Internal Server Error` - Błąd serwera
- `503 Service Unavailable` - Serwis niedostępny

---

## 6. Bezpieczeństwo

### Rate limiting

- Rejestracja: 5 żądań / 15 minut / IP
- Logowanie: 10 żądań / 15 minut / IP
- Wysyłanie wiadomości: 60 żądań / minutę / użytkownik
- Pozostałe endpointy: 100 żądań / minutę / użytkownik

### Walidacja

- **Frontend**: Walidacja przy użyciu `zod` przed wysłaniem
- **Backend**: Ponowna walidacja na poziomie Supabase (CHECK constraints, RLS)
- **Database**: CHECK constraints dla długości pól, dozwolonych wartości

### Sanitization

- Wszystkie dane wejściowe sanityzowane przed zapisem
- Escape special characters w wiadomościach czatu
- Walidacja URL obrazków (whitelist domen)

### CORS

- Dozwolone domeny: tylko domena produkcyjna aplikacji
- Credentials: true (dla cookies z tokenami)

---

## 7. Wydajność

### Caching

- Lista ofert: Cache na 60 sekund (może być stale dla niektórych parametrów)
- Szczegóły oferty: Cache na 30 sekund
- Profil użytkownika: Cache na 5 minut

### Indexy (z db-plan.md)

- Composite indexes: `(city, status, created_at)` dla filtrowania ofert
- Foreign keys: wszystkie FK automatycznie zaindeksowane
- Full-text search: `search_vector` kolumna z GIN index (przyszłość)

### Paginacja

- Offset-based pagination dla MVP
- Rozważyć cursor-based pagination dla większej skalowalności

---

## 8. Obsługa błędów

### Format odpowiedzi błędu

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Tytuł musi mieć 5-100 znaków",
    "details": {
      "field": "title",
      "value": "abc"
    }
  }
}
```

### Kody błędów

- `VALIDATION_ERROR` - Błąd walidacji danych
- `UNAUTHORIZED` - Brak autoryzacji
- `FORBIDDEN` - Brak uprawnień
- `NOT_FOUND` - Zasób nie istnieje
- `CONFLICT` - Konflikt zasobów
- `INTERNAL_ERROR` - Błąd serwera
- `RATE_LIMIT_EXCEEDED` - Przekroczono limit żądań

---

## 9. Notatki implementacyjne

### Supabase Client

- Frontend używa `@supabase/supabase-js` z `SUPABASE_ANON_KEY`
- RLS automatycznie filtruje dane na podstawie tokenu JWT
- Większość logiki biznesowej w triggerach bazodanowych

### Edge Functions (opcjonalne)

- Dla złożonej logiki biznesowej można użyć Supabase Edge Functions
- Przykłady: wysyłanie emaili, webhooks, złożone raporty

### Real-time (przyszłość)

- MVP bez real-time
- W przyszłości: Supabase Realtime dla live chat notifications

### File uploads

- Obrazy ofert przechowywane w Supabase Storage
- Upload flow:
  1. Frontend uploaduje do `/storage/offers`
  2. Otrzymuje public URL
  3. Zapisuje URL w tabeli `offers.image_url`
