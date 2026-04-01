import { useCallback, useEffect, useMemo, useState } from "react";
import { useCrmAuth } from "../CrmAuthContext";
import { isCrmDataAvailable } from "../../../lib/crm/mode";
import {
  fetchWorkforceEmployees,
  fetchAccessEventsJoined,
  fetchSegmentsJoined,
  fetchLostTime,
  departmentMinutesInRange,
  facilityMinutesFromEvents,
  formatMinutes,
  downloadCsv,
  type WorkforceEmployeeRow,
  type AccessEventRow,
  type DepartmentSegmentRow,
  type LostTimeRow,
} from "../../../lib/crm/workforceRepo";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { toast } from "sonner";
import { Download } from "lucide-react";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Long open segment or multiple outs without in — informational flags */
function anomaliesForEmployee(events: AccessEventRow[]): string[] {
  const flags: string[] = [];
  const fac = events
    .filter((e) => e.reader_kind === "facility_in" || e.reader_kind === "facility_out")
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
  let ins = 0;
  let outs = 0;
  for (const e of fac) {
    if (e.reader_kind === "facility_in") ins += 1;
    else outs += 1;
  }
  if (outs > ins + 1) flags.push("More facility exits than entries in window (check sequence)");
  const openDept = events.some((e) => e.reader_kind === "department");
  if (!openDept && fac.length > 0 && fac[fac.length - 1]?.reader_kind === "facility_in") {
    flags.push("On site in window but no department scans recorded");
  }
  return flags;
}

export function WorkforceReportsPage() {
  const { user } = useCrmAuth();
  const [employees, setEmployees] = useState<WorkforceEmployeeRow[]>([]);
  const [empFilter, setEmpFilter] = useState<string>("__all__");
  const [fromStr, setFromStr] = useState(() => startOfDay(new Date(Date.now() - 7 * 86400000)).toISOString().slice(0, 10));
  const [toStr, setToStr] = useState(() => endOfDay(new Date()).toISOString().slice(0, 10));
  const [events, setEvents] = useState<AccessEventRow[]>([]);
  const [segments, setSegments] = useState<DepartmentSegmentRow[]>([]);
  const [lost, setLost] = useState<LostTimeRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fromIso = useMemo(() => startOfDay(new Date(fromStr + "T12:00:00")).toISOString(), [fromStr]);
  const toIso = useMemo(() => endOfDay(new Date(toStr + "T12:00:00")).toISOString(), [toStr]);

  const loadEmployees = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) return;
    try {
      const list = await fetchWorkforceEmployees();
      setEmployees(list.filter((e) => e.active));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    }
  }, [user]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const runReport = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) return;
    setLoading(true);
    try {
      const empId = empFilter === "__all__" ? undefined : empFilter;
      const [ev, seg, lt] = await Promise.all([
        fetchAccessEventsJoined({
          employeeId: empId,
          from: fromIso,
          to: toIso,
          limit: 5000,
        }),
        fetchSegmentsJoined({
          employeeId: empId,
          from: fromIso,
          to: toIso,
        }),
        fetchLostTime({
          employeeId: empId,
          from: fromIso,
          to: toIso,
        }),
      ]);
      setEvents(ev);
      setSegments(seg);
      setLost(lt);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Report failed");
    } finally {
      setLoading(false);
    }
  }, [user, empFilter, fromIso, toIso]);

  useEffect(() => {
    void runReport();
  }, [runReport]);

  const byEmployee = useMemo(() => {
    const map = new Map<string, { emp: WorkforceEmployeeRow; events: AccessEventRow[]; segments: DepartmentSegmentRow[]; lost: LostTimeRow[] }>();
    for (const e of employees) {
      if (empFilter !== "__all__" && e.id !== empFilter) continue;
      map.set(e.id, { emp: e, events: [], segments: [], lost: [] });
    }
    for (const ev of events) {
      const bucket = map.get(ev.workforce_employee_id);
      if (bucket) bucket.events.push(ev);
    }
    for (const s of segments) {
      const bucket = map.get(s.workforce_employee_id);
      if (bucket) bucket.segments.push(s);
    }
    for (const l of lost) {
      const bucket = map.get(l.workforce_employee_id);
      if (bucket) bucket.lost.push(l);
    }
    return [...map.values()];
  }, [employees, events, segments, lost, empFilter]);

  const exportSummaryCsv = () => {
    const headers = ["Employee", "On-site (approx min)", "Lost incidents", "Lost minutes total", "Anomalies"];
    const rows: string[][] = [];
    for (const { emp, events: ev, segments: seg, lost: lt } of byEmployee) {
      const facMin = facilityMinutesFromEvents(ev, fromIso, toIso);
      const lostMins = lt.reduce((a, x) => a + x.minutes_lost, 0);
      rows.push([
        emp.full_name,
        String(facMin),
        String(lt.length),
        String(lostMins),
        anomaliesForEmployee(ev).join("; "),
      ]);
    }
    downloadCsv(`workforce-summary-${fromStr}_${toStr}.csv`, headers, rows);
  };

  const exportDeptCsv = () => {
    const headers = ["Employee", "Department", "Minutes in range"];
    const rows: string[][] = [];
    for (const { emp, segments: seg } of byEmployee) {
      const dm = departmentMinutesInRange(seg, fromIso, toIso);
      for (const [, v] of dm) {
        rows.push([emp.full_name, v.name, String(v.minutes)]);
      }
    }
    downloadCsv(`workforce-departments-${fromStr}_${toStr}.csv`, headers, rows);
  };

  const exportLostCsv = () => {
    const headers = ["Employee", "Left at", "Returned", "Minutes lost"];
    const rows: string[][] = [];
    for (const l of lost) {
      const name = employees.find((e) => e.id === l.workforce_employee_id)?.full_name ?? l.workforce_employee_id;
      rows.push([name, l.left_at, l.returned_at, String(l.minutes_lost)]);
    }
    downloadCsv(`workforce-lost-time-${fromStr}_${toStr}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="grid gap-2">
          <Label>From</Label>
          <input
            type="date"
            className="border border-input rounded-md px-3 py-2 text-sm bg-background"
            value={fromStr}
            onChange={(e) => setFromStr(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>To</Label>
          <input
            type="date"
            className="border border-input rounded-md px-3 py-2 text-sm bg-background"
            value={toStr}
            onChange={(e) => setToStr(e.target.value)}
          />
        </div>
        <div className="grid gap-2 min-w-[200px]">
          <Label>Employee</Label>
          <Select value={empFilter} onValueChange={setEmpFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All employees</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="secondary" onClick={() => void runReport()} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={exportSummaryCsv}>
          <Download className="h-4 w-4 mr-2" />
          CSV summary
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={exportDeptCsv}>
          <Download className="h-4 w-4 mr-2" />
          CSV by department
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={exportLostCsv}>
          <Download className="h-4 w-4 mr-2" />
          CSV lost time
        </Button>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Per-employee summary</h3>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>On-site (approx.)</TableHead>
                <TableHead>Lost incidents</TableHead>
                <TableHead>Lost minutes</TableHead>
                <TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byEmployee.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground text-sm">
                    No data. Adjust filters or add employees and scans.
                  </TableCell>
                </TableRow>
              ) : (
                byEmployee.map(({ emp, events: ev, lost: lt }) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.full_name}</TableCell>
                    <TableCell className="tabular-nums">{formatMinutes(facilityMinutesFromEvents(ev, fromIso, toIso))}</TableCell>
                    <TableCell>{lt.length}</TableCell>
                    <TableCell className="tabular-nums">{lt.reduce((a, x) => a + x.minutes_lost, 0)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-md">
                      {anomaliesForEmployee(ev).join(" · ") || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Department minutes (overlap with date range)</h3>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Minutes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byEmployee.flatMap(({ emp, segments: seg }) => {
                const dm = departmentMinutesInRange(seg, fromIso, toIso);
                const entries = [...dm.entries()];
                if (entries.length === 0) {
                  return [
                    <TableRow key={emp.id + "-none"}>
                      <TableCell>{emp.full_name}</TableCell>
                      <TableCell colSpan={2} className="text-muted-foreground text-sm">
                        No department time in range
                      </TableCell>
                    </TableRow>,
                  ];
                }
                return entries.map(([did, v]) => (
                  <TableRow key={`${emp.id}-${did}`}>
                    <TableCell>{emp.full_name}</TableCell>
                    <TableCell>{v.name}</TableCell>
                    <TableCell className="tabular-nums">{formatMinutes(v.minutes)}</TableCell>
                  </TableRow>
                ));
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Lost time detail</h3>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Left</TableHead>
                <TableHead>Returned</TableHead>
                <TableHead>Minutes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lost.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground text-sm">
                    No lost-time incidents in range.
                  </TableCell>
                </TableRow>
              ) : (
                lost.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{employees.find((e) => e.id === l.workforce_employee_id)?.full_name ?? "—"}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{new Date(l.left_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{new Date(l.returned_at).toLocaleString()}</TableCell>
                    <TableCell>{l.minutes_lost}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
