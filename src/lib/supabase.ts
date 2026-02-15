import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "your-supabase-url"
  );
}

// Only create the real client when Supabase is configured.
// Otherwise provide a dummy that won't be used (guarded by isSupabaseConfigured checks).
let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// Backwards compat — lazy accessor
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
