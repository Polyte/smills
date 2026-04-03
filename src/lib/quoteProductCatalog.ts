/** Stable keys for public quote requests — keep in sync with Edge Function allowlist. */
export const QUOTE_PRODUCT_ENTRIES = [
  { key: "conveyor-belt-fabrics", label: "Conveyor Belt Fabrics" },
  { key: "mob-head-fabrics", label: "Mob Head Fabrics" },
  { key: "technical-fabrics", label: "Technical Fabrics" },
  { key: "woven-industrial-fabrics", label: "Woven Industrial Fabrics" },
] as const;

export type QuoteProductKey = (typeof QUOTE_PRODUCT_ENTRIES)[number]["key"];

/** Public marketing form payload (SQLite + Edge Function). */
export type PublicQuotePayload = {
  product_key: QuoteProductKey;
  product_label: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  message?: string;
  quantity?: number;
  uom?: string;
};

const KEY_SET = new Set<string>(QUOTE_PRODUCT_ENTRIES.map((e) => e.key));

export function isValidQuoteProductKey(key: string): key is QuoteProductKey {
  return KEY_SET.has(key);
}

export function quoteProductLabel(key: string): string {
  const row = QUOTE_PRODUCT_ENTRIES.find((e) => e.key === key);
  return row?.label ?? key;
}
