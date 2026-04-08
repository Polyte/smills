import type { ParsedPipelineRow } from "./sppRepo";
import { sppParsePipelineTable } from "./sppRepo";

/** Maps ERP export columns (by 0-based index) to pipeline fields. A–F core: order, del date, customer, pcode, item, ordered. */
export type SppImportField =
  | "erp_order_ref"
  | "del_date"
  | "customer_name"
  | "pcode"
  | "item_description"
  | "ordered_qty"
  | "uom"
  | "unit_price"
  | "deliver_qty"
  | "balance_qty";

export const SPP_IMPORT_FIELD_META: { key: SppImportField; label: string; required: boolean }[] = [
  { key: "erp_order_ref", label: "Order (SO ref)", required: true },
  { key: "del_date", label: "Del / due date", required: false },
  { key: "customer_name", label: "Customer", required: false },
  { key: "pcode", label: "Product code", required: false },
  { key: "item_description", label: "Item / description", required: false },
  { key: "ordered_qty", label: "Ordered qty", required: false },
  { key: "uom", label: "Unit / UoM", required: false },
  { key: "unit_price", label: "Unit price", required: false },
  { key: "deliver_qty", label: "Delivered qty", required: false },
  { key: "balance_qty", label: "Balance", required: false },
];

export type SppColumnMapping = Partial<Record<SppImportField, number>>;

function normHeader(h: string): string {
  return h.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/\s+/g, " ");
}

function buildHeaderIndex(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    map[normHeader(h)] = i;
  });
  return map;
}

function findIdx(m: Record<string, number>, aliases: string[]): number | undefined {
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

/** Auto-map common ERP / Excel header names to field indices. */
export function sppGuessColumnMapping(headers: string[]): SppColumnMapping {
  const m = buildHeaderIndex(headers);
  const map: SppColumnMapping = {};
  const set = (field: SppImportField, aliases: string[]) => {
    const ix = findIdx(m, aliases);
    if (ix !== undefined) map[field] = ix;
  };
  set("erp_order_ref", ["order", "so", "order no", "order #", "sales order", "order ref"]);
  set("del_date", ["del date", "delivery", "del. date", "due date", "del date"]);
  set("customer_name", ["customer", "customer name", "client", "cust"]);
  set("pcode", ["pcode", "p code", "product code", "code", "sku"]);
  set("item_description", ["item", "description", "product", "material"]);
  set("ordered_qty", ["ordered", "order qty", "qty ordered", "qty", "order qty"]);
  set("uom", ["unit", "uom", "units"]);
  set("unit_price", ["price", "unit price", "sell price", "unit price zar"]);
  set("deliver_qty", ["deliver", "delivered", "qty delivered", "del qty"]);
  set("balance_qty", ["balance", "bal", "open qty", "remaining"]);
  return map;
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

function cellAt(cells: string[], mapping: SppColumnMapping, field: SppImportField): string | undefined {
  const ix = mapping[field];
  if (ix === undefined) return undefined;
  return cells[ix];
}

/** Build one pipeline row using explicit column indices (preview + import). */
export function sppRowFromColumnMapping(cells: string[], mapping: SppColumnMapping): ParsedPipelineRow | null {
  const erp = cellAt(cells, mapping, "erp_order_ref")?.trim();
  if (!erp) return null;
  const pcode = cellAt(cells, mapping, "pcode")?.trim() ?? null;
  const lineKey = pcode ? `${erp}::${pcode}` : erp;
  return {
    erp_order_ref: erp,
    line_key: lineKey,
    customer_name: cellAt(cells, mapping, "customer_name")?.trim() ?? null,
    pcode,
    item_description: cellAt(cells, mapping, "item_description")?.trim() ?? null,
    ordered_qty: parseNum(cellAt(cells, mapping, "ordered_qty")),
    uom: cellAt(cells, mapping, "uom")?.trim() ?? null,
    del_date: parseDateCell(cellAt(cells, mapping, "del_date")),
    unit_price: parseNum(cellAt(cells, mapping, "unit_price")),
    deliver_qty: parseNum(cellAt(cells, mapping, "deliver_qty")),
    balance_qty: parseNum(cellAt(cells, mapping, "balance_qty")),
  };
}

export function sppParseAllRowsWithMapping(
  headers: string[],
  rows: string[][],
  mapping: SppColumnMapping
): ParsedPipelineRow[] {
  const out: ParsedPipelineRow[] = [];
  for (const cells of rows) {
    if (cells.every((c) => !String(c).trim())) continue;
    const padded = [...cells];
    while (padded.length < headers.length) padded.push("");
    const r = sppRowFromColumnMapping(padded, mapping);
    if (r) out.push(r);
  }
  return out;
}

/** Read CSV/TSV or Excel first sheet into headers + data rows. */
export async function sppReadFileAsTable(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const sheet = wb.SheetNames[0];
    if (!sheet) return { headers: [], rows: [] };
    const ws = wb.Sheets[sheet];
    const aoa = XLSX.utils.sheet_to_json<(string | number | boolean | null | undefined)[]>(ws, {
      header: 1,
      raw: false,
      defval: "",
    }) as unknown[][];
    if (!aoa.length) return { headers: [], rows: [] };
    const headers = (aoa[0] as unknown[]).map((c) => String(c ?? "").trim());
    const rows = aoa.slice(1).map((row) => {
      const r = row as unknown[];
      return headers.map((_, i) => String(r[i] ?? "").trim());
    });
    return { headers, rows };
  }
  const text = await file.text();
  return sppParsePipelineTable(text);
}
