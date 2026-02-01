/* eslint-disable no-console */
import path from 'path';
import dotenv from 'dotenv';
import { test as teardown } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Ensure env vars are loaded in the teardown worker process
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

/**
 * Global teardown for E2E tests
 *
 * This runs after all E2E tests have completed and cleans up the test database.
 * It deletes all test data to ensure a clean state for the next test run.
 *
 * Tables are truncated in the correct order to respect foreign key constraints:
 * 1. messages (depends on chats)
 * 2. chats (depends on users)
 * 3. exchange_history (depends on offers and users)
 * 4. interests (depends on offers and users)
 * 5. offer_images (depends on offers)
 * 6. offers (depends on users)
 * 7. profiles (depends on users)
 * 8. users (via auth.users)
 */
teardown('cleanup database after all tests', async () => {
  console.log('🧹 Starting database cleanup...');

  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables for database cleanup');
    console.error('Required: PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    throw new Error('Cannot perform database cleanup without service role key');
  }

  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Step 1: Delete messages (depends on chats)
    console.log('  → Deleting messages...');
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (messagesError) {
      console.error('  ❌ Error deleting messages:', messagesError);
      throw messagesError;
    }
    console.log('  ✓ Messages deleted');

    // Step 2: Delete chats (depends on users)
    console.log('  → Deleting chats...');
    const { error: chatsError } = await supabase
      .from('chats')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (chatsError) {
      console.error('  ❌ Error deleting chats:', chatsError);
      throw chatsError;
    }
    console.log('  ✓ Chats deleted');

    // Step 3: Delete exchange_history (depends on offers and users)
    console.log('  → Deleting exchange history...');
    const { error: exchangeError } = await supabase
      .from('exchange_history')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (exchangeError) {
      console.error('  ❌ Error deleting exchange history:', exchangeError);
      throw exchangeError;
    }
    console.log('  ✓ Exchange history deleted');

    // Step 4: Delete interests (depends on offers and users)
    console.log('  → Deleting interests...');
    const { error: interestsError } = await supabase
      .from('interests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (interestsError) {
      console.error('  ❌ Error deleting interests:', interestsError);
      throw interestsError;
    }
    console.log('  ✓ Interests deleted');

    // Step 5: Delete offer_images (depends on offers)
    console.log('  → Deleting offer images...');
    const { error: imagesError } = await supabase
      .from('offer_images')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (imagesError) {
      console.error('  ❌ Error deleting offer images:', imagesError);
      throw imagesError;
    }
    console.log('  ✓ Offer images deleted');

    // Step 6: Delete offers (depends on users)
    console.log('  → Deleting offers...');
    const { error: offersError } = await supabase
      .from('offers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (offersError) {
      console.error('  ❌ Error deleting offers:', offersError);
      throw offersError;
    }
    console.log('  ✓ Offers deleted');

    // IDs of seed/fixture users that must NOT be deleted
    const preservedUserIds = [process.env.E2E_USERNAME_ID, process.env.E2E_USERNAME_2_ID].filter(Boolean) as string[];

    // Step 7: Delete users from public.users (preserve seed users)
    console.log('  → Deleting users (preserving seed accounts)...');
    let usersQuery = supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    for (const id of preservedUserIds) {
      usersQuery = usersQuery.neq('id', id);
    }
    const { error: usersError } = await usersQuery;

    if (usersError) {
      console.error('  ❌ Error deleting users:', usersError);
      throw usersError;
    }
    console.log('  ✓ Users deleted');

    // Step 8: Delete auth users (preserve seed users)
    console.log('  → Deleting auth users (preserving seed accounts)...');
    const { data: users, error: listUsersError } = await supabase.auth.admin.listUsers();

    if (listUsersError) {
      console.error('  ❌ Error listing users:', listUsersError);
      throw listUsersError;
    }

    const usersToDelete = (users?.users ?? []).filter((u) => !preservedUserIds.includes(u.id));

    if (usersToDelete.length > 0) {
      console.log(
        `  → Found ${usersToDelete.length} users to delete (preserving ${preservedUserIds.length} seed users)`,
      );

      for (const user of usersToDelete) {
        const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id);

        if (deleteUserError) {
          console.error(`  ❌ Error deleting user ${user.id}:`, deleteUserError);
          throw deleteUserError;
        }
      }

      console.log(`  ✓ Deleted ${usersToDelete.length} auth users`);
    } else {
      console.log('  ℹ No users to delete');
    }

    console.log('✅ Database cleanup completed successfully');
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    throw error;
  }
});
