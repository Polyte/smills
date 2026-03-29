import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../app/crm/database.types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(url?.trim() && anon?.trim());
}

let client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
  if (!url || !anon) {
    throw new Error(
      "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local."
    );
  }
  if (!client) {
    client = createClient<Database>(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

/** Safe for routes that render before env is configured (e.g. tests). */
export function getSupabaseOrNull(): SupabaseClient<Database> | null {
  if (!url || !anon) return null;
  return getSupabase();
}
