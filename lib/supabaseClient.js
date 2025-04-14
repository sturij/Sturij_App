// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a single supabase client and export it
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Don't have any conditional exports or multiple exports of 'supabase'
