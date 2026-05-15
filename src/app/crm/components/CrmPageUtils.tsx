import type { ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "../../components/ui/utils";

type Breadcrumb = { label: string; to?: string };

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  iconBg?: string;
  breadcrumbs?: Breadcrumb[];
  children?: ReactNode;
}

export function PageHeader({ title, description, icon, iconBg, breadcrumbs, children }: PageHeaderProps) {
  return (
    <div className="relative isolate overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/20 px-6 py-5 shadow-sm">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-[oklch(0.45_0.14_265)] via-[oklch(0.72_0.14_82)] via-60% to-[oklch(0.45_0.14_265)]" />
      <div className="pointer-events-none absolute -right-12 -top-12 size-56 rounded-full bg-[radial-gradient(circle,oklch(0.74_0.14_82/0.06),transparent_65%)] blur-2xl" />
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-muted-foreground">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted-foreground/40">/</span>}
              {b.to ? <Link to={b.to} className="hover:text-foreground transition-colors">{b.label}</Link> : <span className="text-foreground/60">{b.label}</span>}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-start gap-4">
        {icon && (
          <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl border shadow-sm", iconBg || "bg-amber-50 border-amber-200/70")}>
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">{title}</h1>
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            {children && <div className="shrink-0">{children}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title = "No data", description = "Nothing to display yet.", action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="empty-state-icon mb-4">{icon}</div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground/60 max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LastUpdated() {
  return (
    <p className="text-[10px] text-muted-foreground/50 text-right">
      Updated {new Date().toLocaleTimeString()}
    </p>
  );
}
