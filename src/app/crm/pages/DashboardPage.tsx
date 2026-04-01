import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { format } from "date-fns";
import { dashboardStats, isCrmDataAvailable } from "../../../lib/crm/crmRepo";
import {
  fetchWorkforceDashboardSummary,
  formatMinutes,
  type WorkforceDashboardSummary,
} from "../../../lib/crm/workforceRepo";
import {
  invDashboardProductInsights,
  invOverviewStats,
  type InvDashboardInsightRow,
} from "../../../lib/crm/inventoryRepo";
import { useCrmAuth } from "../CrmAuthContext";
import type { Database } from "../database.types";
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
  mockFloorActivityIndex,
  mockProductLineMix,
  mockTrending,
  mockWeeklyMillOutput,
  pipelineStageFill,
  getPipelineChartData,
} from "../dashboardMockData";
import { toast } from "sonner";
import { Link } from "react-router";
import { FactoryFloorSimulation } from "../components/FactoryFloorSimulation";
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
      setContactCount(stats.contactCount);
      setDealCount(stats.dealCount);
      setLeadsCount(stats.leadsCount);
      setWonDealsValue(stats.wonDealsValue);
      setPipelineOpenCount(stats.pipelineOpenCount);
      if (profile?.role === "manager") {
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }, [user, profile?.role]);

  useEffect(() => {
    void load();
  }, [load]);

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
      <div
        className="crm-dash-enter relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-r from-card via-[oklch(0.98_0.015_85)] to-[oklch(0.96_0.02_200/0.35)] p-5 shadow-sm dark:from-card dark:via-[oklch(0.18_0.02_265)] dark:to-[oklch(0.16_0.04_260)]"
        style={{ animationDelay: "0ms" }}
      >
        <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-[oklch(0.72_0.12_82/0.2)] blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-40 rounded-full bg-[oklch(0.55_0.12_220/0.15)] blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight gold-text-shimmer sm:text-3xl">
              Dashboard
            </h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              Sales pipeline, inventory, and illustrative throughput aligned with{" "}
              <a
                href="https://www.standertonmills.co.za/"
                className="text-primary underline-offset-2 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Standerton Mills
              </a>
              : technical yarns and woven fabrics — testing through spinning, twisting, weaving, finishing, packing, and
              shipping.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
            <Factory className="size-3.5 text-[oklch(0.55_0.12_200)]" />
            Crafting quality yarn & fabrics
          </div>
        </div>
      </div>

      <section
        className="crm-dash-enter grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
        style={{ animationDelay: "20ms" }}
        aria-label="Company snapshot from public site"
      >
        {standertonMillsFacts.map((f) => (
          <div
            key={f.label}
            className="rounded-lg border border-border/70 bg-card/80 px-3 py-2.5 shadow-sm"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</p>
            <p className="font-display text-lg font-bold tabular-nums text-foreground">{f.value}</p>
            <p className="text-[11px] text-muted-foreground leading-snug">{f.detail}</p>
          </div>
        ))}
      </section>

      {loading ? (
        <p className="text-sm text-muted-foreground crm-dash-enter">Loading…</p>
      ) : (
        <>
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

          {profile?.role === "manager" && workforceSummary ? (
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

          <section className="crm-dash-enter space-y-3" style={{ animationDelay: "160ms" }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">Charts &amp; trends</h3>
              <span className="rounded-full border border-[var(--chart-2)]/40 bg-secondary/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
                Sample data
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Illustrative cotton throughput (sliver, spun yarn, woven greige) and floor load — replace with live
              MES/ERP feeds when available.
            </p>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="border-border/80 shadow-md overflow-hidden">
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm font-display">Weekly mill output (k units)</CardTitle>
                  <CardDescription className="text-xs">Stacked: woven greige · spun yarn · carded sliver</CardDescription>
                </CardHeader>
                <CardContent className="h-[220px] pt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mockWeeklyMillOutput} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dashFabric" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.85} />
                          <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.12} />
                        </linearGradient>
                        <linearGradient id="dashYarn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0.15} />
                        </linearGradient>
                        <linearGradient id="dashGreige" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.85} />
                          <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.12} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in oklch, var(--foreground) 8%, transparent)" />
                      <XAxis dataKey="week" tick={{ fontSize: 9 }} stroke="var(--muted-foreground)" />
                      <YAxis tick={{ fontSize: 10 }} width={36} stroke="var(--muted-foreground)" />
                      <Tooltip contentStyle={tipStyle} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Area
                        type="monotone"
                        dataKey="cardedSliver"
                        name="Carded sliver"
                        stackId="1"
                        stroke="var(--chart-3)"
                        strokeWidth={2}
                        fill="url(#dashGreige)"
                      />
                      <Area
                        type="monotone"
                        dataKey="spunYarn"
                        name="Spun yarn"
                        stackId="1"
                        stroke="var(--chart-4)"
                        strokeWidth={2}
                        fill="url(#dashYarn)"
                      />
                      <Area
                        type="monotone"
                        dataKey="wovenGreige"
                        name="Woven greige"
                        stackId="1"
                        stroke="var(--chart-2)"
                        strokeWidth={2}
                        fill="url(#dashFabric)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-border/80 shadow-md overflow-hidden">
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm font-display">Product line mix</CardTitle>
                  <CardDescription className="text-xs">Share of shipped volume by category</CardDescription>
                </CardHeader>
                <CardContent className="h-[220px] pt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mockProductLineMix}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={44}
                        outerRadius={72}
                        paddingAngle={2}
                        label={({ name, percent }) =>
                          `${String(name).split(" ")[0]} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={{ stroke: "color-mix(in oklch, var(--foreground) 25%, transparent)" }}
                      >
                        {mockProductLineMix.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} stroke="color-mix(in oklch, var(--card) 40%, transparent)" strokeWidth={1} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tipStyle} />
                      <Legend wrapperStyle={{ fontSize: "10px" }} layout="horizontal" verticalAlign="bottom" />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-border/80 shadow-md overflow-hidden lg:col-span-1">
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm font-display">Spin &amp; weave load</CardTitle>
                  <CardDescription className="text-xs">Relative floor intensity (0–100)</CardDescription>
                </CardHeader>
                <CardContent className="h-[220px] pt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mockFloorActivityIndex} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in oklch, var(--foreground) 8%, transparent)" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={28} stroke="var(--muted-foreground)" />
                      <Tooltip contentStyle={tipStyle} />
                      <Line
                        type="monotone"
                        dataKey="index"
                        name="Mill load"
                        stroke="var(--chart-1)"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "var(--chart-5)", strokeWidth: 2, stroke: "var(--card)" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </section>

          <div className="grid gap-4">
            <Card
              className="crm-dash-enter border-border/80 shadow-sm transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-md"
              style={{ animationDelay: "260ms" }}
            >
              <CardHeader>
                <CardDescription>
                  Deals by stage
                  {pipelineIsSample ? (
                    <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-amber-700/90 dark:text-amber-400/90">
                      Sample pipeline
                    </span>
                  ) : null}
                </CardDescription>
                <CardTitle className="text-lg">Pipeline</CardTitle>
              </CardHeader>
              <CardContent className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in oklch, var(--foreground) 10%, transparent)" />
                    <XAxis
                      dataKey="stage"
                      tick={{ fontSize: 11 }}
                      stroke="var(--muted-foreground)"
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} stroke="var(--muted-foreground)" />
                    <Tooltip contentStyle={tipStyle} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} name="Deals">
                      {pipelineData.map((row) => (
                        <Cell key={row.stage} fill={pipelineStageFill(row.stage)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

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
                  label: "Stock value (std cost)",
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
