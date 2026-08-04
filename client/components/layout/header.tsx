'use client';

import { useTheme } from 'next-themes';
import { Bell, Moon, Sun, LogOut, Search, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore, useUIStore } from '@/store';
import { authApi } from '@/services/api';
import { toast } from 'sonner';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { user, clearAuth } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const router = useRouter();

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    clearAuth();
    toast.success('Logged out');
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl md:px-6">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative hidden max-w-sm flex-1 md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search students, vendors..." className="pl-9 bg-card/60" />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <Button variant="ghost" size="icon" onClick={() => router.push('/notifications')}>
          <Bell className="h-4 w-4" />
        </Button>

        <div className="hidden items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-1.5 sm:flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{user?.name || 'Admin'}</p>
            <p className="truncate text-[10px] text-muted-foreground">{user?.role || 'admin'}</p>
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
