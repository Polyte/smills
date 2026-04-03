import { getSupabase } from "../supabaseClient";
import { crmUsesSupabase } from "./crmRepo";

export const CONTACT_DOCUMENTS_BUCKET = "contact-documents";
export const QC_DEFECT_PHOTOS_BUCKET = "qc-defect-photos";

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-()+ ]/g, "_").slice(0, 180);
}

export function isExternalPhotoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
}

export type SalesOrderRow = {
  id: string;
  created_at: string;
  updated_at: string;
  order_number: string;
  contact_id: string | null;
  deal_id: string | null;
  quote_id: string | null;
  fabric_type: string | null;
  gsm: number | null;
  width_cm: number | null;
  color: string | null;
  finish: string | null;
  status: string;
  owner_id: string;
  notes: string | null;
};

export type FactoryWorkOrderRow = {
  id: string;
  created_at: string;
  updated_at: string;
  code: string;
  sales_order_id: string | null;
  status: string;
  planned_start: string | null;
  planned_end: string | null;
  machine_line: string | null;
  inv_production_order_id: string | null;
  notes: string | null;
  created_by: string;
};

export type AutomationEventRow = {
  id: string;
  created_at: string;
  event_type: string;
  message: string;
  machine_line: string | null;
  sales_order_id: string | null;
  meta: Record<string, unknown>;
};

export type AutomationActionRow = {
  id: string;
  created_at: string;
  rule_id: string | null;
  status: string;
  action_type: string;
  summary: string;
  payload: Record<string, unknown>;
  source: string;
  decided_at: string | null;
  decided_by: string | null;
};

export type AutomationRuleRow = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  enabled: boolean;
  trigger_type: string;
  condition_json: Record<string, unknown>;
  action_json: Record<string, unknown>;
  created_by: string;
};

export function factoryNeedsSupabase(): boolean {
  if (!crmUsesSupabase()) {
    throw new Error("Factory operations require Supabase (not local SQLite mode).");
  }
}

export type SampleRequestStatus = "requested" | "in_lab" | "approved" | "rejected";

export type SampleRequestRow = {
  id: string;
  created_at: string;
  updated_at: string;
  sales_order_id: string;
  status: SampleRequestStatus;
  tracking_notes: string | null;
  rejected_reason: string | null;
  approved_at: string | null;
  created_by: string;
};

export async function listSampleRequests(): Promise<
  (SampleRequestRow & { sales_orders?: { order_number: string } | null })[]
> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sample_requests")
    .select("*, sales_orders(order_number)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as (SampleRequestRow & { sales_orders?: { order_number: string } | null })[]) ?? [];
}

export async function createSampleRequest(payload: {
  sales_order_id: string;
  tracking_notes?: string | null;
  created_by: string;
}): Promise<string> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sample_requests")
    .insert({
      sales_order_id: payload.sales_order_id,
      tracking_notes: payload.tracking_notes ?? null,
      created_by: payload.created_by,
      status: "requested",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data!.id as string;
}

export async function updateSampleRequest(
  id: string,
  patch: {
    status?: SampleRequestStatus;
    tracking_notes?: string | null;
    rejected_reason?: string | null;
    approved_at?: string | null;
  }
): Promise<void> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const row: Record<string, unknown> = { ...patch };
  if (patch.status === "approved" && !patch.approved_at) {
    row.approved_at = new Date().toISOString();
  }
  if (patch.status && patch.status !== "rejected") {
    row.rejected_reason = null;
  }
  const { error } = await supabase.from("sample_requests").update(row).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listSalesOrders(): Promise<SalesOrderRow[]> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sales_orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as SalesOrderRow[]) ?? [];
}

export async function getSalesOrder(id: string): Promise<SalesOrderRow | null> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const { data, error } = await supabase.from("sales_orders").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as SalesOrderRow | null;
}

export async function createSalesOrder(payload: {
  contact_id?: string | null;
  deal_id?: string | null;
  quote_id?: string | null;
  fabric_type?: string | null;
  gsm?: number | null;
  width_cm?: number | null;
  color?: string | null;
  finish?: string | null;
  notes?: string | null;
  owner_id: string;
}): Promise<string> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sales_orders")
    .insert({
      ...payload,
      status: "quotation",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data!.id as string;
}

export async function updateSalesOrderStatus(id: string, status: SalesOrderRow["status"]): Promise<void> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const { error } = await supabase.from("sales_orders").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listFactoryWorkOrders(): Promise<FactoryWorkOrderRow[]> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("factory_work_orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as FactoryWorkOrderRow[]) ?? [];
}

export async function listAutomationEvents(params?: {
  from?: string;
  to?: string;
  orderNumber?: string;
}): Promise<AutomationEventRow[]> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  let q = supabase.from("automation_events").select("*").order("created_at", { ascending: false }).limit(200);
  if (params?.from) q = q.gte("created_at", params.from);
  if (params?.to) q = q.lte("created_at", params.to);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  let rows = (data as AutomationEventRow[]) ?? [];
  if (params?.orderNumber?.trim()) {
    const needle = params.orderNumber.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        String(r.message).toLowerCase().includes(needle) ||
        JSON.stringify(r.meta).toLowerCase().includes(needle)
    );
  }
  return rows;
}

export async function listPendingAutomationActions(): Promise<AutomationActionRow[]> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("automation_actions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as AutomationActionRow[]) ?? [];
}

export async function updateAutomationAction(
  id: string,
  patch: { status: string; decided_by?: string | null }
): Promise<void> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const { error } = await supabase
    .from("automation_actions")
    .update({
      status: patch.status,
      decided_at: new Date().toISOString(),
      decided_by: patch.decided_by ?? null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listAutomationRules(): Promise<AutomationRuleRow[]> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const { data, error } = await supabase.from("automation_rules").select("*").order("name");
  if (error) throw new Error(error.message);
  return (data as AutomationRuleRow[]) ?? [];
}

export async function upsertAutomationRule(
  row: Partial<AutomationRuleRow> & { name: string; trigger_type: string; created_by: string }
): Promise<void> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  if (row.id) {
    const { error } = await supabase
      .from("automation_rules")
      .update({
        name: row.name,
        enabled: row.enabled ?? true,
        trigger_type: row.trigger_type,
        condition_json: row.condition_json ?? {},
        action_json: row.action_json ?? {},
      })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from("automation_rules").insert({
    name: row.name,
    enabled: row.enabled ?? true,
    trigger_type: row.trigger_type,
    condition_json: row.condition_json ?? {},
    action_json: row.action_json ?? {},
    created_by: row.created_by,
  });
  if (error) throw new Error(error.message);
}

export async function deleteAutomationRule(id: string): Promise<void> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const { error } = await supabase.from("automation_rules").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type AutomationAlertRow = {
  id: string;
  created_at: string;
  severity: string;
  title: string;
  body: string | null;
  user_id: string | null;
  read_at: string | null;
  meta: Record<string, unknown>;
};

export async function listAutomationAlerts(limit = 30): Promise<AutomationAlertRow[]> {
  if (!crmUsesSupabase()) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("automation_alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data as AutomationAlertRow[]) ?? [];
}

export async function markAutomationAlertRead(id: string): Promise<void> {
  if (!crmUsesSupabase()) return;
  const supabase = getSupabase();
  await supabase.from("automation_alerts").update({ read_at: new Date().toISOString() }).eq("id", id);
}

export async function defectRateLast7Days(): Promise<{ failPct: number; total: number }> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("qc_inspections")
    .select("result")
    .gte("created_at", since);
  if (error) throw new Error(error.message);
  const rows = (data as { result: string }[]) ?? [];
  const total = rows.length;
  const fails = rows.filter((r) => r.result === "fail").length;
  return { failPct: total ? Math.round((100 * fails) / total) : 0, total };
}

export type QcInspectionRow = {
  id: string;
  created_at: string;
  sales_order_id: string | null;
  factory_work_order_id: string | null;
  roll_id: string | null;
  result: string;
  notes: string | null;
  inspector_id: string;
};

export async function listQcInspectionsRecent(days = 7): Promise<QcInspectionRow[]> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase
    .from("qc_inspections")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as QcInspectionRow[]) ?? [];
}

export async function createQcInspection(payload: {
  sales_order_id?: string | null;
  factory_work_order_id?: string | null;
  roll_id?: string | null;
  result: "pass" | "fail" | "pending";
  notes?: string | null;
  inspector_id: string;
}): Promise<string> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("qc_inspections")
    .insert({
      sales_order_id: payload.sales_order_id ?? null,
      factory_work_order_id: payload.factory_work_order_id ?? null,
      roll_id: payload.roll_id ?? null,
      result: payload.result,
      notes: payload.notes ?? null,
      inspector_id: payload.inspector_id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data!.id as string;
}

export async function createFactoryWorkOrderRow(payload: {
  code: string;
  sales_order_id?: string | null;
  machine_line?: string | null;
  created_by: string;
}): Promise<void> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const { error } = await supabase.from("factory_work_orders").insert({
    code: payload.code,
    sales_order_id: payload.sales_order_id ?? null,
    machine_line: payload.machine_line ?? null,
    created_by: payload.created_by,
    status: "planned",
  });
  if (error) throw new Error(error.message);
}

export type ContactLogRow = {
  id: string;
  created_at: string;
  contact_id: string;
  kind: string;
  subject: string;
  body: string | null;
  occurred_at: string;
  created_by: string;
};

export async function listContactLogs(contactId: string): Promise<ContactLogRow[]> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("contact_logs")
    .select("*")
    .eq("contact_id", contactId)
    .order("occurred_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ContactLogRow[]) ?? [];
}

export async function insertContactLog(payload: {
  contact_id: string;
  kind: string;
  subject: string;
  body?: string | null;
  created_by: string;
}): Promise<void> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const { error } = await supabase.from("contact_logs").insert({
    contact_id: payload.contact_id,
    kind: payload.kind,
    subject: payload.subject,
    body: payload.body ?? null,
    created_by: payload.created_by,
  });
  if (error) throw new Error(error.message);
}

export type ContactDocumentRow = {
  id: string;
  created_at: string;
  contact_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  uploaded_by: string;
};

export async function listContactDocuments(contactId: string): Promise<ContactDocumentRow[]> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("contact_documents")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ContactDocumentRow[]) ?? [];
}

export async function uploadContactDocument(params: {
  contactId: string;
  file: File;
  uploadedBy: string;
}): Promise<void> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const path = `${params.contactId}/${crypto.randomUUID()}_${sanitizeFileName(params.file.name)}`;
  const { error: upErr } = await supabase.storage
    .from(CONTACT_DOCUMENTS_BUCKET)
    .upload(path, params.file, { contentType: params.file.type || undefined, upsert: false });
  if (upErr) throw new Error(upErr.message);
  const { error } = await supabase.from("contact_documents").insert({
    contact_id: params.contactId,
    file_name: params.file.name,
    storage_path: path,
    mime_type: params.file.type || null,
    uploaded_by: params.uploadedBy,
  });
  if (error) {
    await supabase.storage.from(CONTACT_DOCUMENTS_BUCKET).remove([path]);
    throw new Error(error.message);
  }
}

export async function getContactDocumentSignedUrl(storagePath: string, expiresSec = 3600): Promise<string> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(CONTACT_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresSec);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function deleteContactDocument(id: string): Promise<void> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const { data: row, error: fetchErr } = await supabase
    .from("contact_documents")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!row) throw new Error("Document not found");
  const { error: delObj } = await supabase.storage
    .from(CONTACT_DOCUMENTS_BUCKET)
    .remove([(row as { storage_path: string }).storage_path]);
  if (delObj) throw new Error(delObj.message);
  const { error } = await supabase.from("contact_documents").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type QcDefectRow = {
  id: string;
  created_at: string;
  inspection_id: string;
  defect_type: string;
  location_label: string | null;
  photo_url: string | null;
};

export type QcInspectionWithDefects = QcInspectionRow & {
  qc_defects: QcDefectRow[] | null;
};

export async function listQcInspectionsWithDefects(days = 30): Promise<QcInspectionWithDefects[]> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase
    .from("qc_inspections")
    .select("*, qc_defects(*)")
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as QcInspectionWithDefects[]) ?? [];
}

export async function listQcDefectsRecent(limit = 40): Promise<
  (QcDefectRow & {
    qc_inspections: { roll_id: string | null; result: string; sales_order_id: string | null } | null;
  })[]
> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("qc_defects")
    .select("*, qc_inspections(roll_id, result, sales_order_id)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (
    (data as (QcDefectRow & {
      qc_inspections: { roll_id: string | null; result: string; sales_order_id: string | null } | null;
    })[]) ?? []
  );
}

export async function insertQcDefect(payload: {
  inspection_id: string;
  defect_type: string;
  location_label?: string | null;
  photo_url?: string | null;
}): Promise<string> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("qc_defects")
    .insert({
      inspection_id: payload.inspection_id,
      defect_type: payload.defect_type,
      location_label: payload.location_label ?? null,
      photo_url: payload.photo_url ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data!.id as string;
}

export async function uploadQcDefectPhoto(inspectionId: string, file: File): Promise<string> {
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const ext = (file.name.split(".").pop() || "bin").slice(0, 8);
  const path = `${inspectionId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(QC_DEFECT_PHOTOS_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (upErr) throw new Error(upErr.message);
  return path;
}

export async function getQcDefectPhotoSignedUrl(storagePath: string, expiresSec = 3600): Promise<string | null> {
  if (isExternalPhotoUrl(storagePath)) return storagePath;
  factoryNeedsSupabase();
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(QC_DEFECT_PHOTOS_BUCKET)
    .createSignedUrl(storagePath, expiresSec);
  if (error) return null;
  return data.signedUrl;
}
