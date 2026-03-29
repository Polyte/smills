import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { dashboardStats, isCrmDataAvailable } from "../../../lib/crm/crmRepo";
import { invOverviewStats } from "../../../lib/crm/inventoryRepo";
import { useCrmAuth } from "../CrmAuthContext";
import type { Database } from "../database.types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Link } from "react-router";

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];

type ActivityJoined = ActivityRow & {
  contacts: Pick<ContactRow, "company_name"> | null;
};

export function DashboardPage() {
  const { user } = useCrmAuth();
  const [openTasks, setOpenTasks] = useState(0);
  const [stageCounts, setStageCounts] = useState<{ stage: string; count: number }[]>([]);
  const [recent, setRecent] = useState<ActivityJoined[]>([]);
  const [invOpenPOs, setInvOpenPOs] = useState(0);
  const [invOpenShips, setInvOpenShips] = useState(0);
  const [invStockValue, setInvStockValue] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const stats = await dashboardStats(user.id);
      setOpenTasks(stats.openTasks);
      setStageCounts(stats.dealsByStage);
      setRecent(stats.recentActivities as ActivityJoined[]);
      try {
        const inv = await invOverviewStats();
        setInvOpenPOs(inv.openPOs);
        setInvOpenShips(inv.draftShipments);
        setInvStockValue(inv.totalStockValue);
      } catch {
        setInvOpenPOs(0);
        setInvOpenShips(0);
        setInvStockValue(0);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isCrmDataAvailable()) {
    return (
      <p className="text-sm text-muted-foreground">CRM storage is not available.</p>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Snapshot of workload and recent touchpoints.</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Open tasks</CardDescription>
                <CardTitle className="text-3xl font-display tabular-nums">{openTasks}</CardTitle>
              </CardHeader>
              <CardContent>
                <Link to="/crm/tasks" className="text-sm text-primary hover:underline">
                  View tasks
                </Link>
              </CardContent>
            </Card>
            <Card className="sm:col-span-2">
              <CardHeader>
                <CardDescription>Deals by stage</CardDescription>
                <CardTitle className="text-lg">Pipeline</CardTitle>
              </CardHeader>
              <CardContent className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageCounts} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="stage"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                    <Bar dataKey="count" fill="var(--gold-mid, #a16207)" radius={[4, 4, 0, 0]} name="Deals" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Inventory</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Open production orders</CardDescription>
                  <CardTitle className="text-2xl font-display tabular-nums">{invOpenPOs}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link to="/crm/inventory/production" className="text-sm text-primary hover:underline">
                    Production
                  </Link>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Open shipments</CardDescription>
                  <CardTitle className="text-2xl font-display tabular-nums">{invOpenShips}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link to="/crm/inventory/shipments" className="text-sm text-primary hover:underline">
                    Shipments
                  </Link>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Stock value (std cost)</CardDescription>
                  <CardTitle className="text-xl font-display tabular-nums">
                    {invStockValue.toLocaleString(undefined, {
                      style: "currency",
                      currency: "ZAR",
                      maximumFractionDigits: 0,
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link to="/crm/inventory/reports" className="text-sm text-primary hover:underline">
                    Reports
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent activities</CardTitle>
              <CardDescription>Latest logged across the team</CardDescription>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activities yet.</p>
              ) : (
                <ul className="space-y-3">
                  {recent.map((a) => (
                    <li key={a.id} className="flex flex-wrap gap-2 text-sm border-b border-border/60 pb-3 last:border-0">
                      <span className="font-medium capitalize">{a.kind}</span>
                      <span className="text-muted-foreground">
                        {format(new Date(a.occurred_at), "PPp")}
                      </span>
                      <span className="w-full">{a.subject}</span>
                      {a.contacts?.company_name ? (
                        <span className="text-xs text-muted-foreground w-full">
                          {a.contacts.company_name}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <Link
                to="/crm/activities"
                className="inline-block mt-4 text-sm text-primary hover:underline"
              >
                All activities
              </Link>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
