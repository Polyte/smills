import { isSupabaseConfigured } from "./supabaseClient";
import { useLocalSqliteCrm } from "./crm/mode";
import type { PublicQuotePayload } from "./quoteProductCatalog";
import { submitLocalPublicQuoteRequest } from "./crm/quotesRepo";

export type { PublicQuotePayload };

export async function submitPublicQuoteRequest(
  payload: PublicQuotePayload
): Promise<{ ok: true; request_id: string } | { ok: false; error: string }> {
  if (useLocalSqliteCrm()) {
    try {
      const request_id = await submitLocalPublicQuoteRequest(payload);
      return { ok: true, request_id };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Could not save quote request locally.",
      };
    }
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Configure Supabase or use local CRM mode for quote requests." };
  }
  const url = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, "");
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const res = await fetch(`${url}/functions/v1/submit-quote-request`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anon}`,
      apikey: anon,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    request_id?: string;
    error?: string;
  };
  if (!res.ok || !json.ok || !json.request_id) {
    return { ok: false, error: json.error || `Request failed (${res.status})` };
  }
  return { ok: true, request_id: json.request_id };
}
