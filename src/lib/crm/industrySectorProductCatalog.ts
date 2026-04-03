import type { InvItemSeed } from "./standertonProductCatalog";

/**
 * Industries served — each title becomes the CRM `category`; bullets become product `name` rows.
 */
const SECTORS: {
  category: string;
  description: string;
  products: { sku: string; name: string; uom?: string }[];
}[] = [
  {
    category: "Mining",
    description:
      "Heavy-duty conveyor belt fabrics designed to withstand the demanding conditions of South African mines.",
    products: [
      { sku: "SM-CAT-MIN-UG", name: "Underground mining" },
      { sku: "SM-CAT-MIN-OP", name: "Open-pit operations" },
      { sku: "SM-CAT-MIN-PROC", name: "Mineral processing" },
    ],
  },
  {
    category: "Manufacturing",
    description:
      "Technical fabrics for various manufacturing applications, from industrial equipment to consumer goods.",
    products: [
      { sku: "SM-CAT-MFG-CONV", name: "Conveyor systems" },
      { sku: "SM-CAT-MFG-EQP", name: "Industrial equipment" },
      { sku: "SM-CAT-MFG-CUST", name: "Custom applications" },
    ],
  },
  {
    category: "Construction",
    description:
      "Durable fabrics for construction applications including safety equipment and material handling.",
    products: [
      { sku: "SM-CAT-CNS-SCAF", name: "Scaffolding nets" },
      { sku: "SM-CAT-CNS-SAFE", name: "Safety barriers" },
      { sku: "SM-CAT-CNS-TRANS", name: "Material transport" },
    ],
  },
  {
    category: "Cleaning & Hygiene",
    description:
      "High-absorbency mop head fabrics for industrial and commercial cleaning applications.",
    products: [
      { sku: "SM-CAT-CLN-MOP", name: "Industrial mops" },
      { sku: "SM-CAT-CLN-CLOTH", name: "Cleaning cloths" },
      { sku: "SM-CAT-CLN-HYG", name: "Hygiene products" },
    ],
  },
  {
    category: "Agriculture",
    description:
      "Specialized fabrics for agricultural applications including crop protection and livestock farming.",
    products: [
      { sku: "SM-CAT-AGR-SHADE", name: "Shade cloth" },
      { sku: "SM-CAT-AGR-COV", name: "Protective covers" },
      { sku: "SM-CAT-AGR-INFRA", name: "Farm infrastructure" },
    ],
  },
  {
    category: "Logistics",
    description:
      "Heavy-duty fabrics for logistics and material handling operations across various sectors.",
    products: [
      { sku: "SM-CAT-LOG-CVB", name: "Conveyor belts" },
      { sku: "SM-CAT-LOG-SEC", name: "Cargo securement" },
      { sku: "SM-CAT-LOG-WH", name: "Warehouse operations" },
    ],
  },
  {
    category: "Cleaning products",
    description:
      "Industrial and commercial cleaning formulations for general use, degreasing, and odour control.",
    products: [
      { sku: "SM-CLEAN-APC", name: "All Purpose Cleaner", uom: "ea" },
      { sku: "SM-CLEAN-DEG", name: "Degreaser", uom: "ea" },
      { sku: "SM-CLEAN-ODO", name: "Odor Eliminator", uom: "ea" },
    ],
  },
];

/** Illustrative ZAR cost / list per sector catalogue row (finished roll or ea). */
const SECTOR_PRICE_HINTS: Record<string, { standard_cost: number; list_price_zar: number }> = {
  "SM-CLEAN-APC": { standard_cost: 72, list_price_zar: 108 },
  "SM-CLEAN-DEG": { standard_cost: 95, list_price_zar: 142 },
  "SM-CLEAN-ODO": { standard_cost: 78, list_price_zar: 118 },
};

export const INDUSTRY_SECTOR_PRODUCT_SEEDS: InvItemSeed[] = SECTORS.flatMap((sector) =>
  sector.products.map((p) => {
    const hint = SECTOR_PRICE_HINTS[p.sku] ?? {
      standard_cost: 1180,
      list_price_zar: 1625,
    };
    return {
      sku: p.sku,
      name: p.name,
      kind: "finished" as const,
      uom: p.uom ?? "roll",
      standard_cost: hint.standard_cost,
      list_price_zar: hint.list_price_zar,
      category: sector.category,
      description: sector.description,
    };
  })
);

/** Preset categories for item forms (includes mill output). */
export const INV_ITEM_CATEGORY_PRESETS = [
  "Mill & yarn",
  ...SECTORS.map((s) => s.category),
] as const;
