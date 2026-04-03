import type { InvDashboardInsightRow } from "../../lib/crm/inventoryRepo";

/** Theme-aligned tokens for Recharts (SVG reads CSS variables). */
export const dashChartVar = (n: 1 | 2 | 3 | 4 | 5) => `var(--chart-${n})`;

/**
 * Public-site snapshot — https://www.standertonmills.co.za/
 * Use for dashboard “At a glance” (CRM illustration, not live HR data).
 */
export const standertonMillsFacts = [
  { label: "Established", value: "1947", detail: "Serving industry since 1947" },
  { label: "Facility", value: "25,000 m²", detail: "Standerton, Mpumalanga" },
  { label: "Machines", value: "200+", detail: "Advanced textile equipment" },
  { label: "Team", value: "500+", detail: "Employees (per company site)" },
] as const;

/**
 * Weekly throughput (1000s of units) — illustrative: prep/sliver proxy, spun yarn, woven greige.
 * Aligns with integrated yarn + fabric manufacturing.
 */
export const mockWeeklyMillOutput = [
  { week: "Jan W1", cardedSliver: 5.1, spunYarn: 8.2, wovenGreige: 12.4 },
  { week: "Jan W2", cardedSliver: 5.6, spunYarn: 7.8, wovenGreige: 14.1 },
  { week: "Jan W3", cardedSliver: 6.0, spunYarn: 9.4, wovenGreige: 13.2 },
  { week: "Jan W4", cardedSliver: 5.4, spunYarn: 8.9, wovenGreige: 15.8 },
  { week: "Feb W1", cardedSliver: 6.3, spunYarn: 10.1, wovenGreige: 16.2 },
  { week: "Feb W2", cardedSliver: 6.8, spunYarn: 9.6, wovenGreige: 17.0 },
  { week: "Feb W3", cardedSliver: 7.1, spunYarn: 11.2, wovenGreige: 18.4 },
  { week: "Feb W4", cardedSliver: 7.4, spunYarn: 10.8, wovenGreige: 19.1 },
];

/** Product mix (% of shipped volume) — mirrors site lines: yarns, technical & industrial woven, agri textiles. */
export const mockProductLineMix = [
  { name: "Technical woven fabrics", value: 28, fill: dashChartVar(1) },
  { name: "Industrial woven (heavy-duty)", value: 22, fill: dashChartVar(2) },
  { name: "Technical yarn cones", value: 18, fill: dashChartVar(3) },
  { name: "Agricultural / shade textiles", value: 14, fill: dashChartVar(4) },
  { name: "Coated & finished goods", value: 18, fill: dashChartVar(5) },
];

/** Pipeline counts when CRM has no deals yet. */
export const mockDealPipelineByStage = [
  { stage: "qualification", count: 6 },
  { stage: "proposal", count: 4 },
  { stage: "won", count: 3 },
  { stage: "lost", count: 1 },
];

/** Sample SKUs — fibres: cotton, synthetic, acrylic & blends (per site). Counts Ne 6s–120s / Tex 10–50 range. */
export const mockBestSelling: InvDashboardInsightRow[] = [
  { item_id: "mock-1", sku: "SM-TEX-WOV-480", name: "Technical woven fabric, 480 g/m² greige roll", qty: 11240, deltaVsPriorPct: null },
  { item_id: "mock-2", sku: "SM-YRN-N32-CB", name: "Ne 32/1 ring yarn, cotton blend cone (dye-ready available)", qty: 9620, deltaVsPriorPct: null },
  { item_id: "mock-3", sku: "SM-IND-WOV-850", name: "Industrial woven fabric, 850 g/m² heavy-duty roll", qty: 8340, deltaVsPriorPct: null },
  { item_id: "mock-4", sku: "SM-AGR-SHADE", name: "Agricultural shade net / agri textile (strip or roll)", qty: 6920, deltaVsPriorPct: null },
  { item_id: "mock-5", sku: "SM-YRN-ACY-TEX", name: "Acrylic blend technical yarn cone", qty: 5180, deltaVsPriorPct: null },
  { item_id: "mock-6", sku: "SM-YRN-PET-IND", name: "Polyester industrial base yarn cone", qty: 4410, deltaVsPriorPct: null },
];

export const mockTrending: InvDashboardInsightRow[] = [
  { item_id: "mock-t1", sku: "SM-YRN-N60-COMP", name: "Ne 60/1 compact cotton cone", qty: 2140, deltaVsPriorPct: 19 },
  { item_id: "mock-t2", sku: "SM-WOV-GREIGE-220", name: "Woven greige 220 g/m², variable width", qty: 1880, deltaVsPriorPct: 35 },
  { item_id: "mock-t3", sku: "SM-TWL-IND", name: "Industrial towelling greige", qty: 1240, deltaVsPriorPct: 12 },
  { item_id: "mock-t4", sku: "SM-YRN-PLY-CAB", name: "Ply & cabled technical yarn", qty: 910, deltaVsPriorPct: 8 },
  { item_id: "mock-t5", sku: "SM-YRN-FIN-SPEC", name: "Special finish / dye-ready yarn (as per spec)", qty: 770, deltaVsPriorPct: 14 },
  { item_id: "mock-t6", sku: "SM-FG-EXPORT", name: "Export-packed finished goods (yarn & fabric)", qty: 540, deltaVsPriorPct: null },
];

/** Daily mill load index (0–100) — sample. */
export const mockFloorActivityIndex = [
  { day: "Mon", index: 62 },
  { day: "Tue", index: 71 },
  { day: "Wed", index: 68 },
  { day: "Thu", index: 79 },
  { day: "Fri", index: 85 },
  { day: "Sat", index: 44 },
  { day: "Sun", index: 32 },
];

/**
 * Integrated manufacturing flow from https://www.standertonmills.co.za/ (“from fiber to finished product”).
 */
export const standertonMillSteps = [
  {
    title: "Testing",
    detail: "ISO-aligned QC and incoming checks on fibre, yarn, and greige — consistency before downstream steps.",
  },
  {
    title: "Spinning",
    detail: "Technical yarns: count range 6s–120s (Tex 10–50), single and multi-end; cotton, synthetic, acrylic & blends.",
  },
  {
    title: "Twisting",
    detail: "Single, ply, and cabling as required for industrial and technical end-use.",
  },
  {
    title: "Weaving",
    detail: "Technical and industrial woven fabrics; yarn & monofilament structural bases, variable widths and weights (site: 150–1200 g/m²).",
  },
  {
    title: "Finishing",
    detail: "Special finishes, coatings, and dye-ready options per customer specification.",
  },
  {
    title: "Packing",
    detail: "Cones, rolls, and packed SKUs prepared for dispatch and export.",
  },
  {
    title: "Shipping",
    detail: "Outbound logistics tied to deals, customers, and shipment records in this CRM.",
  },
] as const;

/** @deprecated Use standertonMillSteps — alias for existing imports */
export const cottonValueChainSteps = standertonMillSteps;

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
