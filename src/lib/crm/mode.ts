import { isSupabaseConfigured } from "../supabaseClient";

/** Force browser SQLite even when Supabase env vars are set. */
function forceLocalSqlite(): boolean {
  return import.meta.env.VITE_CRM_USE_SQLITE === "true";
}

/** Browser SQLite + IndexedDB when Supabase env vars are missing (or forced). */
export function useLocalSqliteCrm(): boolean {
  if (forceLocalSqlite()) return true;
  return !isSupabaseConfigured();
}

/** CRM can load data (Supabase or local). */
export function isCrmDataAvailable(): boolean {
  return isSupabaseConfigured() || useLocalSqliteCrm();
}
