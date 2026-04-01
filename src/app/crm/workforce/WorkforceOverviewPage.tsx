import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router";
import { useCrmAuth } from "../CrmAuthContext";
import { isCrmDataAvailable } from "../../../lib/crm/mode";
import { fetchLivePresence, formatMinutes, type LivePresenceRow } from "../../../lib/crm/workforceRepo";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { RefreshCw, Users, Building2, LogIn, LogOut } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";

function elapsedLabel(startedAt: string | null): string {
  if (!startedAt) return "—";
  const ms = Date.now() - new Date(startedAt).getTime();
  if (ms < 0) return "—";
  return formatMinutes(Math.floor(ms / 60000));
}

export function WorkforceOverviewPage() {
  const { user, profile } = useCrmAuth();
  const [rows, setRows] = useState<LivePresenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchLivePresence();
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load presence");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 60000);
    return () => window.clearInterval(t);
  }, []);

  if (profile?.role === "employee") {
    return <Navigate to="/crm/workforce/me" replace />;
  }

  if (!user) return null;

  const onSite = rows.filter((r) => r.on_site).length;
  const offSite = rows.length - onSite;
  const inDepartment = rows.filter((r) => r.on_site && r.current_department_id).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Who is on site, current department, and time in department (updates every minute).
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/80 shadow-sm">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Active employees</p>
              <p className="text-2xl font-display tabular-nums">{rows.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20 bg-emerald-500/[0.04] shadow-sm">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/15 p-2">
              <LogIn className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">On site</p>
              <p className="text-2xl font-display tabular-nums text-emerald-700 dark:text-emerald-400">{onSite}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-sm">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Off site</p>
              <p className="text-2xl font-display tabular-nums">{offSite}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-sm">
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">In a department</p>
              <p className="text-2xl font-display tabular-nums">{inDepartment}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>On site</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Time in dept</TableHead>
              <TableHead>Last scan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No active employees. Add employees under Workforce → Employees.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.employee.id}>
                  <TableCell className="font-medium">{r.employee.full_name}</TableCell>
                  <TableCell>
                    {r.on_site ? (
                      <Badge className="bg-emerald-600">On site</Badge>
                    ) : (
                      <Badge variant="secondary">Off site</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.on_site && r.current_department_name ? r.current_department_name : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {r.on_site && r.segment_started_at ? elapsedLabel(r.segment_started_at) : "—"}
                    <span className="sr-only">{tick}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {r.last_event_at ? new Date(r.last_event_at).toLocaleString() : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
