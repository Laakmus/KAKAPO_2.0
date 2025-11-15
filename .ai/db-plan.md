# Schemat bazy danych KAKAPO

## 1. Tabele z kolumnami, typami danych i ograniczeniami

### users
Tabela profili użytkowników zsynchronizowana z Supabase Auth.

| Kolumna | Typ | Ograniczenia | Opis |
|---------|-----|--------------|------|
| id | uuid | PRIMARY KEY | Mapowane do auth.uid() z Supabase Auth |
| first_name | varchar(100) | NOT NULL | Imię użytkownika |
| last_name | varchar(100) | NOT NULL | Nazwisko użytkownika |
| created_at | timestamptz | NOT NULL DEFAULT now() | Data rejestracji |

**Uwagi:**
- `id` synchronizowane z `auth.users.id` poprzez trigger/funkcję w Supabase
- Brak pola email i password w tej tabeli - zarządzane przez Supabase Auth
- Usuwanie konta odbywa się przez admin RPC który usuwa konto z Auth i anonimizuje/usuwa profil

---

### offers
Tabela ofert wymiany produktów/usług.

| Kolumna | Typ | Ograniczenia | Opis |
|---------|-----|--------------|------|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Identyfikator oferty |
| owner_id | uuid | NOT NULL REFERENCES users(id) ON DELETE CASCADE | Właściciel oferty |
| title | varchar(100) | NOT NULL CHECK (length(title) >= 5 AND length(title) <= 100) | Tytuł oferty |
| description | text | NOT NULL CHECK (length(description) >= 10 AND length(description) <= 5000) | Opis oferty |
| image_url | varchar(2048) | NULL | URL zdjęcia z Supabase Storage |
| city | varchar(100) | NOT NULL CHECK (city IN ('Warszawa','Kraków','Wrocław','Poznań','Gdańsk','Szczecin','Łódź','Lublin','Białystok','Olsztyn','Rzeszów','Opole','Zielona Góra','Gorzów Wielkopolski','Kielce','Katowice')) | Miasto oferty |
| status | varchar(20) | NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REMOVED')) | Status oferty |
| created_at | timestamptz | NOT NULL DEFAULT now() | Data utworzenia |

**Uwagi:**
- `image_url` przechowuje tylko URL do obrazka w Supabase Storage
- `city` ograniczone do 16 miast z PRD poprzez CHECK constraint
- `ON DELETE CASCADE` usuwa oferty gdy użytkownik jest usuwany

---

### interests
Tabela zainteresowań użytkowników ofertami.

| Kolumna | Typ | Ograniczenia | Opis |
|---------|-----|--------------|------|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Identyfikator zainteresowania |
| offer_id | uuid | NOT NULL REFERENCES offers(id) ON DELETE CASCADE | Oferta będąca przedmiotem zainteresowania |
| user_id | uuid | NOT NULL REFERENCES users(id) ON DELETE CASCADE | Użytkownik zainteresowany ofertą |
| status | varchar(20) | NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED','ACCEPTED','REALIZED')) | Status zainteresowania |
| realized_at | timestamptz | NULL | Data potwierdzenia realizacji przez użytkownika |
| created_at | timestamptz | NOT NULL DEFAULT now() | Data wyrażenia zainteresowania |
| UNIQUE(offer_id, user_id) | | | Użytkownik może być zainteresowany ofertą tylko raz |

**Uwagi:**
- `UNIQUE(offer_id, user_id)` zapewnia że użytkownik może oznaczyć zainteresowanie tylko raz
- Trigger/constraint blokuje możliwość zainteresowania własną ofertą (user_id != offers.owner_id)
- Statusy: `PROPOSED` (początkowy), `ACCEPTED` (mutual match), `REALIZED` (użytkownik potwierdził odbiór towaru)
- `realized_at` wypełniane gdy użytkownik potwierdza że odebrał towar (US-018)
- Wymiana uznana za zrealizowaną gdy OBA zainteresowania mają status REALIZED

---

### chats
Tabela rozmów między użytkownikami przy mutual match. Czat jest reużywany dla kolejnych wymian między tymi samymi użytkownikami.

| Kolumna | Typ | Ograniczenia | Opis |
|---------|-----|--------------|------|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Identyfikator czatu |
| user_a | uuid | NOT NULL REFERENCES users(id) ON DELETE CASCADE CHECK (user_a < user_b) | Pierwszy użytkownik (mniejszy UUID) |
| user_b | uuid | NOT NULL REFERENCES users(id) ON DELETE CASCADE | Drugi użytkownik (większy UUID) |
| status | varchar(20) | NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')) | Status czatu |
| created_at | timestamptz | NOT NULL DEFAULT now() | Data utworzenia czatu |
| UNIQUE(user_a, user_b) | | | Tylko jeden czat między dwoma użytkownikami |

**Uwagi:**
- `user_a < user_b` wymusza kolejność zapisywania par użytkowników (zapobiega duplikatom)
- `UNIQUE(user_a, user_b)` zapewnia tylko jeden czat między użytkownikami - reużywany dla kolejnych wymian
- Czat tworzony automatycznie przez trigger przy mutual match (dwa zainteresowania ACCEPTED)
- Czat pozostaje ACTIVE nawet gdy wymiana została zrealizowana - pozwala to na kolejne wymiany między tymi samymi użytkownikami
- Status ARCHIVED można użyć w przyszłości do archiwizacji nieaktywnych czatów

---

### messages
Tabela wiadomości w czatach.

| Kolumna | Typ | Ograniczenia | Opis |
|---------|-----|--------------|------|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Identyfikator wiadomości |
| chat_id | uuid | NOT NULL REFERENCES chats(id) ON DELETE CASCADE | Czat do którego należy wiadomość |
| sender_id | uuid | NOT NULL REFERENCES users(id) ON DELETE CASCADE | Nadawca wiadomości |
| body | text | NOT NULL CHECK (length(body) >= 1 AND length(body) <= 2000) | Treść wiadomości |
| created_at | timestamptz | NOT NULL DEFAULT now() | Data wysłania |

**Uwagi:**
- `body` ograniczone do 2000 znaków zgodnie z PRD
- `created_at` używane dla sortowania chronologicznego (US-017)
- Sender_id musi być uczestnikiem czatu (user_a lub user_b) - wymuszane przez RLS

---

### archived_messages
Tabela archiwum starych wiadomości przypisanych do użytkowników.

| Kolumna | Typ | Ograniczenia | Opis |
|---------|-----|--------------|------|
| id | uuid | PRIMARY KEY | Oryginalny identyfikator wiadomości |
| chat_id | uuid | NOT NULL | Identyfikator czatu (bez FK - czat może już nie istnieć) |
| sender_id | uuid | NOT NULL REFERENCES users(id) ON DELETE CASCADE | Nadawca wiadomości |
| receiver_id | uuid | NOT NULL REFERENCES users(id) ON DELETE CASCADE | Odbiorca wiadomości |
| body | text | NOT NULL | Treść wiadomości |
| sent_at | timestamptz | NOT NULL | Oryginalna data wysłania |
| archived_at | timestamptz | NOT NULL DEFAULT now() | Data archiwizacji |

**Uwagi:**
- Wiadomości archiwizowane są po określonym czasie (np. 6 miesięcy) lub gdy czat staje się nieaktywny
- `receiver_id` dodany aby zachować pełny kontekst rozmowy po archiwizacji
- Brak FK na `chat_id` - pozwala zachować archiwum nawet po usunięciu czatu
- Użytkownicy mogą przeglądać swoje archiwalne wiadomości (gdzie sender_id = auth.uid() OR receiver_id = auth.uid())
- Proces archiwizacji wykonywany przez zaplanowane zadanie (cron job)

---

### exchange_history
Tabela historii zrealizowanych wymian między użytkownikami.

| Kolumna | Typ | Ograniczenia | Opis |
|---------|-----|--------------|------|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Identyfikator wymiany |
| user_a | uuid | NOT NULL REFERENCES users(id) ON DELETE CASCADE | Pierwszy uczestnik |
| user_b | uuid | NOT NULL REFERENCES users(id) ON DELETE CASCADE | Drugi uczestnik |
| offer_a_id | uuid | NULL | Oferta użytkownika A (może być usunięta) |
| offer_b_id | uuid | NULL | Oferta użytkownika B (może być usunięta) |
| offer_a_title | varchar(100) | NOT NULL | Tytuł oferty A (kopia z offers.title) |
| offer_b_title | varchar(100) | NOT NULL | Tytuł oferty B (kopia z offers.title) |
| chat_id | uuid | NOT NULL REFERENCES chats(id) ON DELETE CASCADE | Czat w którym wymiana była negocjowana |
| realized_at | timestamptz | NOT NULL DEFAULT now() | Data potwierdzenia przez obu użytkowników |

**Uwagi:**
- Rekord tworzony automatycznie gdy oba zainteresowania osiągną status REALIZED
- Przechowuje tytuły ofert jako kopie - zachowuje historię nawet gdy oferty zostaną usunięte
- `offer_a_id` i `offer_b_id` mogą być NULL jeśli oferty zostały już usunięte
- Pozwala użytkownikom przeglądać historię swoich zrealizowanych wymian
- Może być użyte w przyszłości do statystyk i rekomendacji

---

### audit_logs
Tabela audytu operacji administracyjnych.

| Kolumna | Typ | Ograniczenia | Opis |
|---------|-----|--------------|------|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Identyfikator wpisu audytu |
| actor_id | uuid | NULL REFERENCES users(id) ON DELETE SET NULL | Użytkownik wykonujący akcję (NULL dla operacji systemowych) |
| action | varchar(100) | NOT NULL | Typ akcji (np. 'DELETE_USER', 'ANONYMIZE_PROFILE') |
| payload | jsonb | NULL | Dodatkowe dane związane z akcją |
| created_at | timestamptz | NOT NULL DEFAULT now() | Data operacji |

**Uwagi:**
- Używana do logowania operacji administracyjnych (usuwanie kont, moderacja)
- `payload` zawiera szczegóły operacji w formacie JSON
- `actor_id` NULL dla operacji systemowych/automatycznych

---

## 2. Relacje między tabelami

### users → offers
- **Typ:** Jeden-do-wielu
- **Relacja:** Jeden użytkownik może mieć wiele ofert
- **Klucz obcy:** `offers.owner_id → users.id`
- **Kaskadowe usuwanie:** Tak (ON DELETE CASCADE)

### users → interests
- **Typ:** Jeden-do-wielu
- **Relacja:** Jeden użytkownik może wyrazić wiele zainteresowań
- **Klucz obcy:** `interests.user_id → users.id`
- **Kaskadowe usuwanie:** Tak (ON DELETE CASCADE)

### offers → interests
- **Typ:** Jeden-do-wielu
- **Relacja:** Jedna oferta może mieć wiele zainteresowań
- **Klucz obcy:** `interests.offer_id → offers.id`
- **Kaskadowe usuwanie:** Tak (ON DELETE CASCADE)

### users ↔ chats
- **Typ:** Wiele-do-wielu (z ograniczeniem)
- **Relacja:** Użytkownicy uczestniczą w czatach; jeden czat zawsze łączy dokładnie dwóch użytkowników
- **Klucze obce:**
  - `chats.user_a → users.id`
  - `chats.user_b → users.id`
- **Kaskadowe usuwanie:** Tak (ON DELETE CASCADE)
- **Uwaga:** Para (user_a, user_b) jest unikalna i uporządkowana (user_a < user_b); czat jest reużywany dla kolejnych wymian

### chats → messages
- **Typ:** Jeden-do-wielu
- **Relacja:** Jeden czat może mieć wiele wiadomości
- **Klucz obcy:** `messages.chat_id → chats.id`
- **Kaskadowe usuwanie:** Tak (ON DELETE CASCADE)

### users → messages
- **Typ:** Jeden-do-wielu
- **Relacja:** Jeden użytkownik może wysłać wiele wiadomości
- **Klucz obcy:** `messages.sender_id → users.id`
- **Kaskadowe usuwanie:** Tak (ON DELETE CASCADE)

### users → archived_messages
- **Typ:** Jeden-do-wielu (dla sender_id i receiver_id)
- **Relacja:** Użytkownicy mogą mieć wiele zarchiwizowanych wiadomości jako nadawcy lub odbiorcy
- **Klucze obce:**
  - `archived_messages.sender_id → users.id`
  - `archived_messages.receiver_id → users.id`
- **Kaskadowe usuwanie:** Tak (ON DELETE CASCADE)

### users → exchange_history
- **Typ:** Jeden-do-wielu (dla user_a i user_b)
- **Relacja:** Użytkownicy mogą mieć wiele zrealizowanych wymian
- **Klucze obce:**
  - `exchange_history.user_a → users.id`
  - `exchange_history.user_b → users.id`
  - `exchange_history.chat_id → chats.id`
- **Kaskadowe usuwanie:** Tak (ON DELETE CASCADE)

### users → audit_logs
- **Typ:** Jeden-do-wielu
- **Relacja:** Jeden użytkownik może wykonać wiele akcji audytowanych
- **Klucz obcy:** `audit_logs.actor_id → users.id`
- **Kaskadowe usuwanie:** SET NULL (zachowujemy logi nawet po usunięciu użytkownika)

---

## 3. Indeksy

### Indeksy podstawowe (Primary Keys)
Wszystkie tabele mają automatyczne indeksy na kluczach głównych:
- `users(id)`
- `offers(id)`
- `interests(id)`
- `chats(id)`
- `messages(id)`
- `archived_messages(id)`
- `exchange_history(id)`
- `audit_logs(id)`

### Indeksy na kluczach obcych
```sql
-- offers
CREATE INDEX idx_offers_owner_id ON offers(owner_id);

-- interests
CREATE INDEX idx_interests_offer_id ON interests(offer_id);
CREATE INDEX idx_interests_user_id ON interests(user_id);

-- chats
CREATE INDEX idx_chats_user_a ON chats(user_a);
CREATE INDEX idx_chats_user_b ON chats(user_b);

-- messages
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);

-- archived_messages
CREATE INDEX idx_archived_messages_sender_id ON archived_messages(sender_id);
CREATE INDEX idx_archived_messages_receiver_id ON archived_messages(receiver_id);
CREATE INDEX idx_archived_messages_chat_id ON archived_messages(chat_id);

-- exchange_history
CREATE INDEX idx_exchange_history_user_a ON exchange_history(user_a);
CREATE INDEX idx_exchange_history_user_b ON exchange_history(user_b);
CREATE INDEX idx_exchange_history_chat_id ON exchange_history(chat_id);

-- audit_logs
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
```

### Indeksy wydajnościowe

```sql
-- Dla paginacji i filtrowania listy ofert (US-003, US-024)
CREATE INDEX idx_offers_city_status_created ON offers(city, status, created_at DESC);

-- Dla sortowania ofert po dacie
CREATE INDEX idx_offers_status_created ON offers(status, created_at DESC);

-- Dla filtrowania aktywnych ofert właściciela (US-007)
CREATE INDEX idx_offers_owner_status ON offers(owner_id, status);

-- Dla wyszukiwania zainteresowań po statusie
CREATE INDEX idx_interests_status ON interests(status);

-- Dla znajdowania wzajemnych zainteresowań (mutual match)
CREATE INDEX idx_interests_offer_status ON interests(offer_id, status);
CREATE INDEX idx_interests_user_status ON interests(user_id, status);

-- Dla paginacji wiadomości w czacie (US-016, US-017)
CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at);

-- Dla wyszukiwania aktywnych czatów użytkownika (US-015)
CREATE INDEX idx_chats_user_a_status ON chats(user_a, status);
CREATE INDEX idx_chats_user_b_status ON chats(user_b, status);

-- Dla przeglądania archiwalnych wiadomości użytkownika
CREATE INDEX idx_archived_messages_sender_sent ON archived_messages(sender_id, sent_at DESC);
CREATE INDEX idx_archived_messages_receiver_sent ON archived_messages(receiver_id, sent_at DESC);

-- Dla historii wymian użytkownika
CREATE INDEX idx_exchange_history_user_a_realized ON exchange_history(user_a, realized_at DESC);
CREATE INDEX idx_exchange_history_user_b_realized ON exchange_history(user_b, realized_at DESC);

-- Dla audytu po dacie
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
```

### Indeksy full-text search (przyszłość)

```sql
-- Dodanie kolumny tsvector dla wyszukiwania
ALTER TABLE offers ADD COLUMN search_vector tsvector;

-- Trigger aktualizujący search_vector
CREATE FUNCTION offers_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER offers_search_vector_trigger
  BEFORE INSERT OR UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION offers_search_vector_update();

-- GIN index dla szybkiego full-text search
CREATE INDEX idx_offers_search_vector ON offers USING GIN(search_vector);
```

---

## 4. Triggery i funkcje biznesowe

### Blokada self-interest
Użytkownik nie może być zainteresowany własną ofertą.

```sql
CREATE FUNCTION check_self_interest() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM offers
    WHERE id = NEW.offer_id AND owner_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Nie możesz być zainteresowany własną ofertą';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_self_interest
  BEFORE INSERT OR UPDATE ON interests
  FOR EACH ROW
  EXECUTE FUNCTION check_self_interest();
```

### Automatyczne tworzenie czatu przy mutual match
Gdy dwa zainteresowania są wzajemne (ACCEPTED), automatycznie tworzy lub reaktywuje czat.

```sql
CREATE FUNCTION create_chat_on_mutual_match() RETURNS trigger AS $$
DECLARE
  v_other_user_id uuid;
  v_other_offer_id uuid;
  v_chat_id uuid;
  v_user_a uuid;
  v_user_b uuid;
BEGIN
  -- Tylko dla statusu ACCEPTED
  IF NEW.status != 'ACCEPTED' THEN
    RETURN NEW;
  END IF;

  -- Znajdź ofertę właściciela i sprawdź czy jest wzajemne zainteresowanie
  SELECT owner_id INTO v_other_user_id
  FROM offers
  WHERE id = NEW.offer_id;

  -- Znajdź ofertę zainteresowanego użytkownika w której właściciel jest zainteresowany
  SELECT i.offer_id INTO v_other_offer_id
  FROM interests i
  JOIN offers o ON i.offer_id = o.id
  WHERE i.user_id = v_other_user_id
    AND o.owner_id = NEW.user_id
    AND i.status = 'ACCEPTED';

  -- Jeśli jest wzajemne zainteresowanie, utwórz lub reaktywuj czat
  IF v_other_offer_id IS NOT NULL THEN
    -- Ustal kolejność użytkowników (user_a < user_b)
    IF NEW.user_id < v_other_user_id THEN
      v_user_a := NEW.user_id;
      v_user_b := v_other_user_id;
    ELSE
      v_user_a := v_other_user_id;
      v_user_b := NEW.user_id;
    END IF;

    -- Utwórz czat jeśli nie istnieje lub reaktywuj istniejący
    INSERT INTO chats (user_a, user_b, status)
    VALUES (v_user_a, v_user_b, 'ACTIVE')
    ON CONFLICT (user_a, user_b)
    DO UPDATE SET status = 'ACTIVE'; -- Reaktywuj jeśli był zarchiwizowany
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_chat_on_mutual_interest
  AFTER INSERT OR UPDATE ON interests
  FOR EACH ROW
  EXECUTE FUNCTION create_chat_on_mutual_match();
```

### Automatyczne tworzenie wpisu w historii wymian
Gdy oba zainteresowania osiągną status REALIZED, tworzy wpis w exchange_history.

```sql
CREATE FUNCTION create_exchange_history_on_realized() RETURNS trigger AS $$
DECLARE
  v_other_user_id uuid;
  v_other_interest_id uuid;
  v_other_offer_id uuid;
  v_my_offer_title varchar(100);
  v_other_offer_title varchar(100);
  v_chat_id uuid;
  v_user_a uuid;
  v_user_b uuid;
BEGIN
  -- Tylko dla statusu REALIZED
  IF NEW.status != 'REALIZED' OR OLD.status = 'REALIZED' THEN
    RETURN NEW;
  END IF;

  -- Znajdź właściciela oferty
  SELECT owner_id, title INTO v_other_user_id, v_other_offer_title
  FROM offers
  WHERE id = NEW.offer_id;

  -- Znajdź wzajemne zainteresowanie
  SELECT i.id, i.offer_id, o.title
  INTO v_other_interest_id, v_other_offer_id, v_my_offer_title
  FROM interests i
  JOIN offers o ON i.offer_id = o.id
  WHERE i.user_id = v_other_user_id
    AND o.owner_id = NEW.user_id
    AND i.status = 'REALIZED';

  -- Jeśli oba zainteresowania są REALIZED, utwórz wpis w historii
  IF v_other_interest_id IS NOT NULL THEN
    -- Ustal kolejność użytkowników
    IF NEW.user_id < v_other_user_id THEN
      v_user_a := NEW.user_id;
      v_user_b := v_other_user_id;
    ELSE
      v_user_a := v_other_user_id;
      v_user_b := NEW.user_id;
    END IF;

    -- Znajdź czat między użytkownikami
    SELECT id INTO v_chat_id
    FROM chats
    WHERE user_a = v_user_a AND user_b = v_user_b;

    -- Utwórz wpis w historii (tylko jeśli jeszcze nie istnieje dla tej pary ofert)
    INSERT INTO exchange_history (user_a, user_b, offer_a_id, offer_b_id, offer_a_title, offer_b_title, chat_id)
    VALUES (
      v_user_a,
      v_user_b,
      CASE WHEN v_user_a = NEW.user_id THEN v_other_offer_id ELSE NEW.offer_id END,
      CASE WHEN v_user_a = NEW.user_id THEN NEW.offer_id ELSE v_other_offer_id END,
      CASE WHEN v_user_a = NEW.user_id THEN v_my_offer_title ELSE v_other_offer_title END,
      CASE WHEN v_user_a = NEW.user_id THEN v_other_offer_title ELSE v_my_offer_title END,
      v_chat_id
    )
    ON CONFLICT DO NOTHING; -- Zapobiega duplikatom jeśli oba triggery uruchomią się jednocześnie
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_exchange_history_trigger
  AFTER UPDATE ON interests
  FOR EACH ROW
  EXECUTE FUNCTION create_exchange_history_on_realized();
```

### Admin RPC: Usuwanie konta i anonimizacja

```sql
-- Funkcja dostępna tylko dla service_role
CREATE FUNCTION admin_delete_user_account(target_user_id uuid)
RETURNS jsonb
SECURITY DEFINER -- Wykonywana z prawami właściciela funkcji
AS $$
DECLARE
  v_email text;
  v_result jsonb;
BEGIN
  -- Sprawdź czy użytkownik istnieje
  SELECT email INTO v_email FROM auth.users WHERE id = target_user_id;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Użytkownik nie istnieje'
    );
  END IF;

  -- Usuń profil użytkownika (kaskadowo usuwa offers, interests, messages)
  DELETE FROM users WHERE id = target_user_id;

  -- Usuń konto z Supabase Auth (wymaga admin API lub service_role)
  -- To będzie wykonane przez backend/edge function z service_role

  -- Log operacji
  INSERT INTO audit_logs (actor_id, action, payload)
  VALUES (
    auth.uid(),
    'DELETE_USER_ACCOUNT',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'email', v_email,
      'timestamp', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Konto zostało usunięte',
    'user_id', target_user_id
  );
END;
$$ LANGUAGE plpgsql;
```

### Funkcja archiwizacji starych wiadomości

```sql
-- Funkcja do archiwizacji wiadomości starszych niż X miesięcy
CREATE FUNCTION archive_old_messages(months_old integer DEFAULT 6)
RETURNS jsonb
AS $$
DECLARE
  v_cutoff_date timestamptz;
  v_archived_count integer;
BEGIN
  v_cutoff_date := now() - (months_old || ' months')::interval;

  -- Przenieś stare wiadomości do archiwum
  INSERT INTO archived_messages (id, chat_id, sender_id, receiver_id, body, sent_at)
  SELECT
    m.id,
    m.chat_id,
    m.sender_id,
    CASE
      WHEN c.user_a = m.sender_id THEN c.user_b
      ELSE c.user_a
    END as receiver_id,
    m.body,
    m.created_at
  FROM messages m
  JOIN chats c ON m.chat_id = c.id
  WHERE m.created_at < v_cutoff_date;

  GET DIAGNOSTICS v_archived_count = ROW_COUNT;

  -- Usuń przeniesione wiadomości
  DELETE FROM messages WHERE created_at < v_cutoff_date;

  RETURN jsonb_build_object(
    'success', true,
    'archived_count', v_archived_count,
    'cutoff_date', v_cutoff_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. Zasady Row Level Security (RLS)

### users

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Użytkownicy mogą czytać tylko swój własny profil
CREATE POLICY users_select_own
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Użytkownicy mogą aktualizować tylko swój własny profil
CREATE POLICY users_update_own
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Tworzenie profilu tylko dla nowo zarejestrowanych (przez trigger Supabase)
CREATE POLICY users_insert_own
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### offers

```sql
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Wszyscy zalogowani mogą czytać aktywne oferty
CREATE POLICY offers_select_active
  ON offers FOR SELECT
  USING (status = 'ACTIVE' OR owner_id = auth.uid());

-- Tylko właściciel może tworzyć oferty dla siebie
CREATE POLICY offers_insert_own
  ON offers FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Tylko właściciel może edytować swoje oferty
CREATE POLICY offers_update_own
  ON offers FOR UPDATE
  USING (auth.uid() = owner_id);

-- Tylko właściciel może usuwać swoje oferty
CREATE POLICY offers_delete_own
  ON offers FOR DELETE
  USING (auth.uid() = owner_id);
```

### interests

```sql
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

-- Użytkownik widzi zainteresowania które dotyczą:
-- 1. Jego własnych ofert (jako oferent)
-- 2. Ofert w których jest zainteresowany (jako zainteresowany)
CREATE POLICY interests_select_related
  ON interests FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM offers
      WHERE offers.id = interests.offer_id
        AND offers.owner_id = auth.uid()
    )
  );

-- Użytkownik może dodać zainteresowanie tylko dla siebie
CREATE POLICY interests_insert_own
  ON interests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Użytkownik może aktualizować tylko swoje zainteresowania
CREATE POLICY interests_update_own
  ON interests FOR UPDATE
  USING (auth.uid() = user_id);

-- Użytkownik może usuwać tylko swoje zainteresowania
CREATE POLICY interests_delete_own
  ON interests FOR DELETE
  USING (auth.uid() = user_id);
```

### chats

```sql
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Użytkownik widzi tylko czaty w których uczestniczy
CREATE POLICY chats_select_participant
  ON chats FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Czaty tworzone tylko przez trigger (brak INSERT policy dla użytkowników)

-- Uczestnicy mogą aktualizować status czatu
CREATE POLICY chats_update_participant
  ON chats FOR UPDATE
  USING (auth.uid() = user_a OR auth.uid() = user_b);
```

### messages

```sql
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Użytkownik widzi wiadomości tylko z czatów w których uczestniczy
CREATE POLICY messages_select_participant
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
        AND (chats.user_a = auth.uid() OR chats.user_b = auth.uid())
    )
  );

-- Użytkownik może wysyłać wiadomości tylko w czatach w których uczestniczy
CREATE POLICY messages_insert_participant
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_id
        AND (chats.user_a = auth.uid() OR chats.user_b = auth.uid())
    )
  );
```

### archived_messages

```sql
ALTER TABLE archived_messages ENABLE ROW LEVEL SECURITY;

-- Użytkownik widzi tylko swoje archiwalne wiadomości (jako nadawca lub odbiorca)
CREATE POLICY archived_messages_select_own
  ON archived_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Tylko system może dodawać archiwalne wiadomości (przez funkcję SECURITY DEFINER)
-- Brak INSERT/UPDATE/DELETE policy dla użytkowników
```

### exchange_history

```sql
ALTER TABLE exchange_history ENABLE ROW LEVEL SECURITY;

-- Użytkownik widzi tylko swoją historię wymian
CREATE POLICY exchange_history_select_own
  ON exchange_history FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Tylko triggery mogą tworzyć wpisy w historii (brak INSERT policy dla użytkowników)
```

### audit_logs

```sql
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Tylko administratorzy mogą czytać logi (wymaga custom claim lub service_role)
-- Dla MVP: brak dostępu dla zwykłych użytkowników
CREATE POLICY audit_logs_admin_only
  ON audit_logs FOR SELECT
  USING (false); -- Tylko przez service_role lub backend
```

---

## 6. Dodatkowe uwagi i decyzje projektowe

### Mapowanie auth.uid()
- Tabela `users.id` jest bezpośrednio mapowana do `auth.uid()` z Supabase Auth
- Email i hasło zarządzane wyłącznie przez Supabase Auth, nie duplikowane w lokalnej tabeli
- Trigger Supabase automatycznie tworzy rekord w `users` po rejestracji w `auth.users`

### Usuwanie konta (GDPR compliance)
- Admin RPC `admin_delete_user_account()` wykonywane z service_role
- Kasuje profil z `users` (kaskadowo usuwa offers, interests, messages)
- Usuwa konto z Supabase Auth (wykonywane przez backend z service_role)
- Loguje operację w `audit_logs`
- Po usunięciu możliwa ponowna rejestracja tym samym emailem (nowe konto, nowe UUID)

### Reużywanie czatów
- Czat między dwoma użytkownikami jest tworzony raz i używany dla wszystkich ich wymian (zgodnie z PRD US-015)
- `UNIQUE(user_a, user_b)` zapewnia jeden czat na parę użytkowników
- Czat pozostaje ACTIVE nawet po zrealizowaniu wymiany - pozwala na kolejne wymiany
- Trigger przy mutual match reaktywuje czat jeśli był zarchiwizowany (`ON CONFLICT DO UPDATE`)

### Potwierdzanie realizacji wymiany (US-018, US-019)
- Użytkownik potwierdza odbiór towaru klikając "Zrealizowana" - ustawia swoje `interests.status = REALIZED` i `interests.realized_at`
- Wymiana uznana za zrealizowaną gdy OBA zainteresowania mają status REALIZED
- Trigger automatycznie tworzy wpis w `exchange_history` gdy oba zainteresowania osiągną REALIZED
- Użytkownik może anulować potwierdzenie zmieniając status z REALIZED na ACCEPTED (jeśli druga strona jeszcze nie potwierdziła)

### Archiwizacja wiadomości
- Funkcja `archive_old_messages()` wykonywana przez zaplanowane zadanie (np. cron job co miesiąc)
- Przenosi wiadomości starsze niż 6 miesięcy do `archived_messages`
- Zachowuje pełny kontekst (sender_id, receiver_id, chat_id) dla dostępu użytkowników
- Użytkownicy mogą przeglądać swoje archiwalne wiadomości przez RLS policy

### Historia wymian
- Automatyczne tworzenie wpisu w `exchange_history` gdy wymiana zostanie potwierdzona przez obu użytkowników
- Przechowuje kopie tytułów ofert - zachowuje historię nawet gdy oferty zostaną usunięte
- Użytkownicy mogą przeglądać swoją historię zrealizowanych wymian
- Może być wykorzystane w przyszłości do statystyk, rekomendacji, weryfikacji użytkowników

### Liczba zainteresowanych
- Na start dynamicznie liczona przez `COUNT(*)` na tabeli `interests`
- W przyszłości rozważyć dodanie kolumny `interests_count` w `offers` + trigger INCREMENT/DECREMENT

### Walidacja danych
- CHECK constraints w bazie dla długości pól (title, description, body)
- CHECK IN dla listy 16 miast z PRD
- Blokada self-interest przez trigger `prevent_self_interest`
- Walidacja image_url odbywa się na frontendzie (format JPG/PNG/WebP)

### Wydajność i skalowalność
- Indeksy composite (city, status, created_at) dla częstych zapytań
- Full-text search (tsvector + GIN) dla wyszukiwania ofert
- Keyset pagination zalecane zamiast OFFSET dla dużych zbiorów
- Archiwizacja starych wiadomości zmniejsza rozmiar tabeli `messages` i poprawia wydajność

### Bezpieczeństwo
- RLS włączone na wszystkich tabelach użytkownika
- Admin RPC z `SECURITY DEFINER` dla operacji wymagających podwyższonych uprawnień
- Service_role key NIGDY nie jest przechowywany na frontendzie
- Audit logs dla wszystkich operacji administracyjnych
- Archiwalne dane dostępne tylko dla właścicieli (sender/receiver)
