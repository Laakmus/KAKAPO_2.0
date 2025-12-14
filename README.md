# KAKAPO_2.0

Krótki opis

KAKAPO_2.0 to projekt oparty na Astro — prosty szablon strony statycznej/web app, przeznaczony jako punkt startowy do dalszego rozwoju.

## Wymagania

- Node.js >= 18
- npm (lub yarn/pnpm)

## Szybki start

W katalogu projektu:

```sh
# Zainstaluj zależności
npm install

# Uruchom serwer deweloperski
npm run dev

# Zbuduj wersję produkcyjną
npm run build

# Podejrzyj zbudowaną stronę lokalnie
npm run preview
```

Domyślny serwer deweloperski uruchamia się na `http://localhost:4321` (jeśli port nie został zmieniony w konfiguracji).

## Testy

Stack testowy (zgodnie z `.ai/test-plan.md`, **rekomendowany / planowany**):

- **Testy jednostkowe / integracyjne**: **Vitest** + **React Testing Library** (+ **MSW** do mockowania zapytań sieciowych, np. API/Supabase).
- **Testy E2E**: **Playwright**.

### Komendy

```sh
# Unit (Vitest)
npm run test:unit
npm run test:unit:watch
npm run test:unit:ui

# E2E (Playwright)
npm run pw:install
npm run test:e2e
npm run test:e2e:ui
```

## Struktura projektu

Przykładowa struktura (istotne pliki/foldery):

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/
│   │   └── astro.svg
│   ├── components/
│   │   └── Welcome.astro
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
└── package.json
```

## Skonfiguruj i rozwijaj

- Edytuj pliki w `src/pages` aby dodawać nowe strony.
- Twórz wielokrotnego użytku komponenty w `src/components`.
- Dodaj zasoby statyczne do `public/`.

## Przydatne linki

- Dokumentacja Astro: `https://docs.astro.build`
- Konfiguracja projektu: `astro.config.mjs`

## Kontakt / Wkład

Jeśli chcesz współtworzyć projekt — otwórz issue lub PR. Dodaj opis zmian i kroki do reprodukcji/uruchomienia.

---

Plik README zaktualizowany lokalnie — dopasuj treść do specyfiki projektu według potrzeb.
