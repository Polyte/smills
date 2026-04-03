import { NavLink, Outlet, Navigate } from "react-router";
import { UsersRound, LayoutDashboard, UserCircle, Building2, Radio, FileBarChart } from "lucide-react";
import { useCrmAuth } from "../CrmAuthContext";
import { cn } from "../../components/ui/utils";
import { isOpsAdmin } from "../../../lib/crm/roles";

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workforce & attendance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          RFID check-ins, department time, and lost-time tracking (15+ minutes outside the facility).
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {ops &&
          managerLinks.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        {showSelf && (
          <NavLink
            to="/crm/workforce/me"
            className={({ isActive }) =>
              cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <UserCircle className="h-4 w-4 shrink-0" />
            My attendance
          </NavLink>
        )}
      </div>

      <Outlet />
    </div>
  );
}
