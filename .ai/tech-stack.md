## KAKAPO — Tech stack i wytyczne dla zespołu

Ten dokument zbiera rozszerzony kontekst techniczny użytego stacku dla projektu KAKAPO. Ma służyć jako punkt odniesienia podczas developmentu, deployu i dalszego rozwoju. Znajdziesz tu: jakie technologie stosujemy, dlaczego, jak ich używać, wymagane narzędzia oraz checklisty środowiskowe i bezpieczeństwa.

--- 

### 1. Cel dokumentu
- Ujednolicić decyzje technologiczne dla MVP i kolejnych iteracji.  
- Opisać praktyczne kroki, polecane ustawienia i narzędzia, żeby każdy developer mógł szybko zacząć pracę.  
- Zawierać check-listy: lokalne środowisko, CI/CD, bezpieczeństwo, monitoring.

### 2. Ogólny stack (skrót)
- Frontend: `Astro` + `React` + `TypeScript` + `Tailwind CSS` + `shadcn/ui` (lub podobny komponentowy zestaw).  
- Backend / Baza danych: `Supabase` (Postgres + Auth + Storage + RLS).  
- CI/CD: `GitHub Actions`.  
- Hosting: `DigitalOcean` (pierwotnie) — rozważ `Vercel` dla prostego hostingu i CDN.  

### 3. Dlaczego taki wybór (mapowanie do PRD)
- Supabase dostarcza: Auth z weryfikacją email (US-001, US-002), Postgres z SQL i RLS (US-023), storage do zdjęć ofert (US-008). Pozwala szybko zrealizować backend MVP bez pisania pełnego serwera.  
- Astro pozwala budować szybkie strony (TTFP) i używać React tylko tam, gdzie jest potrzebny (islands), co pomaga osiągnąć cele wydajnościowe PRD.  
- TypeScript zapewnia bezpieczeństwo typów (łatwiejsze utrzymanie).  
- Tailwind + `shadcn/ui` przyspieszają budowę spójnego UI (komponenty + design system).  
- GitHub Actions + DigitalOcean: prosty pipeline i kontrola infra; Vercel może upraszczać deploy frontendu (automatyczne CD, edge CDN).

### 4. Szczegóły i rekomendacje implementacyjne

4.1 Frontend
- Repo i struktura: `src/pages/` (Astro pages), `src/components/` (UI), `src/layouts/`.  
- Konfiguracja TypeScript: `tsconfig.json` — ścisłe ustawienia (strict: true).  
- Tailwind: zainicjuj `tailwind.config.cjs` i załaduj do `src/styles.css`. Włącz JIT.  
- `shadcn/ui`: traktować jako zestaw komponentów — upewnić się, że wersja jest kompatybilna z Tailwind i React w Astro. Jeśli używacie `shadcn/ui`, stosuj patterny ich docs (wagę ma generowanie komponentów w repo).  
- Formularze: używać `react-hook-form` (lekki + TypeScript). Walidacja: `zod` na frontend i backend.  
- Autoryzacja: token Supabase (anon/public) do odczytu ofert, ale operacje modyfikujące (create/edit/delete) powinny być wykonywane przez supabase client z JWT sesji lub poprzez server-side function (edge function) dla wrażliwych operacji.

4.2 Backend / Supabase
- Modele minimalne (tabele rekomendowane wg PRD): `users` (profile), `offers`, `interests` (zainteresowania), `chats`, `messages`.  
- Kluczowe kolumny:
  - `users`: id (uuid), email, first_name, last_name, created_at
  - `offers`: id, owner_id (fk users), title, description, image_url, city, status (ACTIVE/REMOVED), created_at
  - `interests`: id, offer_id, user_id, status (PROPOSED/ACCEPTED/REALIZED), created_at
  - `chats`: id, offer_a_id, offer_b_id, status, created_at
  - `messages`: id, chat_id, sender_id, body, created_at
- RLS (row level security):
  - `users`: pozwól aktualizować tylko swój profil (policy by auth.uid() == id).  
  - `offers`: CRUD tylko dla owner_id; public SELECT dla listy ofert (ale ograniczyć widok pól wrażliwych).  
  - `interests` i `messages`: dostęp tylko jeśli uczestnikiem jest auth.uid() powiązane z ofertą/chatem.
- Auth: włączyć weryfikację email. Nigdy nie przechowuj `service_role` key w frontendzie.
- Storage: rekomendowane użycie Supabase Storage do zdjęć ofert; przechowywać tylko URL w `offers`.

4.3 Chat (MVP)
- PRD zakłada brak real-time jako konieczność — MVP może działać przez polling lub fetch przy odświeżeniu. W przyszłości rozważyć Supabase Realtime lub WebSockets.  
- Otwieranie chat tylko przy mutual match: logika w triggerach/func: jeżeli `interests` między dwoma użytkownikami są wzajemne → utworzyć `chat` i ustawić status ACCEPTED.

4.4 CI/CD i hosting
- GitHub Actions: pipeline minimalny:
  - testy (lint, typecheck), build frontendu (astro build), deploy (push do DigitalOcean / Vercel).  
- Secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (do read), `SUPABASE_SERVICE_ROLE_KEY` (Tylko w jobach serwerowych — nigdy expose), `DO_TOKEN` lub `VERCEL_TOKEN`.  
- DigitalOcean: jeśli team ma infra skills — App Platform lub droplet. Dla szybkiego MVP polecam `Vercel` (mniej operacyjnego overheadu).

### 5. Narzędzia developerskie i wersje (zalecane)
- Node.js LTS (np. 18+ lub 20 LTS)  
- pnpm lub npm (repo używa `package.json`)  
- Astro (pinowana wersja w `package.json`)  
- TypeScript >= 4.9  
- TailwindCSS >= 3.x  
- Supabase CLI (lokalna praca z DB/migrations)  
- Postman / Insomnia do testowania API  
- VSCode + rozszerzenia: ESLint, Prettier, Tailwind CSS IntelliSense, TypeScript

### 6. Skonfigurowane skrypty (przykładowe w `package.json`)
- `dev`: uruchamia Astro w trybie development  
- `build`: `astro build`  
- `preview`: `astro preview`  
- `lint`: `eslint . --ext .ts,.tsx,.astro`  
- `typecheck`: `tsc --noEmit`

### 7. Environment variables (lista)
- `SUPABASE_URL` (public)  
- `SUPABASE_ANON_KEY` (public, ograniczone uprawnienia)  
- `SUPABASE_SERVICE_ROLE_KEY` (tylko w bezpiecznych jobach/serwerze)  
- `DATABASE_URL` (jeśli korzystasz z direct DB access w CI)  
- `NODE_ENV`  
- `VITE_` prefixed vars jeśli używasz Vite/Env w kliencie (Astro korzysta z VITE-style env)

### 8. Bezpieczeństwo i dobre praktyki
- Nigdy nie commituj secretów. Używaj GH Secrets.  
- RLS jako pierwsza linia obrony w Supabase — zaimplementuj i przetestuj polityki (US-023).  
- Walidacja: `zod` lub `yup` na frontend i backend (dublować walidację).  
- CSP, sanitization wejść (XSS), limit rozmiaru uploadów.  
- Rate limiting (dla endpointów wrażliwych, np. loginy).  
- Audyt logów i monitorowanie kosztów Supabase (queries, storage, egress).

### 9. Testy, monitoring, backup
- Testy jednostkowe dla logiki (Jest / Vitest).  
- Testy integracyjne minimalne do sprawdzenia CRUD ofert + RLS.  
- Backup bazy: uzgodnić politykę backupów Supabase lub eksport schematów/migrations.  
- Monitoring: Sentry (errors), Prometheus/Datadog (w miarę rozwoju).

### 10. Deployment i skalowanie — droga migracji
- Faza MVP: host frontend statically (Astro build) na Vercel lub DigitalOcean App Platform; Supabase managed.  
- Kiedy rośnie ruch:
  - zwiększyć plan Supabase (IO i CPU), rozważyć dedykowany Postgres lub read replicas,  
  - rozdzielić uploads (CDN) i jej egress,  
  - przenieść ciężką logikę do serverless functions / edge functions.

### 11. Checklisty (krótkie)
- Lokalnie:
  - Node LTS zainstalowany  
  - `npm install` / `pnpm install`  
  - Ustawić `.env` z `SUPABASE_URL` i `SUPABASE_ANON_KEY`  
  - Uruchomić `npm run dev`
- Przed deployem:
  - GH Secrets skonfigurowane (`SUPABASE_SERVICE_ROLE_KEY`, `DO_TOKEN`/`VERCEL_TOKEN`)  
  - Testy uruchomione (`lint`, `typecheck`, `unit tests`)  
  - Build przetestowany lokalnie (`npm run build` + `npm run preview`)

### 12. Notatki końcowe / decyzje do potwierdzenia
- Potwierdź którą bibliotekę UI ostatecznie używamy (`shadcn/ui` vs inny).  
- Decision: `Vercel` vs `DigitalOcean` (preferencja: Vercel dla prostoty deployu frontendu).  
- Zdefiniować dokładne schematy tabel i RLS przed pisaniem migrationów; użyć Supabase CLI do migrations.

--- 

Plik ten powinien być aktualizowany w czasie — dodawaj tu migration notes, schematy tabel i przykłady RLS policy gdy powstaną.  
Jeśli chcesz, mogę w następnym kroku: wygenerować szkielet tabel SQL dla Supabase + przykładowe RLS policies lub przygotować przykładowy `github/workflows/deploy.yml`.


