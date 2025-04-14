
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a mock client for build time
const mockClient = {
  from: () => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
  }),
  auth: {
    signIn: () => Promise.resolve({ user: null, session: null, error: null }),
    signOut: () => Promise.resolve({ error: null }),
  },
};

// Use mock client during build, real client during runtime
export const supabase = (!supabaseUrl || !supabaseAnonKey) 
  ? mockClient 
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
