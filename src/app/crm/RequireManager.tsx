import { Navigate, Outlet } from "react-router";
import { useCrmAuth } from "./CrmAuthContext";

/** CRM routes restricted to managers (inventory-style). */
export function RequireManager() {
  const { profile } = useCrmAuth();
  if (profile?.role !== "manager") {
    return <Navigate to="/crm" replace />;
  }
  return <Outlet />;
}
