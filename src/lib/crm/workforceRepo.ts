/**
 * Workforce attendance: Supabase or local SQLite (same shapes as Postgres).
 */
import { getSupabase } from "../supabaseClient";
import type { Database, Json } from "../../app/crm/database.types";
import { crmUsesSupabase } from "./crmRepo";
import { getLocalSqliteDb, dbAll, dbRun, type Database as SqlJsDatabase } from "./sqlite/engine";
import type { SqlValue } from "sql.js";
import type { UserRole } from "../../app/crm/database.types";
import { isOpsAdmin } from "./roles";

export type ReaderKind = "facility_in" | "facility_out" | "department";

export type DepartmentRow = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  code: string;
  sort_order: number;
  active: boolean;
};

export type WorkforceEmployeeRow = {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string;
  employee_number: string | null;
  rfid_uid: string;
  profile_id: string | null;
  primary_department_id: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
};

export type AccessReaderRow = {
  id: string;
  created_at: string;
  name: string;
  reader_key: string;
  kind: ReaderKind;
  department_id: string | null;
};

export type AccessEventRow = {
  id: string;
  occurred_at: string;
  workforce_employee_id: string;
  reader_id: string;
  rfid_raw: string | null;
  device_meta: Json | null;
  reader_name?: string;
  reader_kind?: ReaderKind;
  department_id?: string | null;
};

export type DepartmentSegmentRow = {
  id: string;
  workforce_employee_id: string;
  department_id: string;
  started_at: string;
  ended_at: string | null;
  started_event_id: string | null;
  ended_event_id: string | null;
  department_name?: string;
};

export type LostTimeRow = {
  id: string;
  created_at: string;
  workforce_employee_id: string;
  left_at: string;
  returned_at: string;
  minutes_lost: number;
  facility_out_event_id: string | null;
  facility_in_event_id: string | null;
};

export type LivePresenceRow = {
  employee: WorkforceEmployeeRow;
  on_site: boolean;
  current_department_id: string | null;
  current_department_name: string | null;
  segment_started_at: string | null;
  last_event_at: string | null;
};

function isoNow(): string {
  return new Date().toISOString();
}

export function canManageWorkforce(role: UserRole | undefined): boolean {
  return isOpsAdmin(role);
}

export function canViewWorkforceSelf(role: UserRole | undefined): boolean {
  return role === "quality_officer" || isOpsAdmin(role);
}

/** Mirror Postgres RPC logic for browser SQLite. */
export function localApplyAccessEvent(
  db: SqlJsDatabase,
  readerKey: string,
  rfidUid: string,
  occurredAt?: string,
  deviceMeta?: Json | null
): { ok: boolean; error?: string; event_id?: string; reader_kind?: ReaderKind } {
  const ts = occurredAt ?? isoNow();
  const rk = readerKey.trim();
  const rf = rfidUid.trim().toLowerCase();
  if (!rk || !rf) {
    return { ok: false, error: "reader_key and rfid_uid required" };
  }

  const readers = dbAll<{ id: string; kind: ReaderKind; department_id: string | null }>(
    db,
    "SELECT id, kind, department_id FROM access_readers WHERE reader_key = ?",
    [rk]
  );
  const reader = readers[0];
  if (!reader) return { ok: false, error: "unknown_reader_key" };

  if (reader.kind === "department" && !reader.department_id) {
    return { ok: false, error: "department_reader_misconfigured" };
  }

  const emps = dbAll<{ id: string }>(
    db,
    "SELECT id FROM workforce_employees WHERE lower(trim(rfid_uid)) = ? AND active = 1",
    [rf]
  );
  const emp = emps[0];
  if (!emp) return { ok: false, error: "unknown_or_inactive_rfid" };

  const eventId = crypto.randomUUID();
  const metaStr = deviceMeta == null ? null : JSON.stringify(deviceMeta);
  dbRun(
    db,
    `INSERT INTO access_events (id, occurred_at, workforce_employee_id, reader_id, rfid_raw, device_meta)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [eventId, ts, emp.id, reader.id, rf, metaStr]
  );

  const lastFacility = dbAll<{ kind: ReaderKind }>(
    db,
    `SELECT ar.kind AS kind FROM access_events ae
     JOIN access_readers ar ON ar.id = ae.reader_id
     WHERE ae.workforce_employee_id = ?
       AND ar.kind IN ('facility_in','facility_out')
       AND (ae.occurred_at < ? OR (ae.occurred_at = ? AND ae.id < ?))
     ORDER BY ae.occurred_at DESC, ae.id DESC LIMIT 1`,
    [emp.id, ts, ts, eventId]
  );
  const lastKind = lastFacility[0]?.kind ?? null;
  const onSite = lastKind === "facility_in";

  if (reader.kind === "facility_out") {
    dbRun(
      db,
      `UPDATE department_time_segments SET ended_at = ?, ended_event_id = ?
       WHERE workforce_employee_id = ? AND ended_at IS NULL`,
      [ts, eventId, emp.id]
    );
  } else if (reader.kind === "facility_in") {
    if (lastKind !== "facility_in") {
      const outs = dbAll<{ id: string; occurred_at: string }>(
        db,
        `SELECT ae.id, ae.occurred_at FROM access_events ae
         JOIN access_readers ar ON ar.id = ae.reader_id
         WHERE ae.workforce_employee_id = ?
           AND ar.kind = 'facility_out'
           AND (ae.occurred_at < ? OR (ae.occurred_at = ? AND ae.id < ?))
         ORDER BY ae.occurred_at DESC, ae.id DESC LIMIT 1`,
        [emp.id, ts, ts, eventId]
      );
      const o = outs[0];
      if (o) {
        const diffMs = new Date(ts).getTime() - new Date(o.occurred_at).getTime();
        const minutes = Math.floor(diffMs / 60000);
        if (minutes >= 15) {
          const ltId = crypto.randomUUID();
          dbRun(
            db,
            `INSERT INTO lost_time_incidents (id, workforce_employee_id, left_at, returned_at, minutes_lost, facility_out_event_id, facility_in_event_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [ltId, emp.id, o.occurred_at, ts, minutes, o.id, eventId]
          );
        }
      }
    }
  } else if (reader.kind === "department" && reader.department_id) {
    if (onSite) {
      dbRun(
        db,
        `UPDATE department_time_segments SET ended_at = ?, ended_event_id = ?
         WHERE workforce_employee_id = ? AND ended_at IS NULL`,
        [ts, eventId, emp.id]
      );
      const segId = crypto.randomUUID();
      dbRun(
        db,
        `INSERT INTO department_time_segments (id, workforce_employee_id, department_id, started_at, started_event_id)
         VALUES (?, ?, ?, ?, ?)`,
        [segId, emp.id, reader.department_id, ts, eventId]
      );
    }
  }

  return { ok: true, event_id: eventId, reader_kind: reader.kind };
}

export async function workforceIngestScan(
  readerKey: string,
  rfidUid: string,
  options?: { clientTs?: string | null; deviceMeta?: Json | null }
): Promise<{ ok: boolean; error?: string; event_id?: string; reader_kind?: ReaderKind }> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("workforce_apply_access_event", {
      p_reader_key: readerKey,
      p_rfid_uid: rfidUid,
      p_occurred_at: options?.clientTs ?? null,
      p_device_meta: options?.deviceMeta ?? null,
    });
    if (error) return { ok: false, error: error.message };
    const row = data as { ok?: boolean; error?: string; event_id?: string; reader_kind?: ReaderKind };
    if (row?.ok === false) return { ok: false, error: row.error ?? "rpc_failed" };
    return {
      ok: true,
      event_id: row.event_id,
      reader_kind: row.reader_kind,
    };
  }
  const db = await getLocalSqliteDb();
  try {
    return localApplyAccessEvent(db, readerKey, rfidUid, options?.clientTs ?? undefined, options?.deviceMeta ?? null);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

type DeptInsert = Database["public"]["Tables"]["departments"]["Insert"];

export async function fetchDepartments(): Promise<DepartmentRow[]> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("departments").select("*").order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as DepartmentRow[];
  }
  const db = await getLocalSqliteDb();
  return dbAll<DepartmentRow>(
    db,
    "SELECT id, created_at, updated_at, name, code, sort_order, active FROM departments ORDER BY sort_order, name"
  ).map((r) => ({ ...r, active: Boolean(r.active) }));
}

export async function upsertDepartment(row: Partial<DepartmentRow> & { name: string; code: string }): Promise<string> {
  const id = row.id ?? crypto.randomUUID();
  const now = isoNow();
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const payload: DeptInsert = {
      id,
      name: row.name,
      code: row.code.trim(),
      sort_order: row.sort_order ?? 0,
      active: row.active ?? true,
    };
    const { error } = await supabase.from("departments").upsert(payload);
    if (error) throw new Error(error.message);
    return id;
  }
  const db = await getLocalSqliteDb();
  const exists = dbAll<{ n: number }>(db, "SELECT COUNT(*) AS n FROM departments WHERE id = ?", [id])[0]?.n;
  if (exists) {
    dbRun(db, "UPDATE departments SET name = ?, code = ?, sort_order = ?, active = ?, updated_at = ? WHERE id = ?", [
      row.name,
      row.code.trim(),
      row.sort_order ?? 0,
      row.active === false ? 0 : 1,
      now,
      id,
    ]);
  } else {
    dbRun(
      db,
      `INSERT INTO departments (id, created_at, updated_at, name, code, sort_order, active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, now, now, row.name, row.code.trim(), row.sort_order ?? 0, row.active === false ? 0 : 1]
    );
  }
  return id;
}

export async function deleteDepartment(id: string): Promise<void> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  const db = await getLocalSqliteDb();
  dbRun(db, "DELETE FROM departments WHERE id = ?", [id]);
}

export async function fetchReaders(): Promise<AccessReaderRow[]> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("access_readers").select("*").order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as AccessReaderRow[];
  }
  const db = await getLocalSqliteDb();
  return dbAll<AccessReaderRow>(
    db,
    "SELECT id, created_at, name, reader_key, kind, department_id FROM access_readers ORDER BY name"
  );
}

export async function upsertReader(
  row: Partial<AccessReaderRow> & { name: string; reader_key: string; kind: ReaderKind }
): Promise<string> {
  const id = row.id ?? crypto.randomUUID();
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const payload = {
      id,
      name: row.name,
      reader_key: row.reader_key.trim(),
      kind: row.kind,
      department_id: row.kind === "department" ? row.department_id ?? null : null,
    };
    const { error } = await supabase.from("access_readers").upsert(payload);
    if (error) throw new Error(error.message);
    return id;
  }
  const db = await getLocalSqliteDb();
  const now = isoNow();
  const exists = dbAll<{ n: number }>(db, "SELECT COUNT(*) AS n FROM access_readers WHERE id = ?", [id])[0]?.n;
  const deptId = row.kind === "department" ? row.department_id ?? null : null;
  if (exists) {
    dbRun(db, "UPDATE access_readers SET name = ?, reader_key = ?, kind = ?, department_id = ? WHERE id = ?", [
      row.name,
      row.reader_key.trim(),
      row.kind,
      deptId,
      id,
    ]);
  } else {
    dbRun(
      db,
      `INSERT INTO access_readers (id, created_at, name, reader_key, kind, department_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, now, row.name, row.reader_key.trim(), row.kind, deptId]
    );
  }
  return id;
}

export async function deleteReader(id: string): Promise<void> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { error } = await supabase.from("access_readers").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  const db = await getLocalSqliteDb();
  dbRun(db, "DELETE FROM access_readers WHERE id = ?", [id]);
}

export async function fetchWorkforceEmployees(): Promise<WorkforceEmployeeRow[]> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("workforce_employees").select("*").order("full_name");
    if (error) throw new Error(error.message);
    return (data ?? []) as WorkforceEmployeeRow[];
  }
  const db = await getLocalSqliteDb();
  return dbAll<WorkforceEmployeeRow>(
    db,
    `SELECT id, created_at, updated_at, full_name, employee_number, rfid_uid, profile_id,
            primary_department_id, phone, email, active FROM workforce_employees ORDER BY full_name`
  ).map((r) => ({ ...r, active: Boolean(r.active) }));
}

export async function fetchWorkforceEmployee(id: string): Promise<WorkforceEmployeeRow | null> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("workforce_employees").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as WorkforceEmployeeRow) ?? null;
  }
  const db = await getLocalSqliteDb();
  const rows = dbAll<WorkforceEmployeeRow>(
    db,
    `SELECT id, created_at, updated_at, full_name, employee_number, rfid_uid, profile_id,
            primary_department_id, phone, email, active FROM workforce_employees WHERE id = ?`,
    [id]
  );
  const r = rows[0];
  return r ? { ...r, active: Boolean(r.active) } : null;
}

export async function fetchWorkforceEmployeeByProfile(profileId: string): Promise<WorkforceEmployeeRow | null> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("workforce_employees")
      .select("*")
      .eq("profile_id", profileId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as WorkforceEmployeeRow) ?? null;
  }
  const db = await getLocalSqliteDb();
  const rows = dbAll<WorkforceEmployeeRow>(
    db,
    `SELECT id, created_at, updated_at, full_name, employee_number, rfid_uid, profile_id,
            primary_department_id, phone, email, active FROM workforce_employees WHERE profile_id = ?`,
    [profileId]
  );
  const r = rows[0];
  return r ? { ...r, active: Boolean(r.active) } : null;
}

export async function upsertWorkforceEmployee(
  row: Partial<WorkforceEmployeeRow> & { full_name: string; rfid_uid: string }
): Promise<string> {
  const id = row.id ?? crypto.randomUUID();
  const now = isoNow();
  const rfid = row.rfid_uid.trim().toLowerCase();
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const payload = {
      id,
      full_name: row.full_name,
      employee_number: row.employee_number ?? null,
      rfid_uid: rfid,
      profile_id: row.profile_id ?? null,
      primary_department_id: row.primary_department_id ?? null,
      phone: row.phone ?? null,
      email: row.email ?? null,
      active: row.active ?? true,
    };
    const { error } = await supabase.from("workforce_employees").upsert(payload);
    if (error) throw new Error(error.message);
    return id;
  }
  const db = await getLocalSqliteDb();
  const exists = dbAll<{ n: number }>(db, "SELECT COUNT(*) AS n FROM workforce_employees WHERE id = ?", [id])[0]?.n;
  if (exists) {
    dbRun(
      db,
      `UPDATE workforce_employees SET full_name = ?, employee_number = ?, rfid_uid = ?, profile_id = ?,
       primary_department_id = ?, phone = ?, email = ?, active = ?, updated_at = ? WHERE id = ?`,
      [
        row.full_name,
        row.employee_number ?? null,
        rfid,
        row.profile_id ?? null,
        row.primary_department_id ?? null,
        row.phone ?? null,
        row.email ?? null,
        row.active === false ? 0 : 1,
        now,
        id,
      ]
    );
  } else {
    dbRun(
      db,
      `INSERT INTO workforce_employees (id, created_at, updated_at, full_name, employee_number, rfid_uid,
        profile_id, primary_department_id, phone, email, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        now,
        now,
        row.full_name,
        row.employee_number ?? null,
        rfid,
        row.profile_id ?? null,
        row.primary_department_id ?? null,
        row.phone ?? null,
        row.email ?? null,
        row.active === false ? 0 : 1,
      ]
    );
  }
  return id;
}

export async function deleteWorkforceEmployee(id: string): Promise<void> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { error } = await supabase.from("workforce_employees").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  const db = await getLocalSqliteDb();
  dbRun(db, "DELETE FROM workforce_employees WHERE id = ?", [id]);
}

export async function fetchAccessEventsJoined(
  filters: { employeeId?: string; from?: string; to?: string; limit?: number } = {}
): Promise<AccessEventRow[]> {
  const limit = Math.min(filters.limit ?? 500, 2000);
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    let q = supabase
      .from("access_events")
      .select("id, occurred_at, workforce_employee_id, reader_id, rfid_raw, device_meta")
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (filters.employeeId) q = q.eq("workforce_employee_id", filters.employeeId);
    if (filters.from) q = q.gte("occurred_at", filters.from);
    if (filters.to) q = q.lte("occurred_at", filters.to);
    const { data: events, error } = await q;
    if (error) throw new Error(error.message);
    const evs = (events ?? []) as AccessEventRow[];
    const readerIds = [...new Set(evs.map((e) => e.reader_id))];
    if (readerIds.length === 0) return evs;
    const { data: readers, error: e2 } = await supabase
      .from("access_readers")
      .select("id, name, kind, department_id")
      .in("id", readerIds);
    if (e2) throw new Error(e2.message);
    const rm = new Map((readers ?? []).map((r) => [r.id, r as AccessReaderRow]));
    return evs.map((e) => {
      const r = rm.get(e.reader_id);
      return {
        ...e,
        reader_name: r?.name,
        reader_kind: r?.kind,
        department_id: r?.department_id ?? null,
      };
    });
  }
  const db = await getLocalSqliteDb();
  let sql = `SELECT ae.id, ae.occurred_at, ae.workforce_employee_id, ae.reader_id, ae.rfid_raw, ae.device_meta,
    ar.name AS reader_name, ar.kind AS reader_kind, ar.department_id AS department_id
    FROM access_events ae JOIN access_readers ar ON ar.id = ae.reader_id WHERE 1=1`;
  const params: SqlValue[] = [];
  if (filters.employeeId) {
    sql += " AND ae.workforce_employee_id = ?";
    params.push(filters.employeeId);
  }
  if (filters.from) {
    sql += " AND ae.occurred_at >= ?";
    params.push(filters.from);
  }
  if (filters.to) {
    sql += " AND ae.occurred_at <= ?";
    params.push(filters.to);
  }
  sql += " ORDER BY ae.occurred_at DESC, ae.id DESC LIMIT ?";
  params.push(limit);
  const rows = dbAll<
    AccessEventRow & { reader_name: string; reader_kind: ReaderKind; department_id: string | null }
  >(db, sql, params);
  return rows.map((r) => ({
    ...r,
    device_meta: r.device_meta ? (JSON.parse(String(r.device_meta)) as Json) : null,
  }));
}

export async function fetchSegmentsJoined(
  filters: { employeeId?: string; from?: string; to?: string } = {}
): Promise<DepartmentSegmentRow[]> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    let q = supabase
      .from("department_time_segments")
      .select("id, workforce_employee_id, department_id, started_at, ended_at, started_event_id, ended_event_id")
      .order("started_at", { ascending: false });
    if (filters.employeeId) q = q.eq("workforce_employee_id", filters.employeeId);
    if (filters.from) q = q.gte("started_at", filters.from);
    if (filters.to) q = q.lte("started_at", filters.to);
    const { data: segments, error } = await q;
    if (error) throw new Error(error.message);
    const segs = (segments ?? []) as DepartmentSegmentRow[];
    const deptIds = [...new Set(segs.map((s) => s.department_id))];
    if (deptIds.length === 0) return segs;
    const { data: depts, error: e2 } = await supabase.from("departments").select("id, name").in("id", deptIds);
    if (e2) throw new Error(e2.message);
    const dm = new Map((depts ?? []).map((d) => [d.id, d.name as string]));
    return segs.map((s) => ({ ...s, department_name: dm.get(s.department_id) }));
  }
  const db = await getLocalSqliteDb();
  let sql = `SELECT s.id, s.workforce_employee_id, s.department_id, s.started_at, s.ended_at,
    s.started_event_id, s.ended_event_id, d.name AS department_name
    FROM department_time_segments s
    JOIN departments d ON d.id = s.department_id WHERE 1=1`;
  const params: SqlValue[] = [];
  if (filters.employeeId) {
    sql += " AND s.workforce_employee_id = ?";
    params.push(filters.employeeId);
  }
  if (filters.from) {
    sql += " AND s.started_at >= ?";
    params.push(filters.from);
  }
  if (filters.to) {
    sql += " AND s.started_at <= ?";
    params.push(filters.to);
  }
  sql += " ORDER BY s.started_at DESC";
  return dbAll<DepartmentSegmentRow>(db, sql, params);
}

export async function fetchLostTime(
  filters: { employeeId?: string; from?: string; to?: string } = {}
): Promise<LostTimeRow[]> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    let q = supabase.from("lost_time_incidents").select("*").order("returned_at", { ascending: false });
    if (filters.employeeId) q = q.eq("workforce_employee_id", filters.employeeId);
    if (filters.from) q = q.gte("returned_at", filters.from);
    if (filters.to) q = q.lte("returned_at", filters.to);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as LostTimeRow[];
  }
  const db = await getLocalSqliteDb();
  let sql = "SELECT * FROM lost_time_incidents WHERE 1=1";
  const params: SqlValue[] = [];
  if (filters.employeeId) {
    sql += " AND workforce_employee_id = ?";
    params.push(filters.employeeId);
  }
  if (filters.from) {
    sql += " AND returned_at >= ?";
    params.push(filters.from);
  }
  if (filters.to) {
    sql += " AND returned_at <= ?";
    params.push(filters.to);
  }
  sql += " ORDER BY returned_at DESC";
  return dbAll<LostTimeRow>(db, sql, params);
}

export async function fetchOpenDepartmentSegment(employeeId: string): Promise<DepartmentSegmentRow | null> {
  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("department_time_segments")
      .select("id, workforce_employee_id, department_id, started_at, ended_at, started_event_id, ended_event_id")
      .eq("workforce_employee_id", employeeId)
      .is("ended_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const row = data as DepartmentSegmentRow;
    const { data: d } = await supabase.from("departments").select("name").eq("id", row.department_id).maybeSingle();
    return { ...row, department_name: d?.name ?? undefined };
  }
  const db = await getLocalSqliteDb();
  const rows = dbAll<DepartmentSegmentRow & { department_name?: string }>(
    db,
    `SELECT s.id, s.workforce_employee_id, s.department_id, s.started_at, s.ended_at,
            s.started_event_id, s.ended_event_id, d.name AS department_name
     FROM department_time_segments s
     JOIN departments d ON d.id = s.department_id
     WHERE s.workforce_employee_id = ? AND s.ended_at IS NULL LIMIT 1`,
    [employeeId]
  );
  return rows[0] ?? null;
}

/** Derive live presence from latest facility + optional open segment. */
export async function fetchLivePresence(): Promise<LivePresenceRow[]> {
  const employees = (await fetchWorkforceEmployees()).filter((e) => e.active);
  const out: LivePresenceRow[] = [];

  for (const emp of employees) {
    const events = await fetchAccessEventsJoined({ employeeId: emp.id, limit: 60 });
    let on_site = false;
    const facilityEvents = events
      .filter((e) => e.reader_kind === "facility_in" || e.reader_kind === "facility_out")
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at) || b.id.localeCompare(a.id));
    if (facilityEvents[0]) {
      const lastFacility = facilityEvents[0].reader_kind ?? null;
      on_site = lastFacility === "facility_in";
    }

    const open = await fetchOpenDepartmentSegment(emp.id);

    out.push({
      employee: emp,
      on_site,
      current_department_id: open?.department_id ?? null,
      current_department_name: open?.department_name ?? null,
      segment_started_at: open?.started_at ?? null,
      last_event_at: events[0]?.occurred_at ?? null,
    });
  }

  return out;
}

export type WorkforceDashboardSummary = {
  activeEmployees: number;
  onSiteNow: number;
  departmentReaders: number;
  lostIncidents7d: number;
  lostMinutes7d: number;
};

/** Compact stats for the main CRM dashboard (managers only — may throw on RLS for other roles). */
export async function fetchWorkforceDashboardSummary(): Promise<WorkforceDashboardSummary> {
  const fromIso = new Date(Date.now() - 7 * 86400000).toISOString();
  const [employees, presence, lost, readers] = await Promise.all([
    fetchWorkforceEmployees(),
    fetchLivePresence(),
    fetchLostTime({ from: fromIso }),
    fetchReaders(),
  ]);
  const activeEmployees = employees.filter((e) => e.active).length;
  const onSiteNow = presence.filter((p) => p.on_site).length;
  const departmentReaders = readers.filter((r) => r.kind === "department").length;
  const lostIncidents7d = lost.length;
  const lostMinutes7d = lost.reduce((a, x) => a + x.minutes_lost, 0);
  return {
    activeEmployees,
    onSiteNow,
    departmentReaders,
    lostIncidents7d,
    lostMinutes7d,
  };
}

/** Minutes spent per department from closed + open segments overlapping [from, to]. */
export function departmentMinutesInRange(
  segments: DepartmentSegmentRow[],
  fromIso: string,
  toIso: string
): Map<string, { name: string; minutes: number }> {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  const map = new Map<string, { name: string; minutes: number }>();

  for (const s of segments) {
    const start = new Date(s.started_at).getTime();
    const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
    const a = Math.max(start, from);
    const b = Math.min(end, to);
    if (b <= a) continue;
    const mins = Math.round((b - a) / 60000);
    const key = s.department_id;
    const name = s.department_name ?? key;
    const prev = map.get(key) ?? { name, minutes: 0 };
    prev.minutes += mins;
    map.set(key, prev);
  }
  return map;
}

/** Approximate on-site minutes from facility in/out events in range. */
export function facilityMinutesFromEvents(events: AccessEventRow[], fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  const list = events
    .filter((e) => e.reader_kind === "facility_in" || e.reader_kind === "facility_out")
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at) || a.id.localeCompare(b.id));

  let total = 0;
  let openIn: number | null = null;

  for (const e of list) {
    const t = new Date(e.occurred_at).getTime();
    if (t < from || t > to) {
      /* still track state for spans crossing range */
    }
    if (e.reader_kind === "facility_in") {
      if (openIn == null) openIn = t;
    } else if (e.reader_kind === "facility_out" && openIn != null) {
      const a = Math.max(openIn, from);
      const b = Math.min(t, to);
      if (b > a) total += Math.round((b - a) / 60000);
      openIn = null;
    }
  }

  if (openIn != null) {
    const a = Math.max(openIn, from);
    const b = Math.min(Date.now(), to);
    if (b > a) total += Math.round((b - a) / 60000);
  }

  return total;
}

export function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const esc = (c: string) => `"${c.replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
