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
} from "lucide-react";
import { useMemo, useState } from "react";
import { useCrmAuth } from "./CrmAuthContext";
import { Button } from "../components/ui/button";
import { cn } from "../components/ui/utils";

export function CrmShell() {
  const { profile, signOut, isLocalMode } = useCrmAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = useMemo(() => {
    const items: {
      to: string;
      end?: boolean;
      label: string;
      icon: typeof LayoutDashboard;
    }[] = [
      { to: "/crm", end: true, label: "Dashboard", icon: LayoutDashboard },
      { to: "/crm/contacts", label: "Contacts", icon: Users },
      { to: "/crm/deals", label: "Deals", icon: KanbanSquare },
      { to: "/crm/inventory", label: "Inventory", icon: Warehouse },
    ];
    if (profile?.role !== "staff") {
      items.push({
        to: profile?.role === "employee" ? "/crm/workforce/me" : "/crm/workforce",
        end: profile?.role === "employee",
        label: "Workforce",
        icon: UsersRound,
      });
    }
    items.push(
      { to: "/crm/activities", label: "Activities", icon: History },
      { to: "/crm/tasks", label: "Tasks", icon: ListTodo },
      { to: "/crm/settings", label: "Settings", icon: Settings }
    );
    return items;
  }, [profile?.role]);

  async function handleSignOut() {
    await signOut();
    navigate("/crm/login", { replace: true });
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-primary text-primary-foreground"
        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    );

  return (
    <div className="min-h-screen flex bg-background text-foreground">
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
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-sidebar-border px-4">
          <NavLink
            to="/crm"
            className="flex items-center gap-2 font-display font-bold text-sidebar-foreground"
            onClick={() => setMobileOpen(false)}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm">
              SM
            </span>
            <span className="truncate">Standerton Mills CRM</span>
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
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {nav.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={linkClass}
              onClick={() => setMobileOpen(false)}
            >
              <Icon className="size-4 shrink-0 opacity-80" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3 space-y-2">
          <p className="truncate px-2 text-xs text-muted-foreground">
            {profile?.full_name || "Signed in"}
            {profile?.role ? (
              <span className="block capitalize text-[10px] uppercase tracking-wide opacity-70">
                {profile.role}
              </span>
            ) : null}
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => void handleSignOut()}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-6">
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
          <h1 className="text-sm font-semibold text-muted-foreground truncate flex items-center gap-2">
            Standerton Mills — crafting quality yarn & fabrics
            {isLocalMode ? (
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200/80 shrink-0">
                Local DB
              </span>
            ) : null}
          </h1>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
