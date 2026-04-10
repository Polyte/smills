import { getSupabase } from "../supabaseClient";
import { crmUsesSupabase } from "./crmRepo";
import type { CrmActor } from "./crmRepo";
import { dbAll, dbRun, getLocalSqliteDb, notifyLocalDbWrite } from "./sqlite/engine";
import { canWritePlanning } from "./roles";

export type SppProductLine = "yarn" | "weaving";
export type SppTrackerStatus = "draft" | "active" | "closed";

export const SPP_DEVIATION_REASONS = [
  "raw_material_in_transit",
  "raw_material_unavailable",
  "equipment_breakdown",
  "labour_turnout",
  "labour_efficiency",
  "holiday",
  "poor_planning",
  "other",
] as const;
export type SppDeviationReason = (typeof SPP_DEVIATION_REASONS)[number];

export type SppTrackerRow = {
  id: string;
  created_at: string;
  updated_at: string;
  year_month: string;
  product_line: SppProductLine;
  status: SppTrackerStatus;
  week_starts_on: string;
  snapshot_at: string | null;
  opening_import_id: string | null;
  created_by: string;
};

export type SppOrderLineRow = {
  id: string;
  tracker_id: string;
  pipeline_import_id: string | null;
  erp_order_ref: string;
  line_key: string;
  customer_name: string | null;
  pcode: string | null;
  item_description: string | null;
  ordered_qty: number | null;
  uom: string | null;
  del_date: string | null;
  unit_price: number | null;
  unit_label: string | null;
  deliver_qty: number | null;
  balance_qty: number | null;
  from_opening_pipeline: boolean;
  is_ad_hoc: boolean;
  sales_order_id: string | null;
};

export type SppMonthlyTargetRow = {
  spp_order_line_id: string;
  target_qty: number | null;
  target_value_zar: number | null;
};

export type SppWeeklyPlanRow = {
  spp_order_line_id: string;
  week_start: string;
  planned_qty: number | null;
  planned_value_zar: number | null;
};

export type SppActualRow = {
  spp_order_line_id: string;
  period_start: string;
  granularity: "day" | "week";
  actual_qty: number | null;
  actual_value_zar: number | null;
};

export type SppVarianceNoteRow = {
  spp_order_line_id: string;
  week_start: string;
  analysis_text: string | null;
  deviation_reasons: SppDeviationReason[];
};

function assertSppWrite(actor: CrmActor | null): void {
  if (!actor) throw new Error("Not signed in");
  if (!canWritePlanning(actor.role)) {
    throw new Error("Insufficient permissions for Sales & Production Planning");
  }
}

function parseDeviationReasons(raw: unknown): SppDeviationReason[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((x): x is SppDeviationReason =>
      SPP_DEVIATION_REASONS.includes(x as SppDeviationReason)
    );
  }
  if (typeof raw === "string") {
    try {
      const j = JSON.parse(raw) as unknown;
      return parseDeviationReasons(j);
    } catch {
      return [];
    }
  }
  return [];
}

export async function sppGetTracker(
  yearMonth: string,
  productLine: SppProductLine
): Promise<SppTrackerRow | null> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("spp_tracker")
      .select("*")
      .eq("year_month", yearMonth)
      .eq("product_line", productLine)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as SppTrackerRow) ?? null;
  }
  const db = await getLocalSqliteDb();
  const rows = dbAll<Record<string, unknown>>(db, "SELECT * FROM spp_tracker WHERE year_month = ? AND product_line = ?", [
    yearMonth,
    productLine,
  ]);
  const r = rows[0];
  if (!r) return null;
  return mapSqliteTracker(r);
}

function mapSqliteTracker(r: Record<string, unknown>): SppTrackerRow {
  return {
    id: String(r.id),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
    year_month: String(r.year_month),
    product_line: r.product_line as SppProductLine,
    status: r.status as SppTrackerStatus,
    week_starts_on: String(r.week_starts_on),
    snapshot_at: r.snapshot_at == null ? null : String(r.snapshot_at),
    opening_import_id: r.opening_import_id == null ? null : String(r.opening_import_id),
    created_by: String(r.created_by),
  };
}

export async function sppEnsureTracker(
  actor: CrmActor,
  yearMonth: string,
  productLine: SppProductLine
): Promise<SppTrackerRow> {
  assertSppWrite(actor);
  const existing = await sppGetTracker(yearMonth, productLine);
  if (existing) return existing;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("spp_tracker")
      .insert({
        id,
        year_month: yearMonth,
        product_line: productLine,
        status: "draft",
        week_starts_on: "monday",
        created_by: actor.id,
        updated_at: now,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as SppTrackerRow;
  }
  const db = await getLocalSqliteDb();
  dbRun(
    db,
    `INSERT INTO spp_tracker (id, created_at, updated_at, year_month, product_line, status, week_starts_on, snapshot_at, opening_import_id, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, now, now, yearMonth, productLine, "draft", "monday", null, null, actor.id]
  );
  notifyLocalDbWrite();
  const t = await sppGetTracker(yearMonth, productLine);
  if (!t) throw new Error("Failed to create tracker");
  return t;
}

export type ParsedPipelineRow = {
  erp_order_ref: string;
  line_key: string;
  customer_name: string | null;
  pcode: string | null;
  item_description: string | null;
  ordered_qty: number | null;
  uom: string | null;
  del_date: string | null;
  unit_price: number | null;
  deliver_qty: number | null;
  balance_qty: number | null;
};

function normHeader(h: string): string {
  return h.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/\s+/g, " ");
}

function pickHeaderMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    map[normHeader(h)] = i;
  });
  return map;
}

function colIdx(m: Record<string, number>, aliases: string[]): number | undefined {
  for (const a of aliases) {
    const k = normHeader(a);
    if (k in m) return m[k];
  }
  for (const key of Object.keys(m)) {
    for (const a of aliases) {
      const k = normHeader(a);
      if (k.length > 2 && (key === k || key.includes(k))) return m[key];
    }
  }
  return undefined;
}

function parseNum(v: string | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseDateCell(v: string | undefined): string | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  const iso = /^\d{4}-\d{2}-\d{2}/.exec(s);
  if (iso) return iso[0];
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

/** Parse ERP pipeline / tracker export: first row headers, then data. Tab or comma separated. */
export function sppParsePipelineTable(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (!lines.length) return { headers: [], rows: [] };
  const delim = lines[0].includes("\t") ? "\t" : ",";
  const splitLine = (line: string) => {
    if (delim === "\t") return line.split("\t").map((c) => c.trim());
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        q = !q;
      } else if (ch === "," && !q) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };
  const headers = splitLine(lines[0]!);
  const rows = lines.slice(1).map(splitLine);
  return { headers, rows };
}

export function sppRowFromCells(headers: string[], cells: string[]): ParsedPipelineRow | null {
  const m = pickHeaderMap(headers);
  const orderIdx = colIdx(m, ["order", "so", "order no", "order #", "sales order"]);
  if (orderIdx === undefined) return null;
  const erp = cells[orderIdx]?.trim();
  if (!erp) return null;
  const g = (aliases: string[]) => {
    const ix = colIdx(m, aliases);
    return ix !== undefined ? cells[ix] : undefined;
  };
  const pcode = g(["pcode", "p code", "product code", "code"]) ?? null;
  const lineKey = pcode ? `${erp}::${pcode}` : erp;
  return {
    erp_order_ref: erp,
    line_key: lineKey,
    customer_name: g(["customer", "customer name", "client"]) ?? null,
    pcode,
    item_description: g(["item", "description", "product"]) ?? null,
    ordered_qty: parseNum(g(["ordered", "order qty", "qty ordered", "qty"])),
    uom: g(["unit", "uom"]) ?? null,
    del_date: parseDateCell(g(["del date", "delivery", "del. date", "due date"])),
    unit_price: parseNum(g(["price", "unit price", "unit price zar", "sell price"])),
    deliver_qty: parseNum(g(["deliver", "delivered", "qty delivered"])),
    balance_qty: parseNum(g(["balance", "bal", "open qty"])),
  };
}

export async function sppImportPipelineRows(
  actor: CrmActor,
  trackerId: string,
  fileName: string,
  parsed: ParsedPipelineRow[],
  opts: { isOpeningSnapshot: boolean }
): Promise<{ importId: string; inserted: number }> {
  assertSppWrite(actor);
  const importId = crypto.randomUUID();
  const now = new Date().toISOString();
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { error: e1 } = await supabase.from("spp_pipeline_import").insert({
      id: importId,
      tracker_id: trackerId,
      file_name: fileName,
      row_count: parsed.length,
      is_opening_snapshot: opts.isOpeningSnapshot,
      imported_by: actor.id,
    });
    if (e1) throw new Error(e1.message);
    if (opts.isOpeningSnapshot) {
      const { error: e2 } = await supabase
        .from("spp_tracker")
        .update({ opening_import_id: importId, snapshot_at: now, updated_at: now })
        .eq("id", trackerId);
      if (e2) throw new Error(e2.message);
    }
    let n = 0;
    for (const r of parsed) {
      const { error } = await supabase.from("spp_order_line").insert({
        tracker_id: trackerId,
        pipeline_import_id: importId,
        erp_order_ref: r.erp_order_ref,
        line_key: r.line_key,
        customer_name: r.customer_name,
        pcode: r.pcode,
        item_description: r.item_description,
        ordered_qty: r.ordered_qty,
        uom: r.uom,
        del_date: r.del_date,
        unit_price: r.unit_price,
        deliver_qty: r.deliver_qty,
        balance_qty: r.balance_qty,
        from_opening_pipeline: opts.isOpeningSnapshot,
        is_ad_hoc: false,
      });
      if (!error) n += 1;
    }
    return { importId, inserted: n };
  }
  const db = await getLocalSqliteDb();
  dbRun(
    db,
    `INSERT INTO spp_pipeline_import (id, created_at, tracker_id, file_name, row_count, is_opening_snapshot, imported_by) VALUES (?,?,?,?,?,?,?)`,
    [importId, now, trackerId, fileName, parsed.length, opts.isOpeningSnapshot ? 1 : 0, actor.id]
  );
  if (opts.isOpeningSnapshot) {
    dbRun(db, `UPDATE spp_tracker SET opening_import_id = ?, snapshot_at = ?, updated_at = ? WHERE id = ?`, [
      importId,
      now,
      now,
      trackerId,
    ]);
  }
  let inserted = 0;
  for (const r of parsed) {
    try {
      const oid = crypto.randomUUID();
      dbRun(
        db,
        `INSERT INTO spp_order_line (id, created_at, updated_at, tracker_id, pipeline_import_id, erp_order_ref, line_key, customer_name, pcode, item_description, ordered_qty, uom, del_date, unit_price, deliver_qty, balance_qty, from_opening_pipeline, is_ad_hoc)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          oid,
          now,
          now,
          trackerId,
          importId,
          r.erp_order_ref,
          r.line_key,
          r.customer_name,
          r.pcode,
          r.item_description,
          r.ordered_qty,
          r.uom,
          r.del_date,
          r.unit_price,
          r.deliver_qty,
          r.balance_qty,
          opts.isOpeningSnapshot ? 1 : 0,
          0,
        ]
      );
      inserted += 1;
    } catch {
      /* UNIQUE conflict — skip duplicate line */
    }
  }
  notifyLocalDbWrite();
  return { importId, inserted };
}

export async function sppListOrderLines(trackerId: string): Promise<SppOrderLineRow[]> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("spp_order_line").select("*").eq("tracker_id", trackerId);
    if (error) throw new Error(error.message);
    return (data as SppOrderLineRow[]) ?? [];
  }
  const db = await getLocalSqliteDb();
  const rows = dbAll<Record<string, unknown>>(db, "SELECT * FROM spp_order_line WHERE tracker_id = ? ORDER BY erp_order_ref, line_key", [
    trackerId,
  ]);
  return rows.map(mapSqliteOrderLine);
}

function mapSqliteOrderLine(r: Record<string, unknown>): SppOrderLineRow {
  return {
    id: String(r.id),
    tracker_id: String(r.tracker_id),
    pipeline_import_id: r.pipeline_import_id == null ? null : String(r.pipeline_import_id),
    erp_order_ref: String(r.erp_order_ref),
    line_key: String(r.line_key ?? ""),
    customer_name: r.customer_name == null ? null : String(r.customer_name),
    pcode: r.pcode == null ? null : String(r.pcode),
    item_description: r.item_description == null ? null : String(r.item_description),
    ordered_qty: r.ordered_qty == null ? null : Number(r.ordered_qty),
    uom: r.uom == null ? null : String(r.uom),
    del_date: r.del_date == null ? null : String(r.del_date),
    unit_price: r.unit_price == null ? null : Number(r.unit_price),
    unit_label: r.unit_label == null ? null : String(r.unit_label),
    deliver_qty: r.deliver_qty == null ? null : Number(r.deliver_qty),
    balance_qty: r.balance_qty == null ? null : Number(r.balance_qty),
    from_opening_pipeline: Boolean(r.from_opening_pipeline),
    is_ad_hoc: Boolean(r.is_ad_hoc),
    sales_order_id: r.sales_order_id == null ? null : String(r.sales_order_id),
  };
}

export async function sppUpsertMonthlyTarget(
  actor: CrmActor,
  lineId: string,
  targetQty: number | null,
  targetValueZar: number | null
): Promise<void> {
  assertSppWrite(actor);
  const now = new Date().toISOString();
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data: ex } = await supabase.from("spp_monthly_target").select("id").eq("spp_order_line_id", lineId).maybeSingle();
    if (ex) {
      const { error } = await supabase
        .from("spp_monthly_target")
        .update({ target_qty: targetQty, target_value_zar: targetValueZar, updated_at: now })
        .eq("spp_order_line_id", lineId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("spp_monthly_target").insert({
        spp_order_line_id: lineId,
        target_qty: targetQty,
        target_value_zar: targetValueZar,
      });
      if (error) throw new Error(error.message);
    }
    return;
  }
  const db = await getLocalSqliteDb();
  const row = dbAll<{ id: string }>(db, "SELECT id FROM spp_monthly_target WHERE spp_order_line_id = ?", [lineId]);
  if (row.length) {
    dbRun(
      db,
      "UPDATE spp_monthly_target SET target_qty = ?, target_value_zar = ?, updated_at = ? WHERE spp_order_line_id = ?",
      [targetQty, targetValueZar, now, lineId]
    );
  } else {
    dbRun(
      db,
      "INSERT INTO spp_monthly_target (id, created_at, updated_at, spp_order_line_id, target_qty, target_value_zar) VALUES (?,?,?,?,?,?)",
      [crypto.randomUUID(), now, now, lineId, targetQty, targetValueZar]
    );
  }
  notifyLocalDbWrite();
}

export async function sppUpsertWeeklyPlan(
  actor: CrmActor,
  lineId: string,
  weekStart: string,
  plannedQty: number | null,
  plannedValueZar: number | null
): Promise<void> {
  assertSppWrite(actor);
  const now = new Date().toISOString();
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data: ex } = await supabase
      .from("spp_weekly_plan")
      .select("id")
      .eq("spp_order_line_id", lineId)
      .eq("week_start", weekStart)
      .maybeSingle();
    if (ex) {
      const { error } = await supabase
        .from("spp_weekly_plan")
        .update({ planned_qty: plannedQty, planned_value_zar: plannedValueZar, updated_at: now })
        .eq("spp_order_line_id", lineId)
        .eq("week_start", weekStart);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("spp_weekly_plan").insert({
        spp_order_line_id: lineId,
        week_start: weekStart,
        planned_qty: plannedQty,
        planned_value_zar: plannedValueZar,
      });
      if (error) throw new Error(error.message);
    }
    return;
  }
  const db = await getLocalSqliteDb();
  const row = dbAll<{ id: string }>(
    db,
    "SELECT id FROM spp_weekly_plan WHERE spp_order_line_id = ? AND week_start = ?",
    [lineId, weekStart]
  );
  if (row.length) {
    dbRun(
      db,
      "UPDATE spp_weekly_plan SET planned_qty = ?, planned_value_zar = ?, updated_at = ? WHERE spp_order_line_id = ? AND week_start = ?",
      [plannedQty, plannedValueZar, now, lineId, weekStart]
    );
  } else {
    dbRun(
      db,
      "INSERT INTO spp_weekly_plan (id, created_at, updated_at, spp_order_line_id, week_start, planned_qty, planned_value_zar) VALUES (?,?,?,?,?,?,?)",
      [crypto.randomUUID(), now, now, lineId, weekStart, plannedQty, plannedValueZar]
    );
  }
  notifyLocalDbWrite();
}

export async function sppUpsertWeeklyActual(
  actor: CrmActor,
  lineId: string,
  weekStart: string,
  actualQty: number | null,
  actualValueZar: number | null
): Promise<void> {
  assertSppWrite(actor);
  const now = new Date().toISOString();
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data: ex } = await supabase
      .from("spp_actual")
      .select("id")
      .eq("spp_order_line_id", lineId)
      .eq("period_start", weekStart)
      .eq("granularity", "week")
      .maybeSingle();
    if (ex) {
      const { error } = await supabase
        .from("spp_actual")
        .update({ actual_qty: actualQty, actual_value_zar: actualValueZar, updated_at: now })
        .eq("spp_order_line_id", lineId)
        .eq("period_start", weekStart)
        .eq("granularity", "week");
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("spp_actual").insert({
        spp_order_line_id: lineId,
        period_start: weekStart,
        granularity: "week",
        actual_qty: actualQty,
        actual_value_zar: actualValueZar,
        entered_by: actor.id,
      });
      if (error) throw new Error(error.message);
    }
    return;
  }
  const db = await getLocalSqliteDb();
  const row = dbAll<{ id: string }>(
    db,
    "SELECT id FROM spp_actual WHERE spp_order_line_id = ? AND period_start = ? AND granularity = ?",
    [lineId, weekStart, "week"]
  );
  if (row.length) {
    dbRun(
      db,
      "UPDATE spp_actual SET actual_qty = ?, actual_value_zar = ?, updated_at = ? WHERE spp_order_line_id = ? AND period_start = ? AND granularity = ?",
      [actualQty, actualValueZar, now, lineId, weekStart, "week"]
    );
  } else {
    dbRun(
      db,
      "INSERT INTO spp_actual (id, created_at, updated_at, spp_order_line_id, period_start, granularity, actual_qty, actual_value_zar, entered_by) VALUES (?,?,?,?,?,?,?,?,?)",
      [crypto.randomUUID(), now, now, lineId, weekStart, "week", actualQty, actualValueZar, actor.id]
    );
  }
  notifyLocalDbWrite();
}

export async function sppUpsertVarianceNote(
  actor: CrmActor,
  lineId: string,
  weekStart: string,
  analysisText: string | null,
  deviationReasons: SppDeviationReason[]
): Promise<void> {
  assertSppWrite(actor);
  const now = new Date().toISOString();
  const reasons = deviationReasons.filter((x) => SPP_DEVIATION_REASONS.includes(x));
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data: ex } = await supabase
      .from("spp_variance_note")
      .select("id")
      .eq("spp_order_line_id", lineId)
      .eq("week_start", weekStart)
      .maybeSingle();
    if (ex) {
      const { error } = await supabase
        .from("spp_variance_note")
        .update({ analysis_text: analysisText, deviation_reasons: reasons, updated_at: now })
        .eq("spp_order_line_id", lineId)
        .eq("week_start", weekStart);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("spp_variance_note").insert({
        spp_order_line_id: lineId,
        week_start: weekStart,
        analysis_text: analysisText,
        deviation_reasons: reasons,
      });
      if (error) throw new Error(error.message);
    }
    return;
  }
  const db = await getLocalSqliteDb();
  const json = JSON.stringify(reasons);
  const row = dbAll<{ id: string }>(
    db,
    "SELECT id FROM spp_variance_note WHERE spp_order_line_id = ? AND week_start = ?",
    [lineId, weekStart]
  );
  if (row.length) {
    dbRun(
      db,
      "UPDATE spp_variance_note SET analysis_text = ?, deviation_reasons = ?, updated_at = ? WHERE spp_order_line_id = ? AND week_start = ?",
      [analysisText, json, now, lineId, weekStart]
    );
  } else {
    dbRun(
      db,
      "INSERT INTO spp_variance_note (id, created_at, updated_at, spp_order_line_id, week_start, analysis_text, deviation_reasons) VALUES (?,?,?,?,?,?,?)",
      [crypto.randomUUID(), now, now, lineId, weekStart, analysisText, json]
    );
  }
  notifyLocalDbWrite();
}

export async function sppAddAdHocLine(
  actor: CrmActor,
  trackerId: string,
  r: ParsedPipelineRow
): Promise<string> {
  assertSppWrite(actor);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { error } = await supabase.from("spp_order_line").insert({
      id,
      tracker_id: trackerId,
      pipeline_import_id: null,
      erp_order_ref: r.erp_order_ref,
      line_key: r.line_key,
      customer_name: r.customer_name,
      pcode: r.pcode,
      item_description: r.item_description,
      ordered_qty: r.ordered_qty,
      uom: r.uom,
      del_date: r.del_date,
      unit_price: r.unit_price,
      deliver_qty: r.deliver_qty,
      balance_qty: r.balance_qty,
      from_opening_pipeline: false,
      is_ad_hoc: true,
    });
    if (error) throw new Error(error.message);
    return id;
  }
  const db = await getLocalSqliteDb();
  dbRun(
    db,
    `INSERT INTO spp_order_line (id, created_at, updated_at, tracker_id, pipeline_import_id, erp_order_ref, line_key, customer_name, pcode, item_description, ordered_qty, uom, del_date, unit_price, deliver_qty, balance_qty, from_opening_pipeline, is_ad_hoc)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      now,
      now,
      trackerId,
      null,
      r.erp_order_ref,
      r.line_key,
      r.customer_name,
      r.pcode,
      r.item_description,
      r.ordered_qty,
      r.uom,
      r.del_date,
      r.unit_price,
      r.deliver_qty,
      r.balance_qty,
      0,
      1,
    ]
  );
  notifyLocalDbWrite();
  return id;
}

export type SppLineBundle = SppOrderLineRow & {
  monthly: SppMonthlyTargetRow | null;
  weeklyPlans: Map<string, { planned_qty: number | null; planned_value_zar: number | null }>;
  weeklyActuals: Map<string, { actual_qty: number | null; actual_value_zar: number | null }>;
  variance: Map<
    string,
    { analysis_text: string | null; deviation_reasons: SppDeviationReason[] }
  >;
};

export async function sppLoadBundle(trackerId: string, lineIds: string[]): Promise<Map<string, SppLineBundle>> {
  const map = new Map<string, SppLineBundle>();
  if (!lineIds.length) return map;
  const lines = await sppListOrderLines(trackerId);
  for (const ln of lines) {
    if (!lineIds.includes(ln.id)) continue;
    map.set(ln.id, {
      ...ln,
      monthly: null,
      weeklyPlans: new Map(),
      weeklyActuals: new Map(),
      variance: new Map(),
    });
  }
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data: mt } = await supabase.from("spp_monthly_target").select("*").in("spp_order_line_id", lineIds);
    for (const row of mt ?? []) {
      const m = map.get(row.spp_order_line_id as string);
      if (m)
        m.monthly = {
          spp_order_line_id: row.spp_order_line_id as string,
          target_qty: row.target_qty as number | null,
          target_value_zar: row.target_value_zar as number | null,
        };
    }
    const { data: wp } = await supabase.from("spp_weekly_plan").select("*").in("spp_order_line_id", lineIds);
    for (const row of wp ?? []) {
      const m = map.get(row.spp_order_line_id as string);
      if (m)
        m.weeklyPlans.set(row.week_start as string, {
          planned_qty: row.planned_qty as number | null,
          planned_value_zar: row.planned_value_zar as number | null,
        });
    }
    const { data: ac } = await supabase.from("spp_actual").select("*").in("spp_order_line_id", lineIds).eq("granularity", "week");
    for (const row of ac ?? []) {
      const m = map.get(row.spp_order_line_id as string);
      if (m)
        m.weeklyActuals.set(row.period_start as string, {
          actual_qty: row.actual_qty as number | null,
          actual_value_zar: row.actual_value_zar as number | null,
        });
    }
    const { data: vn } = await supabase.from("spp_variance_note").select("*").in("spp_order_line_id", lineIds);
    for (const row of vn ?? []) {
      const m = map.get(row.spp_order_line_id as string);
      if (m)
        m.variance.set(row.week_start as string, {
          analysis_text: row.analysis_text as string | null,
          deviation_reasons: parseDeviationReasons(row.deviation_reasons),
        });
    }
    return map;
  }
  const db = await getLocalSqliteDb();
  const placeholders = lineIds.map(() => "?").join(",");
  const mtRows = dbAll<Record<string, unknown>>(
    db,
    `SELECT * FROM spp_monthly_target WHERE spp_order_line_id IN (${placeholders})`,
    lineIds
  );
  for (const row of mtRows) {
    const id = String(row.spp_order_line_id);
    const m = map.get(id);
    if (m)
      m.monthly = {
        spp_order_line_id: id,
        target_qty: row.target_qty == null ? null : Number(row.target_qty),
        target_value_zar: row.target_value_zar == null ? null : Number(row.target_value_zar),
      };
  }
  const wpRows = dbAll<Record<string, unknown>>(
    db,
    `SELECT * FROM spp_weekly_plan WHERE spp_order_line_id IN (${placeholders})`,
    lineIds
  );
  for (const row of wpRows) {
    const m = map.get(String(row.spp_order_line_id));
    if (m)
      m.weeklyPlans.set(String(row.week_start), {
        planned_qty: row.planned_qty == null ? null : Number(row.planned_qty),
        planned_value_zar: row.planned_value_zar == null ? null : Number(row.planned_value_zar),
      });
  }
  const acRows = dbAll<Record<string, unknown>>(
    db,
    `SELECT * FROM spp_actual WHERE granularity = 'week' AND spp_order_line_id IN (${placeholders})`,
    lineIds
  );
  for (const row of acRows) {
    const m = map.get(String(row.spp_order_line_id));
    if (m)
      m.weeklyActuals.set(String(row.period_start), {
        actual_qty: row.actual_qty == null ? null : Number(row.actual_qty),
        actual_value_zar: row.actual_value_zar == null ? null : Number(row.actual_value_zar),
      });
  }
  const vnRows = dbAll<Record<string, unknown>>(
    db,
    `SELECT * FROM spp_variance_note WHERE spp_order_line_id IN (${placeholders})`,
    lineIds
  );
  for (const row of vnRows) {
    const m = map.get(String(row.spp_order_line_id));
    if (m)
      m.variance.set(String(row.week_start), {
        analysis_text: row.analysis_text == null ? null : String(row.analysis_text),
        deviation_reasons: parseDeviationReasons(row.deviation_reasons),
      });
  }
  return map;
}

export type SppPipelineImportAuditRow = {
  id: string;
  created_at: string;
  file_name: string;
  row_count: number;
  is_opening_snapshot: boolean;
  imported_by: string;
};

export async function sppListPipelineImports(trackerId: string): Promise<SppPipelineImportAuditRow[]> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("spp_pipeline_import")
      .select("id, created_at, file_name, row_count, is_opening_snapshot, imported_by")
      .eq("tracker_id", trackerId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as SppPipelineImportAuditRow[]) ?? [];
  }
  const db = await getLocalSqliteDb();
  const rows = dbAll<Record<string, unknown>>(
    db,
    `SELECT id, created_at, file_name, row_count, is_opening_snapshot, imported_by FROM spp_pipeline_import WHERE tracker_id = ? ORDER BY created_at DESC`,
    [trackerId]
  );
  return rows.map((r) => ({
    id: String(r.id),
    created_at: String(r.created_at),
    file_name: String(r.file_name),
    row_count: Number(r.row_count),
    is_opening_snapshot: Boolean(r.is_opening_snapshot),
    imported_by: String(r.imported_by),
  }));
}
