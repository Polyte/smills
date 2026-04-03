import type { UserRole } from "../../app/crm/database.types";

/** Inventory, workforce administration, and destructive CRM operations. */
export function isOpsAdmin(role: UserRole | undefined): boolean {
  return role === "admin" || role === "production_manager";
}

/** Deals, quotes, tasks, contacts (non-destructive), samples. */
export function canWriteCommercial(role: UserRole | undefined): boolean {
  return (
    role === "admin" ||
    role === "production_manager" ||
    role === "sales" ||
    role === "quality_officer"
  );
}

/** Warehouse / inventory production orders (not textile factory work orders). */
export function canMutateInventory(role: UserRole | undefined): boolean {
  return role === "admin" || role === "production_manager";
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
  return role === "admin" || role === "production_manager";
}
