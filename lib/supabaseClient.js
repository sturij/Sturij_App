// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zrwyprgwemecabbuigof.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpyd3lwcmd3ZW1lY2FiYnVpZ29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1ODE5MjAsImV4cCI6MjA2MDE1NzkyMH0.o-ZgVO1YDx5w4pm_abbk732z55C6EBu5L0aGnsEmOcA';

// Create a single supabase client for interacting with your database
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Export as a named export (not default)
export { supabaseClient as supabase };