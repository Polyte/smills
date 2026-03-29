import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { format } from "date-fns";
import { dashboardStats, isCrmDataAvailable } from "../../../lib/crm/crmRepo";
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
import { TrendingUp, Award, Factory } from "lucide-react";

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

export function DashboardPage() {
  const { user } = useCrmAuth();
  const [openTasks, setOpenTasks] = useState(0);
  const [stageCounts, setStageCounts] = useState<{ stage: string; count: number }[]>([]);
  const [recent, setRecent] = useState<ActivityJoined[]>([]);
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
  }, [user]);

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
            <p className="mt-1 text-sm text-muted-foreground">
              Workload, pipeline, and a live read on what is moving through the mill.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
            <Factory className="size-3.5 text-[oklch(0.55_0.12_200)]" />
            Standerton Mills CRM
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground crm-dash-enter">Loading…</p>
      ) : (
        <>
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

          <div className="grid gap-4 lg:grid-cols-2 crm-dash-enter" style={{ animationDelay: "120ms" }}>
            <InsightList
              title="Best selling"
              subtitle="Lifetime outbound (or production output if no shipments)"
              rows={displayBest}
              accent="amber"
              icon={Award}
              delayStart={180}
              emptyHint="Complete shipments to see best-selling SKUs by volume."
              sampleBadge={bestSampleBadge}
            />
            <InsightList
              title="Trending"
              subtitle="Last 28 days vs the prior 28 days"
              rows={displayTrending}
              accent="violet"
              icon={TrendingUp}
              delayStart={220}
              emptyHint="No recent movement in the window — rankings will appear as you ship."
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
              Illustrative volumes for fabrics, yarn, and floor activity — swap in live analytics when ready.
            </p>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="border-border/80 shadow-md overflow-hidden">
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm font-display">Weekly output (k units)</CardTitle>
                  <CardDescription className="text-xs">Stacked: fabric · yarn · greige</CardDescription>
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
                        dataKey="greige"
                        name="Greige"
                        stackId="1"
                        stroke="var(--chart-3)"
                        strokeWidth={2}
                        fill="url(#dashGreige)"
                      />
                      <Area
                        type="monotone"
                        dataKey="yarn"
                        name="Yarn"
                        stackId="1"
                        stroke="var(--chart-4)"
                        strokeWidth={2}
                        fill="url(#dashYarn)"
                      />
                      <Area
                        type="monotone"
                        dataKey="fabric"
                        name="Fabric"
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
                  <CardDescription className="text-xs">Share of shipped volume</CardDescription>
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
                  <CardTitle className="text-sm font-display">Floor activity index</CardTitle>
                  <CardDescription className="text-xs">Relative load (0–100)</CardDescription>
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
                        name="Activity"
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card
              className="crm-dash-enter border-border/80 shadow-sm transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-md"
              style={{ animationDelay: "200ms" }}
            >
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
            <Card
              className="crm-dash-enter sm:col-span-2 border-border/80 shadow-sm transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-md"
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
