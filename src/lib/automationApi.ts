/** Browser client for local Timescale-backed automation API (Docker). */

import { getSupabase } from "./supabaseClient";

const base =
  typeof import.meta.env.VITE_AUTOMATION_API_URL === "string"
    ? import.meta.env.VITE_AUTOMATION_API_URL.replace(/\/$/, "")
    : "";

export type MachineTelemetryRow = {
  time?: string;
  machine_id: string;
  machine_type: string;
  rpm: number;
  efficiency_pct: number;
  temperature_c: number | null;
  running: boolean;
  produced_length_m: number;
  produced_weight_kg: number;
  shift_id?: string;
};

export async function fetchLatestMachines(): Promise<MachineTelemetryRow[]> {
  if (!base) return [];
  const { data: { session } } = await getSupabase().auth.getSession();
  const token = session?.access_token;
  if (!token) return [];
  const res = await fetch(`${base}/v1/machines`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const j = (await res.json()) as { machines?: MachineTelemetryRow[] };
  return j.machines ?? [];
}

export async function fetchOeePct(fromIso?: string, toIso?: string): Promise<number | null> {
  if (!base) return null;
  const { data: { session } } = await getSupabase().auth.getSession();
  const token = session?.access_token;
  if (!token) return null;
  const q = new URLSearchParams();
  if (fromIso) q.set("from", fromIso);
  if (toIso) q.set("to", toIso);
  const res = await fetch(`${base}/v1/metrics/oee?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { oee_pct?: number };
  return j.oee_pct ?? null;
}

export async function fetchMachineSeries(
  machineId: string,
  fromIso: string,
  toIso: string
): Promise<MachineTelemetryRow[]> {
  if (!base) return [];
  const { data: { session } } = await getSupabase().auth.getSession();
  const token = session?.access_token;
  if (!token) return [];
  const q = new URLSearchParams({ from: fromIso, to: toIso });
  const res = await fetch(`${base}/v1/machines/${encodeURIComponent(machineId)}/series?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const j = (await res.json()) as { series?: MachineTelemetryRow[] };
  return j.series ?? [];
}

export function getAutomationSseMachinesUrl(accessToken: string): string {
  if (!base) return "";
  const u = new URL(`${base}/v1/stream/machines`);
  u.searchParams.set("access_token", accessToken);
  return u.toString();
}

export function isAutomationApiConfigured(): boolean {
  return Boolean(base);
}
