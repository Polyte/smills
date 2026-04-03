import { Link } from "react-router";
import { Cpu } from "lucide-react";
import type { MachineTelemetryRow } from "../../../lib/automationApi";
import { cn } from "../../components/ui/utils";

export function MachineTelemetryStrip({
  machines,
  className,
}: {
  machines: MachineTelemetryRow[];
  className?: string;
}) {
  if (machines.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No live machine telemetry yet. Start the automation stack (Docker) and set{" "}
        <code className="rounded bg-muted px-1">VITE_AUTOMATION_API_URL</code>.
      </p>
    );
  }
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {machines.map((m) => (
        <div
          key={m.machine_id}
          className="min-w-[140px] flex-1 rounded-lg border border-border/70 bg-card/90 px-3 py-2 shadow-sm"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
              {m.machine_id}
            </span>
            <span
              className={cn(
                "size-2 rounded-full shrink-0",
                m.running ? "bg-emerald-500" : "bg-amber-500"
              )}
            />
          </div>
          <p className="text-lg font-display font-bold tabular-nums leading-tight">
            {Math.round(m.efficiency_pct)}%
            <span className="text-[10px] font-sans font-normal text-muted-foreground ml-1">eff</span>
          </p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {m.rpm ? `${m.rpm} rpm` : "—"}
            {m.temperature_c != null ? ` · ${m.temperature_c}°C` : ""}
          </p>
        </div>
      ))}
      <Link
        to="/crm/automation"
        className="inline-flex items-center justify-center gap-1 rounded-lg border border-dashed border-primary/40 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5 min-w-[100px]"
      >
        <Cpu className="size-3.5" />
        Hub
      </Link>
    </div>
  );
}
