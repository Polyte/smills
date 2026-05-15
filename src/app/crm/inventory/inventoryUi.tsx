import type { ReactNode } from "react";
import { ArrowUpRight, Boxes, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { cn } from "../../components/ui/utils";

export function InventoryHero({
  eyebrow,
  title,
  children,
  actions,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section
      data-gsap-panel
      className="relative isolate overflow-hidden rounded-xl border border-border/70 bg-[linear-gradient(135deg,var(--card),color-mix(in_oklch,var(--card)_82%,var(--muted)))] shadow-sm"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[oklch(0.56_0.12_205)] via-[oklch(0.72_0.13_84)] to-[oklch(0.52_0.13_300)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(110deg,transparent,oklch(0.72_0.12_82/0.12),transparent)]" />
      <div className="relative flex flex-wrap items-start justify-between gap-5 p-5 sm:p-6">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
          <div className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{children}</div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </section>
  );
}

export function InventoryPanel({
  title,
  description,
  children,
  className,
  action,
}: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section
      data-gsap-panel
      className={cn("overflow-hidden rounded-xl border border-border/70 bg-card/85 shadow-sm", className)}
    >
      {title || description || action ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--muted)_32%,transparent),transparent)] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title ? <h3 className="font-display text-base font-semibold tracking-tight text-foreground">{title}</h3> : null}
            {description ? <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function InventoryTableShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      data-gsap-table
      className={cn(
        "overflow-x-auto rounded-xl border border-border/70 bg-card/90 shadow-sm [&_tbody_tr:hover]:bg-muted/25 [&_thead_tr]:border-border/70 [&_thead_tr]:bg-muted/35",
        className
      )}
    >
      {children}
    </div>
  );
}

export function InventoryMetricCard({
  label,
  value,
  href,
  linkLabel,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  href?: string;
  linkLabel?: string;
  tone?: "blue" | "amber" | "emerald" | "violet";
}) {
  const toneClass =
    tone === "amber"
      ? "from-[oklch(0.72_0.13_84)] to-[oklch(0.62_0.12_70)] text-amber-800 dark:text-amber-300"
      : tone === "emerald"
        ? "from-[oklch(0.7_0.14_155)] to-[oklch(0.56_0.12_185)] text-emerald-800 dark:text-emerald-300"
        : tone === "violet"
          ? "from-[oklch(0.58_0.15_288)] to-[oklch(0.49_0.13_310)] text-violet-800 dark:text-violet-300"
          : "from-[oklch(0.58_0.12_205)] to-[oklch(0.48_0.1_245)] text-sky-800 dark:text-sky-300";

  return (
    <div
      data-gsap-card
      className="group relative overflow-hidden rounded-xl border border-border/70 bg-[linear-gradient(145deg,var(--card),color-mix(in_oklch,var(--card)_86%,var(--muted)))] p-4 shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-90", toneClass)} />
      <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-muted/30 blur-2xl" />
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className={cn("mt-1 font-display text-2xl font-bold tabular-nums", toneClass)}>{value}</div>
      {href && linkLabel ? (
        <Link to={href} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          {linkLabel}
          <ArrowUpRight className="size-3" />
        </Link>
      ) : null}
    </div>
  );
}

export function InventoryEmptyState({
  title,
  children,
  icon: Icon = Boxes,
}: {
  title: string;
  children?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div
      data-gsap-card
      className="flex min-h-[140px] flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/15 px-4 py-8 text-center"
    >
      <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <p className="font-medium text-foreground">{title}</p>
      {children ? <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{children}</p> : null}
    </div>
  );
}

export function InventoryInfoStrip({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      data-gsap-panel
      className="rounded-xl border border-border/70 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--muted)_30%,transparent),color-mix(in_oklch,var(--card)_92%,transparent))] px-4 py-3 text-sm text-muted-foreground shadow-sm"
    >
      <p className="font-display text-base font-semibold tracking-tight text-foreground">{title}</p>
      <div className="mt-1 max-w-4xl text-xs leading-relaxed">{children}</div>
    </div>
  );
}

export function InventoryValuePill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "info";
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
      : tone === "warn"
        ? "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300"
        : tone === "info"
          ? "border-sky-500/25 bg-sky-500/10 text-sky-800 dark:text-sky-300"
          : "border-border/70 bg-muted/35 text-foreground";

  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium tabular-nums", toneClass)}>
      {children}
    </span>
  );
}
