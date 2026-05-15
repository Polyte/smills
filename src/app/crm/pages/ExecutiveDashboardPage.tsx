import { useMemo, useState } from "react";
import { Activity, BarChart3, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, Package, Factory, Target, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Link } from "react-router";
import { cn } from "../../components/ui/utils";
import { PageHeader, LastUpdated } from "../components/CrmPageUtils";

const metricColors = {
  green: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
  red: "text-rose-600 dark:text-rose-400",
};

function getColor(v: number, thresholds: [number, number]) {
  if (v >= thresholds[0]) return metricColors.green;
  if (v >= thresholds[1]) return metricColors.amber;
  return metricColors.red;
}

function MetricCard({ label, value, unit, icon, trend, sub }: {
  label: string; value: string; unit?: string; icon: React.ReactNode; trend?: { dir: "up" | "down"; pct: string }; sub?: string;
}) {
  const num = parseFloat(value);
  const color = getColor(num, [85, 70]);
  return (
    <div className="relative isolate overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/20 px-5 py-4 shadow-sm transition-all hover:shadow-md">
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r", num >= 85 ? "from-emerald-500/40 via-emerald-500 to-emerald-500/40" : num >= 70 ? "from-amber-500/40 via-amber-500 to-amber-500/40" : "from-rose-500/40 via-rose-500 to-rose-500/40")} />
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
          <div className="flex items-baseline gap-1.5">
            <span className={cn("text-3xl font-bold tabular-nums tracking-tight", color)}>{value}</span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
          {trend && (
            <p className={cn("text-xs flex items-center gap-1", trend.dir === "up" ? "text-emerald-600" : "text-rose-600")}>
              {trend.dir === "up" ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {trend.pct} vs last month
            </p>
          )}
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/20">
          {icon}
        </div>
      </div>
          <LastUpdated />
    </div>
  );
}

function ProgressBar({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs"><span>{label}</span><span className="font-mono font-semibold">{value.toLocaleString()} / {max.toLocaleString()} ({pct}%)</span></div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
      </div>
          <LastUpdated />
    </div>
  );
}

export default function ExecutiveDashboardPage() {
  const [period] = useState("This Month");

  // Simulated live data
  const data = useMemo(() => ({
    oee: 78.4,
    outputVsTarget: { output: 847000, target: 1100000, unit: "m" },
    onTimeDelivery: 92.3,
    qualityYield: 94.1,
    orderBook: 2450000,
    capacity: 3200000,
    revenue: 18500000,
    revenueTarget: 22000000,
    costPerKg: 42.50,
  }), []);

  const machineOEE = useMemo(() => [
    { area: "Yarn Spinning", oee: 82.1, trend: "+2.4" },
    { area: "Weaving", oee: 76.8, trend: "-1.2" },
    { area: "Finishing", oee: 79.5, trend: "+0.8" },
    { area: "Inspection", oee: 88.3, trend: "+3.1" },
  ], []);

  const weeklyOutput = useMemo(() => [
    { week: "W1", plan: 260, actual: 248, yarn: 120, weaving: 98, finishing: 30 },
    { week: "W2", plan: 260, actual: 255, yarn: 125, weaving: 100, finishing: 30 },
    { week: "W3", plan: 260, actual: 238, yarn: 115, weaving: 95, finishing: 28 },
    { week: "W4", plan: 260, actual: 252, yarn: 122, weaving: 99, finishing: 31 },
  ], []);

  const topAlerts = [
    { severity: "high" as const, msg: "L1004 — Warp break, 23 min downtime", time: "5 min ago" },
    { severity: "medium" as const, msg: "TEX 42/1 inventory low — ~2h remaining", time: "12 min ago" },
    { severity: "medium" as const, msg: "Weaving OEE below 75% target this week", time: "1h ago" },
  ];

  return (
    <div className="space-y-6 pb-12" data-gsap-section>
      <PageHeader
        title="Executive Command Center"
        description="High-level operational overview for strategic decision-making"
        icon={<BarChart3 className="size-5 text-amber-600" />}
        iconBg="bg-amber-50 border-amber-200/70"
        breadcrumbs={[{ label: "CRM" }, { label: "Command Center" }]}
      >
        <Badge variant="outline" className="text-[10px]">{period}</Badge>
      </PageHeader>

      {/* Alert strip */}
      {topAlerts.length > 0 && (
        <div className="space-y-1.5">
          {topAlerts.map((a, i) => (
            <div key={i} className={cn("flex items-center gap-2 rounded-xl border px-4 py-2 text-xs",
              a.severity === "high" ? "border-rose-500/30 bg-rose-500/5" : "border-amber-500/30 bg-amber-500/5")}>
              <div className={cn("size-1.5 rounded-full shrink-0", a.severity === "high" ? "bg-rose-500 animate-pulse" : "bg-amber-500")} />
              <span className="flex-1 text-foreground">{a.msg}</span>
              <span className="text-muted-foreground shrink-0">{a.time}</span>
              <Link to="/crm/planning" className="text-primary hover:underline text-[10px] font-medium">View</Link>
            </div>
          ))}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="OEE" value={data.oee.toFixed(1)} unit="%" icon={<Activity className="size-5 text-blue-600" />} trend={{ dir: "up", pct: "+2.1%" }} sub="Plant average all lines" />
        <MetricCard label="Output vs Target" value={`${Math.round((data.outputVsTarget.output / data.outputVsTarget.target) * 100)}`} unit="%" icon={<Target className="size-5 text-amber-600" />} sub={`${(data.outputVsTarget.output / 1000).toFixed(0)}k / ${(data.outputVsTarget.target / 1000).toFixed(0)}k ${data.outputVsTarget.unit}`} />
        <MetricCard label="On-Time Delivery" value={data.onTimeDelivery.toFixed(1)} unit="%" icon={<Clock className="size-5 text-emerald-600" />} trend={{ dir: "up", pct: "+0.8%" }} sub="Order fulfillment rate" />
        <MetricCard label="Quality Yield" value={data.qualityYield.toFixed(1)} unit="%" icon={<CheckCircle2 className="size-5 text-violet-600" />} trend={{ dir: "up", pct: "+1.2%" }} sub="First Pass Yield" />
      </div>

      {/* Second row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Order Book vs Capacity */}
        <Card className="relative isolate overflow-hidden border-border/70 shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-500/30 via-[#D4AF37] to-blue-500/30" />
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Package className="size-4" /> Order Book vs Capacity</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card to-muted/10 p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Order Book</p>
                <p className="text-2xl font-bold text-foreground mt-1">{(data.orderBook / 1000).toFixed(0)}k</p>
                <p className="text-xs text-muted-foreground">meters</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card to-muted/10 p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Capacity</p>
                <p className="text-2xl font-bold text-foreground mt-1">{(data.capacity / 1000).toFixed(0)}k</p>
                <p className="text-xs text-muted-foreground">meters / month</p>
              </div>
            </div>
            <ProgressBar value={data.orderBook} max={data.capacity} label="Utilization" color="bg-gradient-to-r from-blue-500 to-[#D4AF37]" />
            <p className={cn("text-xs font-medium", data.orderBook > data.capacity * 0.85 ? "text-amber-600" : "text-emerald-600")}>
              {data.orderBook > data.capacity * 0.85 ? "⚠️ Approaching capacity — consider scheduling review" : "✅ Within safe capacity range"}
            </p>
          </CardContent>
        </Card>

        {/* Financial snapshot */}
        <Card className="relative isolate overflow-hidden border-border/70 shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-500/30 via-[#D4AF37] to-emerald-500/30" />
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="size-4" /> Financial Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Revenue (MTD)</p>
                <p className="text-xl font-bold text-emerald-600">R {(data.revenue / 1e6).toFixed(1)}M</p>
                <p className="text-xs text-muted-foreground">Target: R {(data.revenueTarget / 1e6).toFixed(1)}M</p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Cost per kg</p>
                <p className="text-xl font-bold text-amber-600">R {data.costPerKg.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Yarn & fabric combined</p>
              </div>
            </div>
            <ProgressBar value={data.revenue} max={data.revenueTarget} label="Revenue attainment" color="bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Export: 62%</span>
              <span>Local: 38%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Machine OEE by area */}
      <Card className="relative isolate overflow-hidden border-border/70 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-violet-500/30 via-[#D4AF37] to-violet-500/30" />
        <CardHeader className="border-b bg-muted/10">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><Factory className="size-4" /> OEE by Production Area</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {machineOEE.map(m => (
              <div key={m.area} className="rounded-xl border border-border/60 bg-card p-4 transition-all hover:shadow-md">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{m.area}</p>
                <p className={cn("text-2xl font-bold mt-1", getColor(m.oee, [85, 70]))}>{m.oee}%</p>
                <p className={cn("text-xs mt-0.5", m.trend.startsWith("+") ? "text-emerald-600" : "text-rose-600")}>{m.trend} pp</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weekly output trend */}
      <Card className="relative isolate overflow-hidden border-border/70 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-500/30 via-[#D4AF37] to-amber-500/30" />
        <CardHeader className="border-b bg-muted/10">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart3 className="size-4" /> Weekly Production Output (000s m)</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="space-y-4">
            {weeklyOutput.map(w => {
              const attainment = Math.round((w.actual / w.plan) * 100);
              return (
                <div key={w.week} className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold">{w.week}</span>
                    <span className="font-mono">{w.actual.toLocaleString()} / {w.plan.toLocaleString()} ({attainment}%)</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${(w.yarn / w.actual) * 100}%` }} title={`Yarn: ${w.yarn}`} />
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(w.weaving / w.actual) * 100}%` }} title={`Weaving: ${w.weaving}`} />
                    <div className="h-full bg-amber-500 transition-all" style={{ width: `${(w.finishing / w.actual) * 100}%` }} title={`Finishing: ${w.finishing}`} />
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-blue-500" /> Yarn</span>
                    <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-emerald-500" /> Weaving</span>
                    <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-amber-500" /> Finishing</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Production Planning", to: "/crm/planning", icon: Target },
          { label: "Inventory", to: "/crm/inventory", icon: Package },
          { label: "Quality Control", to: "/crm/quality", icon: CheckCircle2 },
          { label: "Reports", to: "/crm/reports", icon: BarChart3 },
        ].map(item => (
          <Link key={item.to} to={item.to}
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 group">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/20">
              <item.icon className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <span className="text-sm font-medium flex-1">{item.label}</span>
            <ArrowRight className="size-4 text-muted-foreground/40 group-hover:text-foreground transition-all group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
          <LastUpdated />
    </div>
  );
}



