import type { UserRole } from "../../app/crm/database.types";

/** Inventory, workforce administration, and destructive CRM operations. */
export function isOpsAdmin(role: UserRole | undefined): boolean {
  return role === "super_admin" || role === "admin" || role === "production_manager";
}

export function isSuperAdmin(role: UserRole | undefined): boolean {
  return role === "super_admin";
}

/** Only Super Admin may assign the super_admin role (enforced in crmRepo too). */
export function canAssignUserRole(actor: UserRole | undefined, targetRole: UserRole): boolean {
  if (!actor) return false;
  if (targetRole === "super_admin") return actor === "super_admin";
  return isOpsAdmin(actor);
}

/** Deals, quotes, tasks, contacts (non-destructive), samples. */
export function canWriteCommercial(role: UserRole | undefined): boolean {
  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "production_manager" ||
    role === "sales" ||
    role === "quality_officer"
  );
}

/** Sales & Production Planning write access (ops + sales). */
export function canWritePlanning(role: UserRole | undefined): boolean {
  return isOpsAdmin(role) || role === "sales";
}

/** Warehouse / inventory production orders (not textile factory work orders). */
export function canMutateInventory(role: UserRole | undefined): boolean {
  return isOpsAdmin(role);
}

export function showWorkforceInNav(role: UserRole | undefined): boolean {
  return role !== undefined && role !== "sales";
}

export function workforceDefaultPath(role: UserRole | undefined): string {
  return isOpsAdmin(role) ? "/crm/workforce" : "/crm/workforce/me";
}

export function isQualityRole(role: UserRole | undefined): boolean {
  return role === "quality_officer" || isOpsAdmin(role);
}

export function canManageAutomationRules(role: UserRole | undefined): boolean {
  return isOpsAdmin(role);
}
