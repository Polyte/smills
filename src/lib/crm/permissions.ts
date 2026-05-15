/**
 * Standerton Mills — Roles & Permissions System
 * Based on the RBAC specification with 12 roles and 8 modules.
 */

// ── Permission Levels ──
export const PERM = {
  NONE: 0,
  READ: 1,
  EXECUTE: 2,
  WRITE: 3,
  FULL: 4,
} as const;

export type PermissionLevel = (typeof PERM)[keyof typeof PERM];

// ── Roles ──
export const ROLES = [
  "executive",
  "production_manager",
  "shift_supervisor",
  "quality_manager",
  "maintenance_lead",
  "yarn_planner",
  "weaving_planner",
  "inventory_clerk",
  "sales",
  "rd_engineer",
  "technician",
  "auditor",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  executive: "Executive",
  production_manager: "Production Manager",
  shift_supervisor: "Shift Supervisor",
  quality_manager: "Quality Manager",
  maintenance_lead: "Maintenance Lead",
  yarn_planner: "Yarn Planner",
  weaving_planner: "Weaving Planner",
  inventory_clerk: "Inventory Clerk",
  sales: "Sales / Account Manager",
  rd_engineer: "R&D Engineer",
  technician: "Technician (limited)",
  auditor: "Auditor / Compliance",
};

// ── Modules ──
export const MODULES = [
  "command_center",
  "yarn_manufacturing",
  "weaving_fabric",
  "quality_compliance",
  "rd_solutions",
  "inventory_logistics",
  "sustainability_maintenance",
  "financial_sales",
] as const;

export type Module = (typeof MODULES)[number];

export const MODULE_LABELS: Record<Module, string> = {
  command_center: "Command Center",
  yarn_manufacturing: "Yarn Manufacturing",
  weaving_fabric: "Weaving & Fabric",
  quality_compliance: "Quality & Compliance",
  rd_solutions: "Custom Solutions & R&D",
  inventory_logistics: "Inventory & Logistics",
  sustainability_maintenance: "Sustainability & Maintenance",
  financial_sales: "Financial & Sales",
};

// ── Module-Role Permission Matrix ──
const MODULE_PERMISSIONS: Record<Module, Record<Role, PermissionLevel>> = {
  command_center: {
    executive: 4, production_manager: 3, shift_supervisor: 2,
    quality_manager: 2, maintenance_lead: 2, yarn_planner: 1,
    weaving_planner: 1, inventory_clerk: 1, sales: 2,
    rd_engineer: 1, technician: 1, auditor: 3,
  },
  yarn_manufacturing: {
    executive: 3, production_manager: 4, shift_supervisor: 3,
    quality_manager: 2, maintenance_lead: 2, yarn_planner: 4,
    weaving_planner: 2, inventory_clerk: 2, sales: 1,
    rd_engineer: 2, technician: 1, auditor: 2,
  },
  weaving_fabric: {
    executive: 3, production_manager: 4, shift_supervisor: 3,
    quality_manager: 2, maintenance_lead: 2, yarn_planner: 1,
    weaving_planner: 4, inventory_clerk: 2, sales: 2,
    rd_engineer: 2, technician: 2, auditor: 2,
  },
  quality_compliance: {
    executive: 3, production_manager: 3, shift_supervisor: 2,
    quality_manager: 4, maintenance_lead: 1, yarn_planner: 1,
    weaving_planner: 1, inventory_clerk: 1, sales: 1,
    rd_engineer: 3, technician: 0, auditor: 4,
  },
  rd_solutions: {
    executive: 2, production_manager: 2, shift_supervisor: 1,
    quality_manager: 2, maintenance_lead: 1, yarn_planner: 1,
    weaving_planner: 2, inventory_clerk: 0, sales: 3,
    rd_engineer: 4, technician: 0, auditor: 1,
  },
  inventory_logistics: {
    executive: 3, production_manager: 2, shift_supervisor: 1,
    quality_manager: 1, maintenance_lead: 1, yarn_planner: 3,
    weaving_planner: 2, inventory_clerk: 4, sales: 2,
    rd_engineer: 1, technician: 0, auditor: 2,
  },
  sustainability_maintenance: {
    executive: 2, production_manager: 3, shift_supervisor: 2,
    quality_manager: 1, maintenance_lead: 4, yarn_planner: 1,
    weaving_planner: 1, inventory_clerk: 1, sales: 1,
    rd_engineer: 1, technician: 2, auditor: 1,
  },
  financial_sales: {
    executive: 4, production_manager: 2, shift_supervisor: 1,
    quality_manager: 1, maintenance_lead: 1, yarn_planner: 1,
    weaving_planner: 2, inventory_clerk: 1, sales: 4,
    rd_engineer: 1, technician: 0, auditor: 3,
  },
};

// ── Action Permissions ──
export const ACTIONS = [
  "acknowledge_alerts", "log_root_cause", "manage_users", "export_data",
  "view_machines", "override_targets", "view_history", "manage_maintenance",
  "approve_quality", "edit_profile",
] as const;

export type Action = (typeof ACTIONS)[number];

const ACTION_PERMISSIONS: Record<Action, Record<Role, PermissionLevel>> = {
  acknowledge_alerts: {
    executive: 3, production_manager: 4, shift_supervisor: 4,
    quality_manager: 2, maintenance_lead: 4, yarn_planner: 2,
    weaving_planner: 2, inventory_clerk: 1, sales: 1,
    rd_engineer: 1, technician: 2, auditor: 0,
  },
  log_root_cause: {
    executive: 2, production_manager: 4, shift_supervisor: 4,
    quality_manager: 3, maintenance_lead: 4, yarn_planner: 2,
    weaving_planner: 2, inventory_clerk: 1, sales: 1,
    rd_engineer: 2, technician: 3, auditor: 0,
  },
  manage_users: {
    executive: 4, production_manager: 3, shift_supervisor: 0,
    quality_manager: 3, maintenance_lead: 2, yarn_planner: 0,
    weaving_planner: 0, inventory_clerk: 0, sales: 2,
    rd_engineer: 1, technician: 0, auditor: 1,
  },
  export_data: {
    executive: 4, production_manager: 3, shift_supervisor: 2,
    quality_manager: 3, maintenance_lead: 2, yarn_planner: 2,
    weaving_planner: 2, inventory_clerk: 2, sales: 2,
    rd_engineer: 2, technician: 0, auditor: 3,
  },
  view_machines: {
    executive: 3, production_manager: 4, shift_supervisor: 4,
    quality_manager: 2, maintenance_lead: 4, yarn_planner: 1,
    weaving_planner: 3, inventory_clerk: 0, sales: 1,
    rd_engineer: 2, technician: 2, auditor: 2,
  },
  override_targets: {
    executive: 4, production_manager: 3, shift_supervisor: 0,
    quality_manager: 0, maintenance_lead: 0, yarn_planner: 2,
    weaving_planner: 2, inventory_clerk: 0, sales: 0,
    rd_engineer: 0, technician: 0, auditor: 0,
  },
  view_history: {
    executive: 4, production_manager: 3, shift_supervisor: 2,
    quality_manager: 3, maintenance_lead: 3, yarn_planner: 2,
    weaving_planner: 2, inventory_clerk: 1, sales: 2,
    rd_engineer: 2, technician: 0, auditor: 3,
  },
  manage_maintenance: {
    executive: 2, production_manager: 3, shift_supervisor: 2,
    quality_manager: 0, maintenance_lead: 4, yarn_planner: 0,
    weaving_planner: 0, inventory_clerk: 0, sales: 0,
    rd_engineer: 0, technician: 2, auditor: 0,
  },
  approve_quality: {
    executive: 3, production_manager: 2, shift_supervisor: 1,
    quality_manager: 4, maintenance_lead: 0, yarn_planner: 0,
    weaving_planner: 1, inventory_clerk: 0, sales: 2,
    rd_engineer: 2, technician: 0, auditor: 0,
  },
  edit_profile: {
    executive: 3, production_manager: 3, shift_supervisor: 3,
    quality_manager: 3, maintenance_lead: 3, yarn_planner: 3,
    weaving_planner: 3, inventory_clerk: 3, sales: 3,
    rd_engineer: 3, technician: 3, auditor: 3,
  },
};

// ── Permission Check ──
export function canAccessModule(role: Role | null | undefined, module: Module, level: PermissionLevel = PERM.READ): boolean {
  if (!role) return false;
  const userLevel = MODULE_PERMISSIONS[module]?.[role] ?? 0;
  return userLevel >= level;
}

export function canPerformAction(role: Role | null | undefined, action: Action, level: PermissionLevel = PERM.READ): boolean {
  if (!role) return false;
  const userLevel = ACTION_PERMISSIONS[action]?.[role] ?? 0;
  return userLevel >= level;
}

export function getModuleAccessLevel(role: Role | null | undefined, module: Module): PermissionLevel {
  if (!role) return 0;
  return MODULE_PERMISSIONS[module]?.[role] ?? 0;
}

export function getActionAccessLevel(role: Role | null | undefined, action: Action): PermissionLevel {
  if (!role) return 0;
  return ACTION_PERMISSIONS[action]?.[role] ?? 0;
}

// ── Seed Users ──
export interface SeedUser {
  username: string;
  name: string;
  role: Role;
  department: string;
}

export const SEED_USERS: SeedUser[] = [
  { username: "themba.nkosi", name: "Themba Nkosi", role: "executive", department: "CEO" },
  { username: "fatima.patel", name: "Fatima Patel", role: "production_manager", department: "Weaving" },
  { username: "johan.vanwyk", name: "Johan van Wyk", role: "shift_supervisor", department: "Spinning" },
  { username: "priya.naidoo", name: "Priya Naidoo", role: "quality_manager", department: "QA Lab" },
  { username: "sifiso.dlamini", name: "Sifiso Dlamini", role: "maintenance_lead", department: "Engineering" },
  { username: "lerato.molefe", name: "Lerato Molefe", role: "yarn_planner", department: "Yarn Store" },
  { username: "pieter.botha", name: "Pieter Botha", role: "inventory_clerk", department: "Logistics" },
  { username: "rebecca.martins", name: "Rebecca Martins", role: "sales", department: "Commercial" },
  { username: "michael.ngwenya", name: "Michael Ngwenya", role: "rd_engineer", department: "R&D" },
  { username: "audit.user", name: "Auditor User", role: "auditor", department: "Compliance" },
];

// ── Module-to-Route Map (for sidebar filtering) ──
export const MODULE_ROUTES: Record<Module, string> = {
  command_center: "/crm/command-center",
  yarn_manufacturing: "/crm/planning",
  weaving_fabric: "/crm/planning",
  quality_compliance: "/crm/quality",
  rd_solutions: "/crm/rd-solutions",
  inventory_logistics: "/crm/inventory",
  sustainability_maintenance: "/crm/sustainability",
  financial_sales: "/crm/financials",
};
