/**
 * Default CRM inventory items aligned with https://www.standertonmills.co.za/
 * product lines: yarn manufacturing, technical & industrial woven fabrics,
 * agricultural textiles, coatings/finishes, and custom solutions.
 *
 * Prices are illustrative standard cost & list (ZAR) per UOM for valuation and sales views.
 */
export type InvItemSeed = {
  sku: string;
  name: string;
  kind: "raw" | "wip" | "finished";
  uom: string;
  /** Standard unit cost (ZAR per UOM). */
  standard_cost: number;
  /** List / selling reference price (ZAR per UOM). */
  list_price_zar: number;
  category: string;
  description: string | null;
};

/** @deprecated use InvItemSeed */
export type StandertonProductSeed = InvItemSeed;

const MILL = "Mill & yarn";

export const STANDERTON_CRM_PRODUCTS: InvItemSeed[] = [
  /* Raw materials & inputs — ZAR/kg */
  {
    sku: "SM-RM-COT-LINT",
    name: "Cotton lint / ginned cotton (incoming)",
    kind: "raw",
    uom: "kg",
    standard_cost: 36.5,
    list_price_zar: 48.9,
    category: MILL,
    description: null,
  },
  {
    sku: "SM-RM-PET-FIB",
    name: "Polyester staple fibre (synthetic)",
    kind: "raw",
    uom: "kg",
    standard_cost: 29.2,
    list_price_zar: 38.5,
    category: MILL,
    description: null,
  },
  {
    sku: "SM-RM-ACY-FIB",
    name: "Acrylic fibre",
    kind: "raw",
    uom: "kg",
    standard_cost: 41.8,
    list_price_zar: 54.2,
    category: MILL,
    description: null,
  },
  {
    sku: "SM-RM-BLEND-FIB",
    name: "Blended fibre mix (cotton/synthetic/acrylic)",
    kind: "raw",
    uom: "kg",
    standard_cost: 34.6,
    list_price_zar: 45.0,
    category: MILL,
    description: null,
  },
  {
    sku: "SM-RM-MONO",
    name: "Monofilament / structural base yarn (incoming)",
    kind: "raw",
    uom: "kg",
    standard_cost: 52.4,
    list_price_zar: 68.0,
    category: MILL,
    description: null,
  },
  /* WIP — carding through prep */
  {
    sku: "SM-WIP-SLIVER",
    name: "Carded sliver (spinning WIP)",
    kind: "wip",
    uom: "kg",
    standard_cost: 58.0,
    list_price_zar: 76.5,
    category: MILL,
    description: null,
  },
  {
    sku: "SM-WIP-ROV",
    name: "Roving (spinning WIP)",
    kind: "wip",
    uom: "kg",
    standard_cost: 72.5,
    list_price_zar: 94.0,
    category: MILL,
    description: null,
  },
  {
    sku: "SM-WIP-YARN-OD",
    name: "Yarn on draft / machine WIP",
    kind: "wip",
    uom: "kg",
    standard_cost: 88.0,
    list_price_zar: 115.0,
    category: MILL,
    description: null,
  },
  /* Finished — technical yarns — ZAR/cone */
  {
    sku: "SM-YRN-N32-CB",
    name: "Ne 32/1 ring yarn, cotton blend cone (dye-ready available)",
    kind: "finished",
    uom: "cone",
    standard_cost: 142.0,
    list_price_zar: 198.0,
    category: MILL,
    description: null,
  },
  {
    sku: "SM-YRN-N60-COMP",
    name: "Ne 60/1 compact cotton cone",
    kind: "finished",
    uom: "cone",
    standard_cost: 185.0,
    list_price_zar: 258.0,
    category: MILL,
    description: null,
  },
  {
    sku: "SM-YRN-PET-IND",
    name: "Polyester industrial base yarn cone",
    kind: "finished",
    uom: "cone",
    standard_cost: 128.0,
    list_price_zar: 176.0,
    category: MILL,
    description: null,
  },
  {
    sku: "SM-YRN-ACY-TEX",
    name: "Acrylic blend technical yarn cone",
    kind: "finished",
    uom: "cone",
    standard_cost: 155.0,
    list_price_zar: 214.0,
    category: MILL,
    description: null,
  },
  {
    sku: "SM-YRN-PLY-CAB",
    name: "Ply & cabled technical yarn",
    kind: "finished",
    uom: "cone",
    standard_cost: 198.0,
    list_price_zar: 275.0,
    category: MILL,
    description: null,
  },
  {
    sku: "SM-YRN-FIN-SPEC",
    name: "Special finish / dye-ready yarn (as per spec)",
    kind: "finished",
    uom: "cone",
    standard_cost: 265.0,
    list_price_zar: 368.0,
    category: MILL,
    description: null,
  },
  /* Technical & industrial woven — ZAR/roll */
  {
    sku: "SM-TEX-WOV-480",
    name: "Technical woven fabric, 480 g/m² greige roll",
    kind: "finished",
    uom: "roll",
    standard_cost: 6840.0,
    list_price_zar: 9450.0,
    category: MILL,
    description: null,
  },
  {
    sku: "SM-IND-WOV-850",
    name: "Industrial woven fabric, 850 g/m² heavy-duty roll",
    kind: "finished",
    uom: "roll",
    standard_cost: 11250.0,
    list_price_zar: 15480.0,
    category: MILL,
    description: null,
  },
  {
    sku: "SM-WOV-GREIGE-220",
    name: "Woven greige 220 g/m², variable width",
    kind: "finished",
    uom: "roll",
    standard_cost: 4280.0,
    list_price_zar: 5890.0,
    category: MILL,
    description: null,
  },
  {
    sku: "SM-TWL-IND",
    name: "Industrial towelling greige",
    kind: "finished",
    uom: "roll",
    standard_cost: 5120.0,
    list_price_zar: 7025.0,
    category: MILL,
    description: null,
  },
  {
    sku: "SM-FG-COATED",
    name: "Coated & finished woven goods (customer spec)",
    kind: "finished",
    uom: "roll",
    standard_cost: 8950.0,
    list_price_zar: 12350.0,
    category: MILL,
    description: null,
  },
  /* Agricultural textiles — ZAR/m */
  {
    sku: "SM-AGR-SHADE",
    name: "Agricultural shade net / agri textile (strip or roll)",
    kind: "finished",
    uom: "m",
    standard_cost: 42.5,
    list_price_zar: 62.8,
    category: MILL,
    description: null,
  },
  /* Custom & export — ZAR/ea */
  {
    sku: "SM-SOL-CUSTOM",
    name: "Bespoke textile solution (custom quote)",
    kind: "finished",
    uom: "ea",
    standard_cost: 12000.0,
    list_price_zar: 18500.0,
    category: MILL,
    description: null,
  },
  {
    sku: "SM-FG-EXPORT",
    name: "Export-packed finished goods (yarn & fabric)",
    kind: "finished",
    uom: "ea",
    standard_cost: 8800.0,
    list_price_zar: 13200.0,
    category: MILL,
    description: null,
  },
];
