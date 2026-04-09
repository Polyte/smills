import { Navigate, Outlet } from "react-router";
import { isOpsAdmin } from "../../lib/crm/roles";
import { useCrmAuth } from "./CrmAuthContext";

/** CRM routes restricted to operations admins (inventory, workforce management). */
export function RequireManager() {
  const { profile } = useCrmAuth();
  if (!isOpsAdmin(profile?.role)) {
    return <Navigate to="/crm" replace />;
  }
  return <Outlet />;
}
