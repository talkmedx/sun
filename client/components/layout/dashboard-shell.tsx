'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store';
import { canAccessPath, homeForRole } from '@/lib/permissions';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const { sidebarOpen } = useUIStore();

  useEffect(() => {
    const token = accessToken || (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);
    if (!token) {
      router.replace(`/sun/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    const role = user?.role;
    if (role && !canAccessPath(role, pathname)) {
      router.replace(homeForRole(role));
    }
  }, [accessToken, user?.role, router, pathname]);

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className={cn('transition-all duration-300', sidebarOpen ? 'md:pl-64' : 'md:pl-[72px]')}>
        <Header />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
