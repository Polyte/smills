import { useMemo } from "react";
import { FlaskConical, Clock, CheckCircle2, Star, Users, ArrowRight, Beaker, TestTube, FileSearch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { cn } from "../../components/ui/utils";
import { PageHeader, LastUpdated } from "../components/CrmPageUtils";

export default function RdSolutionsPage() {
  const data = useMemo(() => ({
    avgLeadTime: 18.4,
    leadTimeTarget: 21,
    firstArticleApproval: 86.7,
    nps: 72,
    activeProjects: 8,
    completedThisQuarter: 12,
  }), []);

  const activeProjects = useMemo(() => [
    { name: "EP 800 Conveyor Belt", client: "Anglo American", stage: "prototype" as const, progress: 65, lead: "P. Ndlovu", due: "2026-07" },
    { name: "Flame-Retardant Fabric", client: "SASOL", stage: "testing" as const, progress: 40, lead: "L. Botha", due: "2026-08" },
    { name: "Anti-Microbial Mob Head", client: "Netcare", stage: "sampling" as const, progress: 25, lead: "S. Pillay", due: "2026-06" },
    { name: "Lightweight Agricultural Shade", client: "ZZ2 Farms", stage: "production" as const, progress: 90, lead: "M. Koen", due: "2026-05" },
    { name: "High-Temp Filter Fabric", client: "PPC Cement", stage: "concept" as const, progress: 15, lead: "T. Dube", due: "2026-09" },
  ], []);

  const stageStyles = {
    concept: "border-slate-500/30 bg-slate-500/10 text-slate-600",
    sampling: "border-blue-500/30 bg-blue-500/10 text-blue-600",
    prototype: "border-amber-500/30 bg-amber-500/10 text-amber-600",
    testing: "border-violet-500/30 bg-violet-500/10 text-violet-600",
    production: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  };

  const recentApprovals = useMemo(() => [
    { customer: "Hulamin", product: "EP 500 Conveyor — 1,200mm width", result: "approved" as const, days: 14 },
    { customer: "Tongaat Hulett", product: "Filter Press — 1.5m x 1.5m", result: "approved" as const, days: 11 },
    { customer: "Mondi Paper", product: "Dryer Fabric — custom width", result: "revision" as const, days: 22 },
    { customer: "AfriSam", product: "Heavy-duty EP 600 fabric", result: "approved" as const, days: 9 },
  ], []);

  return (
    <div className="space-y-6 pb-12" data-gsap-section>
      <PageHeader title="Custom Solutions & R&D" description="Bespoke product development, first-article tracking, and innovation pipeline"
        icon={<FlaskConical className="size-5 text-violet-600" />} iconBg="bg-violet-50 border-violet-200/70"
        breadcrumbs={[{ label: "CRM" }, { label: "R&D" }]} />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Avg Custom Lead Time", value: `${data.avgLeadTime}`, unit: "days", icon: <Clock className="size-5 text-amber-600" />, sub: `Target ${data.leadTimeTarget} days`, status: data.avgLeadTime <= data.leadTimeTarget ? "good" as const : "warning" as const },
          { label: "First-Article Approval", value: `${data.firstArticleApproval}`, unit: "%", icon: <CheckCircle2 className="size-5 text-emerald-600" />, sub: "Pass rate on first submission", status: "good" as const },
          { label: "NPS Score", value: `${data.nps}`, unit: "", icon: <Star className="size-5 text-amber-600" />, sub: "Customer satisfaction", status: data.nps >= 70 ? "good" as const : "warning" as const },
          { label: "Active R&D Projects", value: `${data.activeProjects}`, unit: "", icon: <Beaker className="size-5 text-violet-600" />, sub: `${data.completedThisQuarter} completed this quarter`, status: "good" as const },
        ].map(k => (
          <div key={k.label} data-gsap-kpi className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">{k.label}</p>
                <div className="flex items-baseline gap-1">
                  <span className={cn("text-2xl font-bold", k.status === "good" ? "text-emerald-600" : "text-amber-600")}>{k.value}</span>
                  {k.unit && <span className="text-sm text-muted-foreground">{k.unit}</span>}
                </div>
                <p className="text-xs text-muted-foreground">{k.sub}</p>
              </div>
              <div className="size-9 rounded-lg border bg-muted/20 flex items-center justify-center shrink-0">{k.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active R&D Projects */}
        <Card className="relative isolate overflow-hidden border-border/70 shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-violet-500/30 via-[#D4AF37] to-violet-500/30" />
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><FlaskConical className="size-4" /> Active R&D Projects</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {activeProjects.map(p => (
              <div key={p.name} className="rounded-xl border border-border/60 p-3.5 space-y-2 transition-all hover:shadow-sm">
                <div className="flex items-start justify-between">
                  <div><p className="text-sm font-semibold text-foreground">{p.name}</p><p className="text-xs text-muted-foreground">{p.client}</p></div>
                  <Badge variant="outline" className={cn("text-[10px]", stageStyles[p.stage])}>{p.stage}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1"><Progress value={p.progress} className="h-1.5" /></div>
                  <span className="text-xs text-muted-foreground font-mono">{p.progress}%</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Lead: {p.lead}</span>
                  <span>Target: {p.due}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* First Article Approvals */}
        <Card className="relative isolate overflow-hidden border-border/70 shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-500/30 via-[#D4AF37] to-emerald-500/30" />
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><FileSearch className="size-4" /> Recent First-Article Approvals</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {recentApprovals.map(a => (
              <div key={a.customer} className="flex items-center gap-3 rounded-lg border border-border/60 p-3 text-sm">
                <div className={cn("size-8 rounded-lg flex items-center justify-center text-xs font-bold",
                  a.result === "approved" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-amber-50 text-amber-600 border border-amber-200")}>
                  {a.result === "approved" ? "✓" : "↻"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{a.customer}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.product}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className={cn("text-[10px]", a.result === "approved" ? "border-emerald-500/30 text-emerald-600" : "border-amber-500/30 text-amber-600")}>
                    {a.result === "approved" ? "Approved" : "Revision"}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{a.days} days</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Customer Feedback */}
      <Card className="relative isolate overflow-hidden border-border/70 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-500/30 via-[#D4AF37] to-amber-500/30" />
        <CardHeader className="border-b bg-muted/10">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><Star className="size-4" /> Customer Satisfaction (NPS) — Last 6 Months</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Promoters (9-10)", pct: 48, color: "bg-emerald-500" },
              { label: "Passives (7-8)", pct: 32, color: "bg-amber-400" },
              { label: "Detractors (0-6)", pct: 20, color: "bg-rose-500" },
            ].map(g => (
              <div key={g.label} className="rounded-xl border border-border/60 p-4 text-center">
                <div className="h-20 rounded-full w-20 mx-auto border-4 border-muted flex items-center justify-center mb-3">
                  <span className="text-2xl font-bold">{g.pct}%</span>
                </div>
                <p className="text-sm font-medium">{g.label}</p>
                <div className="h-2 rounded-full bg-muted mt-2 overflow-hidden">
                  <div className={cn("h-full rounded-full", g.color)} style={{ width: `${g.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 mt-4 text-center">
            <span className="text-lg font-bold text-foreground">NPS: {data.nps}</span>
            <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Good</Badge>
          </div>
        </CardContent>
      </Card>
          <LastUpdated />
    </div>
  );
}




