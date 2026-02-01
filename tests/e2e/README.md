# E2E Tests Setup and Configuration

## Overview

This directory contains end-to-end (E2E) tests for the KAKAPO 2.0 application using Playwright.

## Database Cleanup

After all E2E tests complete, the test database is automatically cleaned up using the global teardown mechanism.

### How It Works

1. **Teardown Configuration**: The `playwright.config.ts` is configured with a teardown project that runs after all tests complete.
2. **Cleanup Script**: The `global.teardown.ts` file deletes all test data from the database in the correct order to respect foreign key constraints.
3. **Service Role Key**: The teardown uses the Supabase service role key to bypass Row Level Security (RLS) policies and delete all data.

### Order of Deletion

The teardown deletes data in this order (to respect foreign key constraints):

1. **messages** (depends on chats)
2. **chats** (depends on users)
3. **exchange_history** (depends on offers and users)
4. **interests** (depends on offers and users)
5. **offer_images** (depends on offers)
6. **offers** (depends on users)
7. **profiles** (depends on users)
8. **users** (auth.users - final step)

### Required Environment Variables

The teardown requires the following environment variables in your `.env.test` file:

```bash
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**IMPORTANT**: You must add your actual Supabase service role key to `.env.test` for the teardown to work.

### Getting Your Service Role Key

1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Find the "service_role" key under "Project API keys"
4. Copy the key and add it to `.env.test` as `SUPABASE_SERVICE_ROLE_KEY`

**Security Note**: The service role key bypasses all RLS policies and should NEVER be exposed to the client-side code or committed to version control. It should only be used in server-side contexts like this teardown script.

## Running Tests

```bash
# Run all E2E tests (teardown will run automatically after)
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/login.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Skip teardown if needed (for debugging)
npx playwright test --no-deps
```

## Test Structure

```
tests/e2e/
├── global.teardown.ts       # Database cleanup after all tests
├── helpers/
│   └── auth.ts              # Authentication helpers
├── page-objects/            # Page Object Model classes
│   ├── LoginPage.ts
│   ├── SignupPage.ts
│   ├── OffersPage.ts
│   └── ...
└── *.spec.ts                # Test files
```

## Debugging Teardown

If the teardown fails, you'll see error messages in the console output. Common issues:

1. **Missing Service Role Key**: Make sure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.test`
2. **Wrong Key**: Verify you're using the service role key, not the anon key
3. **Network Issues**: Check your connection to Supabase
4. **RLS Policies**: The service role key should bypass RLS, but verify your policies are correct

To skip teardown during debugging:

```bash
npx playwright test --no-deps
```

This will run tests without the teardown, allowing you to inspect the database state after tests.

## Manual Cleanup

If you need to manually clean the database:

```bash
# Run only the teardown
npx playwright test --project="cleanup db"
```

## Test User Credentials

Test users are defined in `.env.test`:

- **User 1**: `E2E_USERNAME` / `E2E_PASSWORD`
- **User 2**: `E2E_USERNAME_2` / `E2E_PASSWORD_2`

These users should already exist in your test database. The teardown will delete them, so you'll need to recreate them if you want to run tests again.
