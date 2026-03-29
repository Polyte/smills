import { Outlet } from "react-router";
import { AppToaster } from "../components/ux/AppToaster";
import { CrmAuthProvider } from "./CrmAuthContext";

export function CrmRoot() {
  return (
    <CrmAuthProvider>
      <AppToaster />
      <Outlet />
    </CrmAuthProvider>
  );
}
