import { getSupabase } from "../supabaseClient";
import { crmUsesSupabase } from "./crmRepo";
import { useLocalSqliteCrm } from "./mode";
import { getLocalSqliteDb, dbAll, dbRun } from "./sqlite/engine";
import type {
  Database,
  QuoteDocStatus,
  InvoiceDocStatus,
  QuoteRequestStatus,
  Json,
} from "../../app/crm/database.types";
import type { PublicQuotePayload } from "../quoteProductCatalog";
import { isValidQuoteProductKey } from "../quoteProductCatalog";

type QuoteRequestRow = Database["public"]["Tables"]["quote_requests"]["Row"];
type QuoteRow = Database["public"]["Tables"]["quotes"]["Row"];
type QuoteLineRow = Database["public"]["Tables"]["quote_lines"]["Row"];
type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
type InvoiceLineRow = Database["public"]["Tables"]["invoice_lines"]["Row"];
type NotificationRow = Database["public"]["Tables"]["crm_notifications"]["Row"];

/** Quotes/notifications work in Supabase CRM or local browser SQLite. */
export function quotesDataAvailable(): boolean {
  return crmUsesSupabase() || useLocalSqliteCrm();
}

/** @deprecated Use quotesDataAvailable */
export function quotesBackendAvailable(): boolean {
  return quotesDataAvailable();
}

function parsePayload(raw: string): Json {
  try {
    return JSON.parse(raw) as Json;
  } catch {
    return {};
  }
}

function toIso(ts: string | null | undefined): string {
  if (!ts) return new Date().toISOString();
  if (ts.includes("T")) return ts;
  return ts.replace(" ", "T") + "Z";
}

export async function submitLocalPublicQuoteRequest(payload: PublicQuotePayload): Promise<string> {
  if (!isValidQuoteProductKey(payload.product_key)) {
    throw new Error("invalid_product");
  }
  if (!payload.company_name?.trim() || !payload.contact_name?.trim()) {
    throw new Error("missing_name");
  }
  if (!payload.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new Error("invalid_email");
  }
  if (!payload.phone?.trim()) {
    throw new Error("missing_phone");
  }

  const db = await getLocalSqliteDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const managers = dbAll<{ id: string }>(
    db,
    `SELECT id FROM crm_users WHERE role IN ('admin','production_manager')`
  );
  const assignRow = managers[0] ?? dbAll<{ id: string }>(db, `SELECT id FROM crm_users LIMIT 1`)[0];
  const assigned_owner_id = assignRow?.id ?? null;

  dbRun(
    db,
    `INSERT INTO quote_requests (
      id, created_at, updated_at, product_key, product_label, company_name, contact_name,
      email, phone, message, quantity, uom, status, assigned_owner_id, contact_id, deal_id
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      now,
      now,
      payload.product_key,
      payload.product_label.trim() || payload.product_key,
      payload.company_name.trim(),
      payload.contact_name.trim(),
      payload.email.trim().toLowerCase(),
      payload.phone.trim(),
      payload.message?.trim() ?? null,
      payload.quantity ?? null,
      payload.uom?.trim() ?? null,
      "submitted",
      assigned_owner_id,
      null,
      null,
    ]
  );

  const notifyIds = new Set<string>();
  for (const m of managers) notifyIds.add(m.id);
  if (assigned_owner_id) notifyIds.add(assigned_owner_id);
  if (notifyIds.size === 0) {
    const any = dbAll<{ id: string }>(db, `SELECT id FROM crm_users LIMIT 5`);
    for (const r of any) notifyIds.add(r.id);
  }

  const title = `New quote request: ${payload.product_label.trim() || payload.product_key}`;
  const payloadJson = JSON.stringify({
    quote_request_id: id,
    title,
    company_name: payload.company_name.trim(),
  });

  for (const user_id of notifyIds) {
    dbRun(db, `INSERT INTO crm_notifications (id, created_at, user_id, kind, payload, read_at) VALUES (?,?,?,?,?,?)`, [
      crypto.randomUUID(),
      now,
      user_id,
      "new_quote_request",
      payloadJson,
      null,
    ]);
  }

  return id;
}

export async function listQuoteRequests(): Promise<QuoteRequestRow[]> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("quote_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as QuoteRequestRow[]) ?? [];
  }
  if (!useLocalSqliteCrm()) return [];
  const db = await getLocalSqliteDb();
  const rows = dbAll<Record<string, unknown>>(db, `SELECT * FROM quote_requests ORDER BY created_at DESC`);
  return rows.map((r) => mapLocalQuoteRequest(r));
}

function mapLocalQuoteRequest(r: Record<string, unknown>): QuoteRequestRow {
  return {
    id: String(r.id),
    created_at: toIso(r.created_at as string),
    updated_at: toIso(r.updated_at as string),
    product_key: String(r.product_key),
    product_label: String(r.product_label),
    company_name: String(r.company_name),
    contact_name: String(r.contact_name),
    email: String(r.email),
    phone: String(r.phone),
    message: r.message != null ? String(r.message) : null,
    quantity: r.quantity != null ? Number(r.quantity) : null,
    uom: r.uom != null ? String(r.uom) : null,
    status: r.status as QuoteRequestRow["status"],
    assigned_owner_id: r.assigned_owner_id != null ? String(r.assigned_owner_id) : null,
    contact_id: r.contact_id != null ? String(r.contact_id) : null,
    deal_id: r.deal_id != null ? String(r.deal_id) : null,
  };
}

export async function updateQuoteRequest(
  id: string,
  patch: Partial<{
    status: QuoteRequestStatus;
    assigned_owner_id: string | null;
    contact_id: string | null;
    deal_id: string | null;
  }>
): Promise<void> {
  const now = new Date().toISOString();
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { error } = await supabase.from("quote_requests").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  if (!useLocalSqliteCrm()) return;
  const db = await getLocalSqliteDb();
  const sets: string[] = ["updated_at = ?"];
  const params: (string | null)[] = [now];
  if (patch.status !== undefined) {
    sets.push("status = ?");
    params.push(patch.status);
  }
  if (patch.assigned_owner_id !== undefined) {
    sets.push("assigned_owner_id = ?");
    params.push(patch.assigned_owner_id);
  }
  if (patch.contact_id !== undefined) {
    sets.push("contact_id = ?");
    params.push(patch.contact_id);
  }
  if (patch.deal_id !== undefined) {
    sets.push("deal_id = ?");
    params.push(patch.deal_id);
  }
  params.push(id);
  dbRun(db, `UPDATE quote_requests SET ${sets.join(", ")} WHERE id = ?`, params);
}

export async function listQuotesForRequest(quoteRequestId: string): Promise<QuoteRow[]> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("quote_request_id", quoteRequestId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as QuoteRow[]) ?? [];
  }
  if (!useLocalSqliteCrm()) return [];
  const db = await getLocalSqliteDb();
  const rows = dbAll<Record<string, unknown>>(
    db,
    `SELECT * FROM quotes WHERE quote_request_id = ? ORDER BY created_at DESC`,
    [quoteRequestId]
  );
  return rows.map((r) => mapLocalQuote(r));
}

function mapLocalQuote(r: Record<string, unknown>): QuoteRow {
  return {
    id: String(r.id),
    created_at: toIso(r.created_at as string),
    updated_at: toIso(r.updated_at as string),
    quote_request_id: String(r.quote_request_id),
    quote_number: String(r.quote_number),
    status: r.status as QuoteRow["status"],
    subtotal_zar: Number(r.subtotal_zar ?? 0),
    tax_rate: Number(r.tax_rate ?? 0),
    tax_zar: Number(r.tax_zar ?? 0),
    total_zar: Number(r.total_zar ?? 0),
    currency: String(r.currency ?? "ZAR"),
    valid_until: r.valid_until != null ? String(r.valid_until) : null,
    created_by: String(r.created_by),
    pdf_path: r.pdf_path != null ? String(r.pdf_path) : null,
    customer_email_snapshot: r.customer_email_snapshot != null ? String(r.customer_email_snapshot) : null,
    customer_company_snapshot: r.customer_company_snapshot != null ? String(r.customer_company_snapshot) : null,
    customer_contact_snapshot: r.customer_contact_snapshot != null ? String(r.customer_contact_snapshot) : null,
  };
}

export async function listQuoteLines(quoteId: string): Promise<QuoteLineRow[]> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("quote_lines")
      .select("*")
      .eq("quote_id", quoteId)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    return (data as QuoteLineRow[]) ?? [];
  }
  if (!useLocalSqliteCrm()) return [];
  const db = await getLocalSqliteDb();
  const rows = dbAll<Record<string, unknown>>(
    db,
    `SELECT * FROM quote_lines WHERE quote_id = ? ORDER BY position ASC`,
    [quoteId]
  );
  return rows.map((r) => ({
    id: String(r.id),
    quote_id: String(r.quote_id),
    position: Number(r.position ?? 0),
    description: String(r.description),
    qty: Number(r.qty ?? 0),
    unit_price_zar: Number(r.unit_price_zar ?? 0),
    line_total_zar: Number(r.line_total_zar ?? 0),
  }));
}

function generateQuoteNumber(): string {
  const y = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `SM-Q-${y}-${rand}`;
}

function generateInvoiceNumber(): string {
  const y = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `SM-INV-${y}-${rand}`;
}

export function computeQuoteTotals(lines: { qty: number; unit_price_zar: number }[], taxRate: number) {
  const subtotal = lines.reduce((s, l) => s + Number(l.qty) * Number(l.unit_price_zar), 0);
  const tax_zar = subtotal * (taxRate || 0);
  const total_zar = subtotal + tax_zar;
  return {
    subtotal_zar: Math.round(subtotal * 100) / 100,
    tax_zar: Math.round(tax_zar * 100) / 100,
    total_zar: Math.round(total_zar * 100) / 100,
  };
}

export async function createQuoteWithLines(
  actorId: string,
  quoteRequest: QuoteRequestRow,
  input: {
    quote_number?: string;
    valid_until: string | null;
    tax_rate: number;
    lines: { description: string; qty: number; unit_price_zar: number }[];
  }
): Promise<string> {
  const quote_number = input.quote_number?.trim() || generateQuoteNumber();
  const lineTotals = input.lines.map((l, i) => {
    const line_total_zar = Math.round(Number(l.qty) * Number(l.unit_price_zar) * 100) / 100;
    return {
      position: i,
      description: l.description,
      qty: l.qty,
      unit_price_zar: l.unit_price_zar,
      line_total_zar,
    };
  });
  const { subtotal_zar, tax_zar, total_zar } = computeQuoteTotals(
    lineTotals.map((l) => ({ qty: l.qty, unit_price_zar: l.unit_price_zar })),
    input.tax_rate
  );

  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data: qInserted, error: qe } = await supabase
      .from("quotes")
      .insert({
        quote_request_id: quoteRequest.id,
        quote_number,
        status: "draft",
        subtotal_zar,
        tax_rate: input.tax_rate,
        tax_zar,
        total_zar,
        valid_until: input.valid_until,
        created_by: actorId,
        customer_email_snapshot: quoteRequest.email,
        customer_company_snapshot: quoteRequest.company_name,
        customer_contact_snapshot: quoteRequest.contact_name,
      })
      .select("id")
      .single();
    if (qe) throw new Error(qe.message);
    const quoteId = qInserted!.id as string;
    if (lineTotals.length) {
      const { error: le } = await supabase.from("quote_lines").insert(
        lineTotals.map((l) => ({
          quote_id: quoteId,
          position: l.position,
          description: l.description,
          qty: l.qty,
          unit_price_zar: l.unit_price_zar,
          line_total_zar: l.line_total_zar,
        }))
      );
      if (le) throw new Error(le.message);
    }
    await supabase
      .from("quote_requests")
      .update({ status: "reviewing" })
      .eq("id", quoteRequest.id)
      .in("status", ["submitted"]);
    return quoteId;
  }

  if (!useLocalSqliteCrm()) throw new Error("No CRM backend");
  const db = await getLocalSqliteDb();
  const quoteId = crypto.randomUUID();
  const now = new Date().toISOString();
  dbRun(
    db,
    `INSERT INTO quotes (
      id, created_at, updated_at, quote_request_id, quote_number, status,
      subtotal_zar, tax_rate, tax_zar, total_zar, currency, valid_until, created_by,
      pdf_path, customer_email_snapshot, customer_company_snapshot, customer_contact_snapshot
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      quoteId,
      now,
      now,
      quoteRequest.id,
      quote_number,
      "draft",
      subtotal_zar,
      input.tax_rate,
      tax_zar,
      total_zar,
      "ZAR",
      input.valid_until,
      actorId,
      null,
      quoteRequest.email,
      quoteRequest.company_name,
      quoteRequest.contact_name,
    ]
  );
  for (const l of lineTotals) {
    dbRun(
      db,
      `INSERT INTO quote_lines (id, quote_id, position, description, qty, unit_price_zar, line_total_zar) VALUES (?,?,?,?,?,?,?)`,
      [crypto.randomUUID(), quoteId, l.position, l.description, l.qty, l.unit_price_zar, l.line_total_zar]
    );
  }
  dbRun(db, `UPDATE quote_requests SET status = 'reviewing', updated_at = ? WHERE id = ? AND status = 'submitted'`, [
    now,
    quoteRequest.id,
  ]);
  return quoteId;
}

export async function updateQuoteHeader(
  quoteId: string,
  patch: Partial<{
    quote_number: string;
    status: QuoteDocStatus;
    valid_until: string | null;
    tax_rate: number;
    customer_email_snapshot: string | null;
    customer_company_snapshot: string | null;
    customer_contact_snapshot: string | null;
  }>
): Promise<void> {
  const now = new Date().toISOString();
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { error } = await supabase.from("quotes").update(patch).eq("id", quoteId);
    if (error) throw new Error(error.message);
    return;
  }
  if (!useLocalSqliteCrm()) return;
  const db = await getLocalSqliteDb();
  const sets: string[] = ["updated_at = ?"];
  const params: (string | number | null)[] = [now];
  if (patch.quote_number !== undefined) {
    sets.push("quote_number = ?");
    params.push(patch.quote_number);
  }
  if (patch.status !== undefined) {
    sets.push("status = ?");
    params.push(patch.status);
  }
  if (patch.valid_until !== undefined) {
    sets.push("valid_until = ?");
    params.push(patch.valid_until);
  }
  if (patch.tax_rate !== undefined) {
    sets.push("tax_rate = ?");
    params.push(patch.tax_rate);
  }
  if (patch.customer_email_snapshot !== undefined) {
    sets.push("customer_email_snapshot = ?");
    params.push(patch.customer_email_snapshot);
  }
  if (patch.customer_company_snapshot !== undefined) {
    sets.push("customer_company_snapshot = ?");
    params.push(patch.customer_company_snapshot);
  }
  if (patch.customer_contact_snapshot !== undefined) {
    sets.push("customer_contact_snapshot = ?");
    params.push(patch.customer_contact_snapshot);
  }
  params.push(quoteId);
  dbRun(db, `UPDATE quotes SET ${sets.join(", ")} WHERE id = ?`, params);
}

export async function replaceQuoteLines(
  quoteId: string,
  lines: { description: string; qty: number; unit_price_zar: number }[],
  tax_rate: number
): Promise<void> {
  const lineTotals = lines.map((l, i) => {
    const line_total_zar = Math.round(Number(l.qty) * Number(l.unit_price_zar) * 100) / 100;
    return {
      quote_id: quoteId,
      position: i,
      description: l.description,
      qty: l.qty,
      unit_price_zar: l.unit_price_zar,
      line_total_zar,
    };
  });
  const { subtotal_zar, tax_zar, total_zar } = computeQuoteTotals(
    lineTotals.map((l) => ({ qty: l.qty, unit_price_zar: l.unit_price_zar })),
    tax_rate
  );

  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { error: delE } = await supabase.from("quote_lines").delete().eq("quote_id", quoteId);
    if (delE) throw new Error(delE.message);
    if (lineTotals.length) {
      const { error: ie } = await supabase.from("quote_lines").insert(lineTotals);
      if (ie) throw new Error(ie.message);
    }
    const { error: ue } = await supabase
      .from("quotes")
      .update({ subtotal_zar, tax_rate, tax_zar, total_zar })
      .eq("id", quoteId);
    if (ue) throw new Error(ue.message);
    return;
  }

  if (!useLocalSqliteCrm()) return;
  const db = await getLocalSqliteDb();
  const now = new Date().toISOString();
  dbRun(db, `DELETE FROM quote_lines WHERE quote_id = ?`, [quoteId]);
  for (const l of lineTotals) {
    dbRun(
      db,
      `INSERT INTO quote_lines (id, quote_id, position, description, qty, unit_price_zar, line_total_zar) VALUES (?,?,?,?,?,?,?)`,
      [crypto.randomUUID(), l.quote_id, l.position, l.description, l.qty, l.unit_price_zar, l.line_total_zar]
    );
  }
  dbRun(db, `UPDATE quotes SET subtotal_zar = ?, tax_rate = ?, tax_zar = ?, total_zar = ?, updated_at = ? WHERE id = ?`, [
    subtotal_zar,
    tax_rate,
    tax_zar,
    total_zar,
    now,
    quoteId,
  ]);
}

export async function listInvoicesForQuote(quoteId: string): Promise<InvoiceRow[]> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as InvoiceRow[]) ?? [];
  }
  if (!useLocalSqliteCrm()) return [];
  const db = await getLocalSqliteDb();
  const rows = dbAll<Record<string, unknown>>(
    db,
    `SELECT * FROM invoices WHERE quote_id = ? ORDER BY created_at DESC`,
    [quoteId]
  );
  return rows.map((r) => mapLocalInvoice(r));
}

function mapLocalInvoice(r: Record<string, unknown>): InvoiceRow {
  return {
    id: String(r.id),
    created_at: toIso(r.created_at as string),
    updated_at: toIso(r.updated_at as string),
    quote_id: String(r.quote_id),
    invoice_number: String(r.invoice_number),
    status: r.status as InvoiceRow["status"],
    subtotal_zar: Number(r.subtotal_zar ?? 0),
    tax_rate: Number(r.tax_rate ?? 0),
    tax_zar: Number(r.tax_zar ?? 0),
    total_zar: Number(r.total_zar ?? 0),
    currency: String(r.currency ?? "ZAR"),
    due_date: r.due_date != null ? String(r.due_date) : null,
    created_by: String(r.created_by),
    pdf_path: r.pdf_path != null ? String(r.pdf_path) : null,
    customer_email_snapshot: r.customer_email_snapshot != null ? String(r.customer_email_snapshot) : null,
    customer_company_snapshot: r.customer_company_snapshot != null ? String(r.customer_company_snapshot) : null,
    customer_contact_snapshot: r.customer_contact_snapshot != null ? String(r.customer_contact_snapshot) : null,
  };
}

export async function listInvoiceLines(invoiceId: string): Promise<InvoiceLineRow[]> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    return (data as InvoiceLineRow[]) ?? [];
  }
  if (!useLocalSqliteCrm()) return [];
  const db = await getLocalSqliteDb();
  const rows = dbAll<Record<string, unknown>>(
    db,
    `SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY position ASC`,
    [invoiceId]
  );
  return rows.map((r) => ({
    id: String(r.id),
    invoice_id: String(r.invoice_id),
    position: Number(r.position ?? 0),
    description: String(r.description),
    qty: Number(r.qty ?? 0),
    unit_price_zar: Number(r.unit_price_zar ?? 0),
    line_total_zar: Number(r.line_total_zar ?? 0),
  }));
}

export async function createInvoiceFromQuote(
  actorId: string,
  quote: QuoteRow,
  quoteRequest: QuoteRequestRow,
  input: { due_date: string | null; tax_rate: number; lines: { description: string; qty: number; unit_price_zar: number }[] }
): Promise<string> {
  const invoice_number = generateInvoiceNumber();
  const lineTotals = input.lines.map((l, i) => {
    const line_total_zar = Math.round(Number(l.qty) * Number(l.unit_price_zar) * 100) / 100;
    return {
      position: i,
      description: l.description,
      qty: l.qty,
      unit_price_zar: l.unit_price_zar,
      line_total_zar,
    };
  });
  const { subtotal_zar, tax_zar, total_zar } = computeQuoteTotals(
    lineTotals.map((l) => ({ qty: l.qty, unit_price_zar: l.unit_price_zar })),
    input.tax_rate
  );

  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data: invIns, error: ie } = await supabase
      .from("invoices")
      .insert({
        quote_id: quote.id,
        invoice_number,
        status: "draft",
        subtotal_zar,
        tax_rate: input.tax_rate,
        tax_zar,
        total_zar,
        due_date: input.due_date,
        created_by: actorId,
        customer_email_snapshot: quoteRequest.email,
        customer_company_snapshot: quoteRequest.company_name,
        customer_contact_snapshot: quoteRequest.contact_name,
      })
      .select("id")
      .single();
    if (ie) throw new Error(ie.message);
    const invoiceId = invIns!.id as string;
    if (lineTotals.length) {
      const { error: le } = await supabase.from("invoice_lines").insert(
        lineTotals.map((l) => ({
          invoice_id: invoiceId,
          position: l.position,
          description: l.description,
          qty: l.qty,
          unit_price_zar: l.unit_price_zar,
          line_total_zar: l.line_total_zar,
        }))
      );
      if (le) throw new Error(le.message);
    }
    return invoiceId;
  }

  if (!useLocalSqliteCrm()) throw new Error("No CRM backend");
  const db = await getLocalSqliteDb();
  const invoiceId = crypto.randomUUID();
  const now = new Date().toISOString();
  dbRun(
    db,
    `INSERT INTO invoices (
      id, created_at, updated_at, quote_id, invoice_number, status,
      subtotal_zar, tax_rate, tax_zar, total_zar, currency, due_date, created_by,
      pdf_path, customer_email_snapshot, customer_company_snapshot, customer_contact_snapshot
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      invoiceId,
      now,
      now,
      quote.id,
      invoice_number,
      "draft",
      subtotal_zar,
      input.tax_rate,
      tax_zar,
      total_zar,
      "ZAR",
      input.due_date,
      actorId,
      null,
      quoteRequest.email,
      quoteRequest.company_name,
      quoteRequest.contact_name,
    ]
  );
  for (const l of lineTotals) {
    dbRun(
      db,
      `INSERT INTO invoice_lines (id, invoice_id, position, description, qty, unit_price_zar, line_total_zar) VALUES (?,?,?,?,?,?,?)`,
      [crypto.randomUUID(), invoiceId, l.position, l.description, l.qty, l.unit_price_zar, l.line_total_zar]
    );
  }
  return invoiceId;
}

export async function updateInvoiceHeader(
  invoiceId: string,
  patch: Partial<{
    status: InvoiceDocStatus;
    due_date: string | null;
    invoice_number: string;
    customer_email_snapshot: string | null;
    customer_company_snapshot: string | null;
    customer_contact_snapshot: string | null;
  }>
): Promise<void> {
  const now = new Date().toISOString();
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { error } = await supabase.from("invoices").update(patch).eq("id", invoiceId);
    if (error) throw new Error(error.message);
    return;
  }
  if (!useLocalSqliteCrm()) return;
  const db = await getLocalSqliteDb();
  const sets: string[] = ["updated_at = ?"];
  const params: (string | null)[] = [now];
  if (patch.status !== undefined) {
    sets.push("status = ?");
    params.push(patch.status);
  }
  if (patch.due_date !== undefined) {
    sets.push("due_date = ?");
    params.push(patch.due_date);
  }
  if (patch.invoice_number !== undefined) {
    sets.push("invoice_number = ?");
    params.push(patch.invoice_number);
  }
  if (patch.customer_email_snapshot !== undefined) {
    sets.push("customer_email_snapshot = ?");
    params.push(patch.customer_email_snapshot);
  }
  if (patch.customer_company_snapshot !== undefined) {
    sets.push("customer_company_snapshot = ?");
    params.push(patch.customer_company_snapshot);
  }
  if (patch.customer_contact_snapshot !== undefined) {
    sets.push("customer_contact_snapshot = ?");
    params.push(patch.customer_contact_snapshot);
  }
  params.push(invoiceId);
  dbRun(db, `UPDATE invoices SET ${sets.join(", ")} WHERE id = ?`, params);
}

export async function replaceInvoiceLines(
  invoiceId: string,
  lines: { description: string; qty: number; unit_price_zar: number }[],
  tax_rate: number
): Promise<void> {
  const lineTotals = lines.map((l, i) => {
    const line_total_zar = Math.round(Number(l.qty) * Number(l.unit_price_zar) * 100) / 100;
    return {
      invoice_id: invoiceId,
      position: i,
      description: l.description,
      qty: l.qty,
      unit_price_zar: l.unit_price_zar,
      line_total_zar,
    };
  });
  const { subtotal_zar, tax_zar, total_zar } = computeQuoteTotals(
    lineTotals.map((l) => ({ qty: l.qty, unit_price_zar: l.unit_price_zar })),
    tax_rate
  );

  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { error: delE } = await supabase.from("invoice_lines").delete().eq("invoice_id", invoiceId);
    if (delE) throw new Error(delE.message);
    if (lineTotals.length) {
      const { error: ie } = await supabase.from("invoice_lines").insert(lineTotals);
      if (ie) throw new Error(ie.message);
    }
    const { error: ue } = await supabase
      .from("invoices")
      .update({ subtotal_zar, tax_rate, tax_zar, total_zar })
      .eq("id", invoiceId);
    if (ue) throw new Error(ue.message);
    return;
  }

  if (!useLocalSqliteCrm()) return;
  const db = await getLocalSqliteDb();
  const now = new Date().toISOString();
  dbRun(db, `DELETE FROM invoice_lines WHERE invoice_id = ?`, [invoiceId]);
  for (const l of lineTotals) {
    dbRun(
      db,
      `INSERT INTO invoice_lines (id, invoice_id, position, description, qty, unit_price_zar, line_total_zar) VALUES (?,?,?,?,?,?,?)`,
      [crypto.randomUUID(), l.invoice_id, l.position, l.description, l.qty, l.unit_price_zar, l.line_total_zar]
    );
  }
  dbRun(db, `UPDATE invoices SET subtotal_zar = ?, tax_rate = ?, tax_zar = ?, total_zar = ?, updated_at = ? WHERE id = ?`, [
    subtotal_zar,
    tax_rate,
    tax_zar,
    total_zar,
    now,
    invoiceId,
  ]);
}

export async function listNotifications(userId: string, limit = 30): Promise<NotificationRow[]> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("crm_notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data as NotificationRow[]) ?? [];
  }
  if (!useLocalSqliteCrm()) return [];
  const db = await getLocalSqliteDb();
  const rows = dbAll<Record<string, unknown>>(
    db,
    `SELECT * FROM crm_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    [userId, limit]
  );
  return rows.map((r) => ({
    id: String(r.id),
    created_at: toIso(r.created_at as string),
    user_id: String(r.user_id),
    kind: String(r.kind),
    payload: parsePayload(String(r.payload ?? "{}")),
    read_at: r.read_at != null ? toIso(r.read_at as string) : null,
  }));
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { count, error } = await supabase
      .from("crm_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
  if (!useLocalSqliteCrm()) return 0;
  const db = await getLocalSqliteDb();
  const rows = dbAll<{ n: number }>(
    db,
    `SELECT COUNT(*) AS n FROM crm_notifications WHERE user_id = ? AND read_at IS NULL`,
    [userId]
  );
  return Number(rows[0]?.n ?? 0);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const now = new Date().toISOString();
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("crm_notifications")
      .update({ read_at: now })
      .eq("id", notificationId);
    if (error) throw new Error(error.message);
    return;
  }
  if (!useLocalSqliteCrm()) return;
  const db = await getLocalSqliteDb();
  dbRun(db, `UPDATE crm_notifications SET read_at = ? WHERE id = ?`, [now, notificationId]);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const now = new Date().toISOString();
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("crm_notifications")
      .update({ read_at: now })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return;
  }
  if (!useLocalSqliteCrm()) return;
  const db = await getLocalSqliteDb();
  dbRun(db, `UPDATE crm_notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL`, [now, userId]);
}

export async function invokeSendCommercialDocument(
  accessToken: string,
  body: { type: "quote" | "invoice"; id: string; recipient_email?: string }
): Promise<{ ok: boolean; error?: string; pdf_path?: string }> {
  if (useLocalSqliteCrm()) {
    return {
      ok: false,
      error:
        "PDF generation and email sending use Supabase Edge Functions. In local SQLite mode, save the quote/invoice and share details manually, or deploy with Supabase for automated PDF email.",
    };
  }
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url?.trim() || !anon?.trim()) {
    return { ok: false, error: "Supabase not configured" };
  }
  const res = await fetch(`${url.replace(/\/$/, "")}/functions/v1/send-commercial-document`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anon,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; pdf_path?: string };
  if (!res.ok) {
    return { ok: false, error: json.error || `HTTP ${res.status}` };
  }
  return { ok: true, pdf_path: json.pdf_path };
}

const COMMERCIAL_DOCS_BUCKET = "commercial-docs";
const COMMERCIAL_DOC_SIGNED_URL_TTL_SEC = 3600;

/** Signed URL to view a stored PDF (Supabase only). Returns null if unavailable or error. */
export async function getCommercialDocumentSignedUrl(pdfPath: string): Promise<string | null> {
  if (useLocalSqliteCrm() || !crmUsesSupabase()) return null;
  const p = pdfPath?.trim();
  if (!p) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(COMMERCIAL_DOCS_BUCKET)
    .createSignedUrl(p, COMMERCIAL_DOC_SIGNED_URL_TTL_SEC);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
