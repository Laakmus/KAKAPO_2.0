/// <reference types="astro/client" />

import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from './db/database.types';
import type { UserProfileDTO } from './types';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user?: { id: string; email?: string };
      /** Full Supabase Auth user cached from middleware getUser() - avoids duplicate roundtrips */
      authUser?: User;
      /** Pre-fetched user profile for SSR — eliminates loading flash on page navigation */
      userProfile?: UserProfileDTO;
    }
  }
}

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
