import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Warehouse,
  UsersRound,
  FileBarChart,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarRange,
  BarChart3,
  Table2,
  FileText,
  DollarSign,
  FlaskConical,
  AlertTriangle,
  Recycle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCrmAuth } from "./CrmAuthContext";
import { Button } from "../components/ui/button";
import { cn } from "../components/ui/utils";
import { CrmNotificationBell } from "./components/CrmNotificationBell";
import { BrandLogo } from "../components/BrandLogo";
import { showWorkforceInNav, workforceDefaultPath } from "../../lib/crm/roles";
import { canAccessModule, PERM, type Role } from "../../lib/crm/permissions";
import { useSmoothScroll } from "./hooks/useSmoothScroll";
import { useGsapDataPageAnimations } from "./hooks/useGsapDataPageAnimations";
import { useGsapPageScrollTrigger } from "../components/effects/useGsapPageScrollTrigger";
import { AlertCenter, LiveIndicator, GlobalDateFilter } from "./components/AlertCenter";

const CRM_SIDEBAR_EXPANDED_KEY = "sm_crm_sidebar_lg_expanded";

type CrmNavItem = { to: string; end?: boolean; label: string; icon: typeof LayoutDashboard };

function UserAvatar({ name }: { name?: string | null }) {
  const initials = (name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#D4AF37/0.28)] text-[oklch(0.93_0.12_90)] text-xs font-bold ring-1 ring-[#D4AF37/0.4)] shadow-[0_0_8px_#D4AF37/0.2)]">
      {initials || "?"}
    </div>
  );
}

export function CrmShell() {
  const { profile, signOut, isLocalMode } = useCrmAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const contentRef = useRef<HTMLElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return localStorage.getItem(CRM_SIDEBAR_EXPANDED_KEY) !== "0";
    } catch {
      return true;
    }
  });

  useSmoothScroll();
  useGsapDataPageAnimations(contentRef, [location.pathname, location.search]);
  useGsapPageScrollTrigger();
  const [alertOpen, setAlertOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CRM_SIDEBAR_EXPANDED_KEY, sidebarExpanded ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [sidebarExpanded]);

  const navGroups = useMemo((): { label: string; items: CrmNavItem[] }[] => {
    const role = profile?.role as Role | undefined;

    const overview: CrmNavItem[] = [
      { to: "/crm", end: true, label: "Dashboard", icon: LayoutDashboard },
      ...(canAccessModule(role, "command_center", PERM.READ) ? [{ to: "/crm/command-center" as const, label: "Command Center" as const, icon: BarChart3 as typeof BarChart3 }] : []),
      ...(canAccessModule(role, "quality_compliance", PERM.READ) ? [{ to: "/crm/quality" as const, label: "Quality" as const, icon: BarChart3 as typeof BarChart3 }] : []),
      { to: "/crm/reports", label: "Reports", icon: FileBarChart },
      ...(canAccessModule(role, "yarn_manufacturing", PERM.READ) || canAccessModule(role, "weaving_fabric", PERM.READ) ? [{ to: "/crm/planning" as const, label: "Yarn & Weaving" as const, icon: CalendarRange as typeof CalendarRange }] : []),
    ];
    const customer: CrmNavItem[] = [
      { to: "/crm/contacts", label: "Customers", icon: Users },
      { to: "/crm/deals", label: "Deals", icon: KanbanSquare },
      { to: "/crm/quotes", label: "Quotes", icon: FileText },
    ];
    const operations: CrmNavItem[] = [
      ...(canAccessModule(role, "inventory_logistics", PERM.READ) ? [{ to: "/crm/inventory" as const, label: "Inventory" as const, icon: Warehouse as typeof Warehouse }] : []),
      { to: "/crm/sales-ledger", label: "Sales ledger", icon: Table2 },
      ...(canAccessModule(role, "sustainability_maintenance", PERM.READ) ? [{ to: "/crm/sustainability" as const, label: "Sustainability" as const, icon: Recycle as typeof Recycle }] : []),
      ...(canAccessModule(role, "financial_sales", PERM.READ) ? [{ to: "/crm/financials" as const, label: "Financials" as const, icon: DollarSign as typeof DollarSign }] : []),
      ...(canAccessModule(role, "rd_solutions", PERM.READ) ? [{ to: "/crm/rd-solutions" as const, label: "R&D Solutions" as const, icon: FlaskConical as typeof FlaskConical }] : []),
    ];
    if (showWorkforceInNav(profile?.role)) {
      const path = workforceDefaultPath(profile?.role);
      operations.push({
        to: path,
        end: path.endsWith("/me"),
        label: "Workforce",
        icon: UsersRound,
      });
    }
    const workspace: CrmNavItem[] = [
      { to: "/crm/activities", label: "Activities", icon: History },
      { to: "/crm/settings", label: "Settings", icon: Settings },
    ];
    return [
      { label: "Overview", items: overview },
      { label: "Customer", items: customer },
      { label: "Operations", items: operations },
      { label: "Workspace", items: workspace },
    ];
  }, [profile?.role]);

  async function handleSignOut() {
    await signOut();
    navigate("/crm/login", { replace: true });
  }

  return (
    <div className="crm-app flex h-screen overflow-hidden bg-sidebar text-sidebar-foreground">
      {/* Mobile overlay */}
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      {/* ── SIDEBAR ── */}
      <aside data-gsap-sidebar
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-65 min-w-0 flex-col text-sidebar-foreground",
          "bg-gradient-to-b from-sidebar-accent via-sidebar to-sidebar",
          "border-r border-sidebar-border",
          "shadow-[6px_0_40px_rgba(0,0,0,0.55),inset_-1px_0_0_var(--sidebar-border)]",
          "transition-[transform,width] duration-300 ease-in-out motion-reduce:transition-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 lg:shrink-0",
          sidebarExpanded ? "lg:w-65" : "lg:w-0 lg:overflow-hidden lg:pointer-events-none"
        )}
      >
        {/* Gold shimmer top stripe */}
        <div className="crm-sidebar-top-bar h-[2px] w-full shrink-0 card-shine" />

        {/* Logo header */}
        <div className="sidebar-brand-glow flex h-[3.6rem] shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-4">
          <NavLink
            to="/crm"
            className="flex min-w-0 items-center gap-2.5 rounded-lg pr-1 outline-none ring-sidebar-ring transition-opacity hover:opacity-90 focus-visible:ring-2"
            onClick={() => setMobileOpen(false)}
          >
            <BrandLogo height={26} withBrandTile={false} className="shrink-0 brightness-0 invert opacity-90" />
            <span className="truncate text-left text-xs font-semibold leading-tight tracking-tight text-white">
              Standerton Mill
              <span className="block truncate font-normal text-[10px] text-white/50">
                CRM
              </span>
            </span>
          </NavLink>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Navigation — full height scrollable */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="CRM sections">
          {navGroups.map((group, gi) => (
            <div key={group.label} className="space-y-1">
              {/* Group label with gold diamond */}
              <div className="flex items-center gap-2 px-3 pb-1">
                <div className="h-px flex-1 bg-sidebar-border" />
                <div className="nav-group-diamond" />
                <p className="shrink-0 text-[9px] font-bold uppercase tracking-[0.12em] text-sidebar-foreground/35">
                  {group.label}
                </p>
                <div className="nav-group-diamond" />
                <div className="h-px flex-1 bg-sidebar-border" />
              </div>
              <div className="space-y-0.5">
                {group.items.map(({ to, end, label, icon: Icon }, ii) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "crm-nav-item-enter group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out",
                        isActive
                          ? "crm-nav-active bg-gradient-to-r from-[#D4AF37/0.22)] to-[#D4AF37/0.12)] text-[oklch(0.95_0.11_90)] shadow-[0_0_20px_-4px_#D4AF37/0.35),inset_0_1px_0_oklch(0.88_0.12_88/0.15)] ring-1 ring-[#D4AF37/0.18)]"
                          : "text-sidebar-foreground/55 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground/90 hover:translate-x-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      )
                    }
                    style={{ animationDelay: `${gi * 60 + ii * 40}ms` }}
                  >
                    {({ isActive }) => (
                      <>
                        <div
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                            isActive
                              ? "bg-gradient-to-br from-[oklch(0.78_0.14_82/0.35)] to-[oklch(0.62_0.13_80/0.25)] shadow-[inset_0_1px_0_oklch(0.92_0.11_90/0.25),0_0_8px_#D4AF37/0.3)]"
                              : "bg-sidebar-accent/60 group-hover:bg-sidebar-accent"
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-3.5 transition-colors duration-200",
                              isActive
                                ? "text-[oklch(0.90_0.12_90)]"
                                : "text-sidebar-foreground/55 group-hover:text-sidebar-foreground/85"
                            )}
                          />
                        </div>
                        <span className="truncate">{label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User card + sign out */}
        <div className="space-y-2 sidebar-footer-border bg-sidebar/50 p-3">
          <div className="card-shine rounded-xl border border-sidebar-border/80 bg-sidebar-accent/60 px-3 py-2.5 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <UserAvatar name={profile?.full_name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-sidebar-foreground/90">
                  {profile?.full_name || "Signed in"}
                </p>
                {profile?.role ? (
                  <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-sidebar-foreground/40">
                    {profile.role.replace(/_/g, " ")}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="flex w-full items-center justify-start gap-2 rounded-xl border border-sidebar-border bg-transparent px-3 py-2 text-sm font-medium text-sidebar-foreground/55 transition-all duration-200 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
            onClick={() => void handleSignOut()}
          >
            <LogOut className="size-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div data-gsap-content className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/95 px-4 shadow-[0_1px_0_rgba(0,0,0,0.06),0_4px_12px_-6px_rgba(0,0,0,0.07)] backdrop-blur-xl lg:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            onClick={() => setSidebarExpanded((v) => !v)}
            aria-expanded={sidebarExpanded}
            aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarExpanded ? <PanelLeftClose className="size-5" /> : <PanelLeftOpen className="size-5" />}
          </Button>
          <h1 className="flex min-w-0 flex-1 items-center gap-2 truncate font-display text-base font-semibold tracking-tight text-foreground">
            Standerton Mills
            {isLocalMode ? (
              <span className="shrink-0 rounded-md border border-amber-200/90 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-950">
                Local DB
              </span>
            ) : null}
          </h1>
          <GlobalDateFilter />
          <LiveIndicator />
          <button data-gsap-alert-pulse onClick={() => setAlertOpen(true)} className="relative shrink-0 rounded-full border border-border/50 bg-muted/25 p-2 transition-all hover:bg-muted/50 hover:shadow-md hover:scale-105 active:scale-95" aria-label="Alerts">
            <AlertTriangle className="size-4 text-amber-500" />
          </button>
          <CrmNotificationBell />
          <AlertCenter open={alertOpen} onClose={() => setAlertOpen(false)} />
        </header>
        <main
          ref={contentRef}
          className="crm-main-scroll relative flex-1 overflow-y-auto overflow-x-hidden bg-background p-4 lg:px-8 lg:py-7"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}


