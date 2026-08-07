'use client';

import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ShieldCheck, KeyRound, User as UserIcon } from 'lucide-react';
import { authApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store';
import { getErrorMessage } from '@/lib/api';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  const passwordForm = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });

  async function onPasswordSubmit(values: {
    currentPassword: string;
    newPassword: string;
    confirm: string;
  }) {
    if (values.newPassword !== values.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await authApi.changePassword(values.currentPassword, values.newPassword);
      toast.success('Password changed');
      passwordForm.reset();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  const roleLabel =
    user?.role === 'super_admin'
      ? 'Super Admin'
      : user?.role === 'staff'
        ? 'Staff Member'
        : user?.role || '—';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Account & security settings</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <Card className="h-full shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Profile Information</CardTitle>
            </div>
            <CardDescription>Your personal details and role permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl uppercase shrink-0">
                {user?.name?.[0] || 'U'}
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-lg leading-none">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <Badge variant={user?.role === 'super_admin' ? 'default' : 'secondary'} className="mt-1">
                  {roleLabel}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border/40">
                <span className="text-muted-foreground">Full Name</span>
                <span className="font-medium">{user?.name || '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/40">
                <span className="text-muted-foreground">Email Address</span>
                <span className="font-medium">{user?.email || '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/40">
                <span className="text-muted-foreground">Phone Number</span>
                <span className="font-medium">{user?.phone || '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/40">
                <span className="text-muted-foreground">Account Status</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4" /> Active
                </span>
              </div>
            </div>

            {user?.role === 'staff' && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-900 dark:text-amber-300">
                Staff access is limited to <strong>Expenses</strong>, <strong>Vendors</strong>,{' '}
                <strong>Products</strong>, and <strong>Admissions</strong>.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Card */}
        <Card className="h-full shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Change Password</CardTitle>
            </div>
            <CardDescription>Update your account password for security</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Current Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  {...passwordForm.register('currentPassword', { required: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <Input
                  type="password"
                  placeholder="At least 8 characters"
                  {...passwordForm.register('newPassword', { required: true, minLength: 8 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  {...passwordForm.register('confirm', { required: true })}
                />
              </div>
              <Button type="submit" className="w-full sm:w-auto">
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
