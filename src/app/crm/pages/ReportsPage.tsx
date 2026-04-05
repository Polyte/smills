import { useCallback, useEffect, useMemo, useState } from "react";
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
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { cn } from "../../components/ui/utils";

const zar = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "ZAR", maximumFractionDigits: 0 });

const CHART_COLORS = [
  "oklch(0.55 0.12 200)",
  "oklch(0.58 0.14 145)",
  "oklch(0.62 0.12 85)",
  "oklch(0.52 0.14 280)",
  "oklch(0.55 0.1 25)",
  "oklch(0.5 0.08 220)",
];

function attainmentPct(actual: number, target: number | null): string {
  if (target == null || target <= 0) return "—";
  return `${Math.min(999, Math.round((actual / target) * 100))}%`;
}

export function ReportsPage() {
  const { user, profile } = useCrmAuth();
  const [preset, setPreset] = useState<InvProductSalesTimePreset>("month");
  const [customFrom, setCustomFrom] = useState(() => format(subDays(new Date(), 29), "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [kindFilter, setKindFilter] = useState<"all" | InvItemKind>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const timeFilter = useMemo((): InvProductSalesTimeFilter => {
    if (preset === "custom") return { preset: "custom", from: customFrom, to: customTo };
    if (preset === "all") return { preset: "all" };
    return { preset };
  }, [preset, customFrom, customTo]);

  const bounds = useMemo(
    () => boundsFromInventoryTimeFilter(timeFilter),
    [timeFilter]
  );

  const [loading, setLoading] = useState(true);
  const [crmSummary, setCrmSummary] = useState<CrmPeriodSummaryRow | null>(null);
  const [dash, setDash] = useState<Awaited<ReturnType<typeof dashboardStats>> | null>(null);
  const [invOv, setInvOv] = useState<Awaited<ReturnType<typeof invOverviewStats>> | null>(null);
  const [salesOrdersRep, setSalesOrdersRep] = useState<SalesOrdersReport | null>(null);
  const [qcSummary, setQcSummary] = useState<Awaited<ReturnType<typeof fetchQcPeriodSummary>> | null>(null);
  const [salesMetrics, setSalesMetrics] = useState<Awaited<ReturnType<typeof invProductSalesMetrics>> | null>(
    null
  );
  const [chartData, setChartData] = useState<Awaited<ReturnType<typeof invDashboardChartsData>> | null>(null);
  const [workforceSum, setWorkforceSum] = useState<Awaited<ReturnType<typeof fetchWorkforceReportSummary>> | null>(
    null
  );
  const [oee, setOee] = useState<number | null>(null);
  const [machineCount, setMachineCount] = useState<number | null>(null);

  const periodSlug = useMemo(() => reportingFilenameSlug(bounds.label), [bounds.label]);
  const customIncomplete = preset === "custom" && (!customFrom.trim() || !customTo.trim());

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
      const charts = await invDashboardChartsData(timeFilter, metrics);
      setChartData(charts);
      setWorkforceSum(wf);

      if (isAutomationApiConfigured()) {
        try {
          const [o, m] = await Promise.all([fetchOeePct(), fetchLatestMachines()]);
          setOee(o);
          setMachineCount(m.length);
        } catch {
          setOee(null);
          setMachineCount(null);
        }
      } else {
        setOee(null);
        setMachineCount(null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load reports");
    } finally {
      setLoading(false);
    }
  }, [user, timeFilter, bounds, customIncomplete]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredProductRows = useMemo(() => {
    if (!salesMetrics) return [];
    return salesMetrics.rows.filter((r) => {
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (categoryFilter && r.category !== categoryFilter) return false;
      return true;
    });
  }, [salesMetrics, kindFilter, categoryFilter]);

  const categoryOptions = useMemo(() => {
    if (!salesMetrics) return [];
    return [...new Set(salesMetrics.rows.map((r) => r.category))].sort((a, b) => a.localeCompare(b));
  }, [salesMetrics]);

  const windowDaysLabel = useMemo(() => {
    const d = reportingWindowDays(bounds);
    if (d == null) return null;
    if (d >= 27 && d <= 32) return "~30-day targets apply as-is.";
    return `Targets are ~30-day baselines, scaled × ${d.toFixed(1)} days / 30.`;
  }, [bounds]);

  const crmActivityCountChart = useMemo(() => {
    if (!crmSummary) return [];
    return [
      { name: "Contacts", value: crmSummary.newContacts },
      { name: "Deals", value: crmSummary.newDeals },
      { name: "Activities", value: crmSummary.activitiesInPeriod },
      { name: "Tasks", value: crmSummary.tasksCreatedInPeriod },
      { name: "Quote req.", value: crmSummary.quoteRequestsInPeriod },
      { name: "Quotes", value: crmSummary.quotesInPeriod },
      { name: "Invoices", value: crmSummary.invoicesInPeriod },
    ];
  }, [crmSummary]);

  const crmMoneyChart = useMemo(() => {
    if (!crmSummary) return [];
    return [
      { name: "Quotes ZAR", value: Math.round(crmSummary.quotesTotalZar / 1000) },
      { name: "Invoices ZAR", value: Math.round(crmSummary.invoicesTotalZar / 1000) },
    ].filter((x) => x.value > 0);
  }, [crmSummary]);

  const pipelinePieData = useMemo(() => {
    if (!dash?.dealsByStage.length) return [];
    return dash.dealsByStage.map((d) => ({ name: d.stage, value: d.count }));
  }, [dash]);

  const salesOrderStatusChart = useMemo(() => {
    if (!salesOrdersRep) return [];
    return Object.entries(salesOrdersRep.statusCounts)
      .map(([name, value]) => ({ name: name.replace(/_/g, " "), value }))
      .sort((a, b) => b.value - a.value);
  }, [salesOrdersRep]);

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
      .slice(0, 18);
  }, [workforceSum, bounds.fromInclusiveIso, bounds.toInclusiveIso]);

  const fabricMixChart = useMemo(() => {
    if (!salesOrdersRep?.ordersInPeriod.length) return [];
    const m = new Map<string, number>();
    for (const o of salesOrdersRep.ordersInPeriod) {
      const k = (o.fabric_type ?? "Other").trim() || "Other";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [salesOrdersRep]);

  const qcPieData = useMemo(() => {
    if (!qcSummary?.total) return [];
    const rest = qcSummary.total - qcSummary.passCount - qcSummary.failCount;
    const out = [
      { name: "Pass", value: qcSummary.passCount },
      { name: "Fail", value: qcSummary.failCount },
    ];
    if (rest > 0) out.push({ name: "Other", value: rest });
    return out.filter((x) => x.value > 0);
  }, [qcSummary]);

  const topSkuVsTargetChart = useMemo(() => {
    if (!filteredProductRows.length) return [];
    const scaled = filteredProductRows.map((r) => {
      const st = scaleInventoryTargetToWindow(r.sales_target_qty, bounds);
      const pt = scaleInventoryTargetToWindow(r.production_target_qty, bounds);
      const score = Math.max(r.shipped_qty, r.production_output_qty, st ?? 0, pt ?? 0);
      return { r, st, pt, score };
    });
    return scaled
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((x) => ({
        sku: x.r.sku,
        shipped: Math.round(x.r.shipped_qty * 100) / 100,
        produced: Math.round(x.r.production_output_qty * 100) / 100,
        salesTarget: x.st != null ? Math.round(x.st * 100) / 100 : 0,
        prodTarget: x.pt != null ? Math.round(x.pt * 100) / 100 : 0,
      }));
  }, [filteredProductRows, bounds]);

  function exportProductCsv() {
    if (!salesMetrics) return;
    const headers = [
      "sku",
      "name",
      "kind",
      "category",
      "shipped_qty",
      "production_output_qty",
      "est_sales_zar",
      "list_price_zar",
      "sales_target_30d",
      "production_target_30d",
      "sales_target_scaled_period",
      "production_target_scaled_period",
    ];
    const rows = filteredProductRows.map((r) => {
      const st = scaleInventoryTargetToWindow(r.sales_target_qty, bounds);
      const pt = scaleInventoryTargetToWindow(r.production_target_qty, bounds);
      return [
        r.sku,
        r.name,
        r.kind,
        r.category,
        String(r.shipped_qty),
        String(r.production_output_qty),
        String(r.est_sales_zar),
        String(r.list_price_zar),
        r.sales_target_qty != null ? String(r.sales_target_qty) : "",
        r.production_target_qty != null ? String(r.production_target_qty) : "",
        st != null ? String(st) : "",
        pt != null ? String(pt) : "",
      ];
    });
    downloadCsv(`reports-inventory-products-${periodSlug}.csv`, headers, rows);
  }

  function exportCrmSummaryCsv() {
    if (!crmSummary) return;
    downloadCsv(`reports-crm-summary-${periodSlug}.csv`, ["metric", "value"], [
      ["new_contacts", String(crmSummary.newContacts)],
      ["new_deals", String(crmSummary.newDeals)],
      ["activities", String(crmSummary.activitiesInPeriod)],
      ["tasks_created", String(crmSummary.tasksCreatedInPeriod)],
      ["quote_requests", String(crmSummary.quoteRequestsInPeriod)],
      ["quotes", String(crmSummary.quotesInPeriod)],
      ["quotes_total_zar", String(crmSummary.quotesTotalZar)],
      ["invoices", String(crmSummary.invoicesInPeriod)],
      ["invoices_total_zar", String(crmSummary.invoicesTotalZar)],
    ]);
  }

  function exportSalesOrdersCsv() {
    if (!salesOrdersRep) return;
    const headers = [
      "order_number",
      "status",
      "fabric_type",
      "created_at",
      "owner_id",
    ];
    const rows = salesOrdersRep.ordersInPeriod.map((o) => [
      o.order_number,
      o.status,
      o.fabric_type ?? "",
      o.created_at,
      o.owner_id,
    ]);
    downloadCsv(`reports-sales-orders-${periodSlug}.csv`, headers, rows);
  }

  function exportWorkforceCsv() {
    if (!workforceSum) return;
    const headers = ["Employee", "Department", "Minutes in range"];
    const rows: string[][] = [];
    for (const emp of workforceSum.employees) {
      const seg = workforceSum.segments.filter((s) => s.workforce_employee_id === emp.id);
      const dm = departmentMinutesInRange(seg, bounds.fromInclusiveIso, bounds.toInclusiveIso);
      for (const [, v] of dm) {
        rows.push([emp.full_name, v.name, String(v.minutes)]);
      }
    }
    downloadCsv(`reports-workforce-departments-${periodSlug}.csv`, headers, rows);
  }

  if (!isCrmDataAvailable()) {
    return <p className="text-sm text-muted-foreground">CRM storage is not available.</p>;
  }

  return (
    <div className="space-y-6 max-w-6xl pb-10">
      <div className="rounded-xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/30 px-5 py-4 shadow-sm">
        <h1 className="text-2xl font-display font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
          Cross-module metrics for the selected period. Inventory targets are set per SKU under{" "}
          <Link className="text-primary font-medium hover:underline" to="/crm/inventory/items">
            Items
          </Link>{" "}
          (admin). Connect Supabase for factory QC and full cloud parity.
        </p>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Time range &amp; filters</CardTitle>
          <CardDescription>Applied to CRM period counts, sales orders, inventory movement metrics, workforce, and QC.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-end">
          <div className="grid gap-1.5 min-w-[180px]">
            <Label className="text-xs">Period</Label>
            <Select
              value={preset}
              onValueChange={(v) => {
                const next = v as InvProductSalesTimePreset;
                if (next === "custom" && (!customFrom.trim() || !customTo.trim())) {
                  const today = new Date();
                  setCustomFrom(format(subDays(today, 29), "yyyy-MM-dd"));
                  setCustomTo(format(today, "yyyy-MM-dd"));
                }
                setPreset(next);
              }}
            >
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="3m">Last 90 days</SelectItem>
                <SelectItem value="6m">Last 180 days</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
                <SelectItem value="custom">Custom range…</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {preset === "custom" ? (
            <>
              <div className="grid gap-1.5">
                <Label className="text-xs">From</Label>
                <Input type="date" className="h-9 w-[155px]" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">To</Label>
                <Input type="date" className="h-9 w-[155px]" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            </>
          ) : null}
          <div className="grid gap-1.5 min-w-[140px]">
            <Label className="text-xs">Inventory kind</Label>
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
          <div className="grid gap-1.5 min-w-[160px]">
            <Label className="text-xs">Inventory category</Label>
            <Select value={categoryFilter || "__all__"} onValueChange={(v) => setCategoryFilter(v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All categories</SelectItem>
                {categoryOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {salesMetrics ? (
            <p className="text-xs text-muted-foreground pb-1">
              <span className="font-medium text-foreground">Resolved:</span> {salesMetrics.periodLabel}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {customIncomplete ? (
        <p className="text-sm text-muted-foreground">Choose both dates for a custom range.</p>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Loading reports…</p>
      ) : (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/40 p-1 rounded-lg border border-border/60">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="crm">Sales &amp; CRM</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="workforce">Workforce</TabsTrigger>
            <TabsTrigger value="factory">Factory &amp; QC</TabsTrigger>
            <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => exportCrmSummaryCsv()} disabled={!crmSummary}>
                <Download className="size-4 mr-1" /> Export CRM summary CSV
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">CRM (period)</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>
                    New contacts: <strong>{crmSummary?.newContacts ?? "—"}</strong>
                  </p>
                  <p>
                    New deals: <strong>{crmSummary?.newDeals ?? "—"}</strong>
                  </p>
                  <p>
                    Activities: <strong>{crmSummary?.activitiesInPeriod ?? "—"}</strong>
                  </p>
                  <p>
                    Quotes (invoices):{" "}
                    <strong>
                      {crmSummary?.quotesInPeriod ?? "—"} ({crmSummary?.invoicesInPeriod ?? "—"})
                    </strong>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Pipeline (current)</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>
                    Open deals: <strong>{dash?.pipelineOpenCount ?? "—"}</strong>
                  </p>
                  <p>
                    Won value: <strong>{dash != null ? zar(dash.wonDealsValue) : "—"}</strong>
                  </p>
                  {dash?.dealsByStage.map((d) => (
                    <p key={d.stage}>
                      {d.stage}: <strong>{d.count}</strong>
                    </p>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Inventory snapshot</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>
                    Stock value (std cost): <strong>{invOv != null ? zar(invOv.totalStockValue) : "—"}</strong>
                  </p>
                  <p>
                    Open POs / shipments:{" "}
                    <strong>
                      {invOv?.openPOs ?? "—"} / {invOv?.draftShipments ?? "—"}
                    </strong>
                  </p>
                  <p>
                    Open sales orders: <strong>{salesOrdersRep?.openBacklog ?? "—"}</strong>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">QC (Supabase)</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {!crmUsesSupabase() ? (
                    <p className="text-muted-foreground">Connect Supabase for QC inspections.</p>
                  ) : (
                    <p>
                      Inspections in period: <strong>{qcSummary?.total ?? 0}</strong> · Fail rate{" "}
                      <strong>{qcSummary?.total ? `${qcSummary.failPct}%` : "—"}</strong>
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Workforce (period)</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>
                    Active employees: <strong>{workforceSum?.employees.length ?? 0}</strong>
                  </p>
                  <p>
                    Approx. facility minutes (sum):{" "}
                    <strong>
                      {workforceSum != null ? formatMinutes(workforceSum.totalFacilityMinutesApprox) : "—"}
                    </strong>
                  </p>
                  <p>
                    Lost time minutes:{" "}
                    <strong>{workforceSum != null ? formatMinutes(workforceSum.totalLostMinutes) : "—"}</strong>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Telemetry API</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {isAutomationApiConfigured() ? (
                    <p>
                      OEE: <strong>{oee != null ? `${oee.toFixed(1)}%` : "—"}</strong> · Machines tracked:{" "}
                      <strong>{machineCount ?? "—"}</strong>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">Set VITE_AUTOMATION_API_URL for live OEE and machines.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {crmActivityCountChart.length > 0 ? (
                <Card className="border-border/80 shadow-sm overflow-hidden">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-sm">CRM activity (period)</CardTitle>
                    <CardDescription>Counts in the selected range</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={crmActivityCountChart} margin={{ left: 4, right: 8, top: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-28} textAnchor="end" height={56} />
                        <YAxis tick={{ fontSize: 11 }} width={36} />
                        <Tooltip />
                        <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                          {crmActivityCountChart.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : null}
              {crmMoneyChart.length > 0 ? (
                <Card className="border-border/80 shadow-sm overflow-hidden">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-sm">Commercial value (period)</CardTitle>
                    <CardDescription>Thousands ZAR (÷ 1000)</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={crmMoneyChart} layout="vertical" margin={{ left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [`${(v * 1000).toLocaleString()} ZAR`, ""]} />
                        <Bar dataKey="value" fill={CHART_COLORS[0]} radius={4} name="k ZAR" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : null}
              {pipelinePieData.length > 0 ? (
                <Card className="border-border/80 shadow-sm overflow-hidden lg:col-span-2">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-sm">Open pipeline by stage</CardTitle>
                    <CardDescription>Current deal distribution (not period-scoped)</CardDescription>
                  </CardHeader>
                  <CardContent className="h-72 flex justify-center pt-2">
                    <ResponsiveContainer width="100%" height="100%" maxHeight={280}>
                      <PieChart>
                        <Pie
                          data={pipelinePieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pipelinePieData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="crm" className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => exportCrmSummaryCsv()} disabled={!crmSummary}>
                <Download className="size-4 mr-1" /> CRM summary
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => exportSalesOrdersCsv()} disabled={!salesOrdersRep}>
                <Download className="size-4 mr-1" /> Sales orders
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Pipeline card shows <strong>current</strong> deal stages; table below is activity in the selected{" "}
              <strong>period</strong>.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Period activity</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>Quote requests: {crmSummary?.quoteRequestsInPeriod ?? "—"}</p>
                  <p>Quotes total: {crmSummary != null ? zar(crmSummary.quotesTotalZar) : "—"}</p>
                  <p>Invoices total: {crmSummary != null ? zar(crmSummary.invoicesTotalZar) : "—"}</p>
                  <p>Tasks created: {crmSummary?.tasksCreatedInPeriod ?? "—"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Sales orders in period</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesOrdersRep
                        ? Object.entries(salesOrdersRep.statusCounts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([st, c]) => (
                              <TableRow key={st}>
                                <TableCell className="capitalize">{st.replace(/_/g, " ")}</TableCell>
                                <TableCell className="text-right">{c}</TableCell>
                              </TableRow>
                            ))
                        : null}
                      {salesOrdersRep && Object.keys(salesOrdersRep.statusCounts).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-muted-foreground">
                            No orders in period.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                  <Link to="/crm/orders" className="text-xs text-primary mt-2 inline-block hover:underline">
                    Open orders →
                  </Link>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {salesOrderStatusChart.length > 0 ? (
                <Card className="border-border/80 shadow-sm">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-sm">Sales orders by status</CardTitle>
                    <CardDescription>In the selected period</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesOrderStatusChart} layout="vertical" margin={{ left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="value" radius={4} name="Orders">
                          {salesOrderStatusChart.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : null}
              {crmActivityCountChart.length > 0 ? (
                <Card className="border-border/80 shadow-sm">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-sm">Period funnel (counts)</CardTitle>
                    <CardDescription>Same metrics as overview CRM card</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={crmActivityCountChart}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={52} />
                        <YAxis width={32} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2} dot />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-2 justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Est. sales from shipments × list price. Admin sets per-SKU targets (30-day baseline) on{" "}
                <Link className="text-primary hover:underline" to="/crm/inventory/items">
                  Items
                </Link>
                .{" "}
                <Link className="text-primary hover:underline" to="/crm/inventory/reports">
                  Valuation &amp; margins →
                </Link>
                {windowDaysLabel ? (
                  <span className="block mt-1 text-xs">{windowDaysLabel}</span>
                ) : null}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => exportProductCsv()} disabled={!filteredProductRows.length}>
                <Download className="size-4 mr-1" /> Product metrics CSV
              </Button>
            </div>
            {salesMetrics ? (
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <Card className="p-3">
                  <p className="text-muted-foreground text-xs">Total shipped qty</p>
                  <p className="text-xl font-display tabular-nums">
                    {filteredProductRows.reduce((a, r) => a + r.shipped_qty, 0).toLocaleString()}
                  </p>
                </Card>
                <Card className="p-3">
                  <p className="text-muted-foreground text-xs">Est. sales ZAR</p>
                  <p className="text-xl font-display tabular-nums">
                    {zar(filteredProductRows.reduce((a, r) => a + r.est_sales_zar, 0))}
                  </p>
                </Card>
                <Card className="p-3">
                  <p className="text-muted-foreground text-xs">SKUs (filtered)</p>
                  <p className="text-xl font-display tabular-nums">{filteredProductRows.length}</p>
                </Card>
              </div>
            ) : null}
            <div className="grid gap-4 xl:grid-cols-2">
              {chartData && chartData.categoryShippedMix.length > 0 ? (
                <Card className="border-border/80 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Shipped qty by category</CardTitle>
                    <CardDescription>{chartData.periodLabel}</CardDescription>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.categoryShippedMix.slice(0, 12)} layout="vertical" margin={{ left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" name="Qty" fill="oklch(0.55 0.12 200)" radius={4} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground xl:col-span-1">No shipment mix for this period.</p>
              )}
              {chartData && chartData.weeklyShippedByKind.some((w) => w.raw + w.wip + w.finished > 0) ? (
                <Card className="border-border/80 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Shipments by kind (9 weeks)</CardTitle>
                    <CardDescription>Stacked raw / WIP / finished</CardDescription>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.weeklyShippedByKind}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                        <YAxis width={40} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="raw" stackId="a" fill={CHART_COLORS[4]} name="Raw" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="wip" stackId="a" fill={CHART_COLORS[2]} name="WIP" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="finished" stackId="a" fill={CHART_COLORS[0]} name="Finished" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : null}
              {chartData ? (
                <Card className="border-border/80 shadow-sm xl:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Last 7 days — shipment intensity</CardTitle>
                    <CardDescription>Relative index (max day = 100)</CardDescription>
                  </CardHeader>
                  <CardContent className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData.weekdayShipmentIntensity}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="day" />
                        <YAxis domain={[0, 100]} width={28} />
                        <Tooltip />
                        <Line type="monotone" dataKey="index" stroke={CHART_COLORS[1]} strokeWidth={2} dot name="Index" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : null}
              {topSkuVsTargetChart.length > 0 ? (
                <Card className="border-border/80 shadow-sm xl:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top SKUs — shipped vs sales target (scaled)</CardTitle>
                    <CardDescription>Targets only appear when set on the item</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topSkuVsTargetChart} margin={{ bottom: 48 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="sku" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={44} />
                        <YAxis width={40} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="shipped" fill={CHART_COLORS[0]} name="Shipped" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="salesTarget" fill={CHART_COLORS[3]} name="Sales target (period)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="produced" fill={CHART_COLORS[2]} name="Produced" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="prodTarget" fill={CHART_COLORS[5]} name="Production target (period)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : null}
            </div>
            <div className="rounded-md border border-border/80 max-h-[28rem] overflow-auto shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Shipped</TableHead>
                    <TableHead className="text-right">Ship %</TableHead>
                    <TableHead className="text-right">Produced</TableHead>
                    <TableHead className="text-right">Prod %</TableHead>
                    <TableHead className="text-right">Est. ZAR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProductRows.slice(0, 80).map((r: InvProductSaleRow) => {
                    const st = scaleInventoryTargetToWindow(r.sales_target_qty, bounds);
                    const pt = scaleInventoryTargetToWindow(r.production_target_qty, bounds);
                    return (
                      <TableRow key={r.item_id}>
                        <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                        <TableCell className="max-w-[140px] truncate">{r.name}</TableCell>
                        <TableCell className="text-xs">{r.category}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.shipped_qty.toFixed(2)}</TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums text-xs",
                            st != null && r.shipped_qty >= st && "text-emerald-700 dark:text-emerald-400 font-medium"
                          )}
                        >
                          {attainmentPct(r.shipped_qty, st)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.production_output_qty.toFixed(2)}</TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums text-xs",
                            pt != null && r.production_output_qty >= pt && "text-emerald-700 dark:text-emerald-400 font-medium"
                          )}
                        >
                          {attainmentPct(r.production_output_qty, pt)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{zar(r.est_sales_zar)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="workforce" className="space-y-4 mt-4">
            <div className="flex flex-wrap justify-between gap-2">
              <Link to="/crm/workforce/reports" className="text-sm text-primary hover:underline">
                Open full workforce reports →
              </Link>
              <Button type="button" variant="outline" size="sm" onClick={() => exportWorkforceCsv()}>
                <Download className="size-4 mr-1" /> Department minutes CSV
              </Button>
            </div>
            <Card className="border-border/80 shadow-sm">
              <CardContent className="pt-6 text-sm space-y-2">
                <p>
                  Access events (loaded): <strong>{workforceSum?.events.length ?? 0}</strong> (cap 2000)
                </p>
                <p>
                  Department segments: <strong>{workforceSum?.segments.length ?? 0}</strong>
                </p>
                <p>
                  Lost-time incidents: <strong>{workforceSum?.lost.length ?? 0}</strong>
                </p>
                {profile?.role === "sales" ? (
                  <p className="text-muted-foreground text-xs">
                    Some workforce detail may be limited for your role; managers see full attendance tooling.
                  </p>
                ) : null}
              </CardContent>
            </Card>
            {workforceDeptChart.length > 0 ? (
              <Card className="border-border/80 shadow-sm">
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm">Minutes by department</CardTitle>
                  <CardDescription>From segments overlapping the selected range</CardDescription>
                </CardHeader>
                <CardContent className="h-72 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workforceDeptChart} layout="vertical" margin={{ left: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => [formatMinutes(v), "Minutes"]} />
                      <Bar dataKey="minutes" fill={CHART_COLORS[1]} radius={4} name="Minutes" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">No department minutes in this range.</p>
            )}
          </TabsContent>

          <TabsContent value="factory" className="space-y-4 mt-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {fabricMixChart.length > 0 ? (
                <Card className="border-border/80 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Orders by fabric type</CardTitle>
                    <CardDescription>Count in period</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={fabricMixChart}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={44} />
                        <YAxis width={32} />
                        <Tooltip />
                        <Bar dataKey="value" fill={CHART_COLORS[2]} radius={4} name="Orders" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : null}
              {crmUsesSupabase() && qcPieData.length > 0 ? (
                <Card className="border-border/80 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">QC outcomes</CardTitle>
                    <CardDescription>Pass / fail mix in period</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64 flex justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={qcPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={44}
                          outerRadius={72}
                          paddingAngle={2}
                        >
                          {qcPieData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : null}
            </div>
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sales order mix (period)</CardTitle>
              </CardHeader>
              <CardContent>
                {!salesOrdersRep?.ordersInPeriod.length ? (
                  <p className="text-sm text-muted-foreground">No orders in this period.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Fabric</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesOrdersRep.ordersInPeriod.slice(0, 30).map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-xs">
                            <Link className="text-primary hover:underline" to={`/crm/orders/${o.id}`}>
                              {o.order_number}
                            </Link>
                          </TableCell>
                          <TableCell className="capitalize">{o.status.replace(/_/g, " ")}</TableCell>
                          <TableCell>{o.fabric_type ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Quality control</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {!crmUsesSupabase() ? (
                  <p className="text-muted-foreground">QC inspections require Supabase (not available in offline SQLite mode).</p>
                ) : (
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      Inspections: <strong>{qcSummary?.total ?? 0}</strong>
                    </li>
                    <li>
                      Pass / fail: <strong>{qcSummary?.passCount ?? 0}</strong> / <strong>{qcSummary?.failCount ?? 0}</strong>
                    </li>
                    <li>
                      Fail rate: <strong>{qcSummary?.total ? `${qcSummary.failPct}%` : "—"}</strong>
                    </li>
                  </ul>
                )}
                <Link to="/crm/automation/insights" className="text-xs text-primary mt-2 inline-block hover:underline">
                  Automation insights →
                </Link>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
              Samples and factory work orders in SQLite are limited; use Supabase for full factory modules.
            </p>
          </TabsContent>

          <TabsContent value="telemetry" className="space-y-4 mt-4">
            {isAutomationApiConfigured() ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-border/80 shadow-sm">
                  <CardContent className="pt-6 text-sm space-y-2">
                    <p>
                      Current OEE (rolling window from API): <strong>{oee != null ? `${oee.toFixed(1)}%` : "—"}</strong>
                    </p>
                    <p>
                      Machines in latest snapshot: <strong>{machineCount ?? "—"}</strong>
                    </p>
                    <Link to="/crm/automation" className="text-primary hover:underline text-xs">
                      Automation hub →
                    </Link>
                  </CardContent>
                </Card>
                {oee != null ? (
                  <Card className="border-border/80 shadow-sm">
                    <CardHeader className="pb-0">
                      <CardTitle className="text-sm">OEE gauge (chart)</CardTitle>
                      <CardDescription>0–100 scale from automation API</CardDescription>
                    </CardHeader>
                    <CardContent className="h-44 pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[{ name: "OEE", v: Math.min(100, Math.max(0, oee)) }]} margin={{ top: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 100]} width={28} />
                          <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, "OEE"]} />
                          <Bar dataKey="v" fill={CHART_COLORS[0]} radius={6} name="%" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Configure <code className="text-xs">VITE_AUTOMATION_API_URL</code> to include live production telemetry on this tab.
              </p>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
