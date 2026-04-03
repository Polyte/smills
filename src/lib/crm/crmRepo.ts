/**
 * Unified CRM data access: Supabase when configured, else SQLite in the browser.
 */
import { getSupabase, isSupabaseConfigured } from "../supabaseClient";
import type { Database, UserRole } from "../../app/crm/database.types";
import { getLocalSqliteDb, dbAll, dbRun } from "./sqlite/engine";
import { sha256Hex } from "./sqlite/crypto";
import { isCrmDataAvailable, useLocalSqliteCrm } from "./mode";
import type { SqlValue } from "sql.js";

/** Data reads/writes: Supabase unless forced to local via VITE_CRM_USE_SQLITE. */
export function crmUsesSupabase(): boolean {
  if (import.meta.env.VITE_CRM_USE_SQLITE === "true") return false;
  return isSupabaseConfigured();
}

export const LOCAL_SESSION_KEY = "sm_crm_uid";
/** After "Remove all local CRM logins", set so `.env` dev auto-seed does not recreate accounts on reload. */
export const LOCAL_NO_AUTO_SEED_KEY = "sm_crm_no_auto_seed";

function localAutoSeedDisabledAfterPurge(): boolean {
  try {
    return localStorage.getItem(LOCAL_NO_AUTO_SEED_KEY) === "1";
  } catch {
    return false;
  }
}

export function localAllowDevLoginAutoSeedAgain(): void {
  try {
    localStorage.removeItem(LOCAL_NO_AUTO_SEED_KEY);
  } catch {
    /* ignore */
  }
}

export type CrmActor = { id: string; role: UserRole };

type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type DealRow = Database["public"]["Tables"]["deals"]["Row"];
type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
export type ProfileShape = {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at?: string;
  email?: string;
};

export function localGetSessionUserId(): string | null {
  try {
    return localStorage.getItem(LOCAL_SESSION_KEY);
  } catch {
    return null;
  }
}

export function localSetSessionUserId(id: string) {
  localStorage.setItem(LOCAL_SESSION_KEY, id);
}

export function localClearSession() {
  localStorage.removeItem(LOCAL_SESSION_KEY);
}

/**
 * Local SQLite only: deletes every `crm_users` row, clears the browser session, and persists the DB.
 * Foreign keys cascade: contacts, deals, activities, tasks, production orders, shipments, movements
 * tied to those users are removed. Catalog items (`inv_items`) and locations usually remain.
 */
export async function clearAllLocalCrmUserAccounts(): Promise<{ error: Error | null }> {
  if (crmUsesSupabase()) {
    return {
      error: new Error(
        "Supabase mode: remove users in the Supabase Dashboard under Authentication → Users, or use the Auth API with a service role."
      ),
    };
  }
  try {
    const db = await getLocalSqliteDb();
    dbRun(db, "DELETE FROM crm_users");
    localClearSession();
    try {
      localStorage.setItem(LOCAL_NO_AUTO_SEED_KEY, "1");
    } catch {
      /* ignore */
    }
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Could not clear local accounts.") };
  }
}

export async function localUserCount(): Promise<number> {
  const db = await getLocalSqliteDb();
  const rows = dbAll<{ n: number }>(db, "SELECT COUNT(*) AS n FROM crm_users");
  return Number(rows[0]?.n ?? 0);
}

export async function localSignUpFirst(
  email: string,
  password: string,
  fullName: string
): Promise<{ error: Error | null }> {
  const n = await localUserCount();
  if (n > 0) return { error: new Error("An account already exists. Sign in instead.") };
  const db = await getLocalSqliteDb();
  const id = crypto.randomUUID();
  const hash = await sha256Hex(password);
  try {
    dbRun(db, "INSERT INTO crm_users (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, 'production_manager')", [
      id,
      email.trim().toLowerCase(),
      hash,
      fullName.trim() || null,
    ]);
    localSetSessionUserId(id);
    try {
      localStorage.removeItem(LOCAL_NO_AUTO_SEED_KEY);
    } catch {
      /* ignore */
    }
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Could not create account.") };
  }
}

/** Local SQLite: add another CRM login (any role). Fails if email already exists. */
export async function localCreateCrmUser(
  email: string,
  password: string,
  fullName: string,
  role: UserRole
): Promise<{ error: Error | null }> {
  if (crmUsesSupabase()) {
    return { error: new Error("Use Supabase Authentication to add users in cloud mode.") };
  }
  const db = await getLocalSqliteDb();
  const norm = email.trim().toLowerCase();
  const taken = dbAll<{ x: number }>(db, "SELECT 1 AS x FROM crm_users WHERE email = ? LIMIT 1", [norm]);
  if (taken.length > 0) return { error: new Error("That email is already registered.") };
  const id = crypto.randomUUID();
  const hash = await sha256Hex(password);
  try {
    dbRun(db, "INSERT INTO crm_users (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)", [
      id,
      norm,
      hash,
      fullName.trim() || null,
      role,
    ]);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Could not create user.") };
  }
}

/**
 * Local SQLite: if configured via Vite env and the user table is empty, create one or two manager accounts.
 * Runs only when `import.meta.env.DEV` is true, or when `VITE_CRM_AUTO_SEED_DEV_LOGINS=true` (avoid in public builds).
 * `localSignUpFirst` is used for the first account (sets browser session); optional second uses `localCreateCrmUser`.
 */
export async function trySeedLocalDevAdminsFromEnv(): Promise<void> {
  if (crmUsesSupabase()) return;
  if (localAutoSeedDisabledAfterPurge()) return;
  const allow =
    Boolean(import.meta.env.DEV) ||
    String(import.meta.env.VITE_CRM_AUTO_SEED_DEV_LOGINS ?? "").toLowerCase() === "true";
  if (!allow) return;
  if ((await localUserCount()) > 0) return;
  const email = String(import.meta.env.VITE_CRM_DEV_ADMIN_EMAIL ?? "").trim();
  const password = String(import.meta.env.VITE_CRM_DEV_ADMIN_PASSWORD ?? "");
  const fullName =
    String(import.meta.env.VITE_CRM_DEV_ADMIN_FULL_NAME ?? "Standerton Admin").trim() || "Standerton Admin";
  if (!email || !password) return;
  const first = await localSignUpFirst(email, password, fullName);
  if (first.error) {
    console.warn("[CRM] Dev admin seed failed:", first.error.message);
    return;
  }
  const email2 = String(import.meta.env.VITE_CRM_DEV_ADMIN2_EMAIL ?? "").trim();
  const password2 = String(import.meta.env.VITE_CRM_DEV_ADMIN2_PASSWORD ?? "");
  const fullName2 =
    String(import.meta.env.VITE_CRM_DEV_ADMIN2_FULL_NAME ?? "Standerton Manager").trim() || "Standerton Manager";
  if (email2 && password2) {
    const second = await localCreateCrmUser(email2, password2, fullName2, "production_manager");
    if (second.error) console.warn("[CRM] Dev second admin seed:", second.error.message);
  }
}

export async function localSignIn(email: string, password: string): Promise<{ error: Error | null }> {
  const db = await getLocalSqliteDb();
  const rows = dbAll<{
    id: string;
    password_hash: string;
  }>(db, "SELECT id, password_hash FROM crm_users WHERE email = ?", [email.trim().toLowerCase()]);
  const row = rows[0];
  if (!row) return { error: new Error("Invalid email or password.") };
  const hash = await sha256Hex(password);
  if (hash !== row.password_hash) return { error: new Error("Invalid email or password.") };
  localSetSessionUserId(row.id);
  return { error: null };
}

export async function fetchProfile(userId: string): Promise<ProfileShape | null> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data } = await supabase.from("profiles").select("id, full_name, role").eq("id", userId).maybeSingle();
    return (data as ProfileShape) ?? null;
  }
  const db = await getLocalSqliteDb();
  const rows = dbAll<ProfileShape>(
    db,
    "SELECT id, full_name, role, created_at, email FROM crm_users WHERE id = ?",
    [userId]
  );
  return rows[0] ?? null;
}

export async function updateMyProfileName(userId: string, fullName: string): Promise<{ error: Error | null }> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { error } = await supabase.from("profiles").update({ full_name: fullName || null }).eq("id", userId);
    return { error: error ? new Error(error.message) : null };
  }
  const db = await getLocalSqliteDb();
  try {
    dbRun(db, "UPDATE crm_users SET full_name = ? WHERE id = ?", [fullName.trim() || null, userId]);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Update failed") };
  }
}

export async function listProfilesForManager(): Promise<ProfileShape[]> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, created_at")
      .order("full_name");
    if (error) throw new Error(error.message);
    return (data as ProfileShape[]) ?? [];
  }
  const db = await getLocalSqliteDb();
  return dbAll<ProfileShape>(
    db,
    "SELECT id, full_name, role, created_at, email FROM crm_users ORDER BY full_name"
  );
}

export async function updateUserRole(targetId: string, role: UserRole): Promise<{ error: Error | null }> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { error } = await supabase.from("profiles").update({ role }).eq("id", targetId);
    return { error: error ? new Error(error.message) : null };
  }
  const db = await getLocalSqliteDb();
  try {
    dbRun(db, "UPDATE crm_users SET role = ? WHERE id = ?", [role, targetId]);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Update failed") };
  }
}

export async function listContacts(): Promise<ContactRow[]> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("contacts").select("*").order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as ContactRow[]) ?? [];
  }
  const db = await getLocalSqliteDb();
  return dbAll<ContactRow>(db, "SELECT * FROM contacts ORDER BY updated_at DESC");
}

export async function saveContact(
  payload: Omit<ContactRow, "id" | "created_at" | "updated_at"> & { id?: string },
  actor: CrmActor
): Promise<{ error: Error | null; id?: string }> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    if (payload.id) {
      const { id, ...rest } = payload;
      const { error } = await supabase.from("contacts").update(rest).eq("id", id);
      return { error: error ? new Error(error.message) : null, id: payload.id };
    }
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        company_name: payload.company_name,
        contact_name: payload.contact_name,
        email: payload.email,
        phone: payload.phone,
        type: payload.type,
        status: payload.status,
        owner_id: payload.owner_id,
        notes: payload.notes,
      })
      .select("id")
      .single();
    return { error: error ? new Error(error.message) : null, id: data?.id };
  }
  const db = await getLocalSqliteDb();
  const now = new Date().toISOString();
  try {
    if (payload.id) {
      const row = dbAll<{ owner_id: string }>(db, "SELECT owner_id FROM contacts WHERE id = ?", [payload.id])[0];
      if (!row) return { error: new Error("Not found") };
      if (actor.role === "sales" && row.owner_id !== actor.id) {
        return { error: new Error("You can only edit contacts you own.") };
      }
      if (actor.role === "sales" && payload.type !== "lead") {
        return { error: new Error("Sales users can only work with leads.") };
      }
      dbRun(
        db,
        `UPDATE contacts SET updated_at = ?, company_name = ?, contact_name = ?, email = ?, phone = ?, type = ?, status = ?, owner_id = ?, notes = ? WHERE id = ?`,
        [
          now,
          payload.company_name,
          payload.contact_name,
          payload.email,
          payload.phone,
          payload.type,
          payload.status,
          payload.owner_id,
          payload.notes,
          payload.id,
        ]
      );
    } else {
      if (actor.role === "sales" && payload.type !== "lead") {
        return { error: new Error("Sales users can only create leads.") };
      }
      const id = crypto.randomUUID();
      dbRun(
        db,
        `INSERT INTO contacts (id, created_at, updated_at, company_name, contact_name, email, phone, type, status, owner_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          now,
          now,
          payload.company_name,
          payload.contact_name,
          payload.email,
          payload.phone,
          payload.type,
          payload.status,
          actor.id,
          payload.notes,
        ]
      );
      return { error: null, id };
    }
    return { error: null, id: payload.id };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Save failed") };
  }
}

export async function deleteContact(id: string, actor: CrmActor): Promise<{ error: Error | null }> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    return { error: error ? new Error(error.message) : null };
  }
  const db = await getLocalSqliteDb();
  const row = dbAll<{ owner_id: string }>(db, "SELECT owner_id FROM contacts WHERE id = ?", [id])[0];
  if (!row) return { error: null };
  if (actor.role === "sales") return { error: new Error("Not allowed.") };
  if (actor.role === "quality_officer" && row.owner_id !== actor.id) {
    return { error: new Error("You can only delete your own contacts.") };
  }
  try {
    dbRun(db, "DELETE FROM contacts WHERE id = ?", [id]);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Delete failed") };
  }
}

export type DealWithContact = DealRow & { contacts: { company_name: string } | null };

export async function listDeals(): Promise<DealWithContact[]> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("deals")
      .select("*, contacts(company_name)")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as DealWithContact[]) ?? [];
  }
  const db = await getLocalSqliteDb();
  const rows = dbAll<DealRow & { company_name: SqlValue }>(
    db,
    `SELECT d.*, c.company_name AS company_name FROM deals d
     LEFT JOIN contacts c ON c.id = d.contact_id
     ORDER BY d.updated_at DESC`
  );
  return rows.map((r) => {
    const { company_name, ...deal } = r;
    return {
      ...(deal as unknown as DealRow),
      contacts: company_name ? { company_name: String(company_name) } : null,
    };
  });
}

export async function saveDeal(
  payload: {
    id?: string;
    contact_id: string;
    title: string;
    stage: DealRow["stage"];
    value_zar: number | null;
    expected_close: string | null;
    owner_id: string;
  },
  actor: CrmActor
): Promise<{ error: Error | null; id?: string }> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    if (payload.id) {
      const { id, owner_id: _o, ...rest } = payload;
      const { error } = await supabase
        .from("deals")
        .update({
          contact_id: rest.contact_id,
          title: rest.title,
          stage: rest.stage,
          value_zar: rest.value_zar,
          expected_close: rest.expected_close,
        })
        .eq("id", id);
      return { error: error ? new Error(error.message) : null, id: payload.id };
    }
    const { data, error } = await supabase
      .from("deals")
      .insert({
        contact_id: payload.contact_id,
        title: payload.title,
        stage: payload.stage,
        value_zar: payload.value_zar,
        expected_close: payload.expected_close,
        owner_id: payload.owner_id,
      })
      .select("id")
      .single();
    return { error: error ? new Error(error.message) : null, id: data?.id };
  }
  if (actor.role === "sales") return { error: new Error("Sales users cannot edit deals.") };
  const db = await getLocalSqliteDb();
  const now = new Date().toISOString();
  try {
    if (payload.id) {
      dbRun(
        db,
        `UPDATE deals SET updated_at = ?, contact_id = ?, title = ?, stage = ?, value_zar = ?, expected_close = ? WHERE id = ?`,
        [
          now,
          payload.contact_id,
          payload.title,
          payload.stage,
          payload.value_zar,
          payload.expected_close,
          payload.id,
        ]
      );
    } else {
      const id = crypto.randomUUID();
      dbRun(
        db,
        `INSERT INTO deals (id, created_at, updated_at, contact_id, title, stage, value_zar, owner_id, expected_close) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          now,
          now,
          payload.contact_id,
          payload.title,
          payload.stage,
          payload.value_zar,
          payload.owner_id,
          payload.expected_close,
        ]
      );
      return { error: null, id };
    }
    return { error: null, id: payload.id };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Save failed") };
  }
}

export async function deleteDeal(id: string, actor: CrmActor): Promise<{ error: Error | null }> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { error } = await supabase.from("deals").delete().eq("id", id);
    return { error: error ? new Error(error.message) : null };
  }
  if (actor.role === "sales") return { error: new Error("Not allowed.") };
  const db = await getLocalSqliteDb();
  const row = dbAll<{ owner_id: string }>(db, "SELECT owner_id FROM deals WHERE id = ?", [id])[0];
  if (!row) return { error: null };
  if (actor.role === "quality_officer" && row.owner_id !== actor.id) {
    return { error: new Error("You can only delete your own deals.") };
  }
  try {
    dbRun(db, "DELETE FROM deals WHERE id = ?", [id]);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Delete failed") };
  }
}

export type ActivityJoined = ActivityRow & {
  contacts: { company_name: string } | null;
  deals: { title: string } | null;
};

export async function listActivities(contactFilterId: string | null): Promise<ActivityJoined[]> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    let q = supabase.from("activities").select("*, contacts(company_name), deals(title)").order("occurred_at", {
      ascending: false,
    });
    if (contactFilterId) q = q.eq("contact_id", contactFilterId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data as ActivityJoined[]) ?? [];
  }
  const db = await getLocalSqliteDb();
  const sql =
    contactFilterId == null
      ? `SELECT a.*, c.company_name AS cname, d.title AS dtitle FROM activities a
         LEFT JOIN contacts c ON c.id = a.contact_id
         LEFT JOIN deals d ON d.id = a.deal_id
         ORDER BY a.occurred_at DESC`
      : `SELECT a.*, c.company_name AS cname, d.title AS dtitle FROM activities a
         LEFT JOIN contacts c ON c.id = a.contact_id
         LEFT JOIN deals d ON d.id = a.deal_id
         WHERE a.contact_id = ?
         ORDER BY a.occurred_at DESC`;
  const params = contactFilterId == null ? [] : [contactFilterId];
  const rows = dbAll<
    ActivityRow & { cname: SqlValue; dtitle: SqlValue }
  >(db, sql, params);
  return rows.map((r) => {
    const { cname, dtitle, ...a } = r;
    return {
      ...(a as unknown as ActivityRow),
      contacts: cname ? { company_name: String(cname) } : null,
      deals: dtitle ? { title: String(dtitle) } : null,
    };
  });
}

export async function insertActivity(
  row: Omit<ActivityRow, "id" | "created_at">,
  actor: CrmActor
): Promise<{ error: Error | null }> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { error } = await supabase.from("activities").insert({
      kind: row.kind,
      subject: row.subject,
      body: row.body,
      occurred_at: row.occurred_at,
      contact_id: row.contact_id,
      deal_id: row.deal_id,
      created_by: actor.id,
    });
    return { error: error ? new Error(error.message) : null };
  }
  const db = await getLocalSqliteDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    dbRun(
      db,
      `INSERT INTO activities (id, created_at, contact_id, deal_id, kind, subject, body, occurred_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        now,
        row.contact_id,
        row.deal_id,
        row.kind,
        row.subject,
        row.body,
        row.occurred_at,
        actor.id,
      ]
    );
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Insert failed") };
  }
}

export type TaskJoined = TaskRow & {
  assignee: { full_name: string | null } | null;
  contacts: { company_name: string } | null;
};

export async function listTasks(scope: "mine" | "all", userId: string): Promise<TaskJoined[]> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    let q = supabase
      .from("tasks")
      .select("*, assignee:profiles!tasks_assignee_id_fkey(full_name), contacts(company_name)")
      .order("due_at", { ascending: true, nullsFirst: false });
    if (scope === "mine") q = q.eq("assignee_id", userId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data as TaskJoined[]) ?? [];
  }
  const db = await getLocalSqliteDb();
  const sql =
    scope === "mine"
      ? `SELECT t.*, u.full_name AS assignee_name, c.company_name AS cname FROM tasks t
         LEFT JOIN crm_users u ON u.id = t.assignee_id
         LEFT JOIN contacts c ON c.id = t.contact_id
         WHERE t.assignee_id = ?
         ORDER BY t.due_at IS NULL, t.due_at ASC`
      : `SELECT t.*, u.full_name AS assignee_name, c.company_name AS cname FROM tasks t
         LEFT JOIN crm_users u ON u.id = t.assignee_id
         LEFT JOIN contacts c ON c.id = t.contact_id
         ORDER BY t.due_at IS NULL, t.due_at ASC`;
  const params = scope === "mine" ? [userId] : [];
  const rows = dbAll<TaskRow & { assignee_name: SqlValue; cname: SqlValue }>(db, sql, params);
  return rows.map((r) => {
    const { assignee_name, cname, ...t } = r;
    return {
      ...(t as unknown as TaskRow),
      assignee: { full_name: assignee_name != null ? String(assignee_name) : null },
      contacts: cname ? { company_name: String(cname) } : null,
    };
  });
}

export async function insertTask(
  row: {
    title: string;
    due_at: string | null;
    assignee_id: string;
    contact_id: string | null;
    deal_id: string | null;
  },
  actor: CrmActor
): Promise<{ error: Error | null }> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { error } = await supabase.from("tasks").insert({
      title: row.title,
      due_at: row.due_at,
      status: "open",
      assignee_id: row.assignee_id,
      contact_id: row.contact_id,
      deal_id: row.deal_id,
      created_by: actor.id,
    });
    return { error: error ? new Error(error.message) : null };
  }
  const db = await getLocalSqliteDb();
  if (actor.role === "sales" && row.assignee_id !== actor.id) {
    return { error: new Error("Staff can only assign tasks to themselves.") };
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    dbRun(
      db,
      `INSERT INTO tasks (id, created_at, updated_at, title, due_at, status, assignee_id, contact_id, deal_id, created_by) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?)`,
      [id, now, now, row.title, row.due_at, row.assignee_id, row.contact_id, row.deal_id, actor.id]
    );
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Insert failed") };
  }
}

export async function completeTask(id: string, actor: CrmActor): Promise<{ error: Error | null }> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { error } = await supabase.from("tasks").update({ status: "done" }).eq("id", id);
    return { error: error ? new Error(error.message) : null };
  }
  const db = await getLocalSqliteDb();
  const row = dbAll<{ assignee_id: string }>(db, "SELECT assignee_id FROM tasks WHERE id = ?", [id])[0];
  if (!row) return { error: new Error("Not found") };
  if (actor.role === "sales" && row.assignee_id !== actor.id) {
    return { error: new Error("Not allowed.") };
  }
  try {
    dbRun(db, "UPDATE tasks SET updated_at = ?, status = 'done' WHERE id = ?", [
      new Date().toISOString(),
      id,
    ]);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Update failed") };
  }
}

export async function listContactsBrief(): Promise<Pick<ContactRow, "id" | "company_name">[]> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("contacts").select("id, company_name").order("company_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  }
  const db = await getLocalSqliteDb();
  return dbAll(db, "SELECT id, company_name FROM contacts ORDER BY company_name");
}

export async function listDealsBrief(): Promise<Pick<DealRow, "id" | "title" | "contact_id">[]> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("deals").select("id, title, contact_id").order("title");
    if (error) throw new Error(error.message);
    return data ?? [];
  }
  const db = await getLocalSqliteDb();
  return dbAll(db, "SELECT id, title, contact_id FROM deals ORDER BY title");
}

export async function listProfilesBrief(): Promise<ProfileShape[]> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("profiles").select("id, full_name, role").order("full_name");
    if (error) throw new Error(error.message);
    return (data as ProfileShape[]) ?? [];
  }
  const db = await getLocalSqliteDb();
  return dbAll<ProfileShape>(db, "SELECT id, full_name, role FROM crm_users ORDER BY full_name");
}

export async function dashboardStats(_userId: string): Promise<{
  openTasks: number;
  dealsByStage: { stage: string; count: number }[];
  recentActivities: ActivityJoined[];
  contactCount: number;
  dealCount: number;
  leadsCount: number;
  wonDealsValue: number;
  pipelineOpenCount: number;
}> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const [tasksRes, dealsRes, actRes, contactsCountRes, leadsCountRes, wonDealsRes] = await Promise.all([
      supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("deals").select("stage"),
      supabase
        .from("activities")
        .select("*, contacts(company_name), deals(title)")
        .order("occurred_at", { ascending: false })
        .limit(8),
      supabase.from("contacts").select("id", { count: "exact", head: true }),
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("type", "lead"),
      supabase.from("deals").select("value_zar").eq("stage", "won"),
    ]);
    if (tasksRes.error) throw new Error(tasksRes.error.message);
    if (dealsRes.error) throw new Error(dealsRes.error.message);
    if (actRes.error) throw new Error(actRes.error.message);
    if (contactsCountRes.error) throw new Error(contactsCountRes.error.message);
    if (leadsCountRes.error) throw new Error(leadsCountRes.error.message);
    if (wonDealsRes.error) throw new Error(wonDealsRes.error.message);
    const stages = ["qualification", "proposal", "won", "lost"] as const;
    const list = dealsRes.data ?? [];
    const wonSum = (wonDealsRes.data ?? []).reduce((acc, row) => acc + Number(row.value_zar ?? 0), 0);
    const pipelineOpenCount = list.filter((d) => d.stage === "qualification" || d.stage === "proposal").length;
    return {
      openTasks: tasksRes.count ?? 0,
      dealsByStage: stages.map((stage) => ({
        stage,
        count: list.filter((d) => d.stage === stage).length,
      })),
      recentActivities: (actRes.data as ActivityJoined[]) ?? [],
      contactCount: contactsCountRes.count ?? 0,
      dealCount: list.length,
      leadsCount: leadsCountRes.count ?? 0,
      wonDealsValue: wonSum,
      pipelineOpenCount,
    };
  }
  const db = await getLocalSqliteDb();
  const open = dbAll<{ n: number }>(db, "SELECT COUNT(*) AS n FROM tasks WHERE status = 'open'");
  const dealRows = dbAll<{ stage: string }>(db, "SELECT stage FROM deals");
  const contactCountRow = dbAll<{ n: number }>(db, "SELECT COUNT(*) AS n FROM contacts");
  const leadsCountRow = dbAll<{ n: number }>(db, "SELECT COUNT(*) AS n FROM contacts WHERE type = 'lead'");
  const wonSumRow = dbAll<{ s: number }>(db, "SELECT COALESCE(SUM(value_zar), 0) AS s FROM deals WHERE stage = 'won'");
  const stages = ["qualification", "proposal", "won", "lost"] as const;
  const recent = await listActivities(null);
  const pipelineOpenCount = dealRows.filter((d) => d.stage === "qualification" || d.stage === "proposal").length;
  return {
    openTasks: Number(open[0]?.n ?? 0),
    dealsByStage: stages.map((stage) => ({
      stage,
      count: dealRows.filter((d) => d.stage === stage).length,
    })),
    recentActivities: recent.slice(0, 8),
    contactCount: Number(contactCountRow[0]?.n ?? 0),
    dealCount: dealRows.length,
    leadsCount: Number(leadsCountRow[0]?.n ?? 0),
    wonDealsValue: Number(wonSumRow[0]?.s ?? 0),
    pipelineOpenCount,
  };
}

export { isCrmDataAvailable, useLocalSqliteCrm };
