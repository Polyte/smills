import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { cn } from "../../components/ui/utils";
import { animateMachineStatusChange } from "../hooks/useStandertonAnimations";
import { animateProgressBar } from "../utils/animateProgressBar";

type MachineStatus = "running" | "idle" | "minor-stop" | "major-stop" | "maintenance";

interface MachineData {
  id: string;
  name: string;
  type: "loom" | "spinner" | "carding" | "winding";
  status: MachineStatus;
  efficiency: number;
  rpm: number | null;
  tempC: number | null;
  warpBeamPct: number;
}

const MOCK_MACHINES: MachineData[] = [
  { id: "LM-01", name: "Loom 01", type: "loom", status: "running", efficiency: 94, rpm: 380, tempC: 42, warpBeamPct: 78 },
  { id: "LM-02", name: "Loom 02", type: "loom", status: "running", efficiency: 91, rpm: 375, tempC: 44, warpBeamPct: 55 },
  { id: "LM-03", name: "Loom 03", type: "loom", status: "idle", efficiency: 0, rpm: null, tempC: 38, warpBeamPct: 100 },
  { id: "LM-04", name: "Loom 04", type: "loom", status: "major-stop", efficiency: 0, rpm: null, tempC: 31, warpBeamPct: 62 },
  { id: "LM-05", name: "Loom 05", type: "loom", status: "running", efficiency: 88, rpm: 362, tempC: 43, warpBeamPct: 40 },
  { id: "LM-06", name: "Loom 06", type: "loom", status: "minor-stop", efficiency: 72, rpm: 200, tempC: 45, warpBeamPct: 81 },
  { id: "LM-07", name: "Loom 07", type: "loom", status: "running", efficiency: 97, rpm: 390, tempC: 41, warpBeamPct: 33 },
  { id: "LM-08", name: "Loom 08", type: "loom", status: "maintenance", efficiency: 0, rpm: null, tempC: null, warpBeamPct: 0 },
  { id: "SP-01", name: "Spinner 01", type: "spinner", status: "running", efficiency: 93, rpm: 12000, tempC: 55, warpBeamPct: 67 },
  { id: "SP-02", name: "Spinner 02", type: "spinner", status: "running", efficiency: 90, rpm: 11800, tempC: 57, warpBeamPct: 49 },
  { id: "SP-03", name: "Spinner 03", type: "spinner", status: "idle", efficiency: 0, rpm: null, tempC: 40, warpBeamPct: 100 },
  { id: "SP-04", name: "Spinner 04", type: "spinner", status: "running", efficiency: 85, rpm: 11200, tempC: 58, warpBeamPct: 22 },
  { id: "CD-01", name: "Carding 01", type: "carding", status: "running", efficiency: 96, rpm: 450, tempC: 48, warpBeamPct: 71 },
  { id: "CD-02", name: "Carding 02", type: "carding", status: "running", efficiency: 89, rpm: 430, tempC: 50, warpBeamPct: 58 },
  { id: "CD-03", name: "Carding 03", type: "carding", status: "minor-stop", efficiency: 65, rpm: 180, tempC: 52, warpBeamPct: 85 },
  { id: "WD-01", name: "Winder 01", type: "winding", status: "running", efficiency: 92, rpm: 800, tempC: 36, warpBeamPct: 44 },
  { id: "WD-02", name: "Winder 02", type: "winding", status: "running", efficiency: 88, rpm: 780, tempC: 37, warpBeamPct: 60 },
  { id: "WD-03", name: "Winder 03", type: "winding", status: "major-stop", efficiency: 0, rpm: null, tempC: 35, warpBeamPct: 77 },
  { id: "WD-04", name: "Winder 04", type: "winding", status: "idle", efficiency: 0, rpm: null, tempC: 33, warpBeamPct: 100 },
  { id: "WD-05", name: "Winder 05", type: "winding", status: "running", efficiency: 95, rpm: 820, tempC: 38, warpBeamPct: 29 },
];

const STATUS_LABEL: Record<MachineStatus, string> = {
  running: "Running",
  idle: "Idle",
  "minor-stop": "Minor Stop",
  "major-stop": "Major Stop",
  maintenance: "Maintenance",
};

const STATUS_DOT: Record<MachineStatus, string> = {
  running: "bg-emerald-500",
  idle: "bg-amber-400",
  "minor-stop": "bg-orange-400",
  "major-stop": "bg-red-600",
  maintenance: "bg-[#8B5E3C]",
};

const STATUS_BORDER: Record<MachineStatus, string> = {
  running: "border-emerald-500/25",
  idle: "border-amber-400/25",
  "minor-stop": "border-orange-400/30",
  "major-stop": "border-red-600/40",
  maintenance: "border-[#8B5E3C]/30",
};

function MachineCard({ machine }: { machine: MachineData }) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const prevStatus = useRef<MachineStatus>(machine.status);

  // Warp beam progress bar animation on mount
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    gsap.set(bar, { width: "0%" });
    animateProgressBar(bar, machine.warpBeamPct, { duration: 0.9, ease: "power2.out" });
  }, [machine.warpBeamPct]);

  // Status change animation
  useEffect(() => {
    const card = cardRef.current;
    if (!card || prevStatus.current === machine.status) return;
    animateMachineStatusChange(card, machine.status);
    prevStatus.current = machine.status;
  }, [machine.status]);

  // Hover effects via GSAP
  function handleMouseEnter() {
    const card = cardRef.current;
    if (!card) return;
    gsap.to(card, { scale: 1.01, duration: 0.2, ease: "power2.out" });
  }

  function handleMouseLeave() {
    const card = cardRef.current;
    if (!card) return;
    gsap.to(card, { scale: 1, duration: 0.2, ease: "power2.out" });
  }

  return (
    <div
      ref={cardRef}
      data-gsap-machine
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative flex flex-col gap-2.5 rounded-xl border bg-card/90 p-3.5 shadow-sm transition-shadow hover:shadow-[0_4px_20px_rgba(212,175,55,0.12)]",
        STATUS_BORDER[machine.status]
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {machine.id}
          </p>
          <p className="truncate text-sm font-semibold text-foreground">{machine.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/50 bg-muted/40 px-2 py-0.5">
          <span className={cn("size-1.5 rounded-full shrink-0", STATUS_DOT[machine.status])} />
          <span className="text-[10px] font-medium text-muted-foreground">
            {STATUS_LABEL[machine.status]}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-lg bg-muted/30 px-1.5 py-1.5">
          <p className="text-base font-bold tabular-nums text-foreground">
            {machine.efficiency > 0 ? `${machine.efficiency}%` : "—"}
          </p>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Eff</p>
        </div>
        <div className="rounded-lg bg-muted/30 px-1.5 py-1.5">
          <p className="text-base font-bold tabular-nums text-foreground">
            {machine.rpm != null
              ? machine.rpm >= 1000
                ? `${(machine.rpm / 1000).toFixed(1)}k`
                : `${machine.rpm}`
              : "—"}
          </p>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">RPM</p>
        </div>
        <div className="rounded-lg bg-muted/30 px-1.5 py-1.5">
          <p className="text-base font-bold tabular-nums text-foreground">
            {machine.tempC != null ? `${machine.tempC}°` : "—"}
          </p>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">°C</p>
        </div>
      </div>

      {/* Warp beam progress */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-medium text-muted-foreground">Warp Beam</span>
          <span className="text-[10px] font-bold tabular-nums text-foreground">{machine.warpBeamPct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
          <div
            ref={barRef}
            className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E8C84A]"
            style={{ width: "0%" }}
          />
        </div>
      </div>

      {/* Major-stop overlay indicator */}
      {machine.status === "major-stop" && (
        <div className="absolute inset-0 rounded-xl ring-2 ring-red-600/50 ring-offset-0 pointer-events-none animate-pulse" />
      )}
    </div>
  );
}

interface MachineGridProps {
  machines?: MachineData[];
  className?: string;
}

export function MachineGrid({ machines = MOCK_MACHINES, className }: MachineGridProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Summary counts
  const running = machines.filter((m) => m.status === "running").length;
  const stopped = machines.filter((m) => m.status === "major-stop").length;
  const avg = machines.filter((m) => m.efficiency > 0);
  const avgEff = avg.length ? Math.round(avg.reduce((s, m) => s + m.efficiency, 0) / avg.length) : 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary strip */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/8 px-3 py-1.5">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{running} Running</span>
        </div>
        {stopped > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-1.5">
            <span className="size-2 rounded-full bg-red-600" />
            <span className="text-xs font-semibold text-red-700 dark:text-red-400">{stopped} Stopped</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/25 bg-[#D4AF37]/8 px-3 py-1.5">
          <span className="text-xs font-semibold text-[#8B6914]">{avgEff}% avg efficiency</span>
        </div>
        <span className="ml-auto text-[11px] text-muted-foreground">{machines.length} machines total</span>
      </div>

      {/* Grid */}
      <div
        ref={gridRef}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      >
        {machines.map((m) => (
          <MachineCard key={m.id} machine={m} />
        ))}
      </div>
    </div>
  );
}
