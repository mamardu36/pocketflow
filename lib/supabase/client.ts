import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { APP_CONFIG } from "@/config/app";

// Only public values: the anon/publishable key is safe in the browser because RLS protects every table.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = url.length > 0 && anonKey.length > 0;

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: `${APP_CONFIG.storagePrefix}-auth` },
    });
  }
  return client;
}
