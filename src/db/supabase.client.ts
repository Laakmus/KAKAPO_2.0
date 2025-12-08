import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables: PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_KEY must be defined',
  );
}

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
