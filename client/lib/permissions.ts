export const CLIENT_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  STAFF: 'staff',
} as const;

export type NavItemKey =
  | 'dashboard'
  | 'students'
  | 'batches'
  | 'courses'
  | 'expenses'
  | 'vendors'
  | 'products'
  | 'admissions'
  | 'reports'
  | 'notifications'
  | 'roles'
  | 'settings';

/** Sidebar / page access by role */
export const ROLE_NAV: Record<string, NavItemKey[]> = {
  super_admin: [
    'dashboard', 'students', 'batches', 'courses', 'expenses', 'vendors',
    'products', 'admissions', 'reports', 'roles', 'notifications', 'settings',
  ],
  admin: [
    'dashboard', 'students', 'batches', 'courses', 'expenses', 'vendors',
    'products', 'admissions', 'reports', 'notifications', 'settings',
  ],
  staff: ['students', 'products', 'expenses', 'admissions', 'notifications', 'settings'],
};

export const ROLE_DESCRIPTIONS = [
  {
    key: 'super_admin',
    label: 'Super Admin',
    description: 'Full access including Roles management and all modules.',
  },
  {
    key: 'admin',
    label: 'Admin',
    description: 'Full business access: dashboard, students, batches, reports, and more.',
  },
  {
    key: 'staff',
    label: 'Staff Member',
    description: 'Limited to Students, Products, Expenses, and Admissions only.',
  },
];

export function canAccessPath(role: string | undefined | null, pathname: string): boolean {
  if (!role) return false;
  const allowed = ROLE_NAV[role] || [];
  const map: { prefix: string; key: NavItemKey }[] = [
    { prefix: '/sun/dashboard', key: 'dashboard' },
    { prefix: '/sun/students', key: 'students' },
    { prefix: '/sun/batches', key: 'batches' },
    { prefix: '/sun/courses', key: 'courses' },
    { prefix: '/sun/expenses', key: 'expenses' },
    { prefix: '/sun/vendors', key: 'vendors' },
    { prefix: '/sun/products', key: 'products' },
    { prefix: '/sun/admissions', key: 'admissions' },
    { prefix: '/sun/reports', key: 'reports' },
    { prefix: '/sun/roles', key: 'roles' },
    { prefix: '/sun/notifications', key: 'notifications' },
    { prefix: '/sun/settings', key: 'settings' },
    { prefix: '/dashboard', key: 'dashboard' },
    { prefix: '/students', key: 'students' },
    { prefix: '/batches', key: 'batches' },
    { prefix: '/expenses', key: 'expenses' },
    { prefix: '/vendors', key: 'vendors' },
    { prefix: '/products', key: 'products' },
    { prefix: '/admissions', key: 'admissions' },
    { prefix: '/reports', key: 'reports' },
    { prefix: '/roles', key: 'roles' },
    { prefix: '/notifications', key: 'notifications' },
    { prefix: '/settings', key: 'settings' },
  ];

  const match = map.find((m) => pathname === m.prefix || pathname.startsWith(m.prefix + '/'));
  if (!match) return false;
  return allowed.includes(match.key);
}

export function homeForRole(role: string | undefined | null): string {
  if (role === CLIENT_ROLES.STAFF) return '/sun/expenses';
  return '/sun/dashboard';
}

export function isAdmin(role: string | undefined | null): boolean {
  return role === CLIENT_ROLES.SUPER_ADMIN || role === CLIENT_ROLES.ADMIN;
}

export function isSuperAdmin(role: string | undefined | null): boolean {
  return role === CLIENT_ROLES.SUPER_ADMIN;
}
