import { NavLink, Outlet, Navigate } from "react-router";
import { UsersRound, LayoutDashboard, UserCircle, Building2, Radio, FileBarChart } from "lucide-react";
import { useCrmAuth } from "../CrmAuthContext";
import { cn } from "../../components/ui/utils";
import { isOpsAdmin } from "../../../lib/crm/roles";
import { crmSubnavTabClass } from "../crmNavClasses";

const managerLinks = [
  { to: "/crm/workforce", end: true, label: "Live board", icon: LayoutDashboard },
  { to: "/crm/workforce/employees", label: "Employees", icon: UsersRound },
  { to: "/crm/workforce/departments", label: "Departments", icon: Building2 },
  { to: "/crm/workforce/readers", label: "RFID readers", icon: Radio },
  { to: "/crm/workforce/reports", label: "Reports", icon: FileBarChart },
];

export function WorkforceLayout() {
  const { profile } = useCrmAuth();
  const ops = isOpsAdmin(profile?.role);
  const showSelf = profile?.role === "quality_officer";

  if (profile?.role === "sales") {
    return <Navigate to="/crm" replace />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border/70 bg-card/50 p-5 shadow-sm backdrop-blur-sm sm:p-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Workforce &amp; attendance</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          RFID check-ins, department time, and lost-time tracking (15+ minutes outside the facility).
        </p>
      </div>

      <nav
        className="flex flex-wrap gap-1 rounded-xl border border-border/60 bg-muted/35 p-1.5 shadow-inner"
        aria-label="Workforce sections"
      >
        {ops &&
          managerLinks.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cn(crmSubnavTabClass(isActive), "inline-flex items-center gap-2")}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        {showSelf && (
          <NavLink
            to="/crm/workforce/me"
            className={({ isActive }) => cn(crmSubnavTabClass(isActive), "inline-flex items-center gap-2")}
          >
            <UserCircle className="h-4 w-4 shrink-0" />
            My attendance
          </NavLink>
        )}
      </nav>

      <Outlet />
    </div>
  );
}
