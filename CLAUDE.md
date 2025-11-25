# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KAKAPO 2.0 is a bartering/exchange platform built with Astro 5, React, TypeScript, and Supabase. Users can create offers, express interest in others' offers, chat when there's mutual interest, and track completed exchanges.

## Technology Stack

- **Framework**: Astro 5.x with React integration
- **Styling**: Tailwind CSS
- **Language**: TypeScript (strict mode via `astro/tsconfigs/strict`)
- **Backend**: Supabase (Auth, Database, Storage)
- **Validation**: Zod schemas
- **Linting**: ESLint 9 + Prettier

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
├── db/                  # Supabase client and database types
│   ├── supabase.client.ts
│   └── database.types.ts
├── middleware/          # Astro middleware (auth token extraction)
│   └── index.ts
├── pages/
│   ├── api/            # API routes (server-side endpoints)
│   │   └── auth/       # Authentication endpoints
│   └── index.astro     # Frontend pages
├── schemas/            # Zod validation schemas
│   └── auth.schema.ts
├── utils/              # Utility functions (error handling, etc.)
│   └── errors.ts
├── components/         # Astro components
├── layouts/            # Page layouts
└── types.ts            # Shared TypeScript types
```

### Planning Documentation

The `.ai/` directory contains comprehensive planning documents:

- `api-plan.md`: Complete REST API specification with all endpoints
- `db-plan.md`: Database schema, RLS policies, triggers, and indexes
- `endpoints/*.md`: Detailed implementation plans for each endpoint

Refer to these documents when implementing new features or understanding existing architecture.

## Environment Variables

Required environment variables (set in `.env`):

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase anonymous key (public, used client-side)

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

## Development Notes

- **No React components yet**: Currently only Astro components exist
- **API-first architecture**: Business logic in API routes and database triggers, not in frontend
- **Middleware is async**: Auth token validation in middleware is non-blocking
- **Error logging**: Use `console.error()` for errors, `console.warn()` for warnings (console.log forbidden)
- **Zod validation**: Always validate external input with Zod schemas before processing
