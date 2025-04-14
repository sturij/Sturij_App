
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a dummy client for build time or when env vars are missing
const dummyClient = {
  from: () => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
  }),
  auth: {
    signIn: () => Promise.resolve({ user: null, error: null }),
    signOut: () => Promise.resolve({ error: null }),
  },
};

// Export the appropriate client based on environment
export const supabase = (!supabaseUrl || !supabaseAnonKey) 
  ? dummyClient 
  : createClient(supabaseUrl, supabaseAnonKey);
