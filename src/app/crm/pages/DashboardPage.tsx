import { useCallback, useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import { format, subDays } from "date-fns";
import {
  crmUsesSupabase,
  dashboardStats,
  isCrmDataAvailable,
} from "../../../lib/crm/crmRepo";
import { defectRateLast7Days, listSalesOrders } from "../../../lib/crm/factoryRepo";
import {
  fetchLatestMachines,
  fetchOeePct,
  isAutomationApiConfigured,
  type MachineTelemetryRow,
} from "../../../lib/automationApi";
import {
  fetchWorkforceDashboardSummary,
  formatMinutes,
  type WorkforceDashboardSummary,
} from "../../../lib/crm/workforceRepo";
import {
  invDashboardChartsData,
  invDashboardProductInsights,
  invOverviewStats,
  invProductSalesMetrics,
  type InvDashboardChartsData,
  type InvDashboardInsightRow,
  type InvProductSalesMetrics,
  type InvProductSalesTimeFilter,
  type InvProductSalesTimePreset,
} from "../../../lib/crm/inventoryRepo";
import { useCrmAuth } from "../CrmAuthContext";
import type { Database, InvItemKind } from "../database.types";
import { Input } from "../../components/ui/input";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Area,
  AreaChart,
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
import {
  mockBestSelling,
  standertonMillsFacts,
  standertonMillSteps,
  dashChartVar,
  mockTrending,
  pipelineStageFill,
  getPipelineChartData,
} from "../dashboardMockData";
import { toast } from "sonner";
import { Link } from "react-router";
import { FactoryFloorSimulation } from "../components/FactoryFloorSimulation";
import { MachineTelemetryStrip } from "../components/MachineTelemetryStrip";
import { cn } from "../../components/ui/utils";
import {
  TrendingUp,
  Award,
  Factory,
  Users,
  UserPlus,
  Briefcase,
  GitBranch,
  CircleDollarSign,
  UsersRound,
  Radio,
  Clock,
  ListTodo,
  Cpu,
} from "lucide-react";

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];

type ActivityJoined = ActivityRow & {
  contacts: Pick<ContactRow, "company_name"> | null;
};

function formatQty(q: number) {
  if (q >= 1000) return q.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (q >= 100) return q.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return q.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function InsightList({
  title,
  subtitle,
  rows,
  accent,
  icon: Icon,
  delayStart,
  emptyHint,
  sampleBadge,
}: {
  title: string;
  subtitle: string;
  rows: InvDashboardInsightRow[];
  accent: "amber" | "violet";
  icon: typeof Award;
  delayStart: number;
  emptyHint: string;
  /** When showing placeholder SKUs, label the card */
  sampleBadge?: string;
}) {
  const accentRing =
    accent === "amber"
      ? "ring-1 ring-[oklch(0.72_0.12_82/0.45)] bg-gradient-to-br from-[oklch(0.97_0.02_90)] to-[oklch(0.94_0.04_85)] dark:from-[oklch(0.22_0.03_85)] dark:to-[oklch(0.18_0.04_280)]"
      : "ring-1 ring-[oklch(0.55_0.16_280/0.4)] bg-gradient-to-br from-[oklch(0.96_0.02_280)] to-[oklch(0.92_0.04_260)] dark:from-[oklch(0.22_0.05_280)] dark:to-[oklch(0.16_0.04_260)]";

  return (
    <Card className={cn("overflow-hidden shadow-md", accentRing)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-lg",
              accent === "amber"
                ? "bg-[oklch(0.72_0.14_82/0.25)] text-[oklch(0.42_0.1_76)]"
                : "bg-[oklch(0.55_0.18_280/0.22)] text-[oklch(0.45_0.16_280)]"
            )}
          >
            <Icon className="size-4" />
          </div>
          <div>
            <CardTitle className="text-base font-display">{title}</CardTitle>
            <CardDescription className="text-xs">
              {subtitle}
              {sampleBadge ? (
                <span className="ml-1.5 inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground">
                  {sampleBadge}
                </span>
              ) : null}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">{emptyHint}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r, i) => (
              <li
                key={r.item_id}
                className="crm-dash-enter flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-card/60 px-3 py-2.5 backdrop-blur-sm"
                style={{ animationDelay: `${delayStart + i * 70}ms` }}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{r.sku}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-foreground">{formatQty(r.qty)}</p>
                  {r.deltaVsPriorPct != null ? (
                    <p
                      className={cn(
                        "text-[10px] font-medium tabular-nums",
                        r.deltaVsPriorPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {r.deltaVsPriorPct >= 0 ? "+" : ""}
                      {r.deltaVsPriorPct}% vs prior 28d
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link
          to="/crm/inventory/stock"
          className="inline-block pt-1 text-xs font-medium text-primary hover:underline"
        >
          View stock
        </Link>
      </CardContent>
    </Card>
  );
}

function SnapshotCard({
  label,
  value,
  href,
  linkLabel,
  icon: Icon,
  delay,
  valueFormat,
}: {
  label: string;
  value: string | number;
  href: string;
  linkLabel: string;
  icon: typeof Users;
  delay: number;
  valueFormat?: "zar";
}) {
  return (
    <Card
      className="crm-dash-enter border-border/80 shadow-sm transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-md"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardDescription className="text-xs">{label}</CardDescription>
          <CardTitle className="text-2xl font-display tabular-nums mt-1">
            {valueFormat === "zar" && typeof value === "number"
              ? value.toLocaleString(undefined, { style: "currency", currency: "ZAR", maximumFractionDigits: 0 })
              : value}
          </CardTitle>
        </div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Link to={href} className="text-xs font-medium text-primary hover:underline">
          {linkLabel}
        </Link>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const dashChartUid = useId().replace(/:/g, "");
  const { user, profile } = useCrmAuth();
  const [openTasks, setOpenTasks] = useState(0);
  const [stageCounts, setStageCounts] = useState<{ stage: string; count: number }[]>([]);
  const [recent, setRecent] = useState<ActivityJoined[]>([]);
  const [contactCount, setContactCount] = useState(0);
  const [dealCount, setDealCount] = useState(0);
  const [leadsCount, setLeadsCount] = useState(0);
  const [wonDealsValue, setWonDealsValue] = useState(0);
  const [pipelineOpenCount, setPipelineOpenCount] = useState(0);
  const [workforceSummary, setWorkforceSummary] = useState<WorkforceDashboardSummary | null>(null);
  const [invOpenPOs, setInvOpenPOs] = useState(0);
  const [invOpenShips, setInvOpenShips] = useState(0);
  const [invStockValue, setInvStockValue] = useState(0);
  const [bestSelling, setBestSelling] = useState<InvDashboardInsightRow[]>([]);
  const [trending, setTrending] = useState<InvDashboardInsightRow[]>([]);
  const [insightBasis, setInsightBasis] = useState<"shipments" | "production_output" | "empty">("empty");
  const [salesMetrics, setSalesMetrics] = useState<InvProductSalesMetrics | null>(null);
  const [chartData, setChartData] = useState<InvDashboardChartsData | null>(null);
  const [salesMetricsLoading, setSalesMetricsLoading] = useState(false);
  const [salesPeriodUi, setSalesPeriodUi] = useState<InvProductSalesTimePreset>("all");
  const [salesCustomFrom, setSalesCustomFrom] = useState("");
  const [salesCustomTo, setSalesCustomTo] = useState("");
  const [salesKindFilter, setSalesKindFilter] = useState<"all" | InvItemKind>("all");
  const [salesCategoryFilter, setSalesCategoryFilter] = useState("");
  const [salesSearch, setSalesSearch] = useState("");
  const [salesActivityFilter, setSalesActivityFilter] = useState<
    "all" | "shipped" | "produced" | "any_output"
  >("all");
  const [loading, setLoading] = useState(true);
  const [autoMachines, setAutoMachines] = useState<MachineTelemetryRow[]>([]);
  const [autoOee, setAutoOee] = useState<number | null>(null);
  const [autoDefectPct, setAutoDefectPct] = useState<number | null>(null);
  const [orderBacklog, setOrderBacklog] = useState<number | null>(null);

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
      setContactCount(stats.contactCount);
      setDealCount(stats.dealCount);
      setLeadsCount(stats.leadsCount);
      setWonDealsValue(stats.wonDealsValue);
      setPipelineOpenCount(stats.pipelineOpenCount);
      if (profile?.role === "admin" || profile?.role === "production_manager") {
        try {
          setWorkforceSummary(await fetchWorkforceDashboardSummary());
        } catch {
          setWorkforceSummary(null);
        }
      } else {
        setWorkforceSummary(null);
      }
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
      try {
        const insights = await invDashboardProductInsights();
        setBestSelling(insights.bestSelling);
        setTrending(insights.trending);
        setInsightBasis(insights.basis);
      } catch {
        setBestSelling([]);
        setTrending([]);
        setInsightBasis("empty");
      }
      if (isAutomationApiConfigured()) {
        try {
          setAutoMachines(await fetchLatestMachines());
        } catch {
          setAutoMachines([]);
        }
        try {
          setAutoOee(await fetchOeePct());
        } catch {
          setAutoOee(null);
        }
      } else {
        setAutoMachines([]);
        setAutoOee(null);
      }
      if (crmUsesSupabase()) {
        try {
          const d = await defectRateLast7Days();
          setAutoDefectPct(d.failPct);
          const ords = await listSalesOrders();
          setOrderBacklog(
            ords.filter((o) => !["delivered", "cancelled"].includes(o.status)).length
          );
        } catch {
          setAutoDefectPct(null);
          setOrderBacklog(null);
        }
      } else {
        setAutoDefectPct(null);
        setOrderBacklog(null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }, [user, profile?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isCrmDataAvailable() || !user) {
      setSalesMetricsLoading(false);
      return;
    }
    if (
      salesPeriodUi === "custom" &&
      (!salesCustomFrom.trim() || !salesCustomTo.trim())
    ) {
      setSalesMetricsLoading(false);
      return;
    }
    const filter: InvProductSalesTimeFilter =
      salesPeriodUi === "all"
        ? { preset: "all" }
        : salesPeriodUi === "custom"
          ? {
              preset: "custom",
              from: salesCustomFrom.trim(),
              to: salesCustomTo.trim(),
            }
          : { preset: salesPeriodUi };

    let cancelled = false;
    setSalesMetricsLoading(true);
    void invProductSalesMetrics(filter)
      .then(async (m) => {
        if (cancelled) return;
        setSalesMetrics(m);
        try {
          const charts = await invDashboardChartsData(filter, m);
          if (!cancelled) setChartData(charts);
        } catch {
          if (!cancelled) setChartData(null);
        }
        if (!cancelled) setSalesMetricsLoading(false);
      })
      .catch((e) => {
        if (!cancelled) {
          setSalesMetrics(null);
          setChartData(null);
          setSalesMetricsLoading(false);
          toast.error(e instanceof Error ? e.message : "Could not load sales metrics");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, salesPeriodUi, salesCustomFrom, salesCustomTo]);

  const salesCategories = useMemo(() => {
    if (!salesMetrics) return [];
    return [...new Set(salesMetrics.rows.map((r) => r.category))].sort((a, b) => a.localeCompare(b));
  }, [salesMetrics]);

  const filteredSalesRows = useMemo(() => {
    if (!salesMetrics) return [];
    const q = salesSearch.trim().toLowerCase();
    return salesMetrics.rows
      .filter((r) => {
        if (salesKindFilter !== "all" && r.kind !== salesKindFilter) return false;
        if (salesCategoryFilter && r.category !== salesCategoryFilter) return false;
        if (q && !r.sku.toLowerCase().includes(q) && !r.name.toLowerCase().includes(q)) return false;
        if (salesActivityFilter === "shipped" && r.shipped_qty <= 0) return false;
        if (salesActivityFilter === "produced" && r.production_output_qty <= 0) return false;
        if (
          salesActivityFilter === "any_output" &&
          r.shipped_qty <= 0 &&
          r.production_output_qty <= 0
        )
          return false;
        return true;
      })
      .sort((a, b) => b.est_sales_zar - a.est_sales_zar || a.name.localeCompare(b.name));
  }, [salesMetrics, salesKindFilter, salesCategoryFilter, salesSearch, salesActivityFilter]);

  const filteredSalesTotals = useMemo(() => {
    let est = 0;
    let shipped = 0;
    for (const r of filteredSalesRows) {
      est += r.est_sales_zar;
      shipped += r.shipped_qty;
    }
    return {
      estSalesZar: Math.round(est * 100) / 100,
      shippedQty: shipped,
      rowCount: filteredSalesRows.length,
    };
  }, [filteredSalesRows]);

  const inventoryPieData = useMemo((): { name: string; value: number; fill: string }[] => {
    const placeholder = (label: string): { name: string; value: number; fill: string }[] => [
      {
        name: label,
        value: 1,
        fill: "color-mix(in oklch, var(--muted-foreground) 35%, transparent)",
      },
    ];

    const fromFiltered = (): { name: string; value: number }[] => {
      const catMap = new Map<string, number>();
      for (const r of filteredSalesRows) {
        if (r.shipped_qty <= 0) continue;
        const c = String(r.category ?? "").trim() || "Uncategorized";
        catMap.set(c, (catMap.get(c) ?? 0) + r.shipped_qty);
      }
      return [...catMap.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    };

    let slices: { name: string; value: number }[];
    if (salesMetrics) {
      slices = fromFiltered();
    } else if (chartData?.categoryShippedMix.length) {
      slices = chartData.categoryShippedMix;
    } else {
      return placeholder("No data yet");
    }

    if (!slices.length) {
      return placeholder(
        salesMetrics && salesMetrics.totalShippedQty > 0
          ? "No shipped qty in current table filters"
          : "No shipments in period"
      );
    }
    return slices.map((d, i) => ({
      ...d,
      fill: dashChartVar((((i % 5) + 1) as 1 | 2 | 3 | 4 | 5)),
    }));
  }, [salesMetrics, filteredSalesRows, chartData]);

  if (!isCrmDataAvailable()) {
    return (
      <p className="text-sm text-muted-foreground">CRM storage is not available.</p>
    );
  }

  const basisNote =
    insightBasis === "shipments"
      ? "Rankings use completed shipment quantities (outbound)."
      : insightBasis === "production_output"
        ? "No shipments yet — showing production receipt volumes as a proxy."
        : "Add items and post receipts, production, or shipments to populate rankings.";

  const displayBest = bestSelling.length > 0 ? bestSelling : mockBestSelling;
  const displayTrending = trending.length > 0 ? trending : mockTrending;
  const bestSampleBadge = bestSelling.length === 0 ? "Sample data" : undefined;
  const trendSampleBadge = trending.length === 0 ? "Sample data" : undefined;
  const { data: pipelineData, isSample: pipelineIsSample } = getPipelineChartData(stageCounts);

  const tipStyle: CSSProperties = {
    borderRadius: "10px",
    border: "1px solid color-mix(in oklch, var(--foreground) 12%, transparent)",
    background: "color-mix(in oklch, var(--card) 92%, transparent)",
    backdropFilter: "blur(8px)",
  };

  return (
    <div className="space-y-8">
      <div className="crm-dash-enter flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Dashboard</h2>
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
          <Factory className="size-3.5 text-[oklch(0.55_0.12_200)]" />
          Inventory &amp; pipeline overview
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground crm-dash-enter">Loading…</p>
      ) : (
        <>
          <section
            className="crm-dash-charts crm-dash-enter space-y-5 rounded-2xl border border-border/60 bg-gradient-to-b from-card/95 via-card to-card p-5 shadow-[0_20px_48px_-24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] dark:shadow-[0_24px_56px_-28px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.04)]"
            style={{ animationDelay: "12ms" }}
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-base font-display font-bold tracking-tight text-foreground sm:text-lg">
                  Inventory &amp; shipment analytics
                </h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
                  Charts use real shipment ledger data. <span className="font-medium text-foreground">Category mix</span>{" "}
                  uses the same period and table filters (kind, category, search, activity) as product sales below; weekly
                  stacks and shipping rhythm use trailing windows from the ledger.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Live · CRM ledger
              </span>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Card className="crm-dash-chart-card group relative overflow-hidden rounded-xl border-border/70 bg-card/80 shadow-md backdrop-blur-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl xl:col-span-2">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.65_0.14_85/0.5)] to-transparent opacity-80" />
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-base font-display">Shipment volume by week</CardTitle>
                  <CardDescription className="text-xs">
                    Stacked outbound qty by item kind (raw · WIP · finished) — last eight weeks.
                  </CardDescription>
                </CardHeader>
                <CardContent className="min-h-[360px] h-[min(48vh,480px)] pt-0 pb-4">
                  {chartData?.weeklyShippedByKind?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartData.weeklyShippedByKind}
                        margin={{ top: 16, right: 12, left: 4, bottom: 8 }}
                      >
                        <defs>
                          <linearGradient id={`${dashChartUid}-wk-raw`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.82} />
                            <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.12} />
                          </linearGradient>
                          <linearGradient id={`${dashChartUid}-wk-wip`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.85} />
                            <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0.12} />
                          </linearGradient>
                          <linearGradient id={`${dashChartUid}-wk-fin`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.85} />
                            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.12} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in oklch, var(--foreground) 8%, transparent)" />
                        <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                        <YAxis tick={{ fontSize: 11 }} width={44} stroke="var(--muted-foreground)" />
                        <Tooltip contentStyle={tipStyle} />
                        <Legend wrapperStyle={{ fontSize: "12px", paddingTop: 8 }} />
                        <Area
                          type="monotone"
                          dataKey="raw"
                          name="Raw"
                          stackId="w"
                          stroke="var(--chart-3)"
                          strokeWidth={2}
                          fill={`url(#${dashChartUid}-wk-raw)`}
                        />
                        <Area
                          type="monotone"
                          dataKey="wip"
                          name="WIP"
                          stackId="w"
                          stroke="var(--chart-4)"
                          strokeWidth={2}
                          fill={`url(#${dashChartUid}-wk-wip)`}
                        />
                        <Area
                          type="monotone"
                          dataKey="finished"
                          name="Finished"
                          stackId="w"
                          stroke="var(--chart-2)"
                          strokeWidth={2}
                          fill={`url(#${dashChartUid}-wk-fin)`}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No weekly shipment data yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="crm-dash-chart-card group relative overflow-hidden rounded-xl border-border/70 bg-card/80 shadow-md backdrop-blur-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.55_0.14_280/0.45)] to-transparent opacity-80" />
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-base font-display">Product line mix</CardTitle>
                  <CardDescription className="text-xs">
                    Share of shipped quantity —{" "}
                    <span className="font-medium text-foreground">{chartData?.periodLabel ?? "—"}</span>, matching table
                    filters below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="min-h-[360px] h-[min(48vh,480px)] pt-0 pb-2 flex flex-col">
                  <div className="min-h-[260px] flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                        <Pie
                          data={inventoryPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="38%"
                          cy="50%"
                          innerRadius="52%"
                          outerRadius="72%"
                          paddingAngle={2}
                          stroke="var(--card)"
                          strokeWidth={2}
                        >
                          {inventoryPieData.map((entry, idx) => (
                            <Cell key={`${entry.name}-${idx}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={tipStyle}
                          formatter={(v: number, _n, p: { payload?: { name?: string } }) => [
                            `${Number(v).toLocaleString()} qty`,
                            p.payload?.name ?? "",
                          ]}
                        />
                        <Legend
                          layout="vertical"
                          align="right"
                          verticalAlign="middle"
                          wrapperStyle={{
                            fontSize: "11px",
                            lineHeight: 1.45,
                            paddingLeft: 8,
                            maxHeight: "100%",
                            overflowY: "auto",
                            width: "58%",
                            right: 0,
                          }}
                          formatter={(value) => (
                            <span
                              className="text-muted-foreground inline-block max-w-[min(220px,32vw)] break-words text-left align-middle"
                              title={String(value)}
                            >
                              {value}
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {salesMetrics != null && salesMetrics.totalShippedQty > 0 && filteredSalesTotals.shippedQty === 0 ? (
                    <p className="text-[11px] text-muted-foreground px-1 pb-1">
                      This period has shipments, but nothing in view matches your filters — widen filters to see the mix.
                    </p>
                  ) : salesMetrics != null && salesMetrics.totalShippedQty === 0 ? (
                    <p className="text-[11px] text-muted-foreground px-1 pb-1">
                      Post completed shipments for the selected period to populate this chart.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="crm-dash-chart-card group relative overflow-hidden rounded-xl border-border/70 bg-card/80 shadow-md backdrop-blur-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.6_0.12_200/0.45)] to-transparent opacity-80" />
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-base font-display">Shipping rhythm</CardTitle>
                  <CardDescription className="text-xs">Last seven days — relative load (max day = 100%).</CardDescription>
                </CardHeader>
                <CardContent className="min-h-[320px] h-[min(42vh,420px)] pt-0 pb-4">
                  {chartData?.weekdayShipmentIntensity?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData.weekdayShipmentIntensity} margin={{ top: 16, right: 12, left: 4, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in oklch, var(--foreground) 8%, transparent)" />
                        <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={32} stroke="var(--muted-foreground)" />
                        <Tooltip contentStyle={tipStyle} />
                        <Line
                          type="monotone"
                          dataKey="index"
                          name="Load index"
                          stroke="var(--chart-1)"
                          strokeWidth={3}
                          dot={{ r: 5, fill: "var(--chart-5)", strokeWidth: 2, stroke: "var(--card)" }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No data.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="crm-dash-chart-card group relative overflow-hidden rounded-xl border-border/70 bg-card/80 shadow-md backdrop-blur-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.72_0.12_82/0.4)] to-transparent opacity-80" />
                <CardHeader className="pb-2 pt-4">
                  <CardDescription>
                    Deals by stage
                    {pipelineIsSample ? (
                      <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-amber-700/90 dark:text-amber-400/90">
                        Sample pipeline
                      </span>
                    ) : null}
                  </CardDescription>
                  <CardTitle className="text-lg font-display">Sales pipeline</CardTitle>
                </CardHeader>
                <CardContent className="min-h-[320px] h-[min(42vh,420px)]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pipelineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in oklch, var(--foreground) 10%, transparent)" />
                      <XAxis dataKey="stage" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} stroke="var(--muted-foreground)" />
                      <Tooltip contentStyle={tipStyle} />
                      <Bar dataKey="count" radius={[10, 10, 0, 0]} name="Deals">
                        {pipelineData.map((row) => (
                          <Cell key={row.stage} fill={pipelineStageFill(row.stage)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </section>

          <div
            className="crm-dash-enter relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-r from-card via-[oklch(0.98_0.015_85)] to-[oklch(0.96_0.02_200/0.35)] p-5 shadow-sm dark:from-card dark:via-[oklch(0.18_0.02_265)] dark:to-[oklch(0.16_0.04_260)]"
            style={{ animationDelay: "24ms" }}
          >
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-[oklch(0.72_0.12_82/0.2)] blur-2xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-40 rounded-full bg-[oklch(0.55_0.12_220/0.15)] blur-2xl" />
            <div className="relative max-w-3xl">
              <h3 className="font-display text-lg font-bold tracking-tight gold-text-shimmer sm:text-xl">Standerton Mills</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Sales pipeline, inventory, and throughput aligned with{" "}
                <a
                  href="https://www.standertonmills.co.za/"
                  className="text-primary underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  standertonmills.co.za
                </a>
                : technical yarns and woven fabrics — spinning, twisting, weaving, finishing, packing, and shipping.
              </p>
            </div>
          </div>

          <section
            className="crm-dash-enter grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
            style={{ animationDelay: "28ms" }}
            aria-label="Company snapshot from public site"
          >
            {standertonMillsFacts.map((f) => (
              <div
                key={f.label}
                className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5 shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-md"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</p>
                <p className="font-display text-lg font-bold tabular-nums text-foreground">{f.value}</p>
                <p className="text-[11px] text-muted-foreground leading-snug">{f.detail}</p>
              </div>
            ))}
          </section>

          <section className="crm-dash-enter space-y-3" style={{ animationDelay: "40ms" }}>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">CRM snapshot</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <SnapshotCard
                label="Contacts"
                value={contactCount}
                href="/crm/contacts"
                linkLabel="View contacts"
                icon={Users}
                delay={50}
              />
              <SnapshotCard
                label="Leads"
                value={leadsCount}
                href="/crm/contacts"
                linkLabel="Open contacts"
                icon={UserPlus}
                delay={60}
              />
              <SnapshotCard
                label="Deals"
                value={dealCount}
                href="/crm/deals"
                linkLabel="Pipeline"
                icon={Briefcase}
                delay={70}
              />
              <SnapshotCard
                label="Open pipeline"
                value={pipelineOpenCount}
                href="/crm/deals"
                linkLabel="Qualification & proposal"
                icon={GitBranch}
                delay={80}
              />
              <SnapshotCard
                label="Won value"
                value={wonDealsValue}
                href="/crm/deals"
                linkLabel="Deals"
                icon={CircleDollarSign}
                delay={90}
                valueFormat="zar"
              />
              <SnapshotCard
                label="Open tasks"
                value={openTasks}
                href="/crm/tasks"
                linkLabel="Tasks"
                icon={ListTodo}
                delay={100}
              />
            </div>
          </section>

          {(profile?.role === "admin" || profile?.role === "production_manager") &&
          workforceSummary ? (
            <Card
              className="crm-dash-enter border-border/80 shadow-sm overflow-hidden"
              style={{ animationDelay: "110ms" }}
            >
              <CardHeader className="pb-2 flex flex-row flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-display">Workforce pulse</CardTitle>
                  <CardDescription className="text-xs">
                    Attendance & RFID — last 7 days lost-time totals
                  </CardDescription>
                </div>
                <Link
                  to="/crm/workforce"
                  className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  <UsersRound className="size-3.5" />
                  Live board
                </Link>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Active staff</p>
                    <p className="text-2xl font-display tabular-nums">{workforceSummary.activeEmployees}</p>
                  </div>
                  <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">On site now</p>
                    <p className="text-2xl font-display tabular-nums text-emerald-700 dark:text-emerald-400">
                      {workforceSummary.onSiteNow}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                      <Radio className="size-3" />
                      Dept readers
                    </p>
                    <p className="text-2xl font-display tabular-nums">{workforceSummary.departmentReaders}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Lost-time events (7d)</p>
                    <p className="text-2xl font-display tabular-nums">{workforceSummary.lostIncidents7d}</p>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" />
                      Lost minutes (7d)
                    </p>
                    <p className="text-2xl font-display tabular-nums">{formatMinutes(workforceSummary.lostMinutes7d)}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  <Link to="/crm/workforce/reports" className="text-primary hover:underline">
                    Reports &amp; CSV
                  </Link>
                  <Link to="/crm/workforce/employees" className="text-primary hover:underline">
                    Employees
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <section className="crm-dash-enter space-y-3" style={{ animationDelay: "72ms" }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold tracking-tight text-foreground inline-flex items-center gap-2">
                <Cpu className="size-4 text-primary" />
                Factory automation
              </h3>
              <Link
                to="/crm/automation/insights"
                className="text-xs font-medium text-primary hover:underline"
              >
                Automation insights
              </Link>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Machine OEE (24h)
                </p>
                <p className="font-display text-lg font-bold tabular-nums">
                  {autoOee != null ? `${Math.round(autoOee)}%` : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  QC fail rate (7d)
                </p>
                <p className="font-display text-lg font-bold tabular-nums">
                  {autoDefectPct != null ? `${autoDefectPct}%` : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Open sales orders
                </p>
                <p className="font-display text-lg font-bold tabular-nums">
                  {orderBacklog != null ? orderBacklog : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5 flex items-center">
                <Link
                  to="/crm/orders"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Manage orders →
                </Link>
              </div>
            </div>
            <MachineTelemetryStrip machines={autoMachines} />
          </section>

          <div className="crm-dash-enter space-y-3" style={{ animationDelay: "80ms" }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">Mill floor</h3>
              <Link
                to="/crm/inventory"
                className="text-xs font-medium text-primary hover:underline"
              >
                Open inventory
              </Link>
            </div>
            <FactoryFloorSimulation />
          </div>

          <Card
            className="crm-dash-enter border-border/80 shadow-sm"
            style={{ animationDelay: "100ms" }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Integrated manufacturing</CardTitle>
              <CardDescription className="text-xs max-w-3xl">
                Flow from the{" "}
                <a
                  href="https://www.standertonmills.co.za/"
                  className="text-primary underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Standerton Mills
                </a>{" "}
                site — map SKUs and locations (fibre and yarn intake, WIP, greige, coated finishes, FG) to receipts,
                production, and shipments in this CRM.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {standertonMillSteps.map((step, i) => (
                  <li
                    key={step.title}
                    className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5 text-sm"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Step {i + 1}
                    </span>
                    <p className="font-medium text-foreground leading-snug">{step.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{step.detail}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2 crm-dash-enter" style={{ animationDelay: "120ms" }}>
            <InsightList
              title="Best selling"
              subtitle="Yarn &amp; fabric SKUs — lifetime outbound (or production receipts if no shipments yet)"
              rows={displayBest}
              accent="amber"
              icon={Award}
              delayStart={180}
              emptyHint="Complete shipments to rank technical yarns, woven greige, and finished goods by volume."
              sampleBadge={bestSampleBadge}
            />
            <InsightList
              title="Trending"
              subtitle="Last 28 days vs the prior 28 days"
              rows={displayTrending}
              accent="violet"
              icon={TrendingUp}
              delayStart={220}
              emptyHint="No recent movement in the window — rankings appear as you ship or receive production."
              sampleBadge={trendSampleBadge}
            />
          </div>
          <p className="text-[11px] text-muted-foreground crm-dash-enter -mt-2" style={{ animationDelay: "140ms" }}>
            {basisNote}
            {bestSampleBadge || trendSampleBadge
              ? " Lists marked “Sample data” use mock SKUs until your ledger has movement."
              : ""}
          </p>

          <Card
            className="crm-dash-enter border-border/80 shadow-sm overflow-hidden"
            style={{ animationDelay: "150ms" }}
          >
            <CardHeader className="pb-2 flex flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base font-display">Product sales &amp; pricing averages</CardTitle>
                <CardDescription className="text-xs max-w-2xl">
                  Active inventory SKUs — estimated sales uses shipment quantities in the selected period × list price.
                  Pricing averages (list, cost, margin) are from the catalog. Narrow rows by kind, category, search, or
                  movement.
                </CardDescription>
              </div>
              <Link
                to="/crm/inventory/items"
                className="text-xs font-medium text-primary hover:underline shrink-0"
              >
                Edit prices in items
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
                <div className="grid gap-1.5 min-w-[160px]">
                  <label className="text-[11px] font-medium text-muted-foreground">Sales period</label>
                  <Select
                    value={salesPeriodUi}
                    onValueChange={(v) => {
                      const next = v as InvProductSalesTimePreset;
                      if (next === "custom" && (!salesCustomFrom.trim() || !salesCustomTo.trim())) {
                        const today = new Date();
                        setSalesCustomFrom(format(subDays(today, 29), "yyyy-MM-dd"));
                        setSalesCustomTo(format(today, "yyyy-MM-dd"));
                      }
                      setSalesPeriodUi(next);
                    }}
                  >
                    <SelectTrigger className="h-9 w-[200px]">
                      <SelectValue placeholder="Period" />
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
                {salesPeriodUi === "custom" ? (
                  <>
                    <div className="grid gap-1.5">
                      <label className="text-[11px] font-medium text-muted-foreground" htmlFor="sales-from">
                        From
                      </label>
                      <Input
                        id="sales-from"
                        type="date"
                        className="h-9 w-[155px]"
                        value={salesCustomFrom}
                        onChange={(e) => setSalesCustomFrom(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-[11px] font-medium text-muted-foreground" htmlFor="sales-to">
                        To
                      </label>
                      <Input
                        id="sales-to"
                        type="date"
                        className="h-9 w-[155px]"
                        value={salesCustomTo}
                        onChange={(e) => setSalesCustomTo(e.target.value)}
                      />
                    </div>
                  </>
                ) : null}
                {salesMetrics && !salesMetricsLoading ? (
                  <p className="text-[11px] text-muted-foreground pb-1 min-w-[120px] flex-1">
                    <span className="font-medium text-foreground">Period:</span> {salesMetrics.periodLabel}
                  </p>
                ) : salesMetricsLoading ? (
                  <p className="text-[11px] text-muted-foreground pb-1 animate-pulse">Updating metrics…</p>
                ) : null}
              </div>
              {salesPeriodUi === "custom" && (!salesCustomFrom.trim() || !salesCustomTo.trim()) ? (
                <p className="text-sm text-muted-foreground">
                  Choose a start and end date to load sales for a custom range.
                </p>
              ) : null}
              {salesMetrics ? (
                <>
                  <p className="text-[11px] text-muted-foreground -mt-1">
                    Shipped and production-out quantities below are for{" "}
                    <span className="font-medium text-foreground">{salesMetrics.periodLabel}</span>.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-border/60 bg-muted/25 px-3 py-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Avg list price (finished)
                      </p>
                      <p className="text-xl font-display tabular-nums mt-0.5">
                        {salesMetrics.avgListPriceFinished != null
                          ? salesMetrics.avgListPriceFinished.toLocaleString(undefined, {
                              style: "currency",
                              currency: "ZAR",
                              maximumFractionDigits: 0,
                            })
                          : "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">Active SKUs with list &gt; 0</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/25 px-3 py-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Avg standard cost
                      </p>
                      <p className="text-xl font-display tabular-nums mt-0.5">
                        {salesMetrics.avgStandardCostActive != null
                          ? salesMetrics.avgStandardCostActive.toLocaleString(undefined, {
                              style: "currency",
                              currency: "ZAR",
                              maximumFractionDigits: 0,
                            })
                          : "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">Active SKUs with cost &gt; 0</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/25 px-3 py-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Avg margin (on list)
                      </p>
                      <p className="text-xl font-display tabular-nums mt-0.5">
                        {salesMetrics.avgMarginPct != null
                          ? `${salesMetrics.avgMarginPct.toFixed(1)}%`
                          : "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">(List − standard cost) ÷ list</p>
                    </div>
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Est. sales (shipments × list)
                      </p>
                      <p className="text-xl font-display tabular-nums text-emerald-800 dark:text-emerald-300 mt-0.5">
                        {salesMetrics.totalEstSalesZar.toLocaleString(undefined, {
                          style: "currency",
                          currency: "ZAR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatQty(salesMetrics.totalShippedQty)} units in period ·{" "}
                        {salesMetrics.skusWithShipments} SKU
                        {salesMetrics.skusWithShipments === 1 ? "" : "s"} with shipments
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="grid gap-1.5 min-w-[140px]">
                      <label className="text-[11px] font-medium text-muted-foreground">Kind</label>
                      <Select
                        value={salesKindFilter}
                        onValueChange={(v) => setSalesKindFilter(v as "all" | InvItemKind)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Kind" />
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
                      <label className="text-[11px] font-medium text-muted-foreground">Category</label>
                      <Select
                        value={salesCategoryFilter || "__all__"}
                        onValueChange={(v) => setSalesCategoryFilter(v === "__all__" ? "" : v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">All categories</SelectItem>
                          {salesCategories.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5 min-w-[200px] flex-1 min-[320px]:min-w-[220px]">
                      <label className="text-[11px] font-medium text-muted-foreground">Search SKU / name</label>
                      <Input
                        className="h-9"
                        placeholder="Filter…"
                        value={salesSearch}
                        onChange={(e) => setSalesSearch(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5 min-w-[200px]">
                      <label className="text-[11px] font-medium text-muted-foreground">Sales / production</label>
                      <Select
                        value={salesActivityFilter}
                        onValueChange={(v) =>
                          setSalesActivityFilter(v as typeof salesActivityFilter)
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All SKUs</SelectItem>
                          <SelectItem value="shipped">With shipment qty</SelectItem>
                          <SelectItem value="produced">With production output</SelectItem>
                          <SelectItem value="any_output">Shipped or produced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <span>
                      <span className="font-medium text-foreground">Filtered rows:</span>{" "}
                      {filteredSalesTotals.rowCount}
                    </span>
                    <span className="tabular-nums">
                      <span className="font-medium text-foreground">Σ List × shipped (est.):</span>{" "}
                      {filteredSalesTotals.estSalesZar.toLocaleString(undefined, {
                        style: "currency",
                        currency: "ZAR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </span>
                    <span className="tabular-nums">
                      <span className="font-medium text-foreground">Σ Shipped qty:</span>{" "}
                      {formatQty(filteredSalesTotals.shippedQty)}
                    </span>
                  </div>
                  <div className="rounded-md border border-border/70 overflow-x-auto max-h-[min(420px,55vh)] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Kind</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">List price</TableHead>
                          <TableHead className="text-right">Std cost</TableHead>
                          <TableHead className="text-right">Shipped (period)</TableHead>
                          <TableHead className="text-right">Prod. out (period)</TableHead>
                          <TableHead className="text-right">Est. sales</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSalesRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-muted-foreground text-sm py-6 text-center">
                              No rows match these filters.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredSalesRows.map((r) => (
                            <TableRow key={r.item_id}>
                              <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                              <TableCell className="max-w-[200px] truncate">{r.name}</TableCell>
                              <TableCell className="capitalize text-muted-foreground">{r.kind}</TableCell>
                              <TableCell className="text-muted-foreground text-xs max-w-[140px] truncate">
                                {r.category}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-xs">
                                {r.list_price_zar.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-xs">
                                {r.standard_cost.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-xs">
                                {formatQty(r.shipped_qty)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-xs">
                                {formatQty(r.production_output_qty)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-xs font-medium">
                                {r.est_sales_zar.toLocaleString(undefined, {
                                  style: "currency",
                                  currency: "ZAR",
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-2">
                  Could not load sales metrics — check inventory connectivity.
                </p>
              )}
            </CardContent>
          </Card>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 crm-dash-enter" style={{ animationDelay: "300ms" }}>
              Inventory snapshot
            </h3>
            <p className="text-xs text-muted-foreground mb-3 crm-dash-enter max-w-2xl" style={{ animationDelay: "310ms" }}>
              Production orders and shipments for yarn WIP, greige and industrial woven rolls, coated finishes, and
              packed FG — fibres include cotton, synthetic, acrylic, and blends per product range.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: "Open production orders",
                  value: invOpenPOs,
                  href: "/crm/inventory/production",
                  link: "Production",
                  delay: 340,
                  bar: "from-[oklch(0.55_0.12_200)] to-[oklch(0.45_0.1_250)]",
                },
                {
                  label: "Open shipments",
                  value: invOpenShips,
                  href: "/crm/inventory/shipments",
                  link: "Shipments",
                  delay: 400,
                  bar: "from-[oklch(0.62_0.14_85)] to-[oklch(0.5_0.12_70)]",
                },
                {
                  label: "Stock value (all items, std cost)",
                  value: invStockValue,
                  href: "/crm/inventory/reports",
                  link: "Reports",
                  delay: 460,
                  bar: "from-[oklch(0.5_0.08_280)] to-[oklch(0.42_0.12_300)]",
                  format: "zar" as const,
                },
              ].map((card) => (
                <Card
                  key={card.label}
                  className="crm-dash-enter group relative overflow-hidden border-border/80 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg"
                  style={{ animationDelay: `${card.delay}ms` }}
                >
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-90",
                      card.bar
                    )}
                  />
                  <CardHeader className="pb-2">
                    <CardDescription>{card.label}</CardDescription>
                    <CardTitle className="text-2xl font-display tabular-nums sm:text-[1.65rem]">
                      {card.format === "zar"
                        ? invStockValue.toLocaleString(undefined, {
                            style: "currency",
                            currency: "ZAR",
                            maximumFractionDigits: 0,
                          })
                        : card.value}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link to={card.href} className="text-sm font-medium text-primary hover:underline">
                      {card.link}
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card
            className="crm-dash-enter border-border/80 shadow-sm"
            style={{ animationDelay: "520ms" }}
          >
            <CardHeader>
              <CardTitle className="text-lg">Recent activities</CardTitle>
              <CardDescription>Latest logged across the team</CardDescription>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activities yet.</p>
              ) : (
                <ul className="space-y-3">
                  {recent.map((a, i) => (
                    <li
                      key={a.id}
                      className="crm-dash-enter flex flex-wrap gap-2 border-b border-border/60 pb-3 text-sm last:border-0"
                      style={{ animationDelay: `${560 + i * 40}ms` }}
                    >
                      <span className="font-medium capitalize">{a.kind}</span>
                      <span className="text-muted-foreground">
                        {format(new Date(a.occurred_at), "PPp")}
                      </span>
                      <span className="w-full">{a.subject}</span>
                      {a.contacts?.company_name ? (
                        <span className="w-full text-xs text-muted-foreground">
                          {a.contacts.company_name}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <Link
                to="/crm/activities"
                className="mt-4 inline-block text-sm text-primary hover:underline"
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
