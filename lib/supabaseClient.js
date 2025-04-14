// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Get environment variables with robust fallbacks for both development and production
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zrwyprgwemecabbuigof.supabase.co';

// Use a more robust check for the anon key to prevent "key is required" errors
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  (typeof window !== 'undefined' ? 
    window.__SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpyd3lwcmd3ZW1lY2FiYnVpZ29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1ODE5MjAsImV4cCI6MjA2MDE1NzkyMH0.o-ZgVO1YDx5w4pm_abbk732z55C6EBu5L0aGnsEmOcA' : 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpyd3lwcmd3ZW1lY2FiYnVpZ29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1ODE5MjAsImV4cCI6MjA2MDE1NzkyMH0.o-ZgVO1YDx5w4pm_abbk732z55C6EBu5L0aGnsEmOcA');

// Create options with more robust error handling for production builds
const options = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
};

// Create a single supabase client for interacting with your database
// with enhanced error handling for production builds
let supabaseClient;

try {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, options);
} catch (error) {
  console.error('Error initializing Supabase client:', error);
  // Provide a fallback client that won't break builds but will log errors
  supabaseClient = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: new Error('Supabase client initialization failed') }),
      getUser: () => Promise.resolve({ data: { user: null }, error: new Error('Supabase client initialization failed') })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: new Error('Supabase client initialization failed') }),
          order: () => Promise.resolve({ data: null, error: new Error('Supabase client initialization failed') }),
          limit: () => Promise.resolve({ data: null, error: new Error('Supabase client initialization failed') })
        }),
        order: () => ({
          limit: () => Promise.resolve({ data: null, error: new Error('Supabase client initialization failed') })
        })
      }),
      insert: () => Promise.resolve({ data: null, error: new Error('Supabase client initialization failed') }),
      update: () => Promise.resolve({ data: null, error: new Error('Supabase client initialization failed') }),
      delete: () => Promise.resolve({ data: null, error: new Error('Supabase client initialization failed') })
    })
  };
}

// Add a global variable for client-side access to the anon key
if (typeof window !== 'undefined') {
  window.__SUPABASE_ANON_KEY = supabaseAnonKey;
}

// Export as a named export (not default)
export { supabaseClient as supabase };
