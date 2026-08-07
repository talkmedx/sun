/** Role-based access for Komal's Makeovers */

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  STAFF: 'staff',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Modules staff members may access */
export const STAFF_MODULES = ['students', 'products', 'expenses', 'admissions'] as const;

export type ModuleKey =
  | 'dashboard'
  | 'students'
  | 'batches'
  | 'expenses'
  | 'vendors'
  | 'products'
  | 'admissions'
  | 'reports'
  | 'notifications'
  | 'settings'
  | 'users';

const ADMIN_ROLES: Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN];
const ALL_ROLES: Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF];

/** Which roles can access each API module */
export const MODULE_ROLES: Record<ModuleKey, Role[]> = {
  dashboard: ADMIN_ROLES,
  students: ALL_ROLES,
  batches: ADMIN_ROLES, // staff uses /batches/dropdown only (handled separately)
  expenses: ALL_ROLES,
  vendors: ADMIN_ROLES,
  products: ALL_ROLES,
  admissions: ALL_ROLES,
  reports: ADMIN_ROLES,
  notifications: ALL_ROLES,
  settings: ALL_ROLES, // change own password
  users: [ROLES.SUPER_ADMIN], // manage roles — super admin only
};

export function isAdminRole(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

export function isStaffRole(role: string): boolean {
  return role === ROLES.STAFF;
}

export function defaultHomeForRole(role: string): string {
  return isStaffRole(role) ? '/expenses' : '/dashboard';
}
