import ordersFilledRaw from "../../data/ordersFilled.json";
import type { ImportedOrderLine } from "./importedOrdersTypes";
import type { SpreadsheetOrderRow, SpreadsheetOrderStatus } from "./spreadsheetOrderTypes";

const LEDGER_SEED = ordersFilledRaw as ImportedOrderLine[];

export const SPREADSHEET_ORDERS_STORAGE_KEY = "sm_spreadsheet_orders_v2";

type StoredPayload = {
  version: 2;
  rows: SpreadsheetOrderRow[];
};

function rowMergeKey(line: Pick<ImportedOrderLine, "salesOrder" | "itemCode" | "orderDate">): string {
  return `${line.salesOrder}\t${line.itemCode}\t${line.orderDate ?? ""}`;
}

function seedRow(line: ImportedOrderLine, index: number): SpreadsheetOrderRow {
  return {
    ...line,
    id: `imp-${index}`,
    source: "seed",
    orderStatus: "open",
    comments: [],
  };
}

export function buildFreshRowsFromSeed(seed: ImportedOrderLine[]): SpreadsheetOrderRow[] {
  return seed.map((line, i) => seedRow(line, i));
}

/** Merge persisted rows with current JSON seed so deploys can refresh spreadsheet data without losing manual rows. */
export function mergeSeedWithStored(seed: ImportedOrderLine[], storedRows: SpreadsheetOrderRow[]): SpreadsheetOrderRow[] {
  const prevByKey = new Map<string, SpreadsheetOrderRow>();
  for (const r of storedRows) {
    if (r.source === "manual" || r.id.startsWith("custom-")) continue;
    prevByKey.set(rowMergeKey(r), r);
  }

  const mergedSeed = seed.map((line, i) => {
    const k = rowMergeKey(line);
    const prev = prevByKey.get(k);
    if (prev) {
      return {
        ...line,
        id: prev.id,
        source: "seed" as const,
        orderStatus: prev.orderStatus,
        comments: prev.comments,
      };
    }
    return seedRow(line, i);
  });

  const manual = storedRows.filter((r) => r.source === "manual" || r.id.startsWith("custom-"));
  return [...mergedSeed, ...manual];
}

export function parseStoredPayload(raw: string, seed: ImportedOrderLine[]): SpreadsheetOrderRow[] | null {
  try {
    const data = JSON.parse(raw) as Partial<StoredPayload>;
    if (!data || !Array.isArray(data.rows)) return null;
    return mergeSeedWithStored(seed, data.rows as SpreadsheetOrderRow[]);
  } catch {
    return null;
  }
}

export function serializeRows(rows: SpreadsheetOrderRow[]): string {
  const payload: StoredPayload = { version: 2, rows };
  return JSON.stringify(payload);
}

export function isSpreadsheetOrderStatus(v: string): v is SpreadsheetOrderStatus {
  return (
    v === "draft" ||
    v === "open" ||
    v === "in_progress" ||
    v === "completed" ||
    v === "cancelled"
  );
}

/** Distinct customer names from the browser ledger (localStorage + seed) for contact sync. */
export function listDistinctLedgerCustomerNamesFromBrowser(): string[] {
  if (typeof window === "undefined") return [];
  let rows: SpreadsheetOrderRow[];
  try {
    const raw = localStorage.getItem(SPREADSHEET_ORDERS_STORAGE_KEY);
    if (!raw) {
      rows = buildFreshRowsFromSeed(LEDGER_SEED);
    } else {
      rows = parseStoredPayload(raw, LEDGER_SEED) ?? buildFreshRowsFromSeed(LEDGER_SEED);
    }
  } catch {
    rows = buildFreshRowsFromSeed(LEDGER_SEED);
  }
  const names = new Set<string>();
  for (const r of rows) {
    const c = r.customer?.trim();
    if (c) names.add(c);
  }
  return [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}
