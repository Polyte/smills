import { NavLink, Outlet, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  ListTodo,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Warehouse,
  UsersRound,
  FileText,
  Activity,
  Cpu,
  FileBarChart,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCrmAuth } from "./CrmAuthContext";
import { Button } from "../components/ui/button";
import { cn } from "../components/ui/utils";
import { CrmNotificationBell } from "./components/CrmNotificationBell";
import { BrandLogo } from "../components/BrandLogo";
import { showWorkforceInNav, workforceDefaultPath } from "../../lib/crm/roles";

const CRM_SIDEBAR_EXPANDED_KEY = "sm_crm_sidebar_lg_expanded";

type CrmNavItem = { to: string; end?: boolean; label: string; icon: typeof LayoutDashboard };

export function CrmShell() {
  const { profile, signOut, isLocalMode } = useCrmAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return localStorage.getItem(CRM_SIDEBAR_EXPANDED_KEY) !== "0";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CRM_SIDEBAR_EXPANDED_KEY, sidebarExpanded ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [sidebarExpanded]);

  const navGroups = useMemo((): { label: string; items: CrmNavItem[] }[] => {
    const overview: CrmNavItem[] = [
      { to: "/crm", end: true, label: "Dashboard", icon: LayoutDashboard },
      { to: "/crm/reports", label: "Reports", icon: FileBarChart },
    ];
    const customer: CrmNavItem[] = [
      { to: "/crm/contacts", label: "Contacts", icon: Users },
      { to: "/crm/deals", label: "Deals", icon: KanbanSquare },
      { to: "/crm/quotes", label: "Quotes", icon: FileText },
    ];
    const operations: CrmNavItem[] = [
      { to: "/crm/inventory", label: "Inventory", icon: Warehouse },
      { to: "/crm/automation", label: "Automation Hub", icon: Cpu },
      { to: "/crm/orders", label: "Orders", icon: Activity },
      { to: "/crm/samples", label: "Samples", icon: FileText },
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
      { to: "/crm/tasks", label: "Tasks", icon: ListTodo },
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

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
      isActive
        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground"
    );

  return (
    <div className="crm-app min-h-screen flex bg-background text-foreground">
      {/* Mobile overlay */}
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 min-w-0 flex-col border-r border-sidebar-border/90 bg-gradient-to-b from-sidebar via-sidebar to-sidebar-accent/35 text-sidebar-foreground shadow-xl shadow-black/5 lg:shadow-none",
          "transition-[transform,width] duration-300 ease-in-out motion-reduce:transition-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:relative lg:z-auto lg:translate-x-0 lg:shrink-0",
          sidebarExpanded ? "lg:w-64 lg:border-sidebar-border/90" : "lg:w-0 lg:overflow-hidden lg:border-transparent lg:pointer-events-none"
        )}
      >
        <div className="flex h-[3.75rem] items-center justify-between gap-2 border-b border-sidebar-border/80 bg-sidebar-accent/25 px-4 backdrop-blur-[2px]">
          <NavLink
            to="/crm"
            className="flex min-w-0 items-center gap-2.5 rounded-lg pr-1 font-display font-bold text-sidebar-foreground outline-none ring-sidebar-ring transition-opacity hover:opacity-95 focus-visible:ring-2"
            onClick={() => setMobileOpen(false)}
          >
            <BrandLogo height={28} withBrandTile className="shrink-0" />
            <span className="truncate text-left text-xs font-semibold leading-tight tracking-tight">
              CRM
              <span className="block truncate font-normal text-[10px] font-sans text-sidebar-foreground/65">
                Standerton Mills
              </span>
            </span>
          </NavLink>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="size-5" />
          </Button>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto p-3" aria-label="CRM sections">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ to, end, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={linkClass}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon className="size-4 shrink-0 opacity-85 group-hover:opacity-100" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="space-y-2 border-t border-sidebar-border/80 bg-sidebar-accent/15 p-3">
          <div className="rounded-xl border border-sidebar-border/60 bg-background/40 px-3 py-2.5 backdrop-blur-sm">
            <p className="truncate text-xs font-medium text-sidebar-foreground">
              {profile?.full_name || "Signed in"}
            </p>
            {profile?.role ? (
              <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-sidebar-foreground/55">
                {profile.role.replace(/_/g, " ")}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2 rounded-xl border-sidebar-border/80 bg-background/30 hover:bg-background/55"
            onClick={() => void handleSignOut()}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/80 bg-background/90 px-4 shadow-sm shadow-black/[0.03] backdrop-blur-md supports-[backdrop-filter]:bg-background/75 lg:px-6">
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
          <CrmNotificationBell />
        </header>
        <main className="relative flex-1 overflow-x-auto bg-gradient-to-b from-muted/45 via-background to-background p-4 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
