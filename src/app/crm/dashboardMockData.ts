import type { InvDashboardInsightRow } from "../../lib/crm/inventoryRepo";

/** Theme-aligned tokens for Recharts (SVG reads CSS variables). */
export const dashChartVar = (n: 1 | 2 | 3 | 4 | 5) => `var(--chart-${n})`;

/** Weekly throughput (1000s of units) — illustrative mill output. */
export const mockWeeklyMillOutput = [
  { week: "Jan W1", fabric: 12.4, yarn: 8.2, greige: 5.1 },
  { week: "Jan W2", fabric: 14.1, yarn: 7.8, greige: 5.6 },
  { week: "Jan W3", fabric: 13.2, yarn: 9.4, greige: 6.0 },
  { week: "Jan W4", fabric: 15.8, yarn: 8.9, greige: 5.4 },
  { week: "Feb W1", fabric: 16.2, yarn: 10.1, greige: 6.3 },
  { week: "Feb W2", fabric: 17.0, yarn: 9.6, greige: 6.8 },
  { week: "Feb W3", fabric: 18.4, yarn: 11.2, greige: 7.1 },
  { week: "Feb W4", fabric: 19.1, yarn: 10.8, greige: 7.4 },
];

/** SKU mix (% of shipped volume) — sample. */
export const mockProductLineMix = [
  { name: "Woven sheeting", value: 28, fill: dashChartVar(1) },
  { name: "Spun yarn cones", value: 24, fill: dashChartVar(2) },
  { name: "Greige cloth", value: 18, fill: dashChartVar(3) },
  { name: "Finished apparel", value: 16, fill: dashChartVar(4) },
  { name: "Industrial blends", value: 14, fill: dashChartVar(5) },
];

/** Pipeline counts when CRM has no deals yet. */
export const mockDealPipelineByStage = [
  { stage: "qualification", count: 6 },
  { stage: "proposal", count: 4 },
  { stage: "won", count: 3 },
  { stage: "lost", count: 1 },
];

export const mockBestSelling: InvDashboardInsightRow[] = [
  { item_id: "mock-1", sku: "SM-COT-240", name: "Cotton sheeting 240cm", qty: 12840, deltaVsPriorPct: null },
  { item_id: "mock-2", sku: "SM-YRN-NE32", name: "Ne 32/1 combed yarn", qty: 9620, deltaVsPriorPct: null },
  { item_id: "mock-3", sku: "SM-GRG-150", name: "Greige twill 150gsm", qty: 7140, deltaVsPriorPct: null },
  { item_id: "mock-4", sku: "SM-DEN-12", name: "Denim roll 12oz", qty: 5020, deltaVsPriorPct: null },
  { item_id: "mock-5", sku: "SM-KNT-PK", name: "Knit polo greige", qty: 3890, deltaVsPriorPct: null },
];

export const mockTrending: InvDashboardInsightRow[] = [
  { item_id: "mock-t1", sku: "SM-COT-240", name: "Cotton sheeting 240cm", qty: 2100, deltaVsPriorPct: 18 },
  { item_id: "mock-t2", sku: "SM-YRN-NE40", name: "Ne 40/1 ring yarn", qty: 1840, deltaVsPriorPct: 42 },
  { item_id: "mock-t3", sku: "SM-LIN-BL", name: "Linen blend shirting", qty: 920, deltaVsPriorPct: -6 },
  { item_id: "mock-t4", sku: "SM-TWL-CHK", name: "Towelling checks", qty: 760, deltaVsPriorPct: 11 },
  { item_id: "mock-t5", sku: "SM-EXP-FG", name: "Export FG pack", qty: 540, deltaVsPriorPct: null },
];

/** Daily activity index (0–100) — sample spark-style series. */
export const mockFloorActivityIndex = [
  { day: "Mon", index: 62 },
  { day: "Tue", index: 71 },
  { day: "Wed", index: 68 },
  { day: "Thu", index: 79 },
  { day: "Fri", index: 85 },
  { day: "Sat", index: 44 },
  { day: "Sun", index: 32 },
];

const STAGES = ["qualification", "proposal", "won", "lost"] as const;

export function normalizePipelineStages(rows: { stage: string; count: number }[]) {
  const map = new Map(rows.map((r) => [r.stage, r.count]));
  return STAGES.map((stage) => ({ stage, count: map.get(stage) ?? 0 }));
}

export function pipelineStageFill(stage: string): string {
  switch (stage) {
    case "qualification":
      return dashChartVar(1);
    case "proposal":
      return dashChartVar(2);
    case "won":
      return dashChartVar(4);
    case "lost":
      return dashChartVar(3);
    default:
      return dashChartVar(5);
  }
}

export function getPipelineChartData(real: { stage: string; count: number }[]) {
  const normalized = normalizePipelineStages(real);
  const total = normalized.reduce((s, r) => s + r.count, 0);
  if (total === 0) {
    return { data: mockDealPipelineByStage, isSample: true as const };
  }
  return { data: normalized, isSample: false as const };
}
