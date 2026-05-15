import { useState, useMemo } from "react";
import { X, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { cn } from "../../components/ui/utils";

const mockAlerts = [
  { id: "a1", timestamp: "14:32", machine: "L1004", reason: "Warp break", duration: "23 min", severity: "high" as const, action: "Check warp beam tension and re-thread" },
  { id: "a2", timestamp: "14:15", machine: "M2005", reason: "Repeated weft breaks (6x)", duration: "30 min", severity: "medium" as const, action: "Inspect yarn quality lot #A482" },
  { id: "a3", timestamp: "14:02", machine: "Yarn Store", reason: "Low inventory", duration: "—", severity: "high" as const, action: "Reorder TEX 42/1 ACRYLIC" },
  { id: "a4", timestamp: "13:45", machine: "L1012", reason: "Maintenance overdue", duration: "2 days", severity: "low" as const, action: "Schedule full service" },
  { id: "a5", timestamp: "13:30", machine: "Inspection", reason: "Defect rate above 3.0/100m²", duration: "—", severity: "medium" as const, action: "Review inspection camera settings" },
];

const ROOT_CAUSES = ["Yarn quality", "Mechanical wear", "Operator error", "Power fluctuation", "Material defect", "Environmental"];

export function AlertCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [rootCauses, setRootCauses] = useState<Record<string, string>>({});

  return open ? (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-card shadow-2xl border-l border-border overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-rose-500" />
            <h2 className="text-base font-bold">Alert & Action Center</h2>
            <Badge variant="outline" className="text-[10px]">{mockAlerts.length - acknowledged.size} active</Badge>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg"><X className="size-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          {mockAlerts.map(a => {
            const acked = acknowledged.has(a.id);
            return (
              <div key={a.id} className={cn("rounded-xl border p-4 transition-all", acked ? "border-emerald-500/20 bg-emerald-500/5 opacity-60" : a.severity === "high" ? "border-rose-500/30 bg-rose-500/5" : "border-amber-500/30 bg-amber-500/5")}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("size-2 rounded-full", acked ? "bg-emerald-500" : a.severity === "high" ? "bg-rose-500 animate-pulse" : "bg-amber-500")} />
                    <span className="font-mono text-xs text-muted-foreground">{a.timestamp}</span>
                    <span className="font-semibold text-sm">{a.machine}</span>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px]", a.severity === "high" ? "border-rose-500/30 text-rose-600" : "text-amber-600 border-amber-500/30")}>{a.severity}</Badge>
                </div>
                <p className="text-sm mb-1">{a.reason} · {a.duration}</p>
                <p className="text-xs text-muted-foreground mb-3">Suggested: {a.action}</p>

                {!acked ? (
                  <div className="space-y-2">
                    <Select onValueChange={(v) => setRootCauses(p => ({ ...p, [a.id]: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tag root cause…" /></SelectTrigger>
                      <SelectContent>
                        {ROOT_CAUSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 text-xs flex-1"
                        onClick={() => {
                          setAcknowledged(p => new Set(p).add(a.id));
                        }}>Acknowledge</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-emerald-600">
                    <CheckCircle2 className="size-3.5" /> Acknowledged
                    {rootCauses[a.id] && <span>· Root cause: {rootCauses[a.id]}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  ) : null;
}

export function GlobalDateFilter() {
  return (
    <Select defaultValue="today">
      <SelectTrigger className="h-8 w-32 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="today">Today</SelectItem>
        <SelectItem value="shift">This Shift</SelectItem>
        <SelectItem value="7d">Last 7 Days</SelectItem>
        <SelectItem value="30d">Last 30 Days</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function LiveIndicator() {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-medium">
      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Live
    </div>
  );
}
