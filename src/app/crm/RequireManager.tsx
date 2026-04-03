import { Navigate, Outlet } from "react-router";
import { useCrmAuth } from "./CrmAuthContext";

/** CRM routes restricted to operations admins (inventory, workforce management). */
export function RequireManager() {
  const { profile } = useCrmAuth();
  if (profile?.role !== "admin" && profile?.role !== "production_manager") {
    return <Navigate to="/crm" replace />;
  }
  return <Outlet />;
}
