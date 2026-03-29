import { Navigate, Outlet, useLocation } from "react-router";
import { useCrmAuth } from "./CrmAuthContext";

export function RequireAuth() {
  const { user, loading } = useCrmAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <p className="text-sm">Loading session…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/crm/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
