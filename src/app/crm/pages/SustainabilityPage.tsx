import { useMemo } from "react";
import { Wrench, Zap, Droplets, Recycle, Clock, AlertTriangle, CheckCircle2, Activity, TrendingDown, Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { cn } from "../../components/ui/utils";
import { PageHeader, LastUpdated } from "../components/CrmPageUtils";

export default function SustainabilityPage() {
  const machines = useMemo(() => [
    { id: "L1001", name: "Loom 1", mtbf: 168, mttr: 2.5, status: "ok" as const, nextService: "2026-06-15" },
    { id: "L1002", name: "Loom 2", mtbf: 142, mttr: 3.1, status: "warning" as const, nextService: "2026-05-28" },
    { id: "L1003", name: "Loom 3", mtbf: 89, mttr: 4.8, status: "critical" as const, nextService: "2026-05-20" },
    { id: "S2001", name: "Spinner 1", mtbf: 195, mttr: 1.8, status: "ok" as const, nextService: "2026-07-01" },
    { id: "S2002", name: "Spinner 2", mtbf: 156, mttr: 2.2, status: "ok" as const, nextService: "2026-06-20" },
    { id: "F3001", name: "Finisher 1", mtbf: 112, mttr: 3.5, status: "warning" as const, nextService: "2026-06-01" },
  ], []);

  return (
    <div className="space-y-6 pb-12" data-gsap-section>
      <PageHeader title="Sustainability & Maintenance" description="Resource usage, asset health, and predictive maintenance"
        icon={<Wrench className="size-5 text-emerald-600" />} iconBg="bg-emerald-50 border-emerald-200/70"
        breadcrumbs={[{ label: "CRM" }, { label: "Sustainability" }]} />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Energy per kg", value: "2.84", unit: "kWh", icon: <Zap className="size-5 text-amber-600" />, trend: "-3.2%" as const, color: "emerald" as const },
          { label: "Water per kg", value: "8.1", unit: "L", icon: <Droplets className="size-5 text-blue-600" />, trend: "-1.8%" as const, color: "emerald" as const },
          { label: "Waste Recycled", value: "94.2", unit: "%", icon: <Recycle className="size-5 text-emerald-600" />, trend: "+2.1%" as const, color: "emerald" as const },
          { label: "Avg MTBF", value: "144", unit: "h", icon: <Gauge className="size-5 text-violet-600" />, trend: "-5.3%" as const, color: "rose" as const },
        ].map(k => (
          <div key={k.label} data-gsap-kpi className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div><p className="text-[10px] font-bold uppercase text-muted-foreground">{k.label}</p><p className="text-2xl font-bold mt-1">{k.value}<span className="text-sm font-normal text-muted-foreground ml-1">{k.unit}</span></p></div>
              <div className="size-9 rounded-lg border bg-muted/20 flex items-center justify-center">{k.icon}</div>
            </div>
            <p className={cn("text-xs mt-2", k.color === "emerald" ? "text-emerald-600" : "text-rose-600")}>{k.trend} vs last month</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Machine health */}
        <Card className="relative isolate overflow-hidden border-border/70 shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-violet-500/30 via-[#D4AF37] to-violet-500/30" />
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Activity className="size-4" /> Machine Health — MTBF / MTTR</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {machines.map(m => (
                <div key={m.id} className={cn("flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm",
                  m.status === "critical" ? "border-rose-500/30 bg-rose-500/5" : m.status === "warning" ? "border-amber-500/30 bg-amber-500/5" : "border-border/60")}>
                  <div className={cn("size-2 rounded-full shrink-0", m.status === "critical" ? "bg-rose-500 animate-pulse" : m.status === "warning" ? "bg-amber-500" : "bg-emerald-500")} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{m.id} · {m.name}</p>
                    <p className="text-xs text-muted-foreground">MTBF {m.mtbf}h · MTTR {m.mttr}h · Next service {m.nextService}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px]", m.status === "critical" ? "border-rose-500/30 text-rose-600" : m.status === "warning" ? "border-amber-500/30 text-amber-600" : "border-emerald-500/30 text-emerald-600")}>
                    {m.status === "critical" ? "Overdue" : m.status === "warning" ? "Due soon" : "OK"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Maintenance schedule */}
        <Card className="relative isolate overflow-hidden border-border/70 shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-500/30 via-[#D4AF37] to-amber-500/30" />
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Clock className="size-4" /> Scheduled Maintenance</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {[
              { task: "Loom 4 — Full service", due: "2026-05-20", priority: "high" as const },
              { task: "Spinner 3 — Belt replacement", due: "2026-05-22", priority: "medium" as const },
              { task: "Compressor — Oil change", due: "2026-05-25", priority: "medium" as const },
              { task: "Inspection Camera Calibration", due: "2026-06-01", priority: "low" as const },
              { task: "Boiler annual inspection", due: "2026-06-10", priority: "low" as const },
            ].map(s => (
              <div key={s.task} className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className={cn("size-2 rounded-full", s.priority === "high" ? "bg-rose-500" : s.priority === "medium" ? "bg-amber-500" : "bg-sky-500")} />
                  <div><p className="text-foreground">{s.task}</p><p className="text-xs text-muted-foreground">Due {s.due}</p></div>
                </div>
                <Badge variant="outline" className={cn("text-[10px]", s.priority === "high" ? "border-rose-500/30 text-rose-600" : "border-amber-500/30 text-amber-600")}>{s.priority}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Energy/Water trend */}
      <Card className="relative isolate overflow-hidden border-border/70 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-500/30 via-[#D4AF37] to-blue-500/30" />
        <CardHeader className="border-b bg-muted/10">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><Zap className="size-4" /> Resource Consumption Trend (per kg)</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="space-y-4">
            {[
              { month: "Jan", energy: 3.12, water: 9.4, waste: 91 },
              { month: "Feb", energy: 3.05, water: 9.1, waste: 92 },
              { month: "Mar", energy: 2.98, water: 8.8, waste: 93 },
              { month: "Apr", energy: 2.91, water: 8.5, waste: 93.5 },
              { month: "May", energy: 2.84, water: 8.1, waste: 94.2 },
            ].map(m => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="w-8 text-xs font-semibold text-muted-foreground">{m.month}</span>
                <div className="flex-1 space-y-1">
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: `${(m.energy / 3.5) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Energy: {m.energy} kWh</span>
                    <span>Water: {m.water} L</span>
                    <span className="text-emerald-600">Recycling: {m.waste}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Predictive alerts */}
      <Card className="border-rose-500/30 bg-rose-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="size-4 text-rose-500" /> Predictive Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            "Loom 3 — Vibration anomaly detected. Predicted bearing failure within 72 hours.",
            "Spinner 2 — Temperature trending above threshold. Check cooling system.",
            "Compressor #1 — Runtime since last service: 1,840h (limit: 2,000h).",
          ].map((a, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-sm">
              <AlertTriangle className="size-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-foreground">{a}</p>
            </div>
          ))}
          <Button size="sm" variant="outline" className="w-full mt-2 text-xs">View all predictions →</Button>
        </CardContent>
      </Card>
          <LastUpdated />
    </div>
  );
}




