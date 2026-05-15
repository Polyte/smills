import type { ParsedPipelineRow } from "./sppRepo";
import { sppParsePipelineTable } from "./sppRepo";

/** HTML `accept` for pipeline CSV/TSV/Excel (include MIME types for stricter browsers). */
export const PIPELINE_FILE_ACCEPT =
  ".csv,.txt,.tsv,.xlsx,.xls,.xlsm,text/csv,text/plain,text/tab-separated-values,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

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

export const SPP_IMPORT_FIELD_META: { key: SppImportField; label: string; required: boolean; description?: string }[] = [
  { key: "erp_order_ref", label: "Order (SO ref)", required: true, description: "Sales order reference number" },
  { key: "del_date", label: "Del / due date", required: false, description: "Delivery or due date for the order" },
  { key: "customer_name", label: "Customer", required: false, description: "Customer name or identifier" },
  { key: "pcode", label: "Product code", required: false, description: "Product or item code" },
  { key: "item_description", label: "Item / description", required: false, description: "Item description or name" },
  { key: "ordered_qty", label: "Ordered qty", required: false, description: "Quantity ordered" },
  { key: "uom", label: "Unit / UoM", required: false, description: "Unit of measure" },
  { key: "unit_price", label: "Unit price", required: false, description: "Price per unit" },
  { key: "deliver_qty", label: "Delivered qty", required: false, description: "Quantity already delivered" },
  { key: "balance_qty", label: "Balance", required: false, description: "Remaining balance to deliver" },
];

export type SppColumnMapping = Partial<Record<SppImportField, number>>;

function normHeader(h: string): string {
  return h.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/\s+/g, " ");
}

function buildHeaderIndex(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    const key = normHeader(h);
    // Only keep the FIRST occurrence of each column name (ignore duplicates)
    if (!(key in map)) map[key] = i;
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
  set("erp_order_ref", [
    "order", "so", "order no", "order #", "sales order", "order ref",
    "order number", "reference", "ref no", "so no", "s/o", "so number",
    "order id", "order code", "job no", "job number", "job ref",
  ]);
  set("del_date", [
    "del date", "delivery", "del. date", "due date", "delivery date",
    "required date", "target date", "date required", "ship date",
    "despatch date", "dispatch date", "commit date",
  ]);
  set("customer_name", [
    "customer", "customer name", "client", "cust", "cust name",
    "company", "account", "debtor", "buyer", "ship to",
  ]);
  set("pcode", [
    "pcode", "p code", "product code", "code", "sku", "item code",
    "item no", "material code", "part no", "part number", "article",
    "stock code", "product no", "prod code", "mat code",
  ]);
  set("item_description", [
    "item", "description", "product", "material", "desc", "product desc",
    "item description", "product description", "item name", "product name",
    "goods", "details", "specification",
  ]);
  set("ordered_qty", [
    "ordered", "order qty", "qty ordered", "qty", "quantity",
    "ord qty", "quantity ordered", "units ordered", "ordered quantity",
    "order quantity", "req qty", "required qty", "order qty",
  ]);
  set("uom", ["unit", "uom", "units", "unit of measure", "measure", "um"]);
  set("unit_price", [
    "price", "unit price", "sell price", "unit price zar", "price zar",
    "selling price", "rate", "nett price", "net price",
  ]);
  set("deliver_qty", [
    "deliver", "delivered", "qty delivered", "del qty", "shipped",
    "dispatched", "despatched", "qty shipped", "delivered qty",
  ]);
  set("balance_qty", [
    "balance", "bal", "open qty", "remaining", "outstanding",
    "undelivered", "backorder", "back order", "open balance",
  ]);
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

/** Yield to the browser event loop so the loading UI renders before sync work. */
function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Read CSV/TSV or Excel first sheet into headers + data rows.
 *  Chunks row processing to avoid freezing the UI on large files. */
export async function sppReadFileAsTable(
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ headers: string[]; rows: string[][] }> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".xlsm")) {
    onProgress?.(5);
    const buf = await file.arrayBuffer();
    onProgress?.(10);

    // Yield so the dialog busy/loading state renders before sync work.
    await yieldToBrowser();

    onProgress?.(20);
    const XLSX = await import("xlsx");
    let wb: import("xlsx").WorkBook;
    try {
      wb = XLSX.read(buf, { type: "array", cellDates: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `Could not read Excel workbook (${msg}). Try “Save as” .xlsx, or export the sheet as CSV.`
      );
    }
    onProgress?.(40);

    const sheet = wb.SheetNames[0];
    if (!sheet) return { headers: [], rows: [] };
    const ws = wb.Sheets[sheet];

    // Yield before sheet_to_json (which is sync & heavy for large files).
    await yieldToBrowser();
    const aoa = XLSX.utils.sheet_to_json<(string | number | boolean | null | undefined)[]>(ws, {
      header: 1,
      raw: false,
      defval: "",
    }) as unknown[][];
    onProgress?.(65);

    if (!aoa.length) return { headers: [], rows: [] };

    const headers = (aoa[0] as unknown[]).map((c) => String(c ?? "").trim());
    const rows: string[][] = [];
    const rowCount = aoa.length - 1;

    // Process data rows in chunks, yielding between chunks to keep the UI responsive.
    const CHUNK = 250;
    for (let start = 1; start < aoa.length; start += CHUNK) {
      const end = Math.min(start + CHUNK, aoa.length);
      for (let ri = start; ri < end; ri++) {
        const r = aoa[ri] as unknown[];
        rows.push(headers.map((_, i) => String(r[i] ?? "").trim()));
      }
      // Update progress proportionally (65–95 %).
      const pct = 65 + Math.round(((end - 1) / rowCount) * 30);
      onProgress?.(pct);

      // Yield after each chunk so the browser can paint and handle input.
      if (end < aoa.length) {
        await yieldToBrowser();
      }
    }

    onProgress?.(95);
    await yieldToBrowser();
    onProgress?.(100);

    return { headers, rows };
  }

  // CSV / TSV path — process in chunks to keep the UI responsive.
  onProgress?.(15);
  const text = await file.text();
  onProgress?.(25);
  await yieldToBrowser();

  // Split into lines
  const allLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (!allLines.length) return { headers: [], rows: [] };

  // Detect delimiter — try ; first (common in SA/European Excel exports), then tab, then comma
  const delim = allLines.some(l => l.includes(";")) ? ";" : allLines[0]!.includes("\t") ? "\t" : ",";
  const csvSplit = (line: string): string[] => {
    if (delim === "\t") return line.split("\t").map((c) => c.trim());
    const splitChar = delim; // use detected delimiter (; or ,)
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (ch === '"') { q = !q; }
      else if (ch === splitChar && !q) { out.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    out.push(cur.trim());
    return out;
  };

  // Auto-detect the real header row: find the first row containing known column keywords
  const KNOWN_HEADER_KEYWORDS = ["order", "so", "sales order", "customer", "product", "item", "qty"];
  let headerIdx = 0;
  for (let i = 0; i < Math.min(allLines.length, 20); i++) {
    const cells = csvSplit(allLines[i]!);
    const text = cells.join(" ").toLowerCase();
    const matchCount = KNOWN_HEADER_KEYWORDS.filter(k => text.includes(k)).length;
    if (matchCount >= 2) { headerIdx = i; break; }
  }

  const headers = csvSplit(allLines[headerIdx]!);
  const rows: string[][] = [];
  const dataLines = allLines.slice(headerIdx + 1);
  const totalRows = dataLines.length;
  const CHUNK = 250;

  onProgress?.(35);
  await yieldToBrowser();

  for (let start = 0; start < totalRows; start += CHUNK) {
    const end = Math.min(start + CHUNK, totalRows);
    for (let i = start; i < end; i++) {
      rows.push(csvSplit(dataLines[i]!));
    }
    const pct = 35 + Math.round(((end) / totalRows) * 55);
    onProgress?.(pct);
    if (end < totalRows) await yieldToBrowser();
  }

  onProgress?.(95);
  await yieldToBrowser();
  onProgress?.(100);
  return { headers, rows };
}
