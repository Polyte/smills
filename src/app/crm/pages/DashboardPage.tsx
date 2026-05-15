import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  dashboardStats,
  isCrmDataAvailable,
} from "../../../lib/crm/crmRepo";
import { listSalesOrders } from "../../../lib/crm/factoryRepo";
import {
  invDashboardChartsData,
  invOverviewStats,
  invProductSalesMetrics,
  type InvDashboardChartsData,
  type InvProductSalesMetrics,
} from "../../../lib/crm/inventoryRepo";
import {
  sppDashboardSummary,
  type SppDashboardSummary,
} from "../../../lib/crm/sppRepo";
import ordersFilledRaw from "../../../data/ordersFilled.json";
import type { ImportedOrderLine } from "../../../lib/crm/importedOrdersTypes";
import {
  buildFreshRowsFromSeed,
  parseStoredPayload,
  SPREADSHEET_ORDERS_STORAGE_KEY,
} from "../../../lib/crm/spreadsheetOrdersPersistence";
import type { SpreadsheetOrderRow } from "../../../lib/crm/spreadsheetOrderTypes";
import { useCrmAuth } from "../CrmAuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  dashChartVar,
  pipelineStageFill,
  getPipelineChartData,
} from "../dashboardMockData";
import { toast } from "sonner";
import { Link } from "react-router";
import { cn } from "../../components/ui/utils";
import {
  TrendingUp,
  TrendingDown,
  Factory,
  Users,
  UserPlus,
  Briefcase,
  GitBranch,
  CircleDollarSign,
  ChevronRight,
  Warehouse,
  LayoutDashboard,
  BarChart3,
  CalendarCheck2,
  Target,
  CheckCircle2,
  ClipboardList,
  Table2,
  Package,
} from "lucide-react";

// ── helpers ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = (status ?? "").toLowerCase();
  const cls = s.includes("deliver") || s.includes("complete")
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    : s.includes("cancel")
    ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
    : s.includes("progress") || s.includes("transit") || s.includes("dispatch") || s.includes("ship")
    ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400"
    : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";

  return (
    <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap", cls)}>
      {status || "—"}
    </span>
  );
}

const DASH_METRIC_TOP_LINE = {
  default: "via-[oklch(0.72_0.14_82/0.45)]",
  emerald: "via-emerald-400/55",
  amber: "via-amber-400/45",
  primary: "via-primary/50",
  cyan: "via-[oklch(0.62_0.14_200/0.55)]",
  rose: "via-rose-400/50",
  violet: "via-[oklch(0.58_0.16_280/0.5)]",
} as const;

function DashMetricCard({
  children,
  surface = "neutral",
  topLine,
  icon,
  className,
}: {
  children: ReactNode;
  surface?: "neutral" | "emerald" | "amber" | "primary";
  topLine?: keyof typeof DASH_METRIC_TOP_LINE;
  icon?: ReactNode;
  className?: string;
}) {
  const surfaceCls =
    surface === "neutral"
      ? "border-border/60 bg-gradient-to-br from-card via-card to-muted/20"
      : surface === "emerald"
        ? "border-emerald-500/25 bg-gradient-to-br from-emerald-50/60 to-emerald-50/20"
        : surface === "amber"
          ? "border-amber-400/25 bg-gradient-to-br from-amber-50/60 to-amber-50/20"
          : "border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent";

  const lineKey: keyof typeof DASH_METRIC_TOP_LINE =
    topLine ??
    (surface === "emerald" ? "emerald" : surface === "amber" ? "amber" : surface === "primary" ? "primary" : "default");

  return (
    <div data-gsap-card
      className={cn(
        "card-shine group relative flex min-h-[5.25rem] flex-col justify-center overflow-hidden rounded-2xl border px-4 py-3.5 shadow-sm",
        "transition-all duration-300 hover:shadow-md hover:-translate-y-px",
        surfaceCls,
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          DASH_METRIC_TOP_LINE[lineKey],
        )}
      />
      <div className="pointer-events-none absolute -right-14 -bottom-14 size-32 rounded-full bg-gradient-to-br from-[oklch(0.72_0.14_82/0.11)] to-transparent blur-2xl dark:from-[oklch(0.72_0.14_82/0.07)]" />
      {icon ? (
        <div className="pointer-events-none absolute bottom-2 right-2 opacity-[0.16] transition-opacity duration-300 group-hover:opacity-[0.28] [&_svg]:size-7">
          {icon}
        </div>
      ) : null}
      <div className="z-[1] min-w-0">{children}</div>
    </div>
  );
}

function SnapshotCard({
  label,
  value,
  href,
  linkLabel,
  icon: Icon,
  delay,
  accentColor = "default",
}: {
  label: string;
  value: string | number;
  href: string;
  linkLabel: string;
  icon: typeof Users;
  delay: number;
  accentColor?: "default" | "emerald" | "violet" | "amber" | "rose";
}) {
  const accentMap = {
    default: {
      icon: "bg-muted/50 text-muted-foreground dark:from-primary/10 dark:to-primary/5 dark:text-primary/90 ring-border/50 dark:ring-primary/20",
      value: "text-foreground",
      glow: "from-primary/[0.1] via-primary/[0.03]",
    },
    emerald: {
      icon: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-emerald-500/25",
      value: "text-emerald-700 dark:text-emerald-400",
      glow: "from-emerald-500/[0.12] via-emerald-500/[0.04]",
    },
    violet: {
      icon: "bg-violet-500/15 text-violet-700 dark:text-violet-400 ring-violet-500/25",
      value: "text-violet-700 dark:text-violet-400",
      glow: "from-violet-500/[0.1] via-violet-500/[0.03]",
    },
    amber: {
      icon: "bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-amber-500/25",
      value: "text-amber-700 dark:text-amber-400",
      glow: "from-amber-500/[0.1] via-amber-500/[0.03]",
    },
    rose: {
      icon: "bg-rose-500/15 text-rose-700 dark:text-rose-400 ring-rose-500/25",
      value: "text-rose-600 dark:text-rose-400",
      glow: "from-rose-500/[0.1] via-rose-500/[0.03]",
    },
  } as const;
  const accent = accentMap[accentColor];

  return (
    <Link
      to={href}
      className="block h-full min-h-0 rounded-2xl outline-none ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2"
      style={{ animation: "sm-card-in 0.5s cubic-bezier(0.16,1,0.3,1) both", animationDelay: `${delay}ms` }}
      aria-label={`${label}: ${String(value)}. ${linkLabel}`}
    >
      <Card className="group relative flex h-full min-h-[8rem] cursor-pointer flex-col gap-0 overflow-hidden rounded-2xl border-border/60 bg-card shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/50 hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.1),0_0_0_1px_oklch(0.74_0.14_82/0.12)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className={cn("pointer-events-none absolute -right-10 -bottom-8 size-40 rounded-full bg-gradient-to-tl to-transparent blur-2xl", accent.glow)} />
        <CardHeader className="flex flex-1 flex-row items-start justify-between gap-2 space-y-0 pb-2">
          <div className="min-w-0">
            <CardDescription className="text-[11px] font-bold uppercase tracking-widest">{label}</CardDescription>
            <CardTitle className={cn("mt-2 font-display text-2xl tabular-nums tracking-tight", accent.value)}>
              {value}
            </CardTitle>
          </div>
          <div className={cn(
            "flex size-9 items-center justify-center rounded-xl ring-1 shadow-sm transition-all duration-300 group-hover:scale-105",
            accent.icon,
          )}>
            <Icon className="size-4" aria-hidden />
          </div>
        </CardHeader>
        <CardContent className="mt-auto flex flex-1 flex-col justify-end pt-0">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary/75 transition-all duration-200 group-hover:gap-1.5 group-hover:text-primary">
            {linkLabel}
            <ChevronRight className="size-3.5 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

const CHART_TAB_LIST = [
  { id: "volume" as const, label: "Shipment volume" },
  { id: "mix" as const, label: "Product mix" },
  { id: "products" as const, label: "Top products" },
  { id: "rhythm" as const, label: "Shipping rhythm" },
  { id: "pipeline" as const, label: "Pipeline" },
] as const;

type ChartTab = (typeof CHART_TAB_LIST)[number]["id"];

function DashboardSectionHeader({
  title,
  subtitle,
  icon: Icon,
  endAdornment,
  className,
}: {
  title: string;
  subtitle: string;
  icon?: typeof BarChart3;
  endAdornment?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <div
            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-amber-200/70 bg-amber-50 text-amber-600 shadow-sm transition-all duration-300"
            aria-hidden
          >
            <Icon className="size-4" />
          </div>
        ) : null}
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold tracking-tight text-foreground sm:text-lg">{title}</h3>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {endAdornment}
    </div>
  );
}

function ChartTabBar({ activeTab, onChange }: { activeTab: ChartTab; onChange: (t: ChartTab) => void }) {
  const tabs = CHART_TAB_LIST;
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusIdx, setFocusIdx] = useState(() => Math.max(0, tabs.findIndex((t) => t.id === activeTab)));

  useEffect(() => {
    const i = CHART_TAB_LIST.findIndex((t) => t.id === activeTab);
    if (i >= 0) setFocusIdx(i);
  }, [activeTab]);

  const moveTo = (nextIdx: number) => {
    const n = ((nextIdx % tabs.length) + tabs.length) % tabs.length;
    setFocusIdx(n);
    queueMicrotask(() => btnRefs.current[n]?.focus());
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = focusIdx;
    switch (e.key) {
      case "ArrowRight": e.preventDefault(); moveTo(i + 1); break;
      case "ArrowLeft": e.preventDefault(); moveTo(i - 1); break;
      case "Home": e.preventDefault(); moveTo(0); break;
      case "End": e.preventDefault(); moveTo(tabs.length - 1); break;
      case " ": case "Enter": e.preventDefault(); onChange(tabs[i].id); break;
      default: break;
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Analytics charts"
      className="flex min-w-0 flex-wrap gap-1.5 rounded-xl border border-border/50 bg-muted/30 p-1"
      onKeyDown={onKeyDown}
    >
      {tabs.map((tab, idx) => (
        <button
          key={tab.id}
          ref={(el) => { btnRefs.current[idx] = el; }}
          type="button"
          role="tab"
          id={`dash-chart-tab-${tab.id}`}
          aria-selected={activeTab === tab.id}
          tabIndex={focusIdx === idx ? 0 : -1}
          onClick={() => { onChange(tab.id); setFocusIdx(idx); }}
          onFocus={() => setFocusIdx(idx)}
          className={cn(
            "min-h-[2.25rem] min-w-0 flex-1 truncate rounded-lg border px-3 py-2 text-left text-[11px] font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-w-[100px]",
            activeTab === tab.id
              ? "border-amber-300/60 bg-white text-foreground shadow-sm ring-1 ring-amber-200/50"
              : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground/90",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function DashboardBodySkeleton() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex min-h-[8rem] flex-col gap-2 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-20" />
              <Skeleton className="mt-auto h-3 w-28" />
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-6 rounded-3xl border border-border/50 bg-muted/25 p-5 shadow-sm lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-7 w-44 max-w-full sm:w-48" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <Skeleton className="h-7 w-36 shrink-0 rounded-full" />
        </div>
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-border/50 bg-muted/30 p-1">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-8 min-h-8 min-w-[100px] flex-1 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[min(55vh,420px)] w-full rounded-2xl" />
      </section>
    </div>
  );
}

// ── main component ──────────────────────────────────────────────────────────

export function DashboardPage() {
  const dashChartUid = useId().replace(/:/g, "");
  const { user } = useCrmAuth();
  const [stageCounts, setStageCounts] = useState<{ stage: string; count: number }[]>([]);
  const [contactCount, setContactCount] = useState(0);
  const [dealCount, setDealCount] = useState(0);
  const [leadsCount, setLeadsCount] = useState(0);
  const [pipelineOpenCount, setPipelineOpenCount] = useState(0);
  const [invOpenPOs, setInvOpenPOs] = useState(0);
  const [invOpenShips, setInvOpenShips] = useState(0);
  const [invStockValue, setInvStockValue] = useState(0);
  const [salesMetrics, setSalesMetrics] = useState<InvProductSalesMetrics | null>(null);
  const [chartData, setChartData] = useState<InvDashboardChartsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sppSummary, setSppSummary] = useState<SppDashboardSummary | null>(null);
  const [orderBacklog, setOrderBacklog] = useState<number | null>(null);
  const [ledgerRows, setLedgerRows] = useState<SpreadsheetOrderRow[]>([]);
  const [activeChartTab, setActiveChartTab] = useState<ChartTab>("volume");
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [relativeNowTick, setRelativeNowTick] = useState(0);
  const [pipelineSampleBannerDismissed, setPipelineSampleBannerDismissed] = useState(false);

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const stats = await dashboardStats(user.id);
      setStageCounts(stats.dealsByStage);
      setContactCount(stats.contactCount);
      setDealCount(stats.dealCount);
      setLeadsCount(stats.leadsCount);
      setPipelineOpenCount(stats.pipelineOpenCount);

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
        const ords = await listSalesOrders();
        setOrderBacklog(ords.filter((o) => !["delivered", "cancelled"].includes(o.status)).length);
      } catch {
        setOrderBacklog(null);
      }
      try {
        const now = new Date();
        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        setSppSummary(await sppDashboardSummary(ym));
      } catch {
        setSppSummary(null);
      }
      try {
        const SEED = ordersFilledRaw as ImportedOrderLine[];
        const raw = localStorage.getItem(SPREADSHEET_ORDERS_STORAGE_KEY);
        const allRows = raw
          ? (parseStoredPayload(raw, SEED) ?? buildFreshRowsFromSeed(SEED))
          : buildFreshRowsFromSeed(SEED);
        setLedgerRows(
          [...allRows]
            .sort((a, b) => (b.orderDate ?? "").localeCompare(a.orderDate ?? ""))
            .slice(0, 14),
        );
      } catch {
        setLedgerRows([]);
      }
      setLastLoadedAt(new Date());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setRelativeNowTick((n) => n + 1), 45_000);
    const onVis = () => { if (document.visibilityState === "visible") setRelativeNowTick((n) => n + 1); };
    document.addEventListener("visibilitychange", onVis);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  useEffect(() => {
    if (!isCrmDataAvailable() || !user) return;
    const filter = { preset: "all" as const };
    let cancelled = false;
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
      })
      .catch(() => { if (!cancelled) { setSalesMetrics(null); setChartData(null); } });
    return () => { cancelled = true; };
  }, [user]);

  const filteredSalesRows = useMemo(() => {
    if (!salesMetrics) return [];
    return [...salesMetrics.rows].sort((a, b) => b.est_sales_zar - a.est_sales_zar || a.name.localeCompare(b.name));
  }, [salesMetrics]);

  const topProductChartData = useMemo(() => {
    return filteredSalesRows
      .filter((r) => r.shipped_qty > 0 || r.est_sales_zar > 0 || r.production_output_qty > 0)
      .slice(0, 7)
      .map((r) => ({
        sku: r.sku,
        name: r.name,
        shipped: Math.round(r.shipped_qty * 100) / 100,
        produced: Math.round(r.production_output_qty * 100) / 100,
        estSalesK: Math.round(r.est_sales_zar / 1000),
      }));
  }, [filteredSalesRows]);

  const inventoryPieData = useMemo((): { name: string; value: number; fill: string }[] => {
    const placeholder = (label: string) => [{ name: label, value: 1, fill: "color-mix(in oklch, var(--muted-foreground) 35%, transparent)" }];
    let slices: { name: string; value: number }[];
    if (filteredSalesRows.length) {
      const catMap = new Map<string, number>();
      for (const r of filteredSalesRows) {
        if (r.shipped_qty <= 0) continue;
        const c = String(r.category ?? "").trim() || "Uncategorized";
        catMap.set(c, (catMap.get(c) ?? 0) + r.shipped_qty);
      }
      slices = [...catMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    } else if (chartData?.categoryShippedMix.length) {
      slices = chartData.categoryShippedMix;
    } else {
      return placeholder("No data yet");
    }
    if (!slices.length) return placeholder("No shipments in period");
    return slices.map((d, i) => ({ ...d, fill: dashChartVar((((i % 5) + 1) as 1 | 2 | 3 | 4 | 5)) }));
  }, [filteredSalesRows, chartData]);

  const updatedRelativeLabel = useMemo(() => {
    if (!lastLoadedAt) return null;
    void relativeNowTick;
    return formatDistanceToNow(lastLoadedAt, { addSuffix: true });
  }, [lastLoadedAt, relativeNowTick]);

  if (!isCrmDataAvailable()) {
    return <p className="text-sm text-muted-foreground">CRM storage is not available.</p>;
  }

  const { data: pipelineData, isSample: pipelineIsSample } = getPipelineChartData(stageCounts);

  const tipStyle: CSSProperties = {
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(10,12,22,0.9)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    boxShadow: "0 20px 48px -12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)",
    color: "oklch(0.9 0.008 85)",
    fontSize: "12px",
    padding: "10px 14px",
  };

  return (
    <div className="space-y-6 pb-4" data-gsap-section>

      {/* ── CRM SNAPSHOT (top) ── */}
      {!loading && (
        <section
          className="space-y-3"
          style={{ animation: "sm-section-in 0.5s cubic-bezier(0.16,1,0.3,1) both" }}
        >
          <DashboardSectionHeader
            icon={LayoutDashboard}
            title="CRM snapshot"
            subtitle="Headline counts — each tile shortcuts into the app."
          />
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <SnapshotCard label="Customers" value={contactCount} href="/crm/contacts" linkLabel="View customers" icon={Users} delay={40} accentColor="default" />
            <SnapshotCard label="Leads" value={leadsCount} href="/crm/contacts" linkLabel="Open contacts" icon={UserPlus} delay={80} accentColor="emerald" />
            <SnapshotCard label="Deals" value={dealCount} href="/crm/deals" linkLabel="Pipeline" icon={Briefcase} delay={120} accentColor="violet" />
            <SnapshotCard label="Open pipeline" value={pipelineOpenCount} href="/crm/deals" linkLabel="Qualification & proposal" icon={GitBranch} delay={160} accentColor="amber" />
          </div>
        </section>
      )}

      {/* ── HERO ── */}
      <section
        className="relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_4px_24px_-8px_rgba(0,0,0,0.09),inset_0_1px_0_rgba(255,255,255,0.9)]"
        style={{ animation: "sm-hero-in 0.65s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        {/* Top stripe */}
        <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-[oklch(0.45_0.14_265)] via-[oklch(0.72_0.14_82)] via-60% to-[oklch(0.55_0.15_300)]" />
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-[radial-gradient(circle_at_30%_30%,oklch(0.82_0.13_88/0.14),transparent_65%)] blur-2xl animate-[sm-float_18s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 size-56 rounded-full bg-[radial-gradient(circle,oklch(0.55_0.14_265/0.1),transparent_65%)] blur-2xl animate-[sm-float-alt_22s_ease-in-out_infinite]" />

        <div className="grid gap-5 p-5 lg:grid-cols-[1.3fr_0.7fr] lg:p-7">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Factory className="size-3.5 text-[oklch(0.55_0.12_200)]" />
                Inventory, pipeline &amp; mill operations
              </span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 shadow-[0_0_8px_oklch(0.55_0.18_150/0.15)]">
                ● Live CRM
              </span>
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.6rem] lg:leading-tight">
              Dashboard
            </h2>
            <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              A single operating view for shipment volume, product sales, customer movement, and factory planning signals.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full w-[72%] rounded-full bg-gradient-to-r from-[oklch(0.55_0.14_265)] via-[oklch(0.72_0.14_82)] to-[oklch(0.82_0.12_90)]"
                  style={{ animation: "sm-gradient-drift 8s ease infinite", backgroundSize: "200% auto" }}
                />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground tabular-nums">72% capacity</span>
            </div>
            {updatedRelativeLabel ? (
              <p className="mt-2 text-xs text-muted-foreground tabular-nums" aria-live="polite">
                Updated {updatedRelativeLabel}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <Link
              to="/crm/inventory/items"
              className="group relative block min-h-[4.75rem] overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-emerald-50/70 to-emerald-50/20 pr-12 shadow-sm outline-none transition-all duration-300 hover:-translate-y-px hover:border-emerald-400/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/45 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <CircleDollarSign className="pointer-events-none absolute right-2 top-1/2 size-10 -translate-y-1/2 text-emerald-600/[0.05] dark:text-emerald-400/[0.12]" aria-hidden />
              <div className="relative px-3.5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Est. sales</p>
                <p className="mt-1 font-display text-xl font-bold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-300">
                  {salesMetrics
                    ? salesMetrics.totalEstSalesZar.toLocaleString(undefined, { style: "currency", currency: "ZAR", maximumFractionDigits: 0 })
                    : "—"}
                </p>
                <span className="mt-1 inline-block text-[10px] font-semibold text-primary/75 group-hover:text-primary">View items →</span>
              </div>
            </Link>
            <Link
              to="/crm/deals"
              className="group relative block min-h-[4.75rem] overflow-hidden rounded-xl border border-border/50 bg-card pr-12 shadow-sm outline-none transition-all duration-300 hover:-translate-y-px hover:border-border hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.55_0.14_265/0.35)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <GitBranch className="pointer-events-none absolute right-2 top-1/2 size-10 -translate-y-1/2 text-foreground/[0.04]" aria-hidden />
              <div className="relative px-3.5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Open pipeline</p>
                <p className="mt-1 font-display text-xl font-bold tabular-nums tracking-tight">{pipelineOpenCount}</p>
                <span className="mt-1 inline-block text-[10px] font-semibold text-primary/75 group-hover:text-primary">View deals →</span>
              </div>
            </Link>
            <Link
              to="/crm/inventory/stock"
              className="group relative block min-h-[4.75rem] overflow-hidden rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-amber-50/20 pr-12 shadow-sm outline-none transition-all duration-300 hover:-translate-y-px hover:border-amber-300/60 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.72_0.12_82/0.4)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <Warehouse className="pointer-events-none absolute right-2 top-1/2 size-10 -translate-y-1/2 text-[oklch(0.48_0.1_76)]/[0.05]" aria-hidden />
              <div className="relative px-3.5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Stock value</p>
                <p className="mt-1 font-display text-xl font-bold tabular-nums tracking-tight text-[oklch(0.48_0.1_76)] dark:text-[oklch(0.82_0.12_88)]">
                  {invStockValue.toLocaleString(undefined, { style: "currency", currency: "ZAR", maximumFractionDigits: 0 })}
                </p>
                <span className="mt-1 inline-block text-[10px] font-semibold text-primary/75 group-hover:text-primary">View stock →</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Mini-strip */}
        <div className="flex flex-wrap gap-5 border-t border-border/40 bg-muted/20 px-5 py-3 lg:px-7">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Open POs</span>
            <span className="font-display text-sm font-bold tabular-nums">{invOpenPOs}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Open shipments</span>
            <span className="font-display text-sm font-bold tabular-nums">{invOpenShips}</span>
          </div>
          {orderBacklog != null && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Order backlog</span>
              <span className="font-display text-sm font-bold tabular-nums">{orderBacklog}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Stock value</span>
            <span className="font-display text-sm font-bold tabular-nums text-[oklch(0.48_0.1_76)] dark:text-[oklch(0.82_0.12_88)]">
              {invStockValue.toLocaleString(undefined, { style: "currency", currency: "ZAR", maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </section>

      {loading ? (
        <DashboardBodySkeleton />
      ) : (
        <>
          {/* ── ANALYTICS ── */}
          <section
            id="crm-dashboard-analytics"
            className="space-y-5 rounded-3xl border border-border/50 bg-muted/25 p-5 shadow-sm lg:p-6"
            style={{ animation: "sm-section-in 0.55s cubic-bezier(0.16,1,0.3,1) both", animationDelay: "120ms" }}
          >
            <DashboardSectionHeader
              icon={BarChart3}
              title="Analytics"
              subtitle="Shipment ledger · inventory movement · product mix"
              endAdornment={
                <span className="shrink-0 rounded-full border border-border/60 bg-muted/35 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                  Live · CRM ledger
                </span>
              }
            />

            <ChartTabBar activeTab={activeChartTab} onChange={setActiveChartTab} />

            {activeChartTab === "volume" && (
              <Card className="crm-chart-card group relative overflow-hidden rounded-2xl border-border/60 bg-card shadow-sm transition-shadow duration-300 hover:shadow-md">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[oklch(0.65_0.14_85/0.8)] to-transparent" />
                <CardHeader className="pb-2 pt-5 px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-display font-bold">Shipment volume by week</CardTitle>
                      <CardDescription className="text-[11px] mt-0.5">Stacked outbound qty — raw · WIP · finished — last 8 weeks</CardDescription>
                    </div>
                    <span className="shrink-0 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">8W</span>
                  </div>
                </CardHeader>
                <CardContent className="h-[min(55vh,540px)] min-w-0 pt-2 pb-4 px-3">
                  {chartData?.weeklyShippedByKind?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData.weeklyShippedByKind} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                        <defs>
                          <linearGradient id={`${dashChartUid}-wk-raw`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.95} />
                            <stop offset="22%" stopColor="var(--chart-3)" stopOpacity={0.72} />
                            <stop offset="58%" stopColor="var(--chart-3)" stopOpacity={0.22} />
                            <stop offset="88%" stopColor="var(--chart-3)" stopOpacity={0.05} />
                            <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id={`${dashChartUid}-wk-wip`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.95} />
                            <stop offset="22%" stopColor="var(--chart-4)" stopOpacity={0.72} />
                            <stop offset="58%" stopColor="var(--chart-4)" stopOpacity={0.22} />
                            <stop offset="88%" stopColor="var(--chart-4)" stopOpacity={0.05} />
                            <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id={`${dashChartUid}-wk-fin`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.95} />
                            <stop offset="22%" stopColor="var(--chart-2)" stopOpacity={0.72} />
                            <stop offset="58%" stopColor="var(--chart-2)" stopOpacity={0.22} />
                            <stop offset="88%" stopColor="var(--chart-2)" stopOpacity={0.05} />
                            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke="color-mix(in oklch, var(--foreground) 5%, transparent)" vertical={false} />
                        <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={40} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tipStyle} cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }} />
                        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: 10, color: "var(--muted-foreground)" }} />
                        <Area type="monotone" dataKey="raw" name="Raw" stackId="w" stroke="var(--chart-3)" strokeWidth={2.5} fill={`url(#${dashChartUid}-wk-raw)`} isAnimationActive animationDuration={900} animationEasing="ease-out" />
                        <Area type="monotone" dataKey="wip" name="WIP" stackId="w" stroke="var(--chart-4)" strokeWidth={2.5} fill={`url(#${dashChartUid}-wk-wip)`} isAnimationActive animationDuration={900} animationEasing="ease-out" />
                        <Area type="monotone" dataKey="finished" name="Finished" stackId="w" stroke="var(--chart-2)" strokeWidth={2.5} fill={`url(#${dashChartUid}-wk-fin)`} isAnimationActive animationDuration={900} animationEasing="ease-out" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Package className="size-9 opacity-20" />
                      <p className="text-sm">No weekly shipment data yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeChartTab === "mix" && (
              <Card className="crm-chart-card group relative overflow-hidden rounded-2xl border-border/60 bg-card shadow-sm transition-shadow duration-300 hover:shadow-md">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[oklch(0.55_0.14_280/0.75)] to-transparent" />
                <CardHeader className="pb-2 pt-5 px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-display font-bold">Product line mix</CardTitle>
                      <CardDescription className="text-[11px] mt-0.5">
                        Shipped qty share — <span className="font-semibold text-foreground/80">{chartData?.periodLabel ?? "—"}</span>
                      </CardDescription>
                    </div>
                    <span className="shrink-0 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Mix</span>
                  </div>
                </CardHeader>
                <CardContent className="flex h-[min(55vh,540px)] min-w-0 flex-col pt-2 pb-2 px-3">
                  <div className="min-h-0 min-w-0 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                        <Pie data={inventoryPieData} dataKey="value" nameKey="name" cx="38%" cy="50%" innerRadius="46%" outerRadius="70%" paddingAngle={3} stroke="transparent" strokeWidth={0} isAnimationActive animationDuration={900} animationEasing="ease-out">
                          {inventoryPieData.map((entry, idx) => (
                            <Cell key={`${entry.name}-${idx}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tipStyle} formatter={(v: number, _n, p: { payload?: { name?: string } }) => [`${Number(v).toLocaleString()} qty`, p.payload?.name ?? ""]} />
                        <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: "11px", lineHeight: 1.45, paddingLeft: 8, maxHeight: "100%", overflowY: "auto", width: "58%", right: 0 }} formatter={(value) => <span className="text-muted-foreground inline-block max-w-[min(220px,32vw)] break-words text-left align-middle" title={String(value)}>{value}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {salesMetrics != null && salesMetrics.totalShippedQty === 0 ? (
                    <p className="text-[11px] text-muted-foreground px-1 pb-1">Post completed shipments to populate this chart.</p>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {activeChartTab === "products" && (
              <Card className="crm-chart-card group relative overflow-hidden rounded-2xl border-border/60 bg-card shadow-sm transition-shadow duration-300 hover:shadow-md">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[oklch(0.62_0.14_145/0.75)] to-transparent" />
                <CardHeader className="pb-2 pt-5 px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-display font-bold">Top product performance</CardTitle>
                      <CardDescription className="text-[11px] mt-0.5">Shipped qty, production output &amp; estimated sales</CardDescription>
                    </div>
                    <span className="rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                      {topProductChartData.length} SKU{topProductChartData.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="h-[min(55vh,540px)] min-w-0 pt-2 pb-4 px-3">
                  {topProductChartData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={topProductChartData} layout="vertical" margin={{ top: 12, right: 20, left: 20, bottom: 8 }}>
                        <defs>
                          <linearGradient id={`${dashChartUid}-bar-shipped`} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.55} />
                            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.9} />
                          </linearGradient>
                          <linearGradient id={`${dashChartUid}-bar-produced`} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.55} />
                            <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0.9} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid horizontal={false} strokeDasharray="2 4" stroke="color-mix(in oklch, var(--foreground) 5%, transparent)" />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => Number(v).toLocaleString()} />
                        <YAxis type="category" dataKey="sku" width={118} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(value: number, name) => {
                          if (name === "Estimated sales (Rk)") return [(Number(value) * 1000).toLocaleString(undefined, { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }), "Estimated sales"];
                          return [`${Number(value).toLocaleString()} qty`, name];
                        }} labelFormatter={(label, rows) => { const row = rows?.[0]?.payload as { name?: string } | undefined; return row?.name ? `${label} · ${row.name}` : String(label); }} />
                        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: 10, color: "var(--muted-foreground)" }} />
                        <Bar dataKey="shipped" name="Shipped" fill={`url(#${dashChartUid}-bar-shipped)`} radius={[0, 6, 6, 0]} isAnimationActive animationDuration={900} animationEasing="ease-out" />
                        <Bar dataKey="produced" name="Produced" fill={`url(#${dashChartUid}-bar-produced)`} radius={[0, 6, 6, 0]} isAnimationActive animationDuration={900} animationEasing="ease-out" />
                        <Line type="monotone" dataKey="estSalesK" name="Estimated sales (Rk)" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 5, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2.5 }} activeDot={{ r: 7, stroke: "var(--chart-1)", strokeWidth: 2, fill: "var(--card)" }} isAnimationActive animationDuration={700} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Package className="size-9 opacity-20" />
                      <p className="text-sm">No products with movement data.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeChartTab === "rhythm" && (
              <Card className="crm-chart-card group relative overflow-hidden rounded-2xl border-border/60 bg-card shadow-sm transition-shadow duration-300 hover:shadow-md">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[oklch(0.6_0.12_200/0.75)] to-transparent" />
                <CardHeader className="pb-2 pt-5 px-5">
                  <CardTitle className="text-sm font-display font-bold">Shipping rhythm</CardTitle>
                  <CardDescription className="text-[11px] mt-0.5">Last 7 days — relative load (max day = 100%)</CardDescription>
                </CardHeader>
                <CardContent className="h-[min(55vh,540px)] min-w-0 pt-2 pb-4 px-3">
                  {chartData?.weekdayShipmentIntensity?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData.weekdayShipmentIntensity} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                        <defs>
                          <linearGradient id={`${dashChartUid}-rhythm`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.95} />
                            <stop offset="20%" stopColor="var(--chart-1)" stopOpacity={0.72} />
                            <stop offset="60%" stopColor="var(--chart-1)" stopOpacity={0.2} />
                            <stop offset="90%" stopColor="var(--chart-1)" stopOpacity={0.04} />
                            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke="color-mix(in oklch, var(--foreground) 5%, transparent)" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={30} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tipStyle} cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }} />
                        <Area type="monotone" dataKey="index" name="Load index" stroke="var(--chart-1)" strokeWidth={2.5} fill={`url(#${dashChartUid}-rhythm)`} dot={{ r: 5, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2.5 }} activeDot={{ r: 7, stroke: "var(--chart-1)", strokeWidth: 2, fill: "var(--card)" }} isAnimationActive animationDuration={900} animationEasing="ease-out" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                      <p className="text-sm">No rhythm data.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeChartTab === "pipeline" && (
              <Card className="crm-chart-card group relative overflow-hidden rounded-2xl border-border/60 bg-card shadow-sm transition-shadow duration-300 hover:shadow-md">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[oklch(0.72_0.12_82/0.7)] to-transparent" />
                <CardHeader className="pb-2 pt-5 px-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-display font-bold">Sales pipeline</CardTitle>
                      <CardDescription className="text-[11px] mt-0.5">Deals by stage</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex h-[min(55vh,540px)] min-w-0 flex-col gap-2 pt-2 pb-4 px-3">
                  {pipelineIsSample && !pipelineSampleBannerDismissed ? (
                    <div className="flex shrink-0 items-start gap-2 rounded-lg border border-amber-500/35 bg-amber-500/[0.06] px-3 py-2 dark:bg-amber-500/10">
                      <p className="min-w-0 flex-1 text-xs leading-snug text-muted-foreground">
                        <span className="font-semibold text-foreground">Sample pipeline.</span> Stages are illustrative until CRM deals populate these stages.
                      </p>
                      <button type="button" className="shrink-0 rounded-md border border-border/60 bg-background/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" onClick={() => setPipelineSampleBannerDismissed(true)}>
                        Dismiss
                      </button>
                    </div>
                  ) : null}
                  <div className="min-h-0 min-w-0 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pipelineData} margin={{ top: 16, right: 12, left: 0, bottom: 8 }}>
                        <defs>
                          {pipelineData.map((row) => (
                            <linearGradient key={row.stage} id={`${dashChartUid}-pipe-${row.stage}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={pipelineStageFill(row.stage)} stopOpacity={0.95} />
                              <stop offset="100%" stopColor={pipelineStageFill(row.stage)} stopOpacity={0.55} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke="color-mix(in oklch, var(--foreground) 5%, transparent)" horizontal vertical={false} />
                        <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={30} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]} name="Deals" isAnimationActive animationDuration={900} animationEasing="ease-out">
                          {pipelineData.map((row) => (
                            <Cell key={row.stage} fill={`url(#${dashChartUid}-pipe-${row.stage})`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          {/* ── PLANNING & TRACKING ── */}
          <section
            className="flex flex-col gap-4"
            style={{ animation: "sm-section-in 0.55s cubic-bezier(0.16,1,0.3,1) both", animationDelay: "180ms" }}
          >
            <DashboardSectionHeader
              icon={CalendarCheck2}
              title="Planning & Tracking"
              subtitle="Current month sales & production plan vs actuals for yarn and weaving."
              endAdornment={
                <Link to="/crm/planning" className="inline-flex items-center gap-1 shrink-0 text-xs font-medium text-primary hover:underline">
                  <ClipboardList className="size-3.5" />
                  Open planner
                </Link>
              }
            />

            <div className="grid gap-3 sm:grid-cols-2">
              {(["yarn", "weaving"] as const).map((line, li) => {
                const s = sppSummary?.[line];
                const tracker = s?.tracker ?? null;
                const statusLabel = tracker?.status === "active" ? "Active" : tracker?.status === "closed" ? "Closed" : tracker ? "Draft" : null;
                const statusColor =
                  tracker?.status === "active"
                    ? "border-emerald-500/30 bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-400"
                    : tracker?.status === "closed"
                      ? "border-border/50 bg-muted/30 text-muted-foreground"
                      : "border-amber-500/30 bg-amber-500/[0.07] text-amber-700 dark:text-amber-400";
                const fulfillment = s?.fulfillmentPct;
                const isOnTrack = fulfillment != null && fulfillment >= 90;
                const isBehind = fulfillment != null && fulfillment < 75;

                return (
                  <Card
                    key={line}
                    className="relative overflow-hidden border-border/60 bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-px"
                    style={{ animation: "sm-card-in 0.5s cubic-bezier(0.16,1,0.3,1) both", animationDelay: `${200 + li * 60}ms` }}
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[oklch(0.62_0.14_200/0.45)] to-transparent" />
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-9 items-center justify-center rounded-xl border border-amber-200/70 bg-amber-50 text-amber-600 shadow-sm">
                            <Target className="size-4" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-display font-bold capitalize">{line}</CardTitle>
                            <CardDescription className="text-[11px] mt-0.5">
                              {sppSummary ? (tracker ? `${s?.orderLineCount ?? 0} order line${(s?.orderLineCount ?? 0) !== 1 ? "s" : ""}` : "No tracker this month") : "Loading…"}
                            </CardDescription>
                          </div>
                        </div>
                        {statusLabel ? (
                          <span className={cn("shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", statusColor)}>
                            {statusLabel}
                          </span>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 px-4 pb-4">
                      {sppSummary && !tracker ? (
                        <p className="text-xs text-muted-foreground">
                          No planning tracker found for this month.{" "}
                          <Link to="/crm/planning" className="text-primary hover:underline font-semibold">Create one →</Link>
                        </p>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 gap-2">
                            {(["Ordered", "Planned", "Actual"] as const).map((label) => {
                              const val = label === "Ordered" ? s?.totalOrdered : label === "Planned" ? s?.totalPlanned : s?.totalActual;
                              return (
                                <div key={label} className="rounded-lg border border-border/50 bg-muted/30 px-2.5 py-2 transition-colors duration-200 hover:bg-muted/50">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                                  <p className="mt-0.5 font-display text-lg font-bold tabular-nums tracking-tight">
                                    {val != null ? val.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                          {fulfillment != null ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  {isOnTrack ? (
                                    <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                  ) : isBehind ? (
                                    <TrendingDown className="size-3.5 text-rose-500 dark:text-rose-400" />
                                  ) : (
                                    <TrendingUp className="size-3.5 text-amber-600 dark:text-amber-400" />
                                  )}
                                  <span className="text-[11px] font-semibold text-muted-foreground">Fulfillment</span>
                                </div>
                                <span className={cn(
                                  "text-sm font-display font-bold tabular-nums",
                                  isOnTrack ? "text-emerald-700 dark:text-emerald-400" : isBehind ? "text-rose-600 dark:text-rose-400" : "text-amber-700 dark:text-amber-400"
                                )}>
                                  {fulfillment.toFixed(1)}%
                                </span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all duration-700",
                                    isOnTrack ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : isBehind ? "bg-gradient-to-r from-rose-400 to-rose-600" : "bg-gradient-to-r from-amber-400 to-amber-500"
                                  )}
                                  style={{ width: `${Math.min(100, fulfillment)}%` }}
                                />
                              </div>
                            </div>
                          ) : s?.tracker ? (
                            <p className="text-[11px] text-muted-foreground">No weekly data entered yet.</p>
                          ) : null}
                          <Link to={`/crm/planning?line=${line}`} className="inline-flex items-center gap-1 pt-0.5 text-xs font-semibold text-primary/80 transition-colors hover:text-primary">
                            View detail <ChevronRight className="size-3.5" />
                          </Link>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <DashMetricCard topLine="cyan" icon={<ClipboardList className="text-sky-700 dark:text-sky-400" />}>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Open sales orders</p>
                <p className="mt-1.5 font-display text-2xl font-bold tabular-nums tracking-tight">{orderBacklog != null ? orderBacklog : "—"}</p>
              </DashMetricCard>
              <DashMetricCard topLine="emerald" icon={<CheckCircle2 className="text-emerald-600 dark:text-emerald-400" />}>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Yarn order lines</p>
                <p className="mt-1.5 font-display text-2xl font-bold tabular-nums tracking-tight">{sppSummary?.yarn.orderLineCount ?? "—"}</p>
              </DashMetricCard>
              <DashMetricCard topLine="violet" icon={<Target className="text-violet-600 dark:text-violet-400" />}>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Weaving order lines</p>
                <p className="mt-1.5 font-display text-2xl font-bold tabular-nums tracking-tight">{sppSummary?.weaving.orderLineCount ?? "—"}</p>
              </DashMetricCard>
            </div>
          </section>

          {/* ── SALES LEDGER ── */}
          <section
            className="space-y-4"
            style={{ animation: "sm-section-in 0.55s cubic-bezier(0.16,1,0.3,1) both", animationDelay: "240ms" }}
          >
            <DashboardSectionHeader
              icon={Table2}
              title="Sales ledger"
              subtitle="Latest imported order lines — delivery status and quantities at a glance."
              endAdornment={
                <Link
                  to="/crm/sales-ledger"
                  className="inline-flex items-center gap-1 shrink-0 text-xs font-semibold text-primary/80 transition-colors hover:text-primary"
                >
                  View full ledger
                  <ChevronRight className="size-3.5" />
                </Link>
              }
            />

            <Card className="overflow-hidden rounded-2xl border-border/60 bg-card shadow-sm">
              {/* Gradient top accent */}
              <div className="h-[2px] w-full bg-gradient-to-r from-[oklch(0.45_0.14_265)] via-[oklch(0.72_0.14_82)] to-[oklch(0.55_0.15_300)]" />
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40 bg-muted/25 hover:bg-muted/35">
                      <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground w-[110px]">Sales Order</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Customer</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Item Code</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Description</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-right w-[80px]">Qty</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Status</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground w-[110px]">Order Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                          <div className="flex flex-col items-center gap-2">
                            <Table2 className="size-8 opacity-20" />
                            <p>No order lines found. Import a spreadsheet via the sales ledger.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      ledgerRows.map((row, i) => (
                        <TableRow
                          key={row.id}
                          className="border-border/30 transition-colors duration-150 hover:bg-muted/20"
                          style={{ animation: "sm-card-in 0.4s cubic-bezier(0.16,1,0.3,1) both", animationDelay: `${260 + i * 25}ms` }}
                        >
                          <TableCell className="font-mono text-xs font-semibold text-foreground py-2.5">{row.salesOrder}</TableCell>
                          <TableCell className="max-w-[160px] py-2.5">
                            <span className="block truncate text-sm font-medium text-foreground" title={row.customer}>{row.customer}</span>
                          </TableCell>
                          <TableCell className="font-mono text-[11px] text-muted-foreground py-2.5">{row.itemCode}</TableCell>
                          <TableCell className="max-w-[200px] py-2.5">
                            <span className="block truncate text-xs text-muted-foreground" title={row.description}>{row.description}</span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm tabular-nums font-semibold py-2.5">
                            {row.quantity != null ? row.quantity.toLocaleString() : "—"}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <StatusBadge status={row.deliveryStatus} />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground py-2.5">
                            {row.orderDate
                              ? (() => { try { return format(new Date(row.orderDate), "dd MMM yyyy"); } catch { return row.orderDate; } })()
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {ledgerRows.length > 0 && (
                <div className="flex items-center justify-between border-t border-border/30 bg-muted/10 px-4 py-2.5">
                  <p className="text-[11px] text-muted-foreground">Showing {ledgerRows.length} most recent order lines</p>
                  <Link
                    to="/crm/sales-ledger"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary/80 transition-colors hover:text-primary"
                  >
                    View all <ChevronRight className="size-3.5" />
                  </Link>
                </div>
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
