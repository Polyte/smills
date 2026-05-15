import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { format, subDays } from "date-fns";
import {
  dashboardStats,
  isCrmDataAvailable,
  crmUsesSupabase,
} from "../../../lib/crm/crmRepo";
import {
  invDashboardChartsData,
  invOverviewStats,
  invProductSalesMetrics,
  type InvProductSalesTimeFilter,
  type InvProductSalesTimePreset,
  type InvProductSaleRow,
} from "../../../lib/crm/inventoryRepo";
import type { InvItemKind } from "../database.types";
import {
  boundsFromInventoryTimeFilter,
  fetchCrmPeriodSummary,
  fetchQcPeriodSummary,
  fetchSalesOrdersReport,
  fetchWorkforceReportSummary,
  reportingFilenameSlug,
  reportingWindowDays,
  scaleInventoryTargetToWindow,
  type CrmPeriodSummaryRow,
  type SalesOrdersReport,
} from "../../../lib/crm/reportingRepo";
import { departmentMinutesInRange, downloadCsv, formatMinutes } from "../../../lib/crm/workforceRepo";
import { fetchLatestMachines, fetchOeePct, isAutomationApiConfigured } from "../../../lib/automationApi";
import { useCrmAuth } from "../CrmAuthContext";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Skeleton } from "../../components/ui/skeleton";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Download,
  TrendingUp,
  Package,
  Users,
  ShoppingCart,
  BarChart3,
  Factory,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "../../components/ui/utils";

const zar = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "ZAR", maximumFractionDigits: 0 });

const tipStyle: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(10,12,22,0.92)",
  backdropFilter: "blur(16px)",
  boxShadow: "0 16px 40px -8px rgba(0,0,0,0.55)",
  color: "oklch(0.9 0.008 85)",
  fontSize: "12px",
  padding: "10px 14px",
};

const CHART_VARS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function attainmentPct(actual: number, target: number | null): string {
  if (target == null || target <= 0) return "—";
  return `${Math.min(999, Math.round((actual / target) * 100))}%`;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof TrendingUp;
  accent?: "emerald" | "amber" | "violet" | "rose" | "sky";
}) {
  const colors: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 ring-emerald-500/20",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-500/10 ring-amber-500/20",
    violet: "text-violet-600 dark:text-violet-400 bg-violet-500/10 ring-violet-500/20",
    rose: "text-rose-600 dark:text-rose-400 bg-rose-500/10 ring-rose-500/20",
    sky: "text-sky-600 dark:text-sky-400 bg-sky-500/10 ring-sky-500/20",
  };
  const cls = accent ? colors[accent] : "text-primary bg-primary/10 ring-primary/20";
  return (
    <div className="animate-card card-shine flex items-center gap-3 rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/20 px-4 py-3.5 shadow-sm">
      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl ring-1", cls)}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-display text-xl font-bold tabular-nums tracking-tight text-foreground">
          {value}
        </p>
        {sub ? <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p> : null}
      </div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
      <BarChart3 className="size-8 opacity-25" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function ReportsBodySkeleton() {
  return (
    <div className="space-y-4" data-gsap-section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}

export function ReportsPage() {
  const { user, profile } = useCrmAuth();
  const [preset, setPreset] = useState<InvProductSalesTimePreset>("month");
  const [customFrom, setCustomFrom] = useState(() => format(subDays(new Date(), 29), "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [kindFilter, setKindFilter] = useState<"all" | InvItemKind>("all");

  const timeFilter = useMemo((): InvProductSalesTimeFilter => {
    if (preset === "custom") return { preset: "custom", from: customFrom, to: customTo };
    if (preset === "all") return { preset: "all" };
    return { preset };
  }, [preset, customFrom, customTo]);

  const bounds = useMemo(() => boundsFromInventoryTimeFilter(timeFilter), [timeFilter]);

  const [loading, setLoading] = useState(true);
  const [crmSummary, setCrmSummary] = useState<CrmPeriodSummaryRow | null>(null);
  const [dash, setDash] = useState<Awaited<ReturnType<typeof dashboardStats>> | null>(null);
  const [invOv, setInvOv] = useState<Awaited<ReturnType<typeof invOverviewStats>> | null>(null);
  const [salesOrdersRep, setSalesOrdersRep] = useState<SalesOrdersReport | null>(null);
  const [qcSummary, setQcSummary] = useState<Awaited<ReturnType<typeof fetchQcPeriodSummary>> | null>(null);
  const [salesMetrics, setSalesMetrics] = useState<Awaited<ReturnType<typeof invProductSalesMetrics>> | null>(null);
  const [chartData, setChartData] = useState<Awaited<ReturnType<typeof invDashboardChartsData>> | null>(null);
  const [workforceSum, setWorkforceSum] = useState<Awaited<ReturnType<typeof fetchWorkforceReportSummary>> | null>(null);
  const [oee, setOee] = useState<number | null>(null);

  const customIncomplete = preset === "custom" && (!customFrom.trim() || !customTo.trim());
  const periodSlug = useMemo(() => reportingFilenameSlug(bounds.label), [bounds.label]);
  const windowDaysLabel = useMemo(() => {
    const d = reportingWindowDays(bounds);
    if (d == null) return null;
    if (d >= 27 && d <= 32) return null;
    return `Targets scaled ×${d.toFixed(1)} / 30 days`;
  }, [bounds]);

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user || customIncomplete) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [crm, stats, inv, so, qc, metrics, wf] = await Promise.all([
        fetchCrmPeriodSummary(timeFilter),
        dashboardStats(user.id),
        invOverviewStats(),
        fetchSalesOrdersReport(timeFilter),
        fetchQcPeriodSummary(bounds),
        invProductSalesMetrics(timeFilter),
        fetchWorkforceReportSummary(bounds),
      ]);
      setCrmSummary(crm);
      setDash(stats);
      setInvOv(inv);
      setSalesOrdersRep(so);
      setQcSummary(qc);
      setSalesMetrics(metrics);
      setChartData(await invDashboardChartsData(timeFilter, metrics));
      setWorkforceSum(wf);
      if (isAutomationApiConfigured()) {
        try { setOee(await fetchOeePct()); } catch { setOee(null); }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load reports");
    } finally {
      setLoading(false);
    }
  }, [user, timeFilter, bounds, customIncomplete]);

  useEffect(() => { void load(); }, [load]);

  const filteredProductRows = useMemo(() => {
    if (!salesMetrics) return [];
    return salesMetrics.rows
      .filter((r) => kindFilter === "all" || r.kind === kindFilter)
      .sort((a, b) => b.est_sales_zar - a.est_sales_zar);
  }, [salesMetrics, kindFilter]);

  const crmActivityChart = useMemo(() => {
    if (!crmSummary) return [];
    return [
      { name: "Contacts", value: crmSummary.newContacts },
      { name: "Deals", value: crmSummary.newDeals },
      { name: "Activities", value: crmSummary.activitiesInPeriod },
      { name: "Tasks", value: crmSummary.tasksCreatedInPeriod },
      { name: "Quotes", value: crmSummary.quotesInPeriod },
      { name: "Invoices", value: crmSummary.invoicesInPeriod },
    ].filter((x) => x.value > 0);
  }, [crmSummary]);

  const pipelinePieData = useMemo(() => {
    if (!dash?.dealsByStage.length) return [];
    return dash.dealsByStage.map((d) => ({ name: d.stage, value: d.count }));
  }, [dash]);

  const topSkuChart = useMemo(() => {
    return filteredProductRows
      .filter((r) => r.shipped_qty > 0 || r.est_sales_zar > 0)
      .slice(0, 10)
      .map((r) => {
        const st = scaleInventoryTargetToWindow(r.sales_target_qty, bounds);
        return {
          sku: r.sku,
          shipped: Math.round(r.shipped_qty * 100) / 100,
          salesTarget: st != null ? Math.round(st * 100) / 100 : 0,
          estSalesK: Math.round(r.est_sales_zar / 1000),
        };
      });
  }, [filteredProductRows, bounds]);

  const qcPieData = useMemo(() => {
    if (!qcSummary?.total) return [];
    return [
      { name: "Pass", value: qcSummary.passCount },
      { name: "Fail", value: qcSummary.failCount },
    ].filter((x) => x.value > 0);
  }, [qcSummary]);

  const workforceDeptChart = useMemo(() => {
    if (!workforceSum) return [];
    const dm = departmentMinutesInRange(
      workforceSum.segments,
      bounds.fromInclusiveIso,
      bounds.toInclusiveIso
    );
    return [...dm.values()]
      .filter((x) => x.minutes > 0)
      .map((x) => ({ name: x.name, minutes: x.minutes }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 12);
  }, [workforceSum, bounds.fromInclusiveIso, bounds.toInclusiveIso]);

  const salesOrderStatusChart = useMemo(() => {
    if (!salesOrdersRep) return [];
    return Object.entries(salesOrdersRep.statusCounts)
      .map(([name, value]) => ({ name: name.replace(/_/g, " "), value }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [salesOrdersRep]);

  function exportProductCsv() {
    if (!salesMetrics) return;
    const headers = ["sku", "name", "kind", "category", "shipped_qty", "production_output_qty", "est_sales_zar", "list_price_zar"];
    const rows = filteredProductRows.map((r) => [
      r.sku, r.name, r.kind, r.category,
      String(r.shipped_qty), String(r.production_output_qty),
      String(r.est_sales_zar), String(r.list_price_zar),
    ]);
    downloadCsv(`reports-inventory-${periodSlug}.csv`, headers, rows);
  }

  function exportCrmCsv() {
    if (!crmSummary) return;
    downloadCsv(`reports-crm-${periodSlug}.csv`, ["metric", "value"], [
      ["new_contacts", String(crmSummary.newContacts)],
      ["new_deals", String(crmSummary.newDeals)],
      ["activities", String(crmSummary.activitiesInPeriod)],
      ["quotes_total_zar", String(crmSummary.quotesTotalZar)],
      ["invoices_total_zar", String(crmSummary.invoicesTotalZar)],
    ]);
  }

  function exportWorkforceCsv() {
    if (!workforceSum) return;
    const headers = ["Employee", "Department", "Minutes"];
    const rows: string[][] = [];
    for (const emp of workforceSum.employees) {
      const seg = workforceSum.segments.filter((s) => s.workforce_employee_id === emp.id);
      const dm = departmentMinutesInRange(seg, bounds.fromInclusiveIso, bounds.toInclusiveIso);
      for (const [, v] of dm) rows.push([emp.full_name, v.name, String(v.minutes)]);
    }
    downloadCsv(`reports-workforce-${periodSlug}.csv`, headers, rows);
  }

  if (!isCrmDataAvailable()) {
    return <p className="text-sm text-muted-foreground">CRM storage is not available.</p>;
  }

  return (
    <div className="space-y-6 w-full max-w-full px-4 sm:px-6 lg:px-8 pb-12" data-gsap-section>
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Period metrics across CRM, inventory, and workforce.
          </p>
        </div>
        {salesMetrics ? (
          <span className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
            {salesMetrics.periodLabel}
          </span>
        ) : null}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3.5 shadow-sm">
        <div className="grid gap-1.5 min-w-[170px]">
          <Label className="text-[11px] font-medium text-muted-foreground">Period</Label>
          <Select
            value={preset}
            onValueChange={(v) => {
              const next = v as InvProductSalesTimePreset;
              if (next === "custom") {
                setCustomFrom(format(subDays(new Date(), 29), "yyyy-MM-dd"));
                setCustomTo(format(new Date(), "yyyy-MM-dd"));
              }
              setPreset(next);
            }}
          >
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
              <SelectItem value="3m">Last 90 days</SelectItem>
              <SelectItem value="6m">Last 180 days</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="custom">Custom…</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {preset === "custom" ? (
          <>
            <div className="grid gap-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground">From</Label>
              <Input type="date" className="h-9 w-[145px]" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground">To</Label>
              <Input type="date" className="h-9 w-[145px]" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          </>
        ) : null}
        <div className="grid gap-1.5 min-w-[130px]">
          <Label className="text-[11px] font-medium text-muted-foreground">Item kind</Label>
          <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as typeof kindFilter)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All kinds</SelectItem>
              <SelectItem value="raw">Raw</SelectItem>
              <SelectItem value="wip">WIP</SelectItem>
              <SelectItem value="finished">Finished</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {windowDaysLabel ? (
          <p className="text-[11px] text-muted-foreground pb-0.5">{windowDaysLabel}</p>
        ) : null}
      </div>

      {customIncomplete ? (
        <p className="text-sm text-muted-foreground">Choose both dates for a custom range.</p>
      ) : loading ? (
        <ReportsBodySkeleton />
      ) : (
        <Tabs defaultValue="overview">
          <TabsList className="inline-flex h-10 items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1">
            <TabsTrigger value="overview" className="rounded-lg px-4 py-1.5 text-sm font-medium">Overview</TabsTrigger>
            <TabsTrigger value="inventory" className="rounded-lg px-4 py-1.5 text-sm font-medium">Inventory</TabsTrigger>
            <TabsTrigger value="workforce" className="rounded-lg px-4 py-1.5 text-sm font-medium">Workforce & Factory</TabsTrigger>
          </TabsList>

          {/* ════ OVERVIEW ════ */}
          <TabsContent value="overview" className="animate-tab mt-5 space-y-5" data-gsap-section>
            {/* KPI strip */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-gsap-panel>
              <StatCard
                label="New contacts"
                value={crmSummary?.newContacts ?? "—"}
                icon={Users}
                accent="sky"
              />
              <StatCard
                label="New deals"
                value={crmSummary?.newDeals ?? "—"}
                sub={dash != null ? `Won: ${zar(dash.wonDealsValue)}` : undefined}
                icon={TrendingUp}
                accent="emerald"
              />
              <StatCard
                label="Est. sales"
                value={salesMetrics != null ? zar(salesMetrics.totalEstSalesZar) : "—"}
                sub={salesMetrics != null ? `${salesMetrics.totalShippedQty.toFixed(0)} units shipped` : undefined}
                icon={ShoppingCart}
                accent="amber"
              />
              <StatCard
                label="Stock value"
                value={invOv != null ? zar(invOv.totalStockValue) : "—"}
                sub={invOv != null ? `${invOv.openPOs} open POs · ${invOv.draftShipments} shipments` : undefined}
                icon={Package}
                accent="violet"
              />
            </div>

            {/* CRM activity chart */}
            {crmActivityChart.length > 0 ? (
              <Card className="overflow-hidden border-border/60 shadow-sm" data-gsap-table>
                <CardHeader className="pb-2 pt-5 px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-display font-bold">CRM activity</CardTitle>
                      <CardDescription className="text-[11px] mt-0.5">Period counts across all modules</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={exportCrmCsv} disabled={!crmSummary}>
                      <Download className="size-3.5 mr-1" /> Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="h-64 px-3 pb-4 pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={crmActivityChart} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="rpt-crm-bar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.55} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="2 4" stroke="color-mix(in oklch, var(--foreground) 6%, transparent)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={32} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                      <Bar dataKey="value" name="Count" fill="url(#rpt-crm-bar)" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={700} animationEasing="ease-out" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Pipeline pie */}
              {pipelinePieData.length > 0 ? (
                <Card className="overflow-hidden border-border/60 shadow-sm" data-gsap-panel>
                  <CardHeader className="pb-2 pt-5 px-5">
                    <CardTitle className="text-sm font-display font-bold">Pipeline by stage</CardTitle>
                    <CardDescription className="text-[11px] mt-0.5">Current open deals</CardDescription>
                  </CardHeader>
                  <CardContent className="h-56 px-3 pb-4 pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pipelinePieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={84}
                          paddingAngle={2}
                          isAnimationActive
                          animationDuration={700}
                          animationEasing="ease-out"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
                        >
                          {pipelinePieData.map((_, i) => (
                            <Cell key={i} fill={CHART_VARS[i % CHART_VARS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tipStyle} />
                        <Legend wrapperStyle={{ fontSize: "11px", color: "var(--muted-foreground)" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : null}

              {/* Sales orders status */}
              {salesOrderStatusChart.length > 0 ? (
                <Card className="overflow-hidden border-border/60 shadow-sm" data-gsap-panel>
                  <CardHeader className="pb-2 pt-5 px-5">
                    <CardTitle className="text-sm font-display font-bold">Orders by status</CardTitle>
                    <CardDescription className="text-[11px] mt-0.5">In selected period</CardDescription>
                  </CardHeader>
                  <CardContent className="h-56 px-3 pb-4 pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesOrderStatusChart} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                        <defs>
                          <linearGradient id="rpt-ord-bar" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.55} />
                            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.9} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid horizontal={false} strokeDasharray="2 4" stroke="color-mix(in oklch, var(--foreground) 6%, transparent)" />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                        <Bar dataKey="value" name="Orders" fill="url(#rpt-ord-bar)" radius={[0, 6, 6, 0]} isAnimationActive animationDuration={700} animationEasing="ease-out" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : null}
            </div>

            {/* Revenue KPI row */}
            {crmSummary && (crmSummary.quotesTotalZar > 0 || crmSummary.invoicesTotalZar > 0) ? (
              <div className="grid gap-3 sm:grid-cols-3" data-gsap-panel>
                <div className="rounded-2xl border border-border/60 bg-card px-4 py-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quotes total</p>
                  <p className="mt-1 font-display text-xl font-bold tabular-nums">{zar(crmSummary.quotesTotalZar)}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card px-4 py-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Invoices total</p>
                  <p className="mt-1 font-display text-xl font-bold tabular-nums">{zar(crmSummary.invoicesTotalZar)}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card px-4 py-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Open backlog</p>
                  <p className="mt-1 font-display text-xl font-bold tabular-nums">{salesOrdersRep?.openBacklog ?? "—"} orders</p>
                </div>
              </div>
            ) : null}
          </TabsContent>

          {/* ════ INVENTORY ════ */}
          <TabsContent value="inventory" className="animate-tab mt-5 space-y-5" data-gsap-section>
            {salesMetrics ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Shipped qty" value={filteredProductRows.reduce((a, r) => a + r.shipped_qty, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} icon={Package} accent="sky" />
                <StatCard label="Est. sales" value={zar(filteredProductRows.reduce((a, r) => a + r.est_sales_zar, 0))} icon={ShoppingCart} accent="emerald" />
                <StatCard label="Active SKUs" value={filteredProductRows.length} icon={BarChart3} accent="amber" />
              </div>
            ) : null}

            {/* Shipment volume by week */}
            {chartData?.weeklyShippedByKind?.some((w) => w.raw + w.wip + w.finished > 0) ? (
              <Card className="overflow-hidden border-border/60 shadow-sm" data-gsap-panel>
                <CardHeader className="pb-2 pt-5 px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-display font-bold">Shipment volume by week</CardTitle>
                      <CardDescription className="text-[11px] mt-0.5">Stacked raw · WIP · finished</CardDescription>
                    </div>
                    <span className="rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">8 wks</span>
                  </div>
                </CardHeader>
                <CardContent className="h-64 px-3 pb-4 pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.weeklyShippedByKind} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="rpt-wk-raw" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="rpt-wk-wip" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="rpt-wk-fin" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.85} />
                          <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="2 4" stroke="color-mix(in oklch, var(--foreground) 6%, transparent)" />
                      <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={36} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tipStyle} cursor={{ stroke: "rgba(255,255,255,0.07)" }} />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: 8, color: "var(--muted-foreground)" }} />
                      <Area type="monotone" dataKey="raw" name="Raw" stackId="w" stroke="var(--chart-3)" strokeWidth={2} fill="url(#rpt-wk-raw)" isAnimationActive animationDuration={700} />
                      <Area type="monotone" dataKey="wip" name="WIP" stackId="w" stroke="var(--chart-4)" strokeWidth={2} fill="url(#rpt-wk-wip)" isAnimationActive animationDuration={700} />
                      <Area type="monotone" dataKey="finished" name="Finished" stackId="w" stroke="var(--chart-2)" strokeWidth={2} fill="url(#rpt-wk-fin)" isAnimationActive animationDuration={700} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2" data-gsap-panel>
              {/* Category mix */}
              {chartData?.categoryShippedMix?.length ? (
                <Card className="overflow-hidden border-border/60 shadow-sm">
                  <CardHeader className="pb-2 pt-5 px-5">
                    <CardTitle className="text-sm font-display font-bold">Shipped by category</CardTitle>
                    <CardDescription className="text-[11px] mt-0.5">{chartData.periodLabel}</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 px-3 pb-4 pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.categoryShippedMix.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                        <defs>
                          <linearGradient id="rpt-cat-bar" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.9} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid horizontal={false} strokeDasharray="2 4" stroke="color-mix(in oklch, var(--foreground) 6%, transparent)" />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                        <Bar dataKey="value" name="Qty" fill="url(#rpt-cat-bar)" radius={[0, 6, 6, 0]} isAnimationActive animationDuration={700} animationEasing="ease-out" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : <div className="flex h-64 items-center justify-center rounded-2xl border border-border/40"><EmptyChart message="No shipment mix for this period" /></div>}

              {/* Top SKUs vs target */}
              {topSkuChart.length > 0 ? (
                <Card className="overflow-hidden border-border/60 shadow-sm">
                  <CardHeader className="pb-2 pt-5 px-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-sm font-display font-bold">Top SKUs — shipped vs target</CardTitle>
                        <CardDescription className="text-[11px] mt-0.5">Top 10 by shipped qty</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={exportProductCsv} disabled={!filteredProductRows.length}>
                        <Download className="size-3.5 mr-1" /> CSV
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="h-64 px-3 pb-4 pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topSkuChart} margin={{ top: 8, right: 12, left: -8, bottom: 24 }}>
                        <CartesianGrid vertical={false} strokeDasharray="2 4" stroke="color-mix(in oklch, var(--foreground) 6%, transparent)" />
                        <XAxis dataKey="sku" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} angle={-30} textAnchor="end" height={40} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={36} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: 4, color: "var(--muted-foreground)" }} />
                        <Bar dataKey="shipped" name="Shipped" fill="var(--chart-2)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700} />
                        <Bar dataKey="salesTarget" name="Target" fill="var(--chart-5)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : null}
            </div>

            {/* SKU table */}
            {filteredProductRows.length > 0 ? (
              <Card className="overflow-hidden border-border/60 shadow-sm" data-gsap-panel>
                <CardHeader className="pb-2 pt-5 px-5">
                  <CardTitle className="text-sm font-display font-bold">Product breakdown</CardTitle>
                  <CardDescription className="text-[11px] mt-0.5">Sorted by estimated sales. Green % = at or above target.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[22rem] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="pl-5">SKU</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Kind</TableHead>
                          <TableHead className="text-right">Shipped</TableHead>
                          <TableHead className="text-right">Ship %</TableHead>
                          <TableHead className="text-right">Est. ZAR</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProductRows.slice(0, 60).map((r: InvProductSaleRow) => {
                          const st = scaleInventoryTargetToWindow(r.sales_target_qty, bounds);
                          return (
                            <TableRow key={r.item_id} className="hover:bg-muted/20">
                              <TableCell className="font-mono text-xs pl-5">{r.sku}</TableCell>
                              <TableCell className="max-w-[160px] truncate text-sm">{r.name}</TableCell>
                              <TableCell className="capitalize text-xs text-muted-foreground">{r.kind}</TableCell>
                              <TableCell className="text-right tabular-nums text-sm">{r.shipped_qty.toFixed(1)}</TableCell>
                              <TableCell className={cn("text-right tabular-nums text-xs", st != null && r.shipped_qty >= st && "font-semibold text-emerald-600 dark:text-emerald-400")}>
                                {attainmentPct(r.shipped_qty, st)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-sm">{zar(r.est_sales_zar)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">No product data for this period and filter.</p>
            )}
          </TabsContent>

          {/* ════ WORKFORCE & FACTORY ════ */}
          <TabsContent value="workforce" className="animate-tab mt-5 space-y-5" data-gsap-section>
            {/* Summary KPIs */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-gsap-panel>
              <StatCard label="Active employees" value={workforceSum?.employees.length ?? 0} icon={Users} accent="sky" />
              <StatCard
                label="Facility time"
                value={workforceSum != null ? formatMinutes(workforceSum.totalFacilityMinutesApprox) : "—"}
                sub="Sum across all dept. segments"
                icon={Factory}
                accent="amber"
              />
              {crmUsesSupabase() && qcSummary != null ? (
                <StatCard
                  label="QC inspections"
                  value={qcSummary.total}
                  sub={`Fail rate: ${qcSummary.total ? `${qcSummary.failPct}%` : "—"}`}
                  icon={qcSummary.failPct > 5 ? AlertTriangle : CheckCircle2}
                  accent={qcSummary.failPct > 5 ? "rose" : "emerald"}
                />
              ) : null}
              {oee != null ? (
                <StatCard label="Machine OEE" value={`${oee.toFixed(1)}%`} sub="Live from automation API" icon={BarChart3} accent="violet" />
              ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-2" data-gsap-panel>
              {/* Dept minutes bar */}
              {workforceDeptChart.length > 0 ? (
                <Card className="overflow-hidden border-border/60 shadow-sm">
                  <CardHeader className="pb-2 pt-5 px-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-sm font-display font-bold">Minutes by department</CardTitle>
                        <CardDescription className="text-[11px] mt-0.5">Segments overlapping selected range</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={exportWorkforceCsv} disabled={!workforceSum}>
                        <Download className="size-3.5 mr-1" /> CSV
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="h-72 px-3 pb-4 pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={workforceDeptChart} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                        <defs>
                          <linearGradient id="rpt-dept-bar" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.9} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid horizontal={false} strokeDasharray="2 4" stroke="color-mix(in oklch, var(--foreground) 6%, transparent)" />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v: number) => [formatMinutes(v), "Minutes"]} />
                        <Bar dataKey="minutes" fill="url(#rpt-dept-bar)" radius={[0, 6, 6, 0]} isAnimationActive animationDuration={700} animationEasing="ease-out" name="Minutes" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex h-72 items-center justify-center rounded-2xl border border-border/40">
                  <EmptyChart message="No department minutes in this range" />
                </div>
              )}

              {/* QC outcomes */}
              {crmUsesSupabase() && qcPieData.length > 0 ? (
                <Card className="overflow-hidden border-border/60 shadow-sm">
                  <CardHeader className="pb-2 pt-5 px-5">
                    <CardTitle className="text-sm font-display font-bold">QC outcomes</CardTitle>
                    <CardDescription className="text-[11px] mt-0.5">Pass / fail in selected period</CardDescription>
                  </CardHeader>
                  <CardContent className="h-72 px-3 pb-4 pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={qcPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={90}
                          paddingAngle={3}
                          isAnimationActive
                          animationDuration={700}
                          animationEasing="ease-out"
                        >
                          <Cell fill="var(--chart-2)" />
                          <Cell fill="oklch(0.55 0.18 15)" />
                        </Pie>
                        <Tooltip contentStyle={tipStyle} />
                        <Legend wrapperStyle={{ fontSize: "12px", color: "var(--muted-foreground)" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : !crmUsesSupabase() ? (
                <div className="flex h-72 items-center justify-center rounded-2xl border border-border/40 bg-muted/10">
                  <p className="text-sm text-muted-foreground text-center px-6">QC data requires Supabase connection.</p>
                </div>
              ) : null}
            </div>

            {/* Workforce detail link */}
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
              <p className="text-sm text-muted-foreground flex-1">
                Full attendance logs, lost-time tracking, and employee drill-down are available on the Workforce board.
              </p>
              <Link to="/crm/workforce/reports" className="text-sm font-semibold text-primary hover:underline shrink-0">
                Open workforce reports →
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

