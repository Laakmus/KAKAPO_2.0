# KAKAPO -- Platforma Wymiany (Barter)

Nowoczesna aplikacja webowa do wymiany produktów i usług bez pieniędzy. Użytkownicy tworzą oferty, przeglądają co inni chcą wymienić, są automatycznie łączeni gdy zainteresowanie jest wzajemne, rozmawiają na czacie i śledzą zrealizowane wymiany.

**Status**: Aktywnie rozwijany. Główne funkcjonalności działają -- patrz [Roadmapa](#roadmapa).

---

## Spis treści

- [Funkcjonalności](#funkcjonalności)
- [Stack technologiczny](#stack-technologiczny)
- [Architektura](#architektura)
- [Struktura projektu](#struktura-projektu)
- [Zbudowane z AI](#zbudowane-z-ai)
- [Uruchomienie](#uruchomienie)
- [Dostępne skrypty](#dostępne-skrypty)
- [Testowanie](#testowanie)
- [CI/CD](#cicd)
- [Decyzje technologiczne](#decyzje-technologiczne)
- [Roadmapa](#roadmapa)

---

## Funkcjonalności

- **Konta użytkowników** -- rejestracja, logowanie, zarządzanie profilem, zmiana hasła, usunięcie konta
- **Zarządzanie ofertami** -- tworzenie, edycja i usuwanie ofert z obsługą wielu zdjęć
- **Odkrywanie** -- przeglądanie ofert z wyszukiwaniem pełnotekstowym, filtrowaniem po mieście, sortowaniem i paginacją
- **Wzajemne dopasowanie** -- wyrażanie zainteresowania ofertami; gdy obie strony są zainteresowane, dopasowanie tworzy się automatycznie
- **Czat** -- dopasowani użytkownicy komunikują się bezpośrednio w celu ustalenia szczegółów wymiany
- **Śledzenie wymian** -- obie strony potwierdzają wymianę; zrealizowane transakcje zapisywane w historii
- **Profile publiczne** -- podgląd profili innych użytkowników i ich aktywnych ofert
- **Chronione trasy** -- strony zabezpieczone uwierzytelnianiem z automatycznym przekierowaniem
- **Feature flags** -- włączanie/wyłączanie funkcji bez ponownego wdrożenia

## Stack technologiczny

| Warstwa | Technologia |
|---|---|
| Framework | Astro 5 z React 19 (hybrydowe SSR) |
| Język | TypeScript (strict mode) |
| Stylowanie | Tailwind CSS 3 + shadcn/ui (prymitywy Radix UI) |
| Backend | Supabase -- PostgreSQL, Auth, Storage, Row-Level Security |
| Walidacja | Zod |
| Formularze | React Hook Form + Zod resolver |
| Testy jednostkowe | Vitest + React Testing Library |
| Testy E2E | Playwright (Page Object Model) |
| CI/CD | GitHub Actions, deployment na Cloudflare Pages |
| Linting | ESLint 9 + Prettier |

## Architektura

Aplikacja wykorzystuje warstwową architekturę z jasnym podziałem odpowiedzialności:

```
Strony Astro / Komponenty React
        |
    API Routes  (21 endpointów REST w src/pages/api/)
        |
    Serwisy     (logika biznesowa w src/services/)
        |
    Supabase    (PostgreSQL + polityki RLS + triggery)
```

Kluczowe decyzje architektoniczne:

- **Warstwa serwisów** -- wszystkie operacje bazodanowe i logika biznesowa żyją w klasach serwisowych, nigdy w endpointach API ani komponentach. Serwisy otrzymują klienta Supabase przez constructor injection.
- **Logika na poziomie bazy** -- triggery PostgreSQL obsługują wykrywanie wzajemnych dopasowań (automatyczne tworzenie czatów), finalizację wymian i zapobieganie samozainteresowaniu. Krytyczne reguły biznesowe są egzekwowane niezależnie od sposobu dostępu do danych.
- **Row-Level Security** -- każda tabela chroniona politykami RLS powiązanymi z JWT uwierzytelnionego użytkownika. Brak dodatkowych sprawdzeń autoryzacji w kodzie aplikacji.
- **Walidacja Zod** -- wszystkie granice API walidują dane wejściowe schematami Zod przed przetworzeniem.
- **Custom hooks** -- 23 hooki React enkapsulują zarządzanie stanem, wywołania API i logikę UI.
- **Server-side data injection** -- middleware Astro pobiera profil użytkownika i dane stron server-side, przekazując je jako props do React.

## Struktura projektu

```
src/
├── components/          # Komponenty React (60+) i Astro
│   └── ui/              # Bazowe komponenty shadcn/ui (Button, Card, Dialog, etc.)
├── contexts/            # Providery kontekstów React
├── db/                  # Klient Supabase i wygenerowane typy bazy
├── features/            # System feature flags
├── hooks/               # Custom hooki React (23 hooki)
├── layouts/             # Layouty stron Astro
├── lib/                 # Biblioteki narzędziowe (helper cn() do łączenia klas)
├── middleware/           # Middleware Astro (ekstrakcja JWT, server-side data injection)
├── pages/
│   ├── api/             # Endpointy REST API
│   │   ├── auth/        #   logowanie, rejestracja, wylogowanie
│   │   ├── chats/       #   lista czatów, wiadomości, szczegóły
│   │   ├── interests/   #   wyrażanie/wycofywanie zainteresowania, lista dopasowań
│   │   ├── offers/      #   CRUD, wyszukiwanie, paginacja
│   │   └── users/       #   profile, zarządzanie kontem
│   └── *.astro          # Trasy frontendowe
├── schemas/             # Schematy walidacji Zod
├── services/            # Warstwa serwisów (auth, offers, interests, chats, users)
├── styles/              # Style globalne
├── types.ts             # Współdzielone definicje typów TypeScript
└── utils/               # Obsługa błędów, funkcje pomocnicze, cookie auth
```

## Zbudowane z AI

Projekt został w pełni zbudowany w modelu **AI-assisted development** z wykorzystaniem Claude Code (Anthropic) jako głównego narzędzia programistycznego.

### Proces pracy z AI

1. **Planowanie** -- PRD, schemat bazy danych, specyfikacja API i plan UI zostały opracowane wspólnie z AI (dokumenty w katalogu `.ai/`)
2. **Implementacja** -- kod pisany iteracyjnie z AI: prompty opisujące wymagania → review wygenerowanego kodu → korekty i doprecyzowanie
3. **Debugging** -- złożone problemy (np. loading flash przy nawigacji) diagnozowane z wykorzystaniem wielu agentów AI równolegle analizujących różne aspekty kodu
4. **Optymalizacja** -- architektoniczne decyzje (server-side data injection, cookie auth) projektowane z AI i implementowane krok po kroku z weryfikacją na każdym etapie

### Dokumentacja planistyczna (`.ai/`)

| Dokument | Opis |
|---|---|
| `prd.md` | Dokument wymagań produktu -- wizja, user stories, wymagania funkcjonalne |
| `db-plan.md` | Schemat bazy danych, polityki RLS, triggery, indeksy |
| `api-plan.md` | Pełna specyfikacja REST API ze wszystkimi endpointami |
| `ui-plan.md` | Plan interfejsu użytkownika, ekrany, komponenty |
| `tech-stack.md` | Uzasadnienie wyboru technologii |
| `test-plan.md` | Strategia testowania (unit + E2E) |
| `feature-flag.md` | System feature flags |
| `image-upload-implementation.md` | Plan implementacji uploadu zdjęć |

### Narzędzia AI

- **Claude Code (CLI)** -- główne narzędzie do pisania kodu, refactoringu, debuggingu
- **Multi-agent workflow** -- równoległe uruchamianie agentów do eksploracji kodu, planowania architektury i code review

## Uruchomienie

### Wymagania

- Node.js >= 18
- Projekt [Supabase](https://supabase.com) (darmowy tier wystarczy)

### Setup

1. Sklonuj repozytorium:
   ```sh
   git clone https://github.com/Laakmus/KAKAPO_2.0.git
   cd KAKAPO_2.0
   ```

2. Zainstaluj zależności:
   ```sh
   npm install
   ```

3. Stwórz plik `.env` w katalogu głównym z danymi Supabase:
   ```
   PUBLIC_SUPABASE_URL=https://twoj-projekt.supabase.co
   PUBLIC_SUPABASE_KEY=twoj-anon-key
   ```

4. Uruchom serwer deweloperski:
   ```sh
   npm run dev
   ```

5. Otwórz [http://localhost:4321](http://localhost:4321) w przeglądarce.

### Build produkcyjny

```sh
npm run build     # Build do ./dist/
npm run preview   # Podgląd buildu produkcyjnego lokalnie
```

## Dostępne skrypty

| Komenda | Opis |
|---|---|
| `npm run dev` | Serwer deweloperski (localhost:4321) |
| `npm run build` | Build produkcyjny |
| `npm run preview` | Podgląd buildu produkcyjnego |
| `npm run lint` | ESLint |
| `npm run lint:fix` | Auto-naprawa problemów lint |
| `npm run format` | Formatowanie kodu Prettierem |
| `npm run format:check` | Sprawdzenie formatowania bez modyfikacji |
| `npm run typecheck` | Sprawdzenie typów TypeScript |
| `npm run test` | Wszystkie testy (unit + E2E) |
| `npm run test:unit` | Testy jednostkowe (Vitest) |
| `npm run test:unit:watch` | Testy jednostkowe w trybie watch |
| `npm run test:unit:ui` | Vitest UI |
| `npm run test:e2e` | Testy E2E (Playwright) |
| `npm run test:e2e:ui` | Playwright UI |
| `npm run test:e2e:headed` | Testy E2E w widocznej przeglądarce |
| `npm run shadcn` | Dodanie nowego komponentu shadcn/ui |

## Testowanie

Projekt ma dwie warstwy testów:

**Testy jednostkowe i integracyjne** -- Vitest z React Testing Library. Testy pokrywają hooki, serwisy, komponenty i funkcje narzędziowe. 288 testów w 60 plikach.

```sh
npm run test:unit          # Pojedyncze uruchomienie
npm run test:unit:watch    # Tryb watch
npm run test:unit:ui       # Wizualny UI
```

**Testy end-to-end** -- Playwright z wzorcem Page Object Model dla łatwego utrzymania testów. 7 plików specyfikacji.

```sh
npm run pw:install         # Instalacja przeglądarek (pierwszy raz)
npm run test:e2e           # Uruchomienie headless
npm run test:e2e:ui        # Wizualny UI
npm run test:e2e:headed    # Widoczna przeglądarka
npm run test:e2e:debug     # Tryb debug
```

## CI/CD

Pipeline GitHub Actions uruchamia się przy każdym pull requeście i przy pushach na `main`:

1. **Lint** -- sprawdzenie ESLint i Prettier
2. **Test** -- testy jednostkowe (Vitest) i E2E (Playwright) uruchamiane równolegle
3. **Build** -- weryfikacja buildu produkcyjnego
4. **Deploy** -- automatyczny deployment na Cloudflare Pages

## Decyzje technologiczne

- **Astro 5** -- wybrany za model hybrydowego renderowania. Statyczne strony gdzie możliwe, server-rendered gdzie potrzebne. Mniejsze bundle JS niż pełny framework SPA.
- **React 19** -- używany jako integracja Astro dla interaktywnych komponentów UI. Architektura wysp (islands) utrzymuje nieinteraktywne strony lekkie.
- **Supabase** -- dostarcza PostgreSQL, uwierzytelnianie, storage plików i row-level security w jednej zarządzanej usłudze. Polityki RLS i triggery bazodanowe trzymają autoryzację i reguły biznesowe blisko danych.
- **shadcn/ui** -- nie zależność biblioteki komponentów, ale kopiowane, konfigurowalne komponenty zbudowane na Radix UI. Pełna kontrola nad stylowaniem z dostępnością obsługiwaną przez prymitywy Radix.
- **Zod** -- walidacja typów w runtime na granicach API, zintegrowana z React Hook Form (klient) i endpointami API (serwer).
- **Vitest + Playwright** -- Vitest do szybkich testów jednostkowych z natywnym wsparciem ESM; Playwright do niezawodnych testów E2E cross-browser z wzorcem Page Object Model.
- **Cloudflare Pages** -- deployment na edge z adapterem Cloudflare dla Astro.

## Roadmapa

- [ ] Real-time czat przez WebSocket/Supabase Realtime
- [ ] Powiadomienia push dla nowych dopasowań i wiadomości
- [ ] Optymalizacja obrazów i lazy loading dla galerii ofert
- [ ] Ulepszenia responsywności mobilnej i wsparcie PWA

---

## Licencja

Projekt nie jest aktualnie publikowany na licencji open-source. Skontaktuj się z autorem w sprawie uprawnień do użycia.
