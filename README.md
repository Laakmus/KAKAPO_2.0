# KAKAPO - Barter Exchange Platform

A modern web application for bartering goods and services without money. Users create offers, discover what others have to trade, get matched when interest is mutual, chat to arrange details, and track completed exchanges.

**Status**: Actively developed. Core features are functional; see [Roadmap](#roadmap) for planned improvements.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [CI/CD](#cicd)
- [Tech Decisions](#tech-decisions)
- [Roadmap](#roadmap)

---

## Features

- **User accounts** -- registration, login, profile management, password change, account deletion
- **Offer management** -- create, edit, and delete offers with multi-image upload
- **Discovery** -- browse offers with full-text search, city filtering, sorting, and pagination
- **Mutual matching** -- express interest in offers; when both sides are interested, a match is created automatically
- **Chat** -- matched users communicate directly to arrange exchange details
- **Exchange tracking** -- both parties confirm the exchange; completed trades are recorded in history
- **Public profiles** -- view other users' profiles and their active offers
- **Protected routes** -- authentication-gated pages with automatic redirects
- **Feature flags** -- toggle features on and off without redeployment

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Astro 5 with React 19 (hybrid SSR) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 3 + shadcn/ui (Radix UI primitives) |
| Backend | Supabase -- PostgreSQL, Auth, Storage, Row-Level Security |
| Validation | Zod |
| Forms | React Hook Form + Zod resolver |
| Unit testing | Vitest + React Testing Library |
| E2E testing | Playwright (Page Object Model) |
| CI/CD | GitHub Actions, deployed to Cloudflare Pages |
| Linting | ESLint 9 + Prettier |

## Architecture

The application follows a layered architecture with clear separation of concerns:

```
Astro Pages / React Components
        |
    API Routes  (21 REST endpoints in src/pages/api/)
        |
    Services    (business logic in src/services/)
        |
    Supabase    (PostgreSQL + RLS policies + triggers)
```

Key architectural decisions:

- **Service layer** -- all database operations and business logic live in service classes, never in API routes or components. Services receive a Supabase client via constructor injection.
- **Database-level logic** -- PostgreSQL triggers handle mutual match detection (auto-creating chats), exchange completion, and self-interest prevention. This keeps critical business rules enforceable regardless of how data is accessed.
- **Row-Level Security** -- every table is protected by RLS policies tied to the authenticated user's JWT. No additional authorization checks needed in application code.
- **Zod validation** -- all API boundaries validate input with Zod schemas before processing.
- **Custom hooks** -- 23 React hooks encapsulate state management, API calls, and UI logic for a clean component layer.
- **Middleware-based auth** -- Astro middleware extracts JWT tokens and attaches the authenticated user to request context.

## Project Structure

```
src/
├── components/          # React components (60+) and Astro components
│   └── ui/              # shadcn/ui base components (Button, Card, Dialog, etc.)
├── contexts/            # React context providers
├── db/                  # Supabase client and generated database types
├── features/            # Feature flag system
├── hooks/               # Custom React hooks (23 hooks)
├── layouts/             # Astro page layouts
├── lib/                 # Utility libraries (cn() class merging helper)
├── middleware/           # Astro middleware (JWT auth extraction)
├── pages/
│   ├── api/             # REST API endpoints
│   │   ├── auth/        #   login, signup, logout
│   │   ├── chats/       #   chat listing, messages, details
│   │   ├── interests/   #   express/withdraw interest, list matches
│   │   ├── offers/      #   CRUD, search, pagination
│   │   └── users/       #   profiles, account management
│   └── *.astro          # Frontend page routes
├── schemas/             # Zod validation schemas
├── services/            # Service layer (auth, offers, interests, chats, users)
├── styles/              # Global styles
├── types.ts             # Shared TypeScript type definitions
└── utils/               # Error handling, helper functions
```

## Getting Started

### Prerequisites

- Node.js >= 18
- A [Supabase](https://supabase.com) project (free tier works)

### Setup

1. Clone the repository:
   ```sh
   git clone https://github.com/your-username/kakapo.git
   cd kakapo
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Create a `.env` file in the project root with your Supabase credentials:
   ```
   PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   PUBLIC_SUPABASE_KEY=your-anon-key
   ```

4. Start the development server:
   ```sh
   npm run dev
   ```

5. Open [http://localhost:4321](http://localhost:4321) in your browser.

### Production Build

```sh
npm run build     # Build to ./dist/
npm run preview   # Preview the production build locally
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server (localhost:4321) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without modifying files |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run test` | Run all tests (unit + E2E) |
| `npm run test:unit` | Run unit tests (Vitest) |
| `npm run test:unit:watch` | Run unit tests in watch mode |
| `npm run test:unit:ui` | Open Vitest UI |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run test:e2e:ui` | Open Playwright UI |
| `npm run test:e2e:headed` | Run E2E tests in headed browser |
| `npm run shadcn` | Add a new shadcn/ui component |

## Testing

The project has two testing layers:

**Unit and integration tests** use Vitest with React Testing Library. Tests cover hooks, services, components, and utility functions.

```sh
npm run test:unit          # Single run
npm run test:unit:watch    # Watch mode
npm run test:unit:ui       # Visual UI
```

**End-to-end tests** use Playwright with a Page Object Model pattern for maintainable test structure.

```sh
npm run pw:install         # Install browsers (first time)
npm run test:e2e           # Headless run
npm run test:e2e:ui        # Visual UI
npm run test:e2e:headed    # Headed browser
npm run test:e2e:debug     # Debug mode
```

## CI/CD

The GitHub Actions pipeline runs on every pull request and on pushes to `main`:

1. **Lint** -- ESLint and Prettier checks
2. **Test** -- unit tests (Vitest) and E2E tests (Playwright) run in parallel
3. **Build** -- production build verification
4. **Deploy** -- automatic deployment to Cloudflare Pages

## Tech Decisions

- **Astro 5** -- chosen for its hybrid rendering model. Static pages where possible, server-rendered routes where needed. Smaller JS bundles than a full SPA framework.
- **React 19** -- used as an Astro integration for interactive UI components. The island architecture keeps non-interactive pages lightweight.
- **Supabase** -- provides PostgreSQL, authentication, file storage, and row-level security in a single managed service. RLS policies and database triggers keep authorization and business rules close to the data.
- **shadcn/ui** -- not a component library dependency but copy-pasted, customizable components built on Radix UI. Full control over styling and behavior with accessibility handled by Radix primitives.
- **Zod** -- runtime type validation at API boundaries, integrated with both React Hook Form (client) and API routes (server) for consistent validation.
- **Vitest + Playwright** -- Vitest for fast unit tests with native ESM support; Playwright for reliable cross-browser E2E testing with the Page Object Model for maintainability.
- **Cloudflare Pages** -- edge deployment with Astro's Cloudflare adapter for low-latency responses globally.

## Roadmap

- [ ] Real-time chat via WebSocket/Supabase Realtime subscriptions
- [ ] Push notifications for new matches and messages
- [ ] Image optimization and lazy loading for offer galleries
- [ ] Mobile-responsive design improvements and PWA support

---

## Contributing

Contributions are welcome. Open an issue to discuss proposed changes or submit a pull request with a clear description of what you changed and why.

## License

This project is not currently published under a specific open-source license. Contact the maintainer for usage permissions.
