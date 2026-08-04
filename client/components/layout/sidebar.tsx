'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Layers, Wallet, Store, Package,
  ClipboardList, BarChart3, Bell, Settings, Sparkles, ChevronLeft, ChevronRight,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore, useAuthStore } from '@/store';
import { ROLE_NAV, type NavItemKey } from '@/lib/permissions';

const navItems: { href: string; label: string; key: NavItemKey; icon: React.ElementType }[] = [
  { href: '/dashboard', label: 'Dashboard', key: 'dashboard', icon: LayoutDashboard },
  { href: '/students', label: 'Students', key: 'students', icon: Users },
  { href: '/batches', label: 'Batches', key: 'batches', icon: Layers },
  { href: '/expenses', label: 'Expenses', key: 'expenses', icon: Wallet },
  { href: '/vendors', label: 'Vendors', key: 'vendors', icon: Store },
  { href: '/products', label: 'Products', key: 'products', icon: Package },
  { href: '/admissions', label: 'Admissions', key: 'admissions', icon: ClipboardList },
  { href: '/reports', label: 'Reports', key: 'reports', icon: BarChart3 },
  { href: '/roles', label: 'Roles', key: 'roles', icon: Shield },
  { href: '/notifications', label: 'Notifications', key: 'notifications', icon: Bell },
  { href: '/settings', label: 'Settings', key: 'settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const role = useAuthStore((s) => s.user?.role) || 'admin';
  const allowed = ROLE_NAV[role] || ROLE_NAV.admin;
  const nav = navItems.filter((item) => allowed.includes(item.key));

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border/60 bg-sidebar transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-[72px]'
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b border-border/60 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0">
            <p className="truncate font-display text-sm font-semibold tracking-tight">Komal&apos;s Makeovers</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {role === 'staff' ? 'Staff Member' : 'Management Tool'}
            </p>
          </motion.div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                active
                  ? 'bg-sidebar-accent text-primary font-medium'
                  : 'text-sidebar-foreground hover:bg-muted'
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-lg bg-sidebar-accent"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <Icon className="relative z-10 h-4 w-4 shrink-0" />
              {sidebarOpen && <span className="relative z-10 truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={toggleSidebar}
        className="m-3 flex items-center justify-center rounded-lg border border-border/60 p-2 text-muted-foreground hover:bg-muted"
      >
        {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
    </aside>
  );
}
