import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

function resolveAnonKey(): string | undefined {
  const a = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const b = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (a && String(a).trim()) return String(a).trim();
  if (b && String(b).trim()) return String(b).trim();
  return undefined;
}

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  return Boolean(url && String(url).trim() && resolveAnonKey());
}

/** Client singleton; tabelas de loteria no schema `public`. */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;
  const url = String(import.meta.env.VITE_SUPABASE_URL).trim();
  const key = resolveAnonKey()!;
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
