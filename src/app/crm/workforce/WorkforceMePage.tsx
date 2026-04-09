import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { useCrmAuth } from "../CrmAuthContext";
import { isCrmDataAvailable } from "../../../lib/crm/mode";
import {
  fetchWorkforceEmployeeByProfile,
  fetchAccessEventsJoined,
  fetchLostTime,
  fetchOpenDepartmentSegment,
  formatMinutes,
  type WorkforceEmployeeRow,
  type AccessEventRow,
  type DepartmentSegmentRow,
  type LostTimeRow,
} from "../../../lib/crm/workforceRepo";
import { isOpsAdmin } from "../../../lib/crm/roles";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";

function elapsedLabel(startedAt: string | null): string {
  if (!startedAt) return "—";
  const ms = Date.now() - new Date(startedAt).getTime();
  if (ms < 0) return "—";
  return formatMinutes(Math.floor(ms / 60000));
}

export function WorkforceMePage() {
  const { user, profile } = useCrmAuth();
  const [emp, setEmp] = useState<WorkforceEmployeeRow | null>(null);
  const [events, setEvents] = useState<AccessEventRow[]>([]);
  const [lost, setLost] = useState<LostTimeRow[]>([]);
  const [openSeg, setOpenSeg] = useState<DepartmentSegmentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user || !profile) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const row = await fetchWorkforceEmployeeByProfile(profile.id);
      setEmp(row);
      if (row) {
        const [ev, lt, open] = await Promise.all([
          fetchAccessEventsJoined({ employeeId: row.id, limit: 40 }),
          fetchLostTime({ employeeId: row.id }),
          fetchOpenDepartmentSegment(row.id),
        ]);
        setEvents(ev);
        setLost(lt.slice(0, 20));
        setOpenSeg(open);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load");
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 30000);
    return () => window.clearInterval(t);
  }, []);

  if (!user || !profile) return null;

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!emp) {
    return (
      <div className="rounded-lg border border-border p-6 space-y-2 max-w-lg">
        <p className="font-medium">No workforce profile linked</p>
        <p className="text-sm text-muted-foreground">
          Your CRM account is not linked to a workforce record yet. Ask a manager to link your profile on the
          employee detail screen.
        </p>
        {isOpsAdmin(profile.role) && (
          <Link to="/crm/workforce/employees" className="text-sm text-primary underline inline-block pt-2">
            Go to Employees
          </Link>
        )}
      </div>
    );
  }

  const facilityEvents = events.filter((e) => e.reader_kind === "facility_in" || e.reader_kind === "facility_out");
  const lastFac = facilityEvents.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0];
  const onSite = lastFac?.reader_kind === "facility_in";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3 items-center">
        <h2 className="text-lg font-semibold">{emp.full_name}</h2>
        {onSite ? <Badge className="bg-emerald-600">On site</Badge> : <Badge variant="secondary">Off site</Badge>}
        {openSeg && onSite && (
          <span className="text-sm text-muted-foreground">
            {openSeg.department_name ?? "Department"} · {elapsedLabel(openSeg.started_at)} in current department
            <span className="sr-only">{tick}</span>
          </span>
        )}
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Recent scans</h3>
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
                    No events yet.
                  </TableCell>
                </TableRow>
              ) : (
                events.slice(0, 15).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{new Date(e.occurred_at).toLocaleString()}</TableCell>
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
        <h3 className="text-sm font-medium">Lost time (15+ min outside)</h3>
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
                    None recorded.
                  </TableCell>
                </TableRow>
              ) : (
                lost.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm">{new Date(l.left_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{new Date(l.returned_at).toLocaleString()}</TableCell>
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
