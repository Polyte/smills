import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useCrmAuth } from "../CrmAuthContext";
import { isCrmDataAvailable } from "../../../lib/crm/mode";
import {
  fetchWorkforceEmployee,
  fetchAccessEventsJoined,
  fetchSegmentsJoined,
  fetchLostTime,
  fetchOpenDepartmentSegment,
  fetchDepartments,
  fetchReaders,
  workforceIngestScan,
  formatMinutes,
  type WorkforceEmployeeRow,
  type AccessEventRow,
  type DepartmentSegmentRow,
  type LostTimeRow,
  type AccessReaderRow,
} from "../../../lib/crm/workforceRepo";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
function elapsedLabel(startedAt: string | null): string {
  if (!startedAt) return "—";
  const ms = Date.now() - new Date(startedAt).getTime();
  if (ms < 0) return "—";
  return formatMinutes(Math.floor(ms / 60000));
}

export function WorkforceEmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useCrmAuth();
  const isManager = profile?.role === "manager";
  const [emp, setEmp] = useState<WorkforceEmployeeRow | null>(null);
  const [events, setEvents] = useState<AccessEventRow[]>([]);
  const [segments, setSegments] = useState<DepartmentSegmentRow[]>([]);
  const [lost, setLost] = useState<LostTimeRow[]>([]);
  const [openSeg, setOpenSeg] = useState<DepartmentSegmentRow | null>(null);
  const [readers, setReaders] = useState<AccessReaderRow[]>([]);
  const [deptNames, setDeptNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [simReader, setSimReader] = useState("");
  const [simBusy, setSimBusy] = useState(false);

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const row = await fetchWorkforceEmployee(id);
      setEmp(row);
      if (!row) return;
      const [ev, seg, lt, open, rlist, depts] = await Promise.all([
        fetchAccessEventsJoined({ employeeId: id, limit: 100 }),
        fetchSegmentsJoined({ employeeId: id }),
        fetchLostTime({ employeeId: id }),
        fetchOpenDepartmentSegment(id),
        fetchReaders(),
        fetchDepartments(),
      ]);
      setEvents(ev);
      setSegments(seg.slice(0, 50));
      setLost(lt.slice(0, 50));
      setOpenSeg(open);
      setReaders(rlist);
      setDeptNames(Object.fromEntries(depts.map((d) => [d.id, d.name])));
      if (rlist.length) {
        setSimReader((prev) => (prev ? prev : rlist[0].reader_key));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 30000);
    return () => window.clearInterval(t);
  }, []);

  const runSimulate = async () => {
    if (!emp || !simReader.trim()) {
      toast.error("Choose a reader");
      return;
    }
    if (!isManager) {
      toast.error("Only managers can simulate scans");
      return;
    }
    setSimBusy(true);
    try {
      const res = await workforceIngestScan(simReader.trim(), emp.rfid_uid, {});
      if (!res.ok) {
        toast.error(res.error ?? "Scan failed");
        return;
      }
      toast.success(`Scan recorded (${res.reader_kind ?? "ok"})`);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setSimBusy(false);
    }
  };

  if (!id) return null;

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!emp) {
    return (
      <p className="text-sm text-muted-foreground">
        Employee not found.{" "}
        <Link to="/crm/workforce/employees" className="text-primary underline">
          Back to list
        </Link>
      </p>
    );
  }

  const facilityEvents = events.filter((e) => e.reader_kind === "facility_in" || e.reader_kind === "facility_out");
  const lastFac = facilityEvents.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0];
  const onSite = lastFac?.reader_kind === "facility_in";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="sm" asChild>
          <Link to="/crm/workforce/employees">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Employees
          </Link>
        </Button>
        <h2 className="text-xl font-semibold">{emp.full_name}</h2>
        {emp.active ? <Badge variant="outline">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
        {onSite ? <Badge className="bg-emerald-600">On site</Badge> : <Badge variant="secondary">Off site</Badge>}
      </div>

      <div className="grid gap-2 text-sm max-w-xl">
        <p>
          <span className="text-muted-foreground">RFID UID:</span>{" "}
          <code className="bg-muted px-1 rounded">{emp.rfid_uid}</code>
        </p>
        {emp.employee_number && (
          <p>
            <span className="text-muted-foreground">Employee #:</span> {emp.employee_number}
          </p>
        )}
        {(emp.phone || emp.email) && (
          <p className="text-muted-foreground">
            {[emp.phone, emp.email].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {openSeg && onSite && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          <span className="font-medium">Current department:</span>{" "}
          {openSeg.department_name ?? deptNames[openSeg.department_id] ?? openSeg.department_id} —{" "}
          <span className="tabular-nums">{elapsedLabel(openSeg.started_at)}</span> elapsed
          <span className="sr-only">{tick}</span>
        </div>
      )}

      {isManager && (
        <section className="rounded-lg border border-border p-4 space-y-3 max-w-lg">
          <h3 className="text-sm font-medium">Simulate RFID scan</h3>
          <p className="text-xs text-muted-foreground">
            Records the same event as an Arduino reader (local SQLite or Supabase as manager). Use the employee&apos;s
            RFID UID with a configured reader key.
          </p>
          <div className="grid gap-2">
            <Label>Reader</Label>
            <Select value={simReader} onValueChange={setSimReader}>
              <SelectTrigger>
                <SelectValue placeholder="Select reader" />
              </SelectTrigger>
              <SelectContent>
                {readers.map((r) => (
                  <SelectItem key={r.id} value={r.reader_key}>
                    {r.name} ({r.kind})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" size="sm" onClick={() => void runSimulate()} disabled={simBusy || readers.length === 0}>
            {simBusy ? "Recording…" : "Record scan"}
          </Button>
        </section>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Recent access events</h3>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Reader</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground text-sm">
                    No events.
                  </TableCell>
                </TableRow>
              ) : (
                events.slice(0, 40).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm whitespace-nowrap">{new Date(e.occurred_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{e.reader_name ?? e.reader_id}</TableCell>
                    <TableCell className="text-sm capitalize">{e.reader_kind?.replace("_", " ")}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Department time segments</h3>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground text-sm">
                    No segments.
                  </TableCell>
                </TableRow>
              ) : (
                segments.map((s) => {
                  const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
                  const start = new Date(s.started_at).getTime();
                  const mins = Math.max(0, Math.round((end - start) / 60000));
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">{s.department_name ?? deptNames[s.department_id] ?? s.department_id}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{new Date(s.started_at).toLocaleString()}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {s.ended_at ? new Date(s.ended_at).toLocaleString() : <Badge variant="outline">Open</Badge>}
                      </TableCell>
                      <TableCell className="tabular-nums">{formatMinutes(mins)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Lost time (15+ minutes outside facility)</h3>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Left</TableHead>
                <TableHead>Returned</TableHead>
                <TableHead>Minutes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lost.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground text-sm">
                    None.
                  </TableCell>
                </TableRow>
              ) : (
                lost.map((l) => (
                  <TableRow key={l.id}>
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
