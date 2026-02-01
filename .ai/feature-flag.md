# Plan: Moduł Feature Flags

## Cel

Stworzyć moduł `src/features/` dający type-safe system flag funkcjonalności, używalny w endpointach API, stronach Astro i komponentach React. API asynchroniczne od początku (pod przyszłą migrację na remote config).

## Struktura modułu

```
src/features/
├── types.ts                # Typy TS (Environment, FeatureFlag)
├── flags.ts                # Konfiguracja flag per środowisko
├── index.ts                # Publiczne API: isFeatureEnabled(), getAllFlags()
└── FeatureFlagProvider.tsx  # React context + hook useFeatureFlag()
```

## Kluczowe decyzje projektowe

- **Async API** (`await isFeatureEnabled('nazwa-flagi')`) po stronie serwera - umożliwi przyszłą migrację na remote config bez zmiany konsumentów
- **Zmienna `ENV_NAME`** (bez prefixu `PUBLIC_`) - dostępna tylko server-side
- **React dostaje flagi przez props** - strony Astro rozwiązują flagi server-side i przekazują do React przez context provider
- **Domyślnie wyłączone** - niezdefiniowane flagi zwracają `false` (bezpieczne domyślnie)
- **Jedno źródło prawdy** - konfiguracja flag w `flags.ts`, typowana unią `FeatureFlag`

## Kształt konfiguracji

```typescript
type Environment = 'local' | 'integration' | 'prod';
type FeatureFlag = 'chat-feature' | 'interest-feature' | 'user-profiles';

const FLAGS: Record<FeatureFlag, Record<Environment, boolean>> = {
  'chat-feature':      { local: true, integration: true, prod: true },
  'interest-feature':  { local: true, integration: true, prod: true },
  'user-profiles':     { local: true, integration: true, prod: true },
};
```

## Publiczne API

### Server-side (endpointy API, strony Astro)

```typescript
import { isFeatureEnabled, getAllFlags } from '@/features';

// Sprawdzenie pojedynczej flagi
if (!await isFeatureEnabled('chat-feature')) { ... }

// Pobranie wszystkich flag dla bieżącego środowiska (do przekazania do React)
const flags = await getAllFlags();
```

### Client-side (komponenty React)

```tsx
// W stronie Astro (server-side):
const flags = await getAllFlags();
// <MojKomponent client:load flags={flags} />

// W React - provider opakowuje aplikację:
<FeatureFlagProvider flags={flags}>
  <App />
</FeatureFlagProvider>

// W dowolnym komponencie React:
const chatEnabled = useFeatureFlag('chat-feature');
```

## Początkowe flagi

Wszystkie włączone wszędzie (żeby niczego nie zepsuć). Służą jako przykłady wzorca:

| Flaga | Cel |
|-------|-----|
| `chat-feature` | Funkcjonalność czatu |
| `interest-feature` | System zainteresowań/matchowania |
| `user-profiles` | Publiczne profile użytkowników |

## Pliki do stworzenia

1. **`src/features/types.ts`** - typy `Environment`, `FeatureFlag`, `FeatureFlagRecord`
2. **`src/features/flags.ts`** - mapa konfiguracji flag
3. **`src/features/index.ts`** - `isFeatureEnabled()`, `getAllFlags()`, `getEnvironment()`
4. **`src/features/FeatureFlagProvider.tsx`** - React context, komponent `FeatureFlagProvider`, hook `useFeatureFlag()`

## Pliki do zmodyfikowania

- **`.env`** - dodanie `ENV_NAME=local`

Brak integracji z istniejącymi stronami/endpointami w tym kroku (integracja w następnym kroku).

## Weryfikacja

1. `npm run lint` - przechodzi
2. `npm run build` - przechodzi
