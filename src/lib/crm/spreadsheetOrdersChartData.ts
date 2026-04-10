import type { SpreadsheetOrderRow } from "./spreadsheetOrderTypes";

export type RevenueByMonthPoint = { month: string; label: string; total: number };
export type StatusSlice = { name: string; value: number };
export type CustomerBar = { customer: string; total: number };

const monthFmt = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" });

export function revenueByOrderMonth(rows: SpreadsheetOrderRow[]): RevenueByMonthPoint[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!r.orderDate || r.grandTotal == null) continue;
    const mk = r.orderDate.slice(0, 7);
    map.set(mk, (map.get(mk) ?? 0) + r.grandTotal);
  }
  const keys = [...map.keys()].sort();
  return keys.map((month) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, (m ?? 1) - 1, 1);
    return {
      month,
      label: Number.isFinite(d.getTime()) ? monthFmt.format(d) : month,
      total: map.get(month) ?? 0,
    };
  });
}

export function deliveryStatusBreakdown(rows: SpreadsheetOrderRow[]): StatusSlice[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = r.deliveryStatus?.trim() || "Unknown";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function topCustomersByGrandTotal(rows: SpreadsheetOrderRow[], limit = 8): CustomerBar[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.grandTotal == null) continue;
    const c = r.customer.trim() || "Unknown";
    map.set(c, (map.get(c) ?? 0) + r.grandTotal);
  }
  return [...map.entries()]
    .map(([customer, total]) => ({ customer, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
