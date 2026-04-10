import type { SpreadsheetOrderRow } from "./spreadsheetOrderTypes";

export type MonthlyTopItem = {
  month: string;
  monthLabel: string;
  itemCode: string;
  description: string;
  totalQuantity: number;
};

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

function monthKeyFromOrderDate(orderDate: string | null): string | null {
  if (!orderDate || orderDate.length < 7) return null;
  return orderDate.slice(0, 7);
}

export function computeGrandTotalStats(rows: SpreadsheetOrderRow[]): {
  count: number;
  sum: number;
  average: number | null;
} {
  const values = rows.map((r) => r.grandTotal).filter((v): v is number => v != null && !Number.isNaN(v));
  const count = values.length;
  if (count === 0) return { count: 0, sum: 0, average: null };
  const sum = values.reduce((a, b) => a + b, 0);
  return { count, sum, average: sum / count };
}

/** Per calendar month (from order date), the item with the highest total ordered quantity. */
export function computeTopItemByMonth(rows: SpreadsheetOrderRow[]): MonthlyTopItem[] {
  type Agg = { qty: number; description: string };
  const byMonth = new Map<string, Map<string, Agg>>();

  for (const r of rows) {
    const mk = monthKeyFromOrderDate(r.orderDate);
    if (!mk || r.quantity == null || Number.isNaN(r.quantity)) continue;
    let items = byMonth.get(mk);
    if (!items) {
      items = new Map();
      byMonth.set(mk, items);
    }
    const code = r.itemCode.trim() || "—";
    const prev = items.get(code);
    const desc = r.description?.trim() || code;
    if (prev) {
      items.set(code, { qty: prev.qty + r.quantity, description: prev.description || desc });
    } else {
      items.set(code, { qty: r.quantity, description: desc });
    }
  }

  const keys = [...byMonth.keys()].sort();
  const out: MonthlyTopItem[] = [];

  for (const mk of keys) {
    const items = byMonth.get(mk)!;
    let bestCode = "";
    let bestQty = -1;
    let bestDesc = "";
    for (const [code, agg] of items) {
      if (agg.qty > bestQty || (agg.qty === bestQty && code.localeCompare(bestCode) < 0)) {
        bestQty = agg.qty;
        bestCode = code;
        bestDesc = agg.description;
      }
    }
    if (bestCode && bestQty >= 0) {
      const [y, m] = mk.split("-").map(Number);
      const d = new Date(y, (m ?? 1) - 1, 1);
      out.push({
        month: mk,
        monthLabel: Number.isFinite(d.getTime()) ? monthFormatter.format(d) : mk,
        itemCode: bestCode,
        description: bestDesc,
        totalQuantity: bestQty,
      });
    }
  }

  return out;
}
