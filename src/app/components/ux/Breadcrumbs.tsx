import { Link } from "react-router";
import { ChevronRight, Home } from "lucide-react";

export type Crumb = { label: string; to?: string };

type BreadcrumbsProps = {
  items: Crumb[];
  className?: string;
  /** Light text for dark hero bands */
  tone?: "default" | "dark";
};

export function Breadcrumbs({ items, className = "", tone = "default" }: BreadcrumbsProps) {
  const link =
    tone === "dark"
      ? "inline-flex items-center gap-1 rounded-md text-slate-200 transition-colors hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      : "inline-flex items-center gap-1 rounded-md text-foreground/80 transition-colors hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2";
  const mid =
    tone === "dark"
      ? "rounded-md text-slate-300 transition-colors hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      : "rounded-md transition-colors hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2";
  const current = tone === "dark" ? "font-medium text-white" : "font-medium text-foreground";
  const muted = tone === "dark" ? "text-slate-400" : "text-muted-foreground";
  const chevron = tone === "dark" ? "opacity-50" : "opacity-40";

  return (
    <nav aria-label="Breadcrumb" className={`text-sm ${className}`}>
      <ol className={`flex flex-wrap items-center gap-1.5 ${muted}`}>
        <li className="flex items-center gap-1.5">
          <Link to="/" className={link}>
            <Home className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            Home
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${chevron}`} aria-hidden />
            {item.to ? (
              <Link to={item.to} className={mid}>
                {item.label}
              </Link>
            ) : (
              <span className={current} aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
