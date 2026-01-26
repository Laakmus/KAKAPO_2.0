# Plan implementacji widoku Główny layout aplikacji

## 1. Przegląd

Główny layout aplikacji to shell wszystkich tras chronionych (`/offers*`, `/profile`, `/chats*`, `/users/*`). Zapewnia spójny układ z górnym paskiem nawigacji, kontenerem treści oraz miejscem na globalne komunikaty. Dodatkowo oddelegowuje obsługę sesji — weryfikuje obecność ważnego JWT, przekierowuje nieautoryzowanych i eksponuje mechanizm wylogowania opartego o `POST /auth/logout`.

## 2. Routing widoku

- Główny layout osadzony w komponencie-ruterze Astro lub `src/layouts` i renderowany jako wrapper dla `/offers/*`, `/profile`, `/chats/*`, `/users/*`.
- Dodatkowo może być używany na innych trasach, które wymagają autoryzacji (np. `/offers/new`, `/users/me`), przez „layout nesting” Astro: `src/layouts/ProtectedLayout.astro` lub Reactowy komponent kolejnego poziomu.

## 3. Struktura komponentów

- `AuthenticatedLayout` (root shell)
  - `TopNavBar`
  - `MainContentContainer`
  - `GlobalToastArea`
  - `AuthGuard` helper (preloader, redirect)

## 4. Szczegóły komponentów

### AuthenticatedLayout

- **Opis**: Reprezentuje shell chronionej sekcji aplikacji. Wczytuje aktualny token (z cookie, localStorage lub contextu Supabase) i steruje widocznością zawartości.
- **Główne elementy**: `header` z `TopNavBar`, `main` jako kontener dla slotu Astro/`children`, `div` z `GlobalToastArea`.
- **Obsługiwane interakcje**: automatyczny redirect (w oparciu o hook `useProtectedRoute`), odświeżanie profilu (fetch `GET /api/users/me`).
- **Obsługiwana walidacja**: sprawdzanie obecności i poprawności tokena; w przypadku braku/ważności → przekierowanie na `/login` i pokazanie toastu (zgodnie z US-023).
- **Typy**: `LayoutProps = { children: ReactNode }`, `SessionState = { userId: string; token: string; status: 'loading' | 'authenticated' | 'unauthenticated' }`.
- **Propsy**: `children`, ewentualnie `initialUser` (profil z serwera).

### TopNavBar

- **Opis**: Stały pasek nawigacji widoczny na wszystkich chronionych stronach. Zawiera logo/nazwę, linki oraz przycisk logout.
- **Główne elementy**: `nav` z listą `NavLink`, `button` logout, `span` z nazwą użytkownika (na podstawie profilu), `Logo` jako link do `/offers`.
- **Obsługiwane interakcje**: kliknięcia w linki zmieniają trasę (Astro `<Link>` lub `useRouter`), kliknięcie `Wyloguj` wywołuje `logoutHandler`.
- **Obsługiwana walidacja**: ostrożna zmiana aktywnego linku (porównanie z `location.pathname`), brak aktywnego stanu dla `/offers/*` vs `/chats/*`.
- **Typy**:
  - `NavItem = { label: string; href: string; testId?: string }`
  - `TopNavProps = { navItems: NavItem[]; activePath: string; onLogout: () => Promise<void>; userLabel?: string }`
- **Propsy**: `navItems`, `activePath`, `onLogout`, `userLabel`.

### LogoutButton (część TopNavBar)

- **Opis**: Rozszerzony przycisk w pasku nawigacji.
- **Elementy**: `button` z ikoną/tekstem.
- **Zdarzenia**: `onClick` uruchamia `logoutFlow` (z `useLogout` hookiem), wstrzymanie podwójnych klików, pokazanie loadera.
- **Walidacja**: sprawdza flagę `isLoggingOut` i obecność tokena.
- **Propsy**: `isDisabled`, `isLoading`.

### MainContentContainer

- **Opis**: Kontener `main` dla aktualnie renderowanego widoku (przekazywanego przez `children` w Astro/React).
- **Elementy**: `main` z `role="main"`, optional `section` z paddingiem/Tailwind classes.
- **Interakcje**: reaguje na `onRouteChange` (scroll top, focus), udostępnia slot do pageable content.
- **Walidacja**: brak (zajmuje się layoutem), ale sprawdza `isAuthenticated` w propsach (render `Skeleton`/spinner w czasie ładowania).
- **Propsy**: `children: ReactNode`, `isLoading: boolean`.

### GlobalToastArea

- **Opis**: Obsługuje wyświetlanie alertów/komunikatów (z `NotificationMessage` z `src/types.ts`).
- **Elementy**: `div` z `role="status"`, listą toastów (np. `shadcn/ui` `Toast`), `button` zamykania.
- **Zdarzenia**: `onClose` usuwa toast, `onAction` (np. przycisk „Ponów” dla błędu sieciowego).
- **Walidacja**: zapewnia, że toasty o typie `error` mają CTA, a `success` cest style w Tailwind.
- **Typy**: `NotificationMessage` (existing), `ToastContextValue = { messages: NotificationMessage[]; push: (msg: NotificationMessage) => void; remove: (id: string) => void }`.
- **Propsy**: `messages`, `onRemove`.

### AuthGuard Hook (`useProtectedRoute`)

- **Opis**: Hook/komponent pomocniczy sprawdzający sesję i decydujący o renderowaniu layoutu.
- **Zdarzenia**: `useEffect` wywołuje `GET /api/users/me` w celu weryfikacji tokenu i ustawienia `userProfile`.
- **Walidacja**: sprawdza `response.status` 200/401/403/500; w przypadku błędu 401/403 → `redirect('/login')`, 5xx → toast z CTA „Ponów”.
- **Typy**: `ProtectedRouteState = { status: 'loading' | 'ready' | 'redirect'; profile?: UserProfileDTO; error?: ApiErrorResponse }`.
- **Propsy**: `token`, `onUnauthorized`.

## 5. Typy

- `LayoutNavItem`: `{ label: string; href: string; icon?: ReactNode; exact?: boolean; testId?: string }`
- `LayoutContextValue`: `{ user?: UserProfileDTO; token?: string; isLoading: boolean; logout: () => Promise<void>; setToast: ToastContextValue['push']; }`
- `ToastMessage`: `NotificationMessage` (type + text + id + action?). Extends existing type with `actionLabel?: string`, `onAction?: () => void`.
- `LogoutPayload`: `{ token: string; allDevices?: boolean }`
- `AuthenticatedLayoutProps`: extends above (maybe `initialProfile?: UserProfileDTO`).
- `ProtectedRouteOptions`: includes `redirectPath`, `onError`.
- `NavActiveState`: `'home' | 'offers' | 'profile' | 'chat'`.

## 6. Zarządzanie stanem

- `useAuthState` (custom hook) utrzymuje `token` (z cookie/localStorage), `userProfile`, `status`.
- `useLogout` hook: przeprowadza `fetch('/api/auth/logout', { headers: { Authorization } })`, zarządza flagami `isLoggingOut`, `error`.
- `useToast` context: kolejka toastów (array z ID, type, text). Udostępnia `pushNotification`/`dismissNotification`.
- `useProtectedRoute`: łączy powyższe, ustawia `isProtectedReady`.
- Stan lokalny `activeNav` (np. `useMemo` z `pathname`, `slug`).
- Wzorce: `React.Context` z `AuthProvider` i `ToastProvider`, `useEffect` do eskalacji redirectu.

## 7. Integracja API

- `GET /api/users/me`: (z `users-me` endpointu) fetchowany w `useProtectedRoute` albo `AuthenticatedLayout` na mount. Nagłówek `Authorization: Bearer ${token}` i obsługa statusów 200/401/500. Odpowiedź mapujemy na `UserProfileDTO`.
- `POST /api/auth/logout`: `logoutFlow` w `useLogout` w TopNavBar. Wysyłamy token (nagłówek Authorization). W przypadku 200 resetujemy token, czyścimy sesję i redirectujemy na `/login`. Obsługujemy statusy 401/404/500 według endpointu (np. 401 → toast + redirect).
- W razie błędu sieciowego (US-025) toast z `actionLabel: 'Ponów'` i `onAction` ponowny fetch.

## 8. Interakcje użytkownika

- Kliknięcie logo/nawigacji → zmiana trasy; aktywny link otrzymuje styl `text-primary`.
- Kliknięcie „Wyloguj” → `useLogout` wywołuje API, pokazuje spinner, w przypadku sukcesu redirect `/login`. Błędy (401/500) wyświetlają toast z CTA lub automatyczne przekierowanie/odświeżenie tokena.
- Brak tokena / 401 podczas load → `useProtectedRoute` pokazuje overlay lub toast „Zaloguj się ponownie” i przekierowuje.
- Sieć offline podczas fetchów → toast z `Ponów` (usługa `useToast`) i możliwość ponowienia akcji (np. fetch profilu).
- Każdy toast ma `aria-live="assertive"` i `role="status"` (dostępność).
- Nawigacja prostym `focus ring`, `aria-current` w aktywnym linku.

## 9. Warunki i walidacja

- Sprawdzenie tokena przy każdym wejściu (hook `useProtectedRoute`). Brak tokena → redirect `/login`.
- Walidacja `NavItem.href` (aktywny path) (np. `startsWith('/offers')` vs `/offers/new`).
- Logout nie wykonuje się jeśli token nie istnieje; `useLogout` sprawdza, `throw new Error('Token missing')`.
- Warunki API (np. 401) sygnalizowane toastem i/lub redirectem.
- Intencja `GlobalToastArea` waliduje typ: `success|error`.

## 10. Obsługa błędów

- Błąd 401/403 z `/api/users/me`: wyświetli toast „Sesja wygasła”, wywoła `resetSession` i redirect do `/login`.
- Błąd 500/timeout: toast z `Ponów` (US-025) i `setRetry(() => fetchProfile())`.
- Błąd logoutu (500/501/404): toast error, ale w przypadku 404 (nieznaleziono sesji) mimo to przekierowujemy do `/login`.
- Brak tokena w localStorage: `useAuthState` ustawia `unauthenticated`.
- Błąd w `useToast` (np. push bez text) logowany w konsoli, ale nie blokuje UI.

## 11. Kroki implementacji

1. Utwórz `AuthenticatedLayout` w `src/layouts` (Astro lub React) z kontektsem `AuthContext` i `ToastContext`, z wrapperem `MainContentContainer`.
2. Wdroż `TopNavBar` i `LogoutButton`, z `navItems` dla Home, Moje Oferty, Profil, Chat i wyświetleniem logo. Upewnij się, że aktywny link używa `aria-current`.
3. Stwórz `useAuthState` + `useProtectedRoute`: fetch `/api/users/me`, ustaw `UserProfileDTO`, reaguj na 401/403.
4. Dodaj `useToast` provider i `GlobalToastArea`, aby inne komponenty mogły wyświetlać komunikaty (include CTA Ponów).
5. W `useLogout` wywołaj `POST /api/auth/logout`, czyść tokeny i `redirect('/login')` oraz emituj odpowiedni toast.
6. Zintegruj layout w plikach routes (`/offers`, `/profile`, `/chats`, `/users/:id`) — owijaj w `AuthenticatedLayout`.
7. Dopilnuj stylizacji Tailwind (`flex`, `max-w`, `spacing`) oraz dostępności (`aria-live`, `focus-visible`, `contrast`).
8. Przemyśl fallbacky (np. skeleton) podczas ładowania `userProfile`.
9. Przetestuj scenariusze: brak tokena, logout success/fail, API timeout, toast queue.
10. Dodaj dokumentację (np. README) opisującą sposób użycia layoutu i hooków.
