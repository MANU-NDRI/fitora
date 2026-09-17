import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// The application deliberately has no implicit mock/localStorage fallback in production.
// A missing configuration is surfaced as an actionable error by the services instead.
export const supabase = createClient(
  supabaseUrl ?? 'https://missing-supabase-configuration.invalid',
  supabaseAnonKey ?? 'missing-supabase-anon-key',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);

export function requireSupabase(): typeof supabase {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase est requis. Configurez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}
