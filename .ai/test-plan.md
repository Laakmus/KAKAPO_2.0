Oto kompleksowy plan testów dla projektu **Kakapo** (nazwa wywnioskowana z komponentu `TopNavBar`), platformy wymiany barterowej opartej na Astro, React, TypeScript i Supabase.

---

# Plan Testów i Zapewnienia Jakości (QA) dla Projektu Kakapo

## 1. Podsumowanie Projektu

**Opis aplikacji:**
Kakapo to platforma webowa umożliwiająca użytkownikom wymianę towarów (barter). Użytkownicy mogą rejestrować się, wystawiać oferty (z opisem, zdjęciami i lokalizacją), przeglądać oferty innych, wyrażać zainteresowanie oraz prowadzić czaty w celu finalizacji wymiany.

**Architektura:**

- **Frontend:** Astro (SSR + Static) z "wyspami" React (Components).
- **Styling:** Tailwind CSS + Shadcn/UI.
- **Backend/API:** Astro API Endpoints (`pages/api/*`).
- **Baza Danych & Auth:** Supabase.
- **Zarządzanie stanem:** React Context (`AuthContext`, `ToastContext`) oraz Custom Hooks.

**Kluczowe moduły do przetestowania:**

1.  **Autentykacja i Profil:** Rejestracja, logowanie, edycja profilu, usuwanie konta (szczególnie krytyczne ze względu na RLS i bezpieczeństwo danych).
2.  **Zarządzanie Ofertami:** CRUD ofert, upload zdjęć, filtrowanie i paginacja.
3.  **Interakcje (Zainteresowania):** Wyrażanie zainteresowania (Interest), mechanizm "matchowania".
4.  **Komunikacja (Chat):** Wysyłanie wiadomości w czasie rzeczywistym (lub near-real-time), statusy wymiany (PROPOSED, ACCEPTED, REALIZED).

**Ocena Ryzyka:**

- **Wysokie:** Niespójność stanu autoryzacji pomiędzy Astro (server) a React (client), błędy w logice statusów wymiany (blokada możliwości finalizacji), wyciek danych użytkowników przez błędy w RLS (Row Level Security).
- **Średnie:** Problemy z uploadem zdjęć, błędy walidacji formularzy.

---

## 2. Strategia Testowania

Z uwagi na hybrydową naturę Astro (Server + Client), strategia musi obejmować obie warstwy.

### A. Testy Jednostkowe (Unit Tests)

Skupienie na logice biznesowej i izolowanych funkcjach.

- **Schemas (Zod):** Weryfikacja poprawności walidacji danych wejściowych (`schemas/*.ts`).
- **Utils:** Funkcje pomocnicze (`utils/*.ts`), np. formatowanie dat, obsługa błędów.
- **Hooks:** Testowanie logiki stanowej w izolacji (`hooks/use*.ts`), np. czy `useOffersList` poprawnie zarządza stanem loading/error.
- **UI Components:** Testowanie komponentów "pure" (np. `Button`, `OfferCard`) pod kątem renderowania propsów.

### B. Testy Integracyjne (Integration Tests)

Testowanie współpracy modułów.

- **Komponenty z Contextem:** Testowanie formularzy (`LoginForm`, `OfferForm`) w otoczeniu `AuthProvider` i `ToastProvider`.
- **API Endpoints:** Testowanie endpointów `/api/*` przy użyciu mocków Supabase (sprawdzenie kodów odpowiedzi 200, 400, 401, 403, 404).

### C. Testy End-to-End (E2E)

Symulacja zachowania użytkownika na gotowej aplikacji.

- Ścieżka krytyczna: Rejestracja -> Dodanie oferty -> Wylogowanie -> Logowanie innego usera -> Wyrażenie zainteresowania -> Chat -> Finalizacja.
- Testowanie przepływów na różnych viewportach (Desktop vs Mobile).

---

## 3. Narzędzia Testowe

Rekomendowany stack technologiczny ("Modern Web"):

| Typ testu              | Narzędzie                     | Uzasadnienie                                                                                                                  |
| :--------------------- | :---------------------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| **Unit / Integration** | **Vitest**                    | Najszybszy runner, natywna obsługa Vite (używanego przez Astro), kompatybilny z API Jest.                                     |
| **Testy Komponentów**  | **React Testing Library**     | Standard branżowy do testowania komponentów React z perspektywy użytkownika.                                                  |
| **E2E**                | **Playwright**                | Szybki, niezawodny, świetna obsługa wielu "kontekstów" przeglądarki (idealne do testowania chatu między dwoma użytkownikami). |
| **Mocking**            | **MSW (Mock Service Worker)** | Do przechwytywania zapytań sieciowych na poziomie API/Supabase.                                                               |
| **Static Analysis**    | **ESLint + Prettier**         | Zapewnienie jakości kodu przed uruchomieniem testów.                                                                          |

---

## 4. Konkretne Przypadki Testowe (Test Cases)

### Moduł: Autentykacja (Auth)

| ID      | Nazwa Testu             | Cel                              | Kroki                                                                                        | Oczekiwany Rezultat                                                                       | Priorytet |
| :------ | :---------------------- | :------------------------------- | :------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------- | :-------- |
| AUTH-01 | Rejestracja - Walidacja | Sprawdzenie walidacji formularza | 1. Otwórz `/signup`<br>2. Wpisz błędny email i krótkie hasło<br>3. Kliknij "Zarejestruj się" | Wyświetlenie komunikatów błędów pod polami (zgodnie z Zod schema). Nie wysłano requestu.  | Średni    |
| AUTH-02 | Logowanie - Sukces      | Weryfikacja poprawnego logowania | 1. Otwórz `/login`<br>2. Podaj poprawne dane<br>3. Submit                                    | Przekierowanie do `/offers`, token zapisany w `localStorage` (via `useLogin`).            | Wysoki    |
| AUTH-03 | Usuwanie Konta          | Weryfikacja "Destructive Action" | 1. Wejdź w Profil -> Usuń konto<br>2. Podaj błędne hasło<br>3. Podaj poprawne hasło          | Błąd przy błędnym haśle. Przy poprawnym: wylogowanie, usunięcie danych, redirect na Home. | Wysoki    |

### Moduł: Oferty (Offers)

| ID     | Nazwa Testu               | Cel                          | Kroki                                                                                                    | Oczekiwany Rezultat                                                                      | Priorytet |
| :----- | :------------------------ | :--------------------------- | :------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------- | :-------- |
| OFF-01 | Dodanie Oferty            | Sprawdzenie `useCreateOffer` | 1. Zaloguj się<br>2. `/offers/new` -> Wypełnij formularz<br>3. Dodaj zdjęcie (mock)<br>4. Wybierz miasto | Oferta utworzona, redirect do szczegółów, Toast "Sukces".                                | Wysoki    |
| OFF-02 | Lista Ofert - Filtrowanie | Sprawdzenie filtrów          | 1. Wejdź na `/offers`<br>2. Wybierz miasto "Warszawa"<br>3. Sortuj "Cena rosnąco"                        | Lista odświeża się, pokazują się tylko oferty z Warszawy. EmptyState jeśli brak wyników. | Średni    |
| OFF-03 | Edycja Oferty             | Sprawdzenie uprawnień        | 1. Wejdź w "Moje Oferty"<br>2. Edytuj ofertę<br>3. Zmień tytuł                                           | Zmiana zapisana.                                                                         | Średni    |

### Moduł: Chat i Interakcje

| ID      | Nazwa Testu               | Cel                             | Kroki                                                                                                        | Oczekiwany Rezultat                                                         | Priorytet |
| :------ | :------------------------ | :------------------------------ | :----------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------- | :-------- |
| CHAT-01 | Wyrażenie zainteresowania | Integracja Offers <-> Interests | 1. User A otwiera ofertę Usera B<br>2. Klika "Jestem zainteresowany"                                         | Przycisk zmienia stan na "Anuluj", licznik zainteresowanych rośnie.         | Wysoki    |
| CHAT-02 | Wymiana wiadomości        | Real-time / Optimistic UI       | 1. User A wchodzi w czat z User B<br>2. Pisze wiadomość<br>3. Enter                                          | Wiadomość pojawia się na liście (`MessagesList`), pole tekstowe czyszczone. | Wysoki    |
| CHAT-03 | Finalizacja wymiany       | Logika statusów                 | 1. Status 'ACCEPTED'<br>2. User A klika "Potwierdzam realizację"<br>3. User B klika "Potwierdzam realizację" | Status zmienia się na 'REALIZED', oferta znika z aktywnych.                 | Wysoki    |

---

## 5. Konfiguracja i Przykłady Kodu

### A. Konfiguracja środowiska (Vitest)

Utwórz plik `vitest.config.ts`:

```typescript
/// <reference types="vitest" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    environment: 'jsdom', // Wymagane dla komponentów React
    setupFiles: ['./src/tests/setup.ts'],
    globals: true, // Pozwala używać describe/it bez importów
  },
});
```

### B. Unit Test: Walidacja Schema (Zod)

Testowanie `src/schemas/auth.schema.ts`.

```typescript
// src/schemas/__tests__/auth.schema.test.ts
import { describe, it, expect } from 'vitest';
import { loginSchema } from '../auth.schema';

describe('Auth Schema Validation', () => {
  it('should validate correct login data', () => {
    const validData = { email: 'test@example.com', password: 'password123' };
    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalidData = { email: 'not-an-email', password: 'password123' };
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('email'); // Zakładając, że taki jest komunikat
    }
  });

  it('should reject short password', () => {
    const invalidData = { email: 'test@example.com', password: '123' };
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
```

### C. Integration Test: Komponent Logowania

Testowanie `src/components/LoginForm.tsx` z mockowaniem hooka.

```tsx
// src/components/__tests__/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '../LoginForm';
import { vi } from 'vitest';
import * as useLoginHook from '@/hooks/useLogin';

// Mock hooka useLogin
const mockLogin = vi.fn();
vi.spyOn(useLoginHook, 'useLogin').mockReturnValue({
  login: mockLogin,
  isLoading: false,
  notification: undefined,
  clearNotification: vi.fn(),
});

describe('LoginForm Component', () => {
  it('should render form fields', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hasło/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /zaloguj/i })).toBeInTheDocument();
  });

  it('should call login function on valid submission', async () => {
    mockLogin.mockResolvedValue({ success: true, data: { access_token: 'fake' } });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByLabelText(/hasło/i), { target: { value: 'secret123' } });

    fireEvent.click(screen.getByRole('button', { name: /zaloguj/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'secret123',
      });
    });
  });

  it('should display validation errors for empty fields', async () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: /zaloguj/i }));

    // Oczekujemy walidacji HTML5 lub React Hook Form
    // Uwaga: Tutaj testujemy czy funkcja login NIE została wywołana
    expect(mockLogin).not.toHaveBeenCalled();
  });
});
```

### D. E2E Test: Playwright

Scenariusz tworzenia oferty.

```typescript
// tests/e2e/create-offer.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Offer Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Logowanie przed każdym testem (można przenieść do global setup)
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/offers');
  });

  test('should allow a logged-in user to create an offer', async ({ page }) => {
    await page.goto('/offers/new');

    // Wypełnianie formularza
    await page.fill('input[name="title"]', 'Rower górski na wymianę');
    await page.fill('textarea[name="description"]', 'Bardzo dobry stan, mało używany.');

    // Obsługa selecta (Shadow DOM lub natywny select w zależności od implementacji komponentu CitySelect)
    // Zakładając standardowy select lub Radix UI trigger:
    await page.click('button#city'); // Otwarcie selecta
    await page.click('text=Warszawa'); // Wybór opcji

    // Submit
    await page.click('button:has-text("Dodaj ofertę")');

    // Asercja sukcesu - przekierowanie do szczegółów
    await expect(page).toHaveURL(/\/offers\/[a-zA-Z0-9-]+/);
    await expect(page.locator('h1')).toContainText('Rower górski na wymianę');
    await expect(page.getByText('Warszawa')).toBeVisible();
  });
});
```

---

## 6. Metryki i Definition of Done

**Docelowe pokrycie kodu:**

- **Logika biznesowa (Hooks/Utils):** > 90%
- **Komponenty UI:** > 70%
- **Strony (Pages):** Pokryte przez testy E2E.

**Kluczowe Wskaźniki (KPIs):**

- Czas wykonania wszystkich testów < 5 min (dla CI/CD).
- 0 błędów krytycznych (Blocker/Critical) w raporcie SonarQube/ESLint.

**Definition of Done (DoD) dla Testów:**

1.  Wszystkie testy jednostkowe przechodzą na lokalnym środowisku.
2.  Testy E2E dla "Happy Path" nowej funkcjonalności zostały napisane i przechodzą.
3.  Brak błędów dostępności (mierzone np. przez `axe-core` w Playwright).
4.  Kod testowy przeszedł Review (podobnie jak kod produkcyjny).

---

## 7. Plan Implementacji

| Faza       | Zakres                                                                                         | Czas trwania | Uwagi                                                                       |
| :--------- | :--------------------------------------------------------------------------------------------- | :----------- | :-------------------------------------------------------------------------- |
| **Faza 1** | Konfiguracja Vitest, Playwright, CI Pipeline. Unit testy dla `schemas` i `utils`.              | 2-3 dni      | Fundament pod dalsze prace.                                                 |
| **Faza 2** | Unit/Integration testy dla kluczowych Hooków (`useAuth`, `useCreateOffer`) i komponentów Auth. | 3-4 dni      | Zabezpieczenie logowania.                                                   |
| **Faza 3** | E2E testy dla ścieżek krytycznych (Tworzenie oferty, Chat).                                    | 4-5 dni      | Największa wartość biznesowa. Mockowanie Supabase w E2E może być wyzwaniem. |
| **Faza 4** | Testy brzegowe, obsługa błędów, loading states (Skeletons).                                    | 2-3 dni      | Poprawa UX i stabilności.                                                   |

**Zależności i Blokery:**

- Dostępność instancji testowej Supabase (lub lokalnego emulatora Supabase CLI) jest krytyczna dla testów E2E i integracyjnych API. Należy skonfigurować lokalne środowisko Supabase przed Faza 2.
