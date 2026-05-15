import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Target, Upload, FileSpreadsheet, CalendarRange, TrendingUp, TrendingDown, CheckCircle2, Loader2, Plus, Trash2, Download, Save, Factory, ScanLine, BarChart3, Clock, AlertTriangle, Layers, GitBranch, Boxes, Activity } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Progress } from "../../components/ui/progress";
import { toast } from "sonner";
import { PlanningImportDialog } from "../planning/PlanningImportDialog";
import { TrackingDashboard } from "../planning/TrackingDashboard";
import { format, addDays, parseISO, startOfMonth, endOfMonth, eachWeekOfInterval, getDay } from "date-fns";
import { cn } from "../../components/ui/utils";

type ProductLine = "yarn" | "weaving";

interface OrderLine {
  id: string;
  orderRef: string;
  customer: string;
  item: string;
  orderedQty: number | null;
  monthlyTarget: number | null;
  weeklyPlan: Record<string, number>;
  weeklyActual: Record<string, number>;
  width?: string;
  picks?: string;
  loom?: string;
  status: "planned" | "in_progress" | "completed" | "hold";
  materialStatus: "sufficient" | "low" | "pending";
}

function getWeekStarts(yearMonth: string): string[] {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return [];
  const monthStart = startOfMonth(new Date(y, m - 1));
  const monthEnd = endOfMonth(new Date(y, m - 1));
  const firstMonday = new Date(monthStart);
  const dayOfWeek = getDay(firstMonday);
  if (dayOfWeek !== 1) firstMonday.setDate(firstMonday.getDate() + ((8 - dayOfWeek) % 7));
  return eachWeekOfInterval({ start: firstMonday, end: monthEnd }, { weekStartsOn: 1 }).map((w) => format(w, "yyyy-MM-dd"));
}

function weekLabel(ws: string): string {
  try { const s = parseISO(ws); return `${format(s, "MMM d")} - ${format(addDays(s, 6), "d")}`; }
  catch { return ws; }
}

export function PlanningTrackerPage() {
  const [yearMonth, setYearMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [productLine, setProductLine] = useState<ProductLine>("yarn");
  const [phase, setPhase] = useState<"planning" | "tracking">("planning");
  const [importOpen, setImportOpen] = useState(false);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewTab, setViewTab] = useState<"detail" | "summary">("detail");
  const [importHistory, setImportHistory] = useState<{name: string; date: string; count: number}[]>([]);
  const storageKey = `sm_planning_${yearMonth}_${productLine}`;
  const historyKey = `sm_planning_history_${productLine}`;

  useEffect(() => {
    try { const saved = localStorage.getItem(historyKey); if (saved) setImportHistory(JSON.parse(saved)); } catch {}
  }, [historyKey]);

  useEffect(() => {
    if (lines.length > 0) {
      try { localStorage.setItem(storageKey, JSON.stringify(lines)); } catch {}
    }
  }, [lines, storageKey]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) { setLines(JSON.parse(saved)); } else { setLines([]); }
    } catch { setLines([]); }
  }, [storageKey]);

  const weeks = useMemo(() => getWeekStarts(yearMonth), [yearMonth]);
  const accent = productLine === "weaving" ? "emerald" : "blue";
  const accentVar = productLine === "weaving" ? "oklch(0.62_0.13_160)" : "oklch(0.62_0.13_210)";

  const updateLine = useCallback((id: string, upd: Partial<OrderLine>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...upd } : l)));
  }, []);

  function debouncedSave(cellKey: string) {
    setSavingCell(cellKey);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSavingCell(null); }, 600);
  }

  function addAdHocLine() {
    if (!adHocOrder.trim()) { toast.error("Order reference required"); return; }
    setLines((prev) => [...prev, {
      id: `adhoc-${Date.now()}`, orderRef: adHocOrder.trim(), customer: adHocCustomer.trim() || "—",
      item: adHocItem.trim() || "Ad-hoc", orderedQty: adHocQty === "" ? null : Number(adHocQty),
      monthlyTarget: null, weeklyPlan: {}, weeklyActual: {}, status: "planned", materialStatus: "pending",
    }]);
    setAdHocOrder(""); setAdHocCustomer(""); setAdHocItem(""); setAdHocQty("");
    toast.success("Ad-hoc line added");
  }

  function autoPlanAll() {
    setLines((prev) => prev.map((ln) => {
      const tgt = ln.monthlyTarget ?? ln.orderedQty ?? 0;
      if (!tgt || !weeks.length) return ln;
      const perWeek = Math.floor(tgt / weeks.length);
      const remainder = tgt - perWeek * weeks.length;
      const weeklyPlan: Record<string, number> = {};
      weeks.forEach((w, i) => { weeklyPlan[w] = i === 0 ? perWeek + remainder : perWeek; });
      return { ...ln, monthlyTarget: ln.monthlyTarget ?? tgt, weeklyPlan, status: "planned" as const };
    }));
    toast.success(`Auto-planned ${lines.filter(l => (l.monthlyTarget ?? l.orderedQty ?? 0) > 0).length} lines`);
  }

  function exportToCsv() {
    const csvRows = [
      ["Order","Customer","Item","Ordered Qty","Monthly Target",...weeks.flatMap(w => [`Plan ${weekLabel(w)}`,`Actual ${weekLabel(w)}`]),"Status","Material"],
      ...lines.map(ln => [ln.orderRef, ln.customer, ln.item, ln.orderedQty ?? "", ln.monthlyTarget ?? "",
        ...weeks.flatMap(w => [ln.weeklyPlan[w] ?? "", ln.weeklyActual[w] ?? ""]), ln.status, ln.materialStatus])
    ];
    const csv = csvRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${productLine}-planning-${yearMonth}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Exported");
  }

  function saveAll() {
    try { localStorage.setItem(storageKey, JSON.stringify(lines)); toast.success("Saved to browser"); }
    catch { toast.error("Could not save"); }
  }

  function removeLine(lineId: string) {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
    toast.success("Line removed");
  }

  function splitTargetEvenly(lineId: string) {
    setLines((prev) => prev.map((ln) => {
      if (ln.id !== lineId) return ln;
      const tgt = ln.monthlyTarget ?? ln.orderedQty ?? 0;
      if (!tgt || !weeks.length) return ln;
      const perWeek = Math.floor(tgt / weeks.length);
      const remainder = tgt - perWeek * weeks.length;
      const weeklyPlan: Record<string, number> = {};
      weeks.forEach((w, i) => { weeklyPlan[w] = i === 0 ? perWeek + remainder : perWeek; });
      return { ...ln, weeklyPlan };
    }));
    toast.success("Target split evenly");
  }

  const handleImport = useCallback((raw: any) => {
    const parsedRows: any[] = Array.isArray(raw) ? raw : [];
    const newLines: OrderLine[] = parsedRows.map((r: any, i: number) => ({
      id: `line-${Date.now()}-${i}`, orderRef: r.erp_order_ref || `SO-${i + 1}`,
      customer: r.customer_name || r.customer || "—", item: r.item_description || r.pcode || r.item || "—",
      orderedQty: r.ordered_qty ?? r.quantity ?? null, monthlyTarget: null,
      weeklyPlan: {}, weeklyActual: {}, width: r.width ?? r.fabric_width ?? null,
      picks: r.picks ?? r.picks_per_inch ?? null, status: "planned" as const, materialStatus: "pending" as const,
    }));
    setLines((prev) => [...prev, ...newLines]);
    const entry = { name: `${productLine} import ${new Date().toLocaleDateString()}`, date: new Date().toISOString(), count: newLines.length };
    setImportHistory((prev) => {
      const updated = [entry, ...prev].slice(0, 10);
      try { localStorage.setItem(historyKey, JSON.stringify(updated)); } catch {}
      return updated;
    });
    toast.success(`Added ${newLines.length} order lines`);
  }, [productLine, historyKey]);

  // Ad-hoc form state
  const [adHocOrder, setAdHocOrder] = useState(""); const [adHocCustomer, setAdHocCustomer] = useState("");
  const [adHocItem, setAdHocItem] = useState(""); const [adHocQty, setAdHocQty] = useState("");

  // ── KPI Computations ──
  const kpis = useMemo(() => {
    const totalOrdered = lines.reduce((s, l) => s + Number(l.orderedQty ?? 0), 0);
    const totalTarget = lines.reduce((s, l) => s + Number(l.monthlyTarget ?? 0), 0);
    let totalPlanned = 0, totalActual = 0;
    const perWeek = weeks.map(() => ({ plan: 0, act: 0 }));
    for (const ln of lines) {
      weeks.forEach((w, i) => {
        perWeek[i].plan += Number(ln.weeklyPlan[w] ?? 0);
        perWeek[i].act += Number(ln.weeklyActual[w] ?? 0);
      });
    }
    totalPlanned = perWeek.reduce((s, w) => s + w.plan, 0);
    totalActual = perWeek.reduce((s, w) => s + w.act, 0);
    const fulfillment = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : null;
    const inProgress = lines.filter(l => l.status === "in_progress").length;
    const completed = lines.filter(l => l.status === "completed").length;
    const materialLow = lines.filter(l => l.materialStatus === "low" || l.materialStatus === "pending").length;
    return { totalOrdered, totalTarget, totalPlanned, totalActual, fulfillment, perWeek, inProgress, completed, materialLow };
  }, [lines, weeks]);

  return (
    <div className="space-y-6" data-gsap-section>
      {/* ── Phase Header ── */}
      <div className="relative isolate overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/20 px-6 py-5 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-[oklch(0.45_0.14_265)] via-[#D4AF37] via-60% to-[oklch(0.45_0.14_265)]" />
        <div className="pointer-events-none absolute -right-12 -top-12 size-56 rounded-full bg-[radial-gradient(circle,#D4AF37/0.06),transparent_65%)] blur-2xl" />
        <div className="flex items-start gap-4">
          <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl border shadow-sm",
            productLine === "weaving" ? "border-emerald-200/70 bg-emerald-50" : "border-blue-200/70 bg-blue-50")}>
            {productLine === "weaving" ? <Factory className="size-5 text-emerald-600" /> : <Activity className="size-5 text-blue-600" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                {productLine === "weaving" ? "Weaving" : "Yarn"} Production Planning
              </h1>
              <Badge variant="outline" className={cn("text-[10px]", productLine === "weaving" ? "border-emerald-500/30 text-emerald-600" : "border-blue-500/30 text-blue-600")}>
                {productLine === "weaving" ? "🔗 Weaving" : "🧵 Yarn"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {phase === "planning"
                ? "Order → Plan → APS (Capacity, MRP, Sequencing) → Detailed Dispatch"
                : "MES tracking: barcode scan, machine IoT, OEE & quality monitoring"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Phase Selector ── */}
      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-1.5 shadow-sm">
        <button onClick={() => setPhase("planning")} className={cn(
          "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
          phase === "planning" ? "bg-[#D4AF37] text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
        )}>
          <Layers className="size-4" /> 🗺️ Planning Phase
        </button>
        <button onClick={() => setPhase("tracking")} className={cn(
          "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
          phase === "tracking" ? "bg-[#D4AF37] text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
        )}>
          <ScanLine className="size-4" /> 👀 Tracking Phase
        </button>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarRange className="size-3.5" />
          <Input type="month" className="w-36 h-8 text-xs" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} />
        </div>
        <Select value={productLine} onValueChange={(v) => setProductLine(v as ProductLine)}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yarn">🧵 Yarn</SelectItem>
            <SelectItem value="weaving">🔗 Weaving</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ════════════ PLANNING PHASE ════════════ */}
      {phase === "planning" && (
        <div className="space-y-6">
          {/* Step indicators */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { step: 1, title: "Order to Plan", desc: "Import ERP orders, check materials, create production plan", icon: Boxes },
              { step: 2, title: "APS Scheduling", desc: "Capacity planning, MRP, sequencing", icon: GitBranch },
              { step: 3, title: "Detailed Dispatch", desc: "Weekly plan, warp specs, task assignment", icon: Clock },
            ].map((s) => (
              <div key={s.step} className="relative isolate overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:shadow-md">
                <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r",
                  s.step === 1 ? "from-blue-500/40 via-[#D4AF37] to-blue-500/40" :
                  s.step === 2 ? "from-violet-500/40 via-[#D4AF37] to-violet-500/40" :
                  "from-amber-500/40 via-[#D4AF37] to-amber-500/40")} />
                <div className="flex items-center gap-3">
                  <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg border",
                    s.step === 1 ? "bg-blue-50 border-blue-200/60" : s.step === 2 ? "bg-violet-50 border-violet-200/60" : "bg-amber-50 border-amber-200/60")}>
                    <s.icon className={cn("size-4", s.step === 1 ? "text-blue-600" : s.step === 2 ? "text-violet-600" : "text-amber-600")} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">Step {s.step}</span>
                      {s.step === 1 && lines.length > 0 && <Badge className="text-[9px] h-4 bg-blue-500/10 text-blue-600 border-blue-500/20">{lines.length} orders</Badge>}
                    </div>
                    <p className="text-sm font-semibold text-foreground">{s.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <Card className="relative isolate overflow-hidden border-border/70 shadow-sm">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-500/30 via-[#D4AF37] to-blue-500/30" />
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <Button className="h-9 gap-1.5 text-xs transition-all hover:scale-[1.02]" onClick={() => setImportOpen(true)}>
                <Upload className="size-3.5" />Import ERP Orders
              </Button>
              {lines.length > 0 && (
                <>
                  <Button size="sm" className="h-9 gap-1.5 text-xs bg-[#D4AF37] text-white hover:bg-[oklch(0.65_0.13_80)] transition-all hover:scale-[1.02]" onClick={autoPlanAll}>
                    <Target className="size-3.5" />Auto APS Plan
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={saveAll}><Save className="size-3.5" />Save</Button>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={exportToCsv}><Download className="size-3.5" />Export</Button>
                  <Button variant="outline" size="sm" className="h-9 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => { setLines([]); try { localStorage.removeItem(storageKey); } catch {} toast.success("Cleared"); }}>
                    Clear
                  </Button>
                </>
              )}
              <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                {lines.length > 0 && <><Badge variant="secondary" className="text-[10px]">{lines.length} orders</Badge>
                {kpis.inProgress > 0 && <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600">{kpis.inProgress} active</Badge>}</>}
              </div>
            </CardContent>
          </Card>

          {/* Import history */}
          {importHistory.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
              <span className="font-medium">Imports:</span>
              {importHistory.slice(0, 5).map((h, i) => (
                <Badge key={i} variant="secondary" className="gap-1 text-[10px]">
                  <Upload className="size-2.5" />{h.count} lines · {new Date(h.date).toLocaleDateString()}
                </Badge>
              ))}
            </div>
          )}

          {/* KPI Cards */}
          {lines.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard icon={<Boxes className="size-4 text-blue-600" />} iconBg="bg-blue-50 border-blue-200/60" label="Total Orders" value={lines.length} sub={`${kpis.inProgress} in progress · ${kpis.completed} done`} />
              <KpiCard icon={<Target className="size-4 text-amber-600" />} iconBg="bg-amber-50 border-amber-200/60" label="Plan Target" value={kpis.totalTarget.toLocaleString()} sub={`${kpis.totalOrdered.toLocaleString()} ordered`} />
              <KpiCard icon={<TrendingUp className="size-4 text-violet-600" />} iconBg="bg-violet-50 border-violet-200/60" label="Scheduled" value={kpis.totalPlanned.toLocaleString()} sub="across all weeks" />
              <KpiCard icon={kpis.fulfillment !== null && kpis.fulfillment < 80 ? <TrendingDown className="size-4 text-destructive" /> : <CheckCircle2 className="size-4 text-emerald-600" />}
                iconBg={kpis.fulfillment !== null && kpis.fulfillment < 80 ? "bg-rose-50 border-rose-200/60" : "bg-emerald-50 border-emerald-200/60"}
                label="Fulfillment" value={kpis.fulfillment !== null ? `${kpis.fulfillment}%` : "—"} sub={kpis.fulfillment !== null ? `${kpis.totalActual} of ${kpis.totalPlanned}` : "No data"} />
            </div>
          )}

          {/* Planning Table + Ad-hoc */}
          <Card className="relative isolate overflow-hidden border-border/70 shadow-sm">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-500/30 via-[#D4AF37] to-amber-500/30" />
            <CardHeader className="border-b border-border/50 bg-gradient-to-r from-muted/30 to-muted/10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Production Orders {lines.length > 0 && <span className="text-foreground">· {lines.length} orders</span>}
                </CardTitle>
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-0.5">
                  <button onClick={() => setViewTab("detail")} className={cn("rounded-md px-3 py-1 text-xs font-medium transition-all", viewTab === "detail" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>Detail</button>
                  <button onClick={() => setViewTab("summary")} className={cn("rounded-md px-3 py-1 text-xs font-medium transition-all", viewTab === "summary" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>Summary</button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {lines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileSpreadsheet className="size-12 text-muted-foreground/20 mb-4" />
                  <p className="text-sm font-medium text-muted-foreground">No production orders yet</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">Import ERP orders or add ad-hoc lines to start planning</p>
                  <Button variant="outline" className="mt-4 gap-2" onClick={() => setImportOpen(true)}>
                    <Upload className="size-3.5" />Import Orders
                  </Button>
                </div>
              ) : viewTab === "summary" ? (
                <div className="p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {weeks.map((w, wi) => {
                    const sp = kpis.perWeek[wi]?.plan ?? 0;
                    const sa = kpis.perWeek[wi]?.act ?? 0;
                    const varPct = sp > 0 ? Math.round(((sa - sp) / sp) * 100) : 0;
                    return (
                      <div key={w} className="rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:shadow-md">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{weekLabel(w)}</p>
                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Plan</span>
                            <span className="font-mono font-semibold text-blue-600">{sp.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Actual</span>
                            <span className="font-mono font-semibold text-emerald-600">{sa.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm border-t border-border/40 pt-2">
                            <span className="text-muted-foreground">Variance</span>
                            <span className={cn("font-mono font-semibold", varPct < 0 ? "text-rose-500" : "text-emerald-500")}>{varPct > 0 ? "+" : ""}{varPct}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[1100px]">
                    <TableHeader>
                      <TableRow className="[&>th]:px-2 [&>th]:py-2.5 [&>th]:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:text-muted-foreground [&>th]:border-r [&>th]:border-border/30 [&>th]:last:border-r-0">
                        <TableHead className="w-6 text-center">#</TableHead>
                        <TableHead className="sticky left-0 z-10 bg-card">Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Item</TableHead>
                        {productLine === "weaving" && <><TableHead className="w-14">Width</TableHead><TableHead className="w-12">Picks</TableHead></>}
                        <TableHead className="text-right w-16">Ordered</TableHead>
                        <TableHead className="text-right w-16">Target</TableHead>
                        <TableHead className="w-14 text-center">Split</TableHead>
                        <TableHead className="w-16 text-center">Material</TableHead>
                        <TableHead className="w-14 text-center">Status</TableHead>
                        {weeks.flatMap((w) => [
                          <TableHead key={`p-${w}`} className="text-center w-14 border-l border-muted-foreground/20 text-[10px]" style={{ background: "rgba(59,130,246,0.07)" }}>Plan<br/>{weekLabel(w).split(" - ")[0]}</TableHead>,
                          <TableHead key={`a-${w}`} className="text-center w-14 text-[10px]" style={{ background: "rgba(34,197,94,0.07)" }}>Act<br/>{weekLabel(w).split(" - ")[0]}</TableHead>,
                        ])}
                        <TableHead className="w-8 text-center">Del</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((ln) => (
                        <TableRow key={ln.id} className="group hover:bg-muted/20 even:bg-muted/[0.04] [&>td]:px-2 [&>td]:py-1.5">
                          <TableCell className="text-center"><span className={cn("inline-block size-2 rounded-full",
                            ln.status === "completed" ? "bg-emerald-500" : ln.status === "in_progress" ? "bg-amber-400" : ln.status === "hold" ? "bg-rose-400" : "bg-muted-foreground/30")} /></TableCell>
                          <TableCell className="sticky left-0 z-10 bg-card font-mono text-xs">{ln.orderRef}</TableCell>
                          <TableCell className="text-xs max-w-[90px] truncate">{ln.customer}</TableCell>
                          <TableCell className="text-xs max-w-[100px] truncate">{ln.item}</TableCell>
                          {productLine === "weaving" && <><TableCell className="text-xs font-mono">{ln.width ?? "—"}</TableCell><TableCell className="text-xs font-mono">{ln.picks ?? "—"}</TableCell></>}
                          <TableCell className="text-right text-xs font-mono">{ln.orderedQty ?? "—"}</TableCell>
                          <TableCell className="p-1"><Input className="h-7 w-14 text-right font-mono text-xs" defaultValue={ln.monthlyTarget ?? ""}
                            onChange={(e) => { const v = e.target.value.trim(); updateLine(ln.id, { monthlyTarget: v === "" ? null : Number(v) }); }}
                            onBlur={() => debouncedSave(`tgt-${ln.id}`)} /></TableCell>
                          <TableCell className="p-1 text-center">
                            <Button type="button" variant="outline" size="sm" className="h-7 px-1.5 text-[10px]" onClick={() => splitTargetEvenly(ln.id)}>Split</Button>
                          </TableCell>
                          <TableCell className="text-center">
                            <select value={ln.materialStatus} onChange={(e) => updateLine(ln.id, { materialStatus: e.target.value as any })}
                              className="h-7 text-[10px] rounded border border-border/60 bg-transparent px-1">
                              <option value="sufficient">✅ OK</option>
                              <option value="low">⚠️ Low</option>
                              <option value="pending">⏳ Pending</option>
                            </select>
                          </TableCell>
                          <TableCell className="text-center">
                            <select value={ln.status} onChange={(e) => updateLine(ln.id, { status: e.target.value as any })}
                              className="h-7 text-[10px] rounded border border-border/60 bg-transparent px-1">
                              <option value="planned">📋 Planned</option>
                              <option value="in_progress">⚙️ Active</option>
                              <option value="completed">✅ Done</option>
                              <option value="hold">⛔ Hold</option>
                            </select>
                          </TableCell>
                          {weeks.map((w) => (
                            <><TableCell key={`p-${ln.id}-${w}`} className="p-0.5 border-l" style={{ background: "rgba(59,130,246,0.03)" }}>
                              <Input className="h-7 w-12 text-right font-mono text-xs" defaultValue={ln.weeklyPlan[w] ?? ""}
                                onChange={(e) => { const v = e.target.value.trim(); updateLine(ln.id, { weeklyPlan: { ...ln.weeklyPlan, [w]: v === "" ? 0 : Number(v) } }); }}
                                onBlur={() => debouncedSave(`plan-${ln.id}-${w}`)} />
                            </TableCell>
                            <TableCell key={`a-${ln.id}-${w}`} className="p-0.5" style={{ background: "rgba(34,197,94,0.03)" }}>
                              <Input className="h-7 w-12 text-right font-mono text-xs" defaultValue={ln.weeklyActual[w] ?? ""}
                                onChange={(e) => { const v = e.target.value.trim(); updateLine(ln.id, { weeklyActual: { ...ln.weeklyActual, [w]: v === "" ? 0 : Number(v) } }); }}
                                onBlur={() => debouncedSave(`act-${ln.id}-${w}`)} />
                            </TableCell></>
                          ))}
                          <TableCell className="text-center">
                            <button className="text-muted-foreground/30 hover:text-destructive transition-colors" onClick={() => removeLine(ln.id)}>
                              <Trash2 className="size-3" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Subtotal */}
                      <TableRow className="bg-muted/20 font-semibold [&>td]:px-2 [&>td]:py-2">
                        <TableCell /><TableCell className="sticky left-0 z-10 bg-muted/20 text-xs font-bold">TOTAL</TableCell><TableCell /><TableCell />
                        {productLine === "weaving" && <><TableCell /><TableCell /></>}
                        <TableCell className="text-right text-xs font-mono font-bold">{lines.reduce((s, l) => s + Number(l.orderedQty ?? 0), 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-xs font-mono font-bold">{lines.reduce((s, l) => s + Number(l.monthlyTarget ?? 0), 0).toLocaleString()}</TableCell>
                        <TableCell /><TableCell /><TableCell />
                        {weeks.map((w) => {
                          const tp = lines.reduce((s, l) => s + Number(l.weeklyPlan[w] ?? 0), 0);
                          const ta = lines.reduce((s, l) => s + Number(l.weeklyActual[w] ?? 0), 0);
                          return (<><TableCell key={`stp-${w}`} className="text-right text-xs font-mono font-bold border-l" style={{ background: "rgba(59,130,246,0.05)" }}>{tp.toLocaleString()}</TableCell>
                            <TableCell key={`sta-${w}`} className="text-right text-xs font-mono font-bold" style={{ background: "rgba(34,197,94,0.05)" }}>{ta.toLocaleString()}</TableCell></>);
                        })}
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ad-hoc form */}
          {lines.length > 0 && (
            <Card className="relative isolate overflow-hidden border-border/70 shadow-sm">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-500/30 via-[#D4AF37] to-blue-500/30" />
              <CardHeader className="border-b border-border/50 bg-gradient-to-r from-muted/30 to-muted/10">
                <CardTitle className="text-sm font-medium text-muted-foreground">Add Manual Order</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                  <div className="space-y-1"><Label className="text-xs">Order ref *</Label><Input placeholder="SO-12345" className="h-9 text-sm" value={adHocOrder} onChange={(e) => setAdHocOrder(e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Customer</Label><Input placeholder="Customer" className="h-9 text-sm" value={adHocCustomer} onChange={(e) => setAdHocCustomer(e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Item</Label><Input placeholder="Item" className="h-9 text-sm" value={adHocItem} onChange={(e) => setAdHocItem(e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Qty</Label><Input type="number" min={0} placeholder="0" className="h-9 text-sm" value={adHocQty} onChange={(e) => setAdHocQty(e.target.value)} /></div>
                  <Button className="h-9 gap-1.5 text-sm" onClick={addAdHocLine}><Plus className="size-4" />Add Order</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

{/* ════════════ TRACKING PHASE — Full MES Dashboard ════════════ */}
{phase === "tracking" && <TrackingDashboard productLine={productLine} lines={lines} />}

      {/* Saving indicator */}
      {savingCell !== null && (
        <div className="saving-indicator"><span className="saving-indicator-dot" />Saving…</div>
      )}

      <PlanningImportDialog open={importOpen} onOpenChange={setImportOpen} trackerId="new" actor={null as any}
        isOpeningSnapshot onImported={() => {}} onRowsParsed={handleImport} />
    </div>
  );
}

function KpiCard({ icon, iconBg, label, value, sub }: {
  icon: React.ReactNode; iconBg: string; label: string; value: string | number; sub?: string;
}) {
  return (
    <div className="animate-card card-shine flex items-center gap-3 rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/20 px-4 py-3.5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl border", iconBg)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-display text-xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}


