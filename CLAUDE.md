# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KAKAPO 2.0 is a bartering/exchange platform built with Astro 5, React, TypeScript, and Supabase. Users can create offers, express interest in others' offers, chat when there's mutual interest, and track completed exchanges.

## Technology Stack

- **Framework**: Astro 5.x with React integration
- **Styling**: Tailwind CSS + shadcn/ui (Radix UI components)
- **Language**: TypeScript (strict mode via `astro/tsconfigs/strict`)
- **Backend**: Supabase (Auth, Database, Storage)
- **Validation**: Zod schemas
- **Linting**: ESLint 9 + Prettier
- **Path aliases**: `@/*` maps to `./src/*` (configured in tsconfig.json)

## Common Commands

```bash
# Development
npm run dev              # Start dev server at localhost:4321

# Build & Preview
npm run build           # Build production site to ./dist/
npm run preview         # Preview production build locally

# Code Quality
npm run lint            # Run ESLint on .js, .ts, .astro files
npm run lint:fix        # Auto-fix ESLint issues
npm run format          # Format code with Prettier
npm run format:check    # Check formatting without modifying files

# UI Components (shadcn/ui)
npm run shadcn          # Add new shadcn/ui component (auto-fixes lint after)
```

## Architecture Overview

### API Structure

This project uses **Astro API routes** (not Edge Functions) for backend endpoints:

- API routes are in `src/pages/api/` following Astro's file-based routing
- All API endpoints require `export const prerender = false`
- Authentication handled via Supabase Auth with JWT Bearer tokens
- Middleware (`src/middleware/index.ts`) extracts tokens and attaches user to `context.locals`

**Important**: When creating new API endpoints, always:

1. Export `prerender = false` at the top of the file
2. Use Zod schemas for request validation (create in `src/schemas/`)
3. Import error handling utilities from `src/utils/errors.ts`
4. Follow existing endpoint patterns in `src/pages/api/auth/login.ts`
5. Use service classes from `src/services/` for business logic (don't put business logic in endpoints)

### Service Layer

The project uses a **service-based architecture** to separate business logic from API endpoints:

- **Services** (`src/services/`): Encapsulate database queries and business logic
- **Service pattern**: Each service is a class with methods for specific operations
- **Supabase client injection**: Services receive SupabaseClient via constructor
- **Example**: `OfferService` handles all offer-related operations (getOfferById, createOffer, listOffers, etc.)

**When to use services**:
- Always use services for database operations in API endpoints
- Don't write raw Supabase queries directly in endpoints
- Services handle type transformations between database types and API DTOs

### Database & Backend

- **Supabase client**: Initialized in `src/db/supabase.client.ts`
- **Type generation**: Database types in `src/db/database.types.ts` (generated from Supabase schema)
- **Row Level Security (RLS)**: All database access enforced by Supabase RLS policies
- **Business logic**: Implemented as PostgreSQL triggers in Supabase (see `.ai/db-plan.md`)

Key database patterns:

- Mutual match detection creates chats automatically (trigger-based)
- Exchange history created when both users confirm exchange (trigger-based)
- Self-interest prevention enforced by database trigger
- Chat reuse: one chat per user pair, reused for all their exchanges

### Validation & Error Handling

All API endpoints follow this pattern:

1. Parse request body with try/catch for JSON errors
2. Validate with Zod schema from `src/schemas/`
3. Handle Zod validation errors with `createErrorResponse()`
4. Process business logic
5. Use `handleAuthError()` for Supabase Auth errors
6. Return consistent error format (see `src/utils/errors.ts`)

### Authentication Flow

1. User logs in via `POST /api/auth/login`
2. Supabase Auth returns `access_token` and `refresh_token`
3. Frontend stores tokens (recommended: httpOnly cookie)
4. All subsequent requests include `Authorization: Bearer {access_token}`
5. Middleware extracts token and validates via `supabase.auth.getUser()`
6. User ID available in endpoints as `context.locals.user.id`
7. RLS policies automatically filter data based on `auth.uid()`

**Middleware caveat**: The middleware uses a non-blocking async approach - `context.locals.user` may not be populated immediately. Always check for authentication in individual endpoints that require it, don't rely solely on middleware.

## Code Style Rules

The project enforces strict code style via eslint.config.js:

- **Indentation**: 2 spaces
- **Quotes**: Single quotes (with escape avoidance)
- **Semicolons**: Required
- **Max line length**: 120 characters
- **Trailing commas**: Required for multiline
- **Object/array spacing**: `{ foo }` and `[bar]`
- **No multiple empty lines**: Max 1 blank line
- **File endings**: Must end with newline

### TypeScript Rules

- Unused vars/args starting with `_` are allowed
- `any` type triggers warnings
- Non-null assertions (`!`) trigger warnings
- Console.log is disallowed (warn/error allowed)

### Astro-Specific Rules

- `set:html` directive is forbidden (use proper escaping)
- Unused CSS selectors trigger warnings
- Prefer `class:list` directive over manual class concatenation

## Directory Structure

```
src/
├── components/
│   ├── ui/             # shadcn/ui React components (Button, Card, Avatar, etc.)
│   └── Welcome.astro   # Astro components
├── db/                 # Supabase client and database types
│   ├── supabase.client.ts
│   └── database.types.ts
├── layouts/            # Page layouts
│   └── Layout.astro
├── lib/                # Utility libraries
│   └── utils.ts        # cn() helper for Tailwind class merging
├── middleware/         # Astro middleware (auth token extraction)
│   └── index.ts
├── pages/
│   ├── api/           # API routes (server-side endpoints)
│   │   ├── auth/      # Authentication endpoints
│   │   ├── chats/     # Chat endpoints
│   │   ├── interests/ # Interest endpoints
│   │   ├── offers/    # Offer endpoints
│   │   └── users/     # User endpoints
│   └── index.astro    # Frontend pages
├── schemas/           # Zod validation schemas
│   ├── auth.schema.ts
│   ├── chats.schema.ts
│   ├── interests.schema.ts
│   ├── offers.schema.ts
│   └── user.schema.ts
├── services/          # Service layer (business logic)
│   ├── auth.service.ts
│   ├── chats.service.ts
│   ├── interests.service.ts
│   ├── offer.service.ts
│   └── user.service.ts
├── utils/             # Utility functions (error handling, etc.)
│   └── errors.ts
└── types.ts           # Shared TypeScript types
```

### Planning Documentation

The `.ai/` directory contains comprehensive planning documents:

- `api-plan.md`: Complete REST API specification with all endpoints
- `db-plan.md`: Database schema, RLS policies, triggers, and indexes
- `endpoints/*.md`: Detailed implementation plans for each endpoint

Refer to these documents when implementing new features or understanding existing architecture.

## Environment Variables

Required environment variables (set in `.env`):

- `PUBLIC_SUPABASE_URL`: Supabase project URL (PUBLIC_ prefix required for client-side access)
- `PUBLIC_SUPABASE_KEY`: Supabase anonymous key (public, used client-side)

**Important**: In Astro, environment variables must have the `PUBLIC_` prefix to be accessible in client-side code (browser). Variables without this prefix are only available in server-side code.

**Never** expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend.

## Supabase Integration

### Client Creation

```typescript
import { supabaseClient } from '../db/supabase.client';
```

The client is pre-configured and available:

- In API routes via `context.locals.supabase`
- In frontend components via direct import

### RLS Policy Dependency

All data access is filtered by Supabase RLS policies based on the authenticated user's JWT token. This means:

- Users can only see/modify their own data
- No additional authorization checks needed in API routes (handled by Supabase)
- Direct database queries via Supabase client are safe

### File Uploads (Future)

Images for offers will be stored in Supabase Storage:

1. Frontend uploads to `/storage/offers`
2. Receives public URL
3. Saves URL in `offers.image_url` column

## UI Components

The project uses **shadcn/ui** for React components:

- **Component library**: shadcn/ui built on Radix UI primitives
- **Location**: `src/components/ui/` (Button, Card, Avatar, AlertDialog, etc.)
- **Styling**: Tailwind CSS with CSS variables for theming (see `tailwind.config.mjs`)
- **Utility**: Use `cn()` from `src/lib/utils.ts` for conditional Tailwind class merging
- **Adding components**: Use `npm run shadcn` to add new components from shadcn/ui

**Important patterns**:
- Import UI components from `@/components/ui/button` (uses path alias)
- Use `client:load` directive when using React components in Astro pages
- Theme colors defined via CSS variables in global CSS (HSL color system)

## Development Notes

- **Hybrid architecture**: Astro components for pages, React components for interactive UI
- **API-first architecture**: Business logic in services and database triggers, not in frontend
- **Middleware is async**: Auth token validation in middleware is non-blocking
- **Error logging**: Use `console.error()` for errors, `console.warn()` for warnings (console.log forbidden)
- **Zod validation**: Always validate external input with Zod schemas before processing
- **No tests yet**: Test infrastructure not set up (future consideration)
