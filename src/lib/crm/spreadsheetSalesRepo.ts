import type { Json } from "../../app/crm/database.types";
import { getSupabase } from "../supabaseClient";
import type {
  SpreadsheetOrderComment,
  SpreadsheetOrderRow,
  SpreadsheetOrderStatus,
} from "./spreadsheetOrderTypes";
import { isSpreadsheetOrderStatus } from "./spreadsheetOrdersPersistence";

function parseComments(raw: Json): SpreadsheetOrderComment[] {
  if (!Array.isArray(raw)) return [];
  const out: SpreadsheetOrderComment[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const text = typeof o.text === "string" ? o.text : "";
    const createdAt = typeof o.createdAt === "string" ? o.createdAt : "";
    const authorLabel = o.authorLabel == null ? null : String(o.authorLabel);
    if (id && text && createdAt) out.push({ id, text, createdAt, authorLabel });
  }
  return out;
}

export function mapDbRowToSpreadsheetRow(r: {
  id: string;
  sales_order: string;
  customer: string;
  item_code: string;
  description: string;
  delivery_status: string;
  order_date: string | null;
  delivery_date: string | null;
  quantity: number | null;
  delivered_kgs: number | null;
  balance: number | null;
  grand_total: number | null;
  order_status: string;
  comments: Json;
  source: string;
  seed_key: string | null;
}): SpreadsheetOrderRow {
  const orderStatus: SpreadsheetOrderStatus = isSpreadsheetOrderStatus(r.order_status)
    ? r.order_status
    : "open";
  return {
    id: r.id,
    salesOrder: r.sales_order,
    customer: r.customer,
    itemCode: r.item_code,
    description: r.description,
    deliveryStatus: r.delivery_status,
    orderDate: r.order_date,
    deliveryDate: r.delivery_date,
    quantity: r.quantity,
    deliveredKgs: r.delivered_kgs,
    balance: r.balance,
    grandTotal: r.grand_total,
    orderStatus,
    comments: parseComments(r.comments),
    source: r.source === "manual" ? "manual" : "seed",
  };
}

function commentsToJson(comments: SpreadsheetOrderComment[]): Json {
  return comments as unknown as Json;
}

export async function listSpreadsheetSalesLines(): Promise<SpreadsheetOrderRow[]> {
  const { data, error } = await getSupabase()
    .from("spreadsheet_sales_lines")
    .select("*")
    .order("order_date", { ascending: false, nullsFirst: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapDbRowToSpreadsheetRow(r));
}

export async function listDistinctSpreadsheetCustomerNames(): Promise<string[]> {
  const { data, error } = await getSupabase().from("spreadsheet_sales_lines").select("customer");
  if (error) throw new Error(error.message);
  const names = new Set<string>();
  for (const row of data ?? []) {
    const c = typeof row.customer === "string" ? row.customer.trim() : "";
    if (c) names.add(c);
  }
  return [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export async function insertSpreadsheetSalesLine(
  payload: Omit<SpreadsheetOrderRow, "id"> & { id?: string }
): Promise<SpreadsheetOrderRow> {
  const { data, error } = await getSupabase()
    .from("spreadsheet_sales_lines")
    .insert({
      sales_order: payload.salesOrder,
      customer: payload.customer,
      item_code: payload.itemCode,
      description: payload.description,
      delivery_status: payload.deliveryStatus,
      order_date: payload.orderDate,
      delivery_date: payload.deliveryDate,
      quantity: payload.quantity,
      delivered_kgs: payload.deliveredKgs,
      balance: payload.balance,
      grand_total: payload.grandTotal,
      order_status: payload.orderStatus,
      comments: commentsToJson(payload.comments),
      source: payload.source,
      seed_key: null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapDbRowToSpreadsheetRow(data);
}

export async function updateSpreadsheetSalesLine(
  id: string,
  patch: Partial<
    Pick<
      SpreadsheetOrderRow,
      | "salesOrder"
      | "customer"
      | "itemCode"
      | "description"
      | "deliveryStatus"
      | "orderDate"
      | "deliveryDate"
      | "quantity"
      | "deliveredKgs"
      | "balance"
      | "grandTotal"
      | "orderStatus"
      | "comments"
    >
  >
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.salesOrder !== undefined) row.sales_order = patch.salesOrder;
  if (patch.customer !== undefined) row.customer = patch.customer;
  if (patch.itemCode !== undefined) row.item_code = patch.itemCode;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.deliveryStatus !== undefined) row.delivery_status = patch.deliveryStatus;
  if (patch.orderDate !== undefined) row.order_date = patch.orderDate;
  if (patch.deliveryDate !== undefined) row.delivery_date = patch.deliveryDate;
  if (patch.quantity !== undefined) row.quantity = patch.quantity;
  if (patch.deliveredKgs !== undefined) row.delivered_kgs = patch.deliveredKgs;
  if (patch.balance !== undefined) row.balance = patch.balance;
  if (patch.grandTotal !== undefined) row.grand_total = patch.grandTotal;
  if (patch.orderStatus !== undefined) row.order_status = patch.orderStatus;
  if (patch.comments !== undefined) row.comments = commentsToJson(patch.comments);

  const { error } = await getSupabase().from("spreadsheet_sales_lines").update(row).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSpreadsheetSalesLine(id: string): Promise<void> {
  const { error } = await getSupabase().from("spreadsheet_sales_lines").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
