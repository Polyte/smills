import { downloadCsv } from "./workforceRepo";
import type { SppDeviationReason, SppLineBundle } from "./sppRepo";

export function sppRollupDeviationReasons(lines: SppLineBundle[]): Partial<Record<SppDeviationReason, number>> {
  const counts: Partial<Record<SppDeviationReason, number>> = {};
  for (const ln of lines) {
    for (const vn of ln.variance.values()) {
      for (const r of vn.deviation_reasons) {
        counts[r] = (counts[r] ?? 0) + 1;
      }
    }
  }
  return counts;
}

export function sppDownloadExecutiveCsv(opts: {
  yearMonth: string;
  productLine: string;
  weeks: string[];
  lines: SppLineBundle[];
  weeklySummary: { plan: number; act: number }[];
}): void {
  const { yearMonth, productLine, weeks, lines, weeklySummary } = opts;
  const data: string[][] = [];
  data.push(["Sales & Production Planning — executive export"]);
  data.push(["Month", yearMonth, "Product line", productLine]);
  data.push([]);
  data.push(["Weekly volume summary"]);
  data.push(["Week start", "Planned qty", "Actual qty", "Variance qty"]);
  weeks.forEach((w, i) => {
    const s = weeklySummary[i] ?? { plan: 0, act: 0 };
    data.push([w, String(s.plan), String(s.act), String(s.act - s.plan)]);
  });
  data.push([]);
  data.push(["Order line roll-up"]);
  data.push([
    "Order",
    "Customer",
    "Item",
    "Ad-hoc",
    "Mth target qty",
    "Mth target ZAR",
    "Sum planned (weeks)",
    "Sum actual (weeks)",
    "Variance qty",
  ]);
  for (const ln of lines) {
    let sumP = 0;
    let sumA = 0;
    for (const w of weeks) {
      sumP += Number(ln.weeklyPlans.get(w)?.planned_qty ?? 0) || 0;
      sumA += Number(ln.weeklyActuals.get(w)?.actual_qty ?? 0) || 0;
    }
    data.push([
      ln.erp_order_ref,
      ln.customer_name ?? "",
      (ln.item_description ?? "").replace(/\s+/g, " "),
      ln.is_ad_hoc ? "yes" : "no",
      String(ln.monthly?.target_qty ?? ""),
      String(ln.monthly?.target_value_zar ?? ""),
      String(sumP),
      String(sumA),
      String(sumA - sumP),
    ]);
  }
  const roll = sppRollupDeviationReasons(lines);
  data.push([]);
  data.push(["Deviation analysis tags (week-notes)"]);
  data.push(["Reason code", "Count"]);
  for (const [k, v] of Object.entries(roll)) {
    if (v && v > 0) data.push([k, String(v)]);
  }
  const maxCols = Math.max(...data.map((r) => r.length), 1);
  const padded = data.map((r) => {
    const x = [...r];
    while (x.length < maxCols) x.push("");
    return x;
  });
  downloadCsv(`spp-executive-${yearMonth}-${productLine}.csv`, padded[0]!, padded.slice(1));
}
