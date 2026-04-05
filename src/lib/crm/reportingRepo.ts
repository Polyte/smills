/**
 * Date-scoped aggregates for the unified CRM Reports page (Supabase + local SQLite).
 */
import type { Database as SqlJsDatabase } from "sql.js";
import { getSupabase } from "../supabaseClient";
import { crmUsesSupabase } from "./crmRepo";
import { getLocalSqliteDb, dbAll } from "./sqlite/engine";
import type { InvProductSalesTimeFilter, InvProductSalesResolvedWindow } from "./inventoryRepo";
import { resolveInvProductSalesWindow } from "./inventoryRepo";
import { defectRateInRange, listSalesOrders, type SalesOrderRow } from "./factoryRepo";
import {
  fetchAccessEventsJoined,
  fetchLostTime,
  fetchSegmentsJoined,
  fetchWorkforceEmployees,
  facilityMinutesFromEvents,
  type AccessEventRow,
  type DepartmentSegmentRow,
  type LostTimeRow,
  type WorkforceEmployeeRow,
} from "./workforceRepo";

export type ReportingBounds = {
  /** Half-open [from, until) for movement/ledger-style queries */
  fromInclusiveIso: string;
  untilExclusiveIso: string;
  /** Inclusive upper bound for APIs that use `lte` on timestamps */
  toInclusiveIso: string;
  label: string;
  mode: "all" | "range";
};

export function boundsFromInventoryTimeFilter(
  filter: InvProductSalesTimeFilter,
  now = new Date()
): ReportingBounds {
  const w = resolveInvProductSalesWindow(filter, now);
  if (w.mode === "all") {
    const until = new Date(now);
    until.setUTCHours(23, 59, 59, 999);
    return {
      mode: "all",
      label: w.label,
      fromInclusiveIso: "1970-01-01T00:00:00.000Z",
      untilExclusiveIso: new Date(now.getTime() + 86400000).toISOString(),
      toInclusiveIso: until.toISOString(),
    };
  }
  const untilExclusiveIso = w.untilExclusive.toISOString();
  const toInclusiveIso = new Date(w.untilExclusive.getTime() - 1).toISOString();
  return {
    mode: "range",
    label: w.label,
    fromInclusiveIso: w.fromInclusive.toISOString(),
    untilExclusiveIso,
    toInclusiveIso,
  };
}

export type CrmPeriodSummaryRow = {
  newContacts: number;
  newDeals: number;
  activitiesInPeriod: number;
  tasksCreatedInPeriod: number;
  quoteRequestsInPeriod: number;
  quotesInPeriod: number;
  quotesTotalZar: number;
  invoicesInPeriod: number;
  invoicesTotalZar: number;
};

function resolvedWindowToHalfOpen(w: InvProductSalesResolvedWindow): {
  all: boolean;
  from?: string;
  until?: string;
} {
  if (w.mode === "all") return { all: true };
  return {
    all: false,
    from: w.fromInclusive.toISOString(),
    until: w.untilExclusive.toISOString(),
  };
}

function sqliteCountPeriod(
  db: SqlJsDatabase,
  table: string,
  timeCol: string,
  bounds: { all: boolean; from?: string; until?: string }
): number {
  if (bounds.all) {
    const r = dbAll<{ n: number }>(db, `SELECT COUNT(*) AS n FROM ${table}`);
    return Number(r[0]?.n ?? 0);
  }
  const r = dbAll<{ n: number }>(
    db,
    `SELECT COUNT(*) AS n FROM ${table}
     WHERE datetime(${timeCol}) >= datetime(?) AND datetime(${timeCol}) < datetime(?)`,
    [bounds.from!, bounds.until!]
  );
  return Number(r[0]?.n ?? 0);
}

export async function fetchCrmPeriodSummary(
  filter: InvProductSalesTimeFilter,
  now = new Date()
): Promise<CrmPeriodSummaryRow> {
  const w = resolveInvProductSalesWindow(filter, now);
  const bounds = resolvedWindowToHalfOpen(w);

  if (crmUsesSupabase()) {
    const supabase = getSupabase();
    function countInPeriod(table: string, timeCol: string) {
      let q = supabase.from(table).select("id", { count: "exact", head: true });
      if (!bounds.all) q = q.gte(timeCol, bounds.from!).lt(timeCol, bounds.until!);
      return q;
    }
    function selectZarInPeriod(table: string) {
      let q = supabase.from(table).select("total_zar");
      if (!bounds.all) q = q.gte("created_at", bounds.from!).lt("created_at", bounds.until!);
      return q;
    }

    const [
      contactsRes,
      dealsRes,
      actRes,
      tasksRes,
      qreqRes,
      quotesCountRes,
      invCountRes,
      quotesSumRes,
      invSumRes,
    ] = await Promise.all([
      countInPeriod("contacts", "created_at"),
      countInPeriod("deals", "created_at"),
      countInPeriod("activities", "occurred_at"),
      countInPeriod("tasks", "created_at"),
      countInPeriod("quote_requests", "created_at"),
      countInPeriod("quotes", "created_at"),
      countInPeriod("invoices", "created_at"),
      selectZarInPeriod("quotes"),
      selectZarInPeriod("invoices"),
    ]);

    const err =
      contactsRes.error ||
      dealsRes.error ||
      actRes.error ||
      tasksRes.error ||
      qreqRes.error ||
      quotesCountRes.error ||
      invCountRes.error ||
      quotesSumRes.error ||
      invSumRes.error;
    if (err) throw new Error(err.message);

    const quoteRows = (quotesSumRes.data ?? []) as { total_zar: number | null }[];
    const invRows = (invSumRes.data ?? []) as { total_zar: number | null }[];

    return {
      newContacts: contactsRes.count ?? 0,
      newDeals: dealsRes.count ?? 0,
      activitiesInPeriod: actRes.count ?? 0,
      tasksCreatedInPeriod: tasksRes.count ?? 0,
      quoteRequestsInPeriod: qreqRes.count ?? 0,
      quotesInPeriod: quotesCountRes.count ?? 0,
      quotesTotalZar: quoteRows.reduce((a, r) => a + Number(r.total_zar ?? 0), 0),
      invoicesInPeriod: invCountRes.count ?? 0,
      invoicesTotalZar: invRows.reduce((a, r) => a + Number(r.total_zar ?? 0), 0),
    };
  }

  const db = await getLocalSqliteDb();
  const qsum = bounds.all
    ? dbAll<{ s: number }>(db, "SELECT COALESCE(SUM(total_zar), 0) AS s FROM quotes")
    : dbAll<{ s: number }>(
        db,
        `SELECT COALESCE(SUM(total_zar), 0) AS s FROM quotes
         WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)`,
        [bounds.from!, bounds.until!]
      );
  const inSum = bounds.all
    ? dbAll<{ s: number }>(db, "SELECT COALESCE(SUM(total_zar), 0) AS s FROM invoices")
    : dbAll<{ s: number }>(
        db,
        `SELECT COALESCE(SUM(total_zar), 0) AS s FROM invoices
         WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)`,
        [bounds.from!, bounds.until!]
      );

  return {
    newContacts: sqliteCountPeriod(db, "contacts", "created_at", bounds),
    newDeals: sqliteCountPeriod(db, "deals", "created_at", bounds),
    activitiesInPeriod: sqliteCountPeriod(db, "activities", "occurred_at", bounds),
    tasksCreatedInPeriod: sqliteCountPeriod(db, "tasks", "created_at", bounds),
    quoteRequestsInPeriod: sqliteCountPeriod(db, "quote_requests", "created_at", bounds),
    quotesInPeriod: sqliteCountPeriod(db, "quotes", "created_at", bounds),
    quotesTotalZar: Number(qsum[0]?.s ?? 0),
    invoicesInPeriod: sqliteCountPeriod(db, "invoices", "created_at", bounds),
    invoicesTotalZar: Number(inSum[0]?.s ?? 0),
  };
}

function orderInBounds(o: SalesOrderRow, fromIso: string, untilExclusiveIso: string, mode: "all" | "range"): boolean {
  if (mode === "all") return true;
  const t = new Date(o.created_at).getTime();
  return t >= new Date(fromIso).getTime() && t < new Date(untilExclusiveIso).getTime();
}

export type SalesOrdersReport = {
  ordersInPeriod: SalesOrderRow[];
  statusCounts: Record<string, number>;
  openBacklog: number;
};

export async function fetchSalesOrdersReport(filter: InvProductSalesTimeFilter, now = new Date()): Promise<SalesOrdersReport> {
  const b = boundsFromInventoryTimeFilter(filter, now);
  const all = await listSalesOrders();
  const ordersInPeriod = all.filter((o) => orderInBounds(o, b.fromInclusiveIso, b.untilExclusiveIso, b.mode));
  const statusCounts: Record<string, number> = {};
  for (const o of ordersInPeriod) {
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
  }
  const openBacklog = all.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;
  return { ordersInPeriod, statusCounts, openBacklog };
}

export type QcPeriodSummary = Awaited<ReturnType<typeof defectRateInRange>>;

export async function fetchQcPeriodSummary(bounds: ReportingBounds): Promise<QcPeriodSummary> {
  return defectRateInRange(bounds.fromInclusiveIso, bounds.toInclusiveIso);
}

export type WorkforceReportSummary = {
  employees: WorkforceEmployeeRow[];
  events: AccessEventRow[];
  segments: DepartmentSegmentRow[];
  lost: LostTimeRow[];
  totalFacilityMinutesApprox: number;
  totalLostMinutes: number;
  distinctEmployeesWithEvents: number;
};

export async function fetchWorkforceReportSummary(bounds: ReportingBounds): Promise<WorkforceReportSummary> {
  const employees = (await fetchWorkforceEmployees()).filter((e) => e.active);
  const [events, segments, lost] = await Promise.all([
    fetchAccessEventsJoined({
      from: bounds.fromInclusiveIso,
      to: bounds.toInclusiveIso,
      limit: 2000,
    }),
    fetchSegmentsJoined({
      from: bounds.fromInclusiveIso,
      to: bounds.toInclusiveIso,
    }),
    fetchLostTime({
      from: bounds.fromInclusiveIso,
      to: bounds.toInclusiveIso,
    }),
  ]);

  let totalFacilityMinutesApprox = 0;
  const seen = new Set<string>();
  for (const emp of employees) {
    const ev = events.filter((e) => e.workforce_employee_id === emp.id);
    if (ev.length) seen.add(emp.id);
    totalFacilityMinutesApprox += facilityMinutesFromEvents(ev, bounds.fromInclusiveIso, bounds.toInclusiveIso);
  }
  const totalLostMinutes = lost.reduce((a, x) => a + x.minutes_lost, 0);

  return {
    employees,
    events,
    segments,
    lost,
    totalFacilityMinutesApprox,
    totalLostMinutes,
    distinctEmployeesWithEvents: seen.size,
  };
}

/** Safe fragment for CSV / download filenames */
export function reportingFilenameSlug(label: string): string {
  return label
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .slice(0, 48) || "report";
}
