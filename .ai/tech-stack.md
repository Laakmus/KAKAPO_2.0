## KAKAPO — Tech stack i wytyczne dla zespołu

Ten dokument zbiera rozszerzony kontekst techniczny użytego stacku dla projektu KAKAPO. Ma służyć jako punkt odniesienia podczas developmentu, deployu i dalszego rozwoju. Znajdziesz tu: jakie technologie stosujemy, dlaczego, jak ich używać, wymagane narzędzia oraz checklisty środowiskowe i bezpieczeństwa.

---

### 1. Cel dokumentu

- Ujednolicić decyzje technologiczne dla MVP i kolejnych iteracji.
- Opisać praktyczne kroki, polecane ustawienia i narzędzia, żeby każdy developer mógł szybko zacząć pracę.
- Zawierać check-listy: lokalne środowisko, CI/CD, bezpieczeństwo, monitoring.

### 2. Ogólny stack (skrót)

- Frontend: `Astro 5` + `React 19` + `TypeScript 5` + `Tailwind CSS 3` + `shadcn/ui` (Radix UI primitives).
- Backend / Baza danych: `Supabase` (Postgres + Auth + Storage + RLS). API realizowane przez **Astro API routes** (`src/pages/api/`), nie Edge Functions.
- CI/CD: `GitHub Actions`.
- Hosting: do ustalenia (Vercel rekomendowany dla prostoty deployu frontendu).

### 3. Dlaczego taki wybór (mapowanie do PRD)

- Supabase dostarcza: Auth z weryfikacją email (US-001, US-002), Postgres z SQL i RLS (US-023), storage do zdjęć ofert (US-008). Pozwala szybko zrealizować backend MVP bez pisania pełnego serwera.
- Astro 5 pozwala budować szybkie strony (TTFP) i używać React tylko tam, gdzie jest potrzebny (islands), co pomaga osiągnąć cele wydajnościowe PRD.
- TypeScript zapewnia bezpieczeństwo typów (łatwiejsze utrzymanie).
- Tailwind + `shadcn/ui` przyspieszają budowę spójnego UI (komponenty + design system).
- GitHub Actions: prosty pipeline CI/CD.

### 4. Szczegóły i rekomendacje implementacyjne

#### 4.1 Frontend

- Repo i struktura: `src/pages/` (Astro pages + API routes), `src/components/` (UI), `src/components/ui/` (shadcn/ui), `src/layouts/`.
- Konfiguracja TypeScript: `tsconfig.json` — `astro/tsconfigs/strict`. Path alias `@/*` → `./src/*`.
- Tailwind: konfiguracja w `tailwind.config.mjs`. Motyw kolorów oparty o CSS variables (HSL).
- `shadcn/ui`: dodawanie komponentów przez `npm run shadcn`. Komponenty w `src/components/ui/`.
- Formularze: `react-hook-form` + `@hookform/resolvers`. Walidacja: `zod` na frontend i backend.
- Autoryzacja: token Supabase (anon/public) do odczytu ofert, operacje modyfikujące wykonywane przez Supabase client z JWT sesji. Middleware (`src/middleware/index.ts`) wyciąga token i ustawia `context.locals.user`.

#### 4.2 Backend / Supabase

- Modele (tabele): `users` (profile), `offers`, `interests` (zainteresowania), `chats`, `messages`.
- Kluczowe kolumny:
  - `users`: id (uuid), email, first_name, last_name, created_at
  - `offers`: id, owner_id (fk users), title, description, image_url, city, status (ACTIVE/REMOVED), created_at
  - `interests`: id, offer_id, user_id, status (PROPOSED/ACCEPTED/REALIZED), created_at
  - `chats`: id, offer_a_id, offer_b_id, status, created_at
  - `messages`: id, chat_id, sender_id, body, created_at
- RLS (row level security):
  - `users`: pozwól aktualizować tylko swój profil (policy by auth.uid() == id).
  - `offers`: CRUD tylko dla owner_id; public SELECT dla listy ofert.
  - `interests` i `messages`: dostęp tylko jeśli uczestnikiem jest auth.uid() powiązane z ofertą/chatem.
- Logika biznesowa w triggerach PostgreSQL:
  - Mutual match → automatyczne tworzenie chatu.
  - Obie strony potwierdzają wymianę → tworzenie exchange history.
  - Zapobieganie self-interest.
  - Jeden chat per para użytkowników (reuse).
- Auth: weryfikacja email włączona. Nigdy nie przechowuj `service_role` key w frontendzie.
- Storage: Supabase Storage do zdjęć ofert; URL w `offers.image_url`.

#### 4.3 Chat (MVP)

- MVP działa przez polling / fetch przy odświeżeniu — bez real-time.
- W przyszłości rozważyć Supabase Realtime lub WebSockets.
- Otwieranie chat tylko przy mutual match — logika w triggerach DB.

#### 4.4 CI/CD i hosting

- GitHub Actions: lint, typecheck, testy, build (`astro build`), deploy.
- Secrets: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_KEY` (do read), `SUPABASE_SERVICE_ROLE_KEY` (tylko w jobach serwerowych — nigdy expose), token hostingu.

### 5. Narzędzia developerskie i wersje

- Node.js LTS (20+)
- npm (menedżer pakietów projektu)
- Astro 5.x (pinowana wersja w `package.json`)
- TypeScript >= 5.9
- TailwindCSS 3.x
- React 19
- Supabase CLI (lokalna praca z DB/migrations)
- VSCode + rozszerzenia: ESLint, Prettier, Tailwind CSS IntelliSense, TypeScript

### 6. Skonfigurowane skrypty (`package.json`)

- `dev` — uruchamia Astro w trybie development (localhost:4321)
- `dev:e2e` — uruchamia Astro w trybie test
- `build` — `astro build`
- `preview` — `astro preview`
- `lint` / `lint:fix` — ESLint na plikach .js, .ts, .astro
- `format` / `format:check` — Prettier
- `typecheck` — `tsc --noEmit`
- `shadcn` — dodaje komponent shadcn/ui + auto-fix lint
- `test` — uruchamia testy unit + E2E
- `test:unit` / `test:unit:watch` / `test:unit:ui` — Vitest
- `test:e2e` / `test:e2e:ui` / `test:e2e:headed` / `test:e2e:debug` — Playwright
- `pw:install` — instalacja przeglądarek Playwright

### 7. Environment variables (lista)

- `PUBLIC_SUPABASE_URL` — URL projektu Supabase (prefix `PUBLIC_` wymagany przez Astro dla dostępu client-side)
- `PUBLIC_SUPABASE_KEY` — klucz anonimowy Supabase (public, ograniczone uprawnienia)
- `SUPABASE_SERVICE_ROLE_KEY` — tylko w bezpiecznych jobach/serwerze
- `NODE_ENV`

**Uwaga**: W Astro zmienne bez prefixu `PUBLIC_` nie są dostępne w kodzie klienckim (przeglądarka).

### 8. Bezpieczeństwo i dobre praktyki

- Nigdy nie commituj secretów. Używaj GH Secrets.
- RLS jako pierwsza linia obrony w Supabase — zaimplementuj i przetestuj polityki (US-023).
- Walidacja: `zod` na frontend i backend (dublować walidację).
- CSP, sanitization wejść (XSS), limit rozmiaru uploadów.
- Rate limiting (dla endpointów wrażliwych, np. loginy).
- Audyt logów i monitorowanie kosztów Supabase (queries, storage, egress).
- `console.log` zabroniony w kodzie (ESLint rule) — używać `console.error` / `console.warn`.

### 9. Testy, monitoring, backup

- Testy jednostkowe / integracyjne:
  - **Vitest** (runner) + środowisko **jsdom** dla komponentów React.
  - **React Testing Library** + **@testing-library/user-event** (testy komponentów z perspektywy użytkownika).
- Testy E2E:
  - **Playwright** (scenariusze end-to-end, w tym testowanie wielu kontekstów przeglądarki — np. chat między dwoma użytkownikami).
  - Konfiguracja w `playwright.config.ts`, testy w `tests/e2e/`.
- Backup bazy: uzgodnić politykę backupów Supabase lub eksport schematów/migrations.
- Monitoring: Sentry (errors) — do wdrożenia w miarę rozwoju.

### 10. Deployment i skalowanie — droga migracji

- Faza MVP: host frontend (Astro build) na Vercel lub innym hostingu; Supabase managed.
- Kiedy rośnie ruch:
  - zwiększyć plan Supabase (IO i CPU), rozważyć dedykowany Postgres lub read replicas,
  - rozdzielić uploads (CDN) i jej egress,
  - przenieść ciężką logikę do serverless functions / edge functions.

### 11. Checklisty (krótkie)

- Lokalnie:
  - Node LTS zainstalowany
  - `npm install`
  - Ustawić `.env` z `PUBLIC_SUPABASE_URL` i `PUBLIC_SUPABASE_KEY`
  - Uruchomić `npm run dev`
- Przed deployem:
  - GH Secrets skonfigurowane (`SUPABASE_SERVICE_ROLE_KEY`, token hostingu)
  - Testy uruchomione (`lint`, `typecheck`, `test:unit`, `test:e2e`)
  - Build przetestowany lokalnie (`npm run build` + `npm run preview`)

### 12. Architektura kodu

- **Warstwa serwisowa** (`src/services/`): cała logika biznesowa i zapytania do DB. Serwisy otrzymują `SupabaseClient` przez konstruktor.
- **API routes** (`src/pages/api/`): każdy endpoint wymaga `export const prerender = false`. Walidacja Zod, obsługa błędów przez `src/utils/errors.ts`.
- **Schemas** (`src/schemas/`): schematy Zod dla walidacji requestów.
- **Middleware** (`src/middleware/index.ts`): ekstrakcja tokenu JWT i walidacja użytkownika (non-blocking async).

Szczegółowe plany API i DB: `.ai/api-plan.md`, `.ai/db-plan.md`, `.ai/endpoints/*.md`.

---

Plik ten powinien być aktualizowany w czasie — dodawaj tu migration notes, schematy tabel i przykłady RLS policy gdy powstaną.
