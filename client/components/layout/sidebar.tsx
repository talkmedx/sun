'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Layers, Wallet, Store, Package,
  ClipboardList, BarChart3, Bell, Settings, Sparkles, ChevronLeft, ChevronRight,
  Shield, X, BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore, useAuthStore } from '@/store';
import { useQuery } from '@tanstack/react-query';
import { admissionsApi } from '@/services/api';
import { ROLE_NAV, type NavItemKey } from '@/lib/permissions';

const navItems: { href: string; label: string; key: NavItemKey; icon: React.ElementType }[] = [
  { href: '/sun/dashboard', label: 'Dashboard', key: 'dashboard', icon: LayoutDashboard },
  { href: '/sun/students', label: 'Students', key: 'students', icon: Users },
  { href: '/sun/batches', label: 'Batches', key: 'batches', icon: Layers },
  { href: '/sun/courses', label: 'Courses', key: 'courses', icon: BookOpen },
  { href: '/sun/expenses', label: 'Expenses', key: 'expenses', icon: Wallet },
  { href: '/sun/vendors', label: 'Vendors', key: 'vendors', icon: Store },
  { href: '/sun/products', label: 'Products', key: 'products', icon: Package },
  { href: '/sun/admissions', label: 'Admissions', key: 'admissions', icon: ClipboardList },
  { href: '/sun/reports', label: 'Reports', key: 'reports', icon: BarChart3 },
  { href: '/sun/roles', label: 'Roles', key: 'roles', icon: Shield },
  { href: '/sun/notifications', label: 'Notifications', key: 'notifications', icon: Bell },
  { href: '/sun/settings', label: 'Settings', key: 'settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, mobileOpen, closeMobile } = useUIStore();
  const role = useAuthStore((s) => s.user?.role) || 'super_admin';
  const allowed = ROLE_NAV[role] || ROLE_NAV.super_admin;
  const nav = navItems.filter((item) => allowed.includes(item.key));

  const { data: pendingAdmissionsData } = useQuery({
    queryKey: ['pending-admissions-count'],
    queryFn: async () => (await admissionsApi.list({ status: 'pending', limit: 1 })).data,
    refetchInterval: 10000,
  });
  const pendingCount = pendingAdmissionsData?.meta?.total ?? 0;

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-xs transition-opacity md:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border/60 bg-sidebar transition-all duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          sidebarOpen ? 'w-64' : 'w-64 md:w-[72px]'
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-border/60 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className={cn('min-w-0 flex-1', !sidebarOpen && 'md:hidden')}>
            <p className="truncate font-display text-sm font-semibold tracking-tight">Komal&apos;s Makeovers</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {role === 'staff' ? 'Staff Member' : 'Management Tool'}
            </p>
          </div>
          <button
            onClick={closeMobile}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted md:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => {
            const cleanPath = pathname ? pathname.replace(/\/$/, '') : '';
            const cleanHref = item.href.replace(/\/$/, '');
            const bareHref = cleanHref.replace(/^\/sun/, '');
            const barePath = cleanPath.replace(/^\/sun/, '');

            const active =
              cleanPath === cleanHref ||
              cleanPath.startsWith(cleanHref + '/') ||
              barePath === bareHref ||
              barePath.startsWith(bareHref + '/');

            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
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
                    className="absolute inset-0 rounded-lg bg-sidebar-accent border border-primary/20"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className="relative z-10 h-4 w-4 shrink-0" />
                <span className={cn('relative z-10 truncate', !sidebarOpen && 'md:hidden')}>
                  {item.label}
                </span>
                {item.key === 'admissions' && pendingCount > 0 && (
                  <span className="relative z-10 ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white shadow-xs">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={toggleSidebar}
          className="m-3 hidden items-center justify-center rounded-lg border border-border/60 p-2 text-muted-foreground hover:bg-muted md:flex"
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </aside>
    </>
  );
}
