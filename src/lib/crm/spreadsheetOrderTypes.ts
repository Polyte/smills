import type { ImportedOrderLine } from "./importedOrdersTypes";

export const SPREADSHEET_ORDER_STATUSES = [
  "draft",
  "open",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type SpreadsheetOrderStatus = (typeof SPREADSHEET_ORDER_STATUSES)[number];

export type SpreadsheetOrderComment = {
  id: string;
  text: string;
  createdAt: string;
  authorLabel: string | null;
};

export type SpreadsheetOrderRow = ImportedOrderLine & {
  id: string;
  source: "seed" | "manual";
  orderStatus: SpreadsheetOrderStatus;
  comments: SpreadsheetOrderComment[];
};

const STATUS_LABELS: Record<SpreadsheetOrderStatus, string> = {
  draft: "Draft",
  open: "Open",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function spreadsheetStatusLabel(s: SpreadsheetOrderStatus): string {
  return STATUS_LABELS[s];
}
