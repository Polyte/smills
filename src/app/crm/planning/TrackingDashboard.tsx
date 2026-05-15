import { useMemo, useState } from "react";
import { Factory, ScanLine, BarChart3, AlertTriangle, CheckCircle2, Activity, Clock, Wrench, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { cn } from "../../components/ui/utils";

const MACHINE_COLORS = {
  running: "border-emerald-500/40 bg-emerald-500/8 text-emerald-600",
  idle: "border-amber-500/40 bg-amber-500/8 text-amber-600",
  fault: "border-rose-500/40 bg-rose-500/8 text-rose-600",
} as const;
const STATUS_LABEL = { running: "Running", idle: "Idle", fault: "Fault" };

function KpiCard({ icon, iconBg, label, value, sub }: any) {
  return (
    <div className="animate-card card-shine flex items-center gap-3 rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/20 px-4 py-3.5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl border", iconBg)}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-display text-xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function TrackingDashboard({ productLine }: { productLine: string }) {
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const hasData = true;
  const isWeaving = productLine === "weaving";
  const machineCount = isWeaving ? 16 : 8;

  const machines = useMemo(() => Array.from({ length: machineCount }, (_, i) => {
    const eff = 70 + Math.random() * 28;
    const isFault = eff < 72;
    const isIdle = eff >= 72 && eff < 80;
    const status: "running" | "idle" | "fault" = isFault ? "fault" : isIdle ? "idle" : "running";
    const reasons = ["warp break", "weft break", "maintenance", "yarn change", "quality check"];
    return {
      id: isWeaving ? `L${1001 + i}` : `M${2001 + i}`,
      efficiency: Math.round(eff * 10) / 10,
      speed: Math.round(isWeaving ? 380 + Math.random() * 80 : 260 + Math.random() * 60),
      status,
      stopReason: status === "fault" ? reasons[i % reasons.length] : null,
      runtime: Math.floor(Math.random() * 480) + 60,
      downtime: status === "running" ? Math.floor(Math.random() * 15) : Math.floor(Math.random() * 120) + 30,
    };
  }), [machineCount, isWeaving]);

  const plantOee = useMemo(() => ({
    avg: Math.round(machines.reduce((s, m) => s + m.efficiency, 0) / machines.length * 10) / 10,
    running: machines.filter(m => m.status === "running").length,
    faulty: machines.filter(m => m.status === "fault").length,
    stops: machines.reduce((s, m) => s + (m.status !== "running" ? 1 : 0), 0),
  }), [machines]);

  const stopData = useMemo(() => [
    { reason: "Warp break", pct: 32, min: 128 }, { reason: "Weft break", pct: 24, min: 96 },
    { reason: "Maintenance", pct: 18, min: 72 }, { reason: "Yarn change", pct: 14, min: 56 },
    { reason: "Quality check", pct: 8, min: 32 }, { reason: "Power dip", pct: 4, min: 16 },
  ], []);

  const defectRate = 2.8;
  const alerts = useMemo(() => [
    { id: "a1", machine: isWeaving ? "L1004" : "M2003", severity: "high" as const, msg: `Stopped 23min — ${isWeaving ? "warp" : "roving"} break`, time: "12:34" },
    { id: "a2", machine: isWeaving ? "L1007" : "M2005", severity: "medium" as const, msg: `6 breaks in 30min — yarn quality?`, time: "13:15" },
    { id: "a3", machine: "Yarn Store", severity: "high" as const, msg: "TEX 42/1 — 2h remaining", time: "14:02" },
    { id: "a4", machine: "Inspection", severity: "medium" as const, msg: `Defect rate ${defectRate}/100m`, time: "14:30" },
  ].filter(a => !acknowledged.has(a.id)), [acknowledged, defectRate, isWeaving]);

  const sel = selectedMachine ? machines.find(m => m.id === selectedMachine) : null;

  return (
    <div className="space-y-6">
      {/* Alert bar */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="size-4 text-rose-500" /> Active ({alerts.length})
          </div>
          {alerts.map(a => (
            <div key={a.id} className={cn("flex items-start gap-3 rounded-xl border px-4 py-2.5 text-sm",
              a.severity === "high" ? "border-rose-500/30 bg-rose-500/5" : "border-amber-500/30 bg-amber-500/5")}>
              <div className={cn("mt-0.5 size-2 shrink-0 rounded-full", a.severity === "high" ? "bg-rose-500 animate-pulse" : "bg-amber-500")} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground"><span className="font-mono text-xs text-muted-foreground">[{a.time}]</span> {a.machine}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.msg}</p>
              </div>
              <button onClick={() => { setAcknowledged(p => new Set(p).add(a.id)); toast.success("Acknowledged"); }}
                className="text-[11px] font-medium text-primary hover:underline shrink-0">Ack</button>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={<BarChart3 className="size-4 text-blue-600" />} iconBg="bg-blue-50 border-blue-200/60" label="OEE" value={`${plantOee.avg}%`} sub="Plant average" />
        <KpiCard icon={<Activity className="size-4 text-emerald-600" />} iconBg="bg-emerald-50 border-emerald-200/60" label="Running" value={`${plantOee.running}/${machineCount}`} sub="Machines active" />
        <KpiCard icon={<AlertTriangle className="size-4 text-rose-600" />} iconBg="bg-rose-50 border-rose-200/60" label="Faults" value={plantOee.faulty} sub={`${plantOee.stops} stopped`} />
        <KpiCard icon={<CheckCircle2 className="size-4 text-violet-600" />} iconBg="bg-violet-50 border-violet-200/60" label="Defects" value={`${defectRate}/100m`} sub="Threshold 3.0" />
      </div>

      {/* Machine grid */}
      <Card className="relative isolate overflow-hidden border-border/70 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-500/30 via-[#D4AF37] to-emerald-500/30" />
        <CardHeader className="border-b bg-muted/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Factory className="size-4" /> {isWeaving ? "Weaving Shed" : "Spinning Floor"}
            </CardTitle>
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-500" /> Run</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-500" /> Idle</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-rose-500" /> Fault</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {machines.map(m => (
              <button key={m.id} onClick={() => setSelectedMachine(sel?.id === m.id ? null : m.id)}
                data-gsap-machine className={cn("rounded-xl border-2 p-2 text-center transition-all hover:shadow-md",
                  MACHINE_COLORS[m.status], sel?.id === m.id && "ring-2 ring-[#D4AF37]")}>
                <p className="text-[10px] font-bold font-mono">{m.id}</p>
                <p className={cn("text-lg font-bold", m.status === "running" ? "text-emerald-600" : m.status === "idle" ? "text-amber-600" : "text-rose-600")}>{m.efficiency}%</p>
                <p className="text-[8px] uppercase opacity-70">{STATUS_LABEL[m.status]}</p>
                {m.stopReason && <p className="text-[7px] text-rose-500 truncate">{m.stopReason}</p>}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected machine drill-down */}
      {sel && (
        <Card className="border-[#D4AF37/30]">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">{sel.id} — {isWeaving ? "Loom" : "Machine"} Details</CardTitle>
            <button onClick={() => setSelectedMachine(null)} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div><p className="text-[10px] font-bold uppercase text-muted-foreground">Efficiency</p><p className="text-lg font-bold">{sel.efficiency}%</p></div>
              <div><p className="text-[10px] font-bold uppercase text-muted-foreground">Speed</p><p className="text-lg font-bold">{sel.speed} RPM</p></div>
              <div><p className="text-[10px] font-bold uppercase text-muted-foreground">Runtime</p><p className="text-lg font-bold">{Math.floor(sel.runtime / 60)}h {sel.runtime % 60}m</p></div>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Stop history (last 24h)</p>
            <Table>
              <TableHeader><TableRow className="[&>th]:text-[10px]"><TableHead>Time</TableHead><TableHead>Duration</TableHead><TableHead>Reason</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {Array.from({ length: 4 }, (_, i) => (
                  <TableRow key={i} className="text-xs">
                    <TableCell className="font-mono">{`${8 + i}:${15 + i * 12}`.padEnd(5, "0")}</TableCell>
                    <TableCell>{Math.floor(Math.random() * 15) + 2} min</TableCell>
                    <TableCell className="text-rose-500">{["warp break", "weft break", "yarn change", "maintenance"][i]}</TableCell>
                    <TableCell><button className="text-[10px] text-primary hover:underline">Tag cause</button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Bottom grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stop analysis */}
        <Card className="relative isolate overflow-hidden border-border/70 shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-rose-500/30 via-[#D4AF37] to-rose-500/30" />
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Clock className="size-4" /> Stop Reason Analysis</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {stopData.map(d => (
              <div key={d.reason} className="space-y-1">
                <div className="flex justify-between text-xs"><span>{d.reason}</span><span className="font-mono font-semibold">{d.pct}% · {d.min}m</span></div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${d.pct}%`, background: d.pct > 25 ? "oklch(0.55 0.18 15)" : d.pct > 15 ? "oklch(0.72 0.14 82)" : "oklch(0.62 0.13 210)" }} />
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full text-xs mt-2">Drill down → Machines</Button>
          </CardContent>
        </Card>

        {/* Quality */}
        <Card className="relative isolate overflow-hidden border-border/70 shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-violet-500/30 via-[#D4AF37] to-violet-500/30" />
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Wrench className="size-4" /> Quality Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className={cn("rounded-lg border p-3", defectRate > 3 ? "border-rose-500/30 bg-rose-500/5" : "border-emerald-500/30 bg-emerald-500/5")}>
              <div className="flex justify-between items-center">
                <div><p className="text-[10px] font-bold uppercase text-muted-foreground">Defect Density</p><p className="text-2xl font-bold">{defectRate}</p></div>
                <div className="text-right"><p className="text-[10px] font-bold uppercase text-muted-foreground">per 100m</p><p className={cn("text-sm font-semibold", defectRate > 3 ? "text-rose-500" : "text-emerald-500")}>{defectRate > 3 ? "⚠️ Above threshold" : "✅ Within limit"}</p></div>
              </div>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">Top defects</p>
            {[{ n: "Slub", c: 14 }, { n: "Hole", c: 8 }, { n: "Miss pick", c: 6 }, { n: "Stain", c: 3 }].map(d => (
              <div key={d.n} className="flex justify-between text-xs"><span>{d.n}</span><span className="font-mono">{d.c} occurrences</span></div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Yarn tracking */}
      <Card className="relative isolate overflow-hidden border-border/70 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-500/30 via-[#D4AF37] to-blue-500/30" />
        <CardHeader className="border-b bg-muted/10">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><ScanLine className="size-4 text-blue-600" /> Yarn Tracking</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3"><p className="text-[10px] font-bold uppercase text-muted-foreground">Inventory</p><p className="text-lg font-bold">1,280 kg</p><p className="text-xs text-muted-foreground">TEX 42/1 · Lot A482</p></div>
            <div className="rounded-lg border p-3"><p className="text-[10px] font-bold uppercase text-muted-foreground">Consumption</p><p className="text-lg font-bold">18.4 kg/h</p><p className="text-xs text-muted-foreground">~14h remaining</p></div>
            <div className="rounded-lg border p-3"><p className="text-[10px] font-bold uppercase text-muted-foreground">Scans Today</p><p className="text-lg font-bold">156</p><p className="text-xs text-muted-foreground">Barcode/RFID</p></div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-[10px] font-bold uppercase text-amber-600">⚠️ Low Stock</p>
              <p className="text-lg font-bold text-amber-600">TEX 1100/3</p>
              <p className="text-xs text-muted-foreground">~2 hours left — reorder now</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

