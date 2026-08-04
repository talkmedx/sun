'use client';

import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { authApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Account & security</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>
            {user?.email} · {roleLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Name:</span> {user?.name}
          </p>
          <p>
            <span className="text-muted-foreground">Phone:</span> {user?.phone || '—'}
          </p>
          {user?.role === 'staff' && (
            <p className="mt-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              Staff access is limited to <strong>Expenses</strong>, <strong>Vendors</strong>,{' '}
              <strong>Products</strong>, and <strong>Admissions</strong>.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-3">
            <div className="space-y-1">
              <Label>Current password</Label>
              <Input
                type="password"
                {...passwordForm.register('currentPassword', { required: true })}
              />
            </div>
            <div className="space-y-1">
              <Label>New password</Label>
              <Input
                type="password"
                {...passwordForm.register('newPassword', { required: true, minLength: 8 })}
              />
            </div>
            <div className="space-y-1">
              <Label>Confirm</Label>
              <Input type="password" {...passwordForm.register('confirm', { required: true })} />
            </div>
            <Button type="submit">Update password</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
