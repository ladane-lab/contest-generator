import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing! Check .env.local');
} else {
  console.log('Connecting to Supabase at:', supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
