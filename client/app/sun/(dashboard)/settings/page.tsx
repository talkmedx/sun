'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ShieldCheck, KeyRound, User as UserIcon, Cloud, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, settingsApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store';
import { getErrorMessage } from '@/lib/api';
import { isAdmin } from '@/lib/permissions';

const DRIVE_ACCOUNT = 'vowvanity@gmail.com';
const NEW_DRIVE_CLIENT_ID =
  '1062631179820-ffgpleimt0n2qn7r648rbr6q38cv8ios.apps.googleusercontent.com';

function resolveClientId(raw: string) {
  const value = raw.trim();
  if (value.includes('apps.googleusercontent.com')) return value;
  return NEW_DRIVE_CLIENT_ID;
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const [clientId, setClientId] = useState(NEW_DRIVE_CLIENT_ID);
  const [clientSecret, setClientSecret] = useState('');
  const canManageDrive = isAdmin(user?.role);

  const passwordForm = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });

  const driveQuery = useQuery({
    queryKey: ['google-drive-status'],
    queryFn: async () => (await settingsApi.googleDriveStatus()).data.data,
    enabled: canManageDrive,
  });

  useEffect(() => {
    const stored = driveQuery.data?.clientId || '';
    if (stored.includes('apps.googleusercontent.com')) {
      setClientId(stored);
    } else {
      setClientId(NEW_DRIVE_CLIENT_ID);
    }
  }, [driveQuery.data?.clientId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('drive') === 'connected') {
      const email = params.get('email');
      toast.success(email ? `Google Drive connected as ${email}` : 'Google Drive connected');
      qc.invalidateQueries({ queryKey: ['google-drive-status'] });
      window.history.replaceState({}, '', '/sun/settings');
    } else if (params.get('drive') === 'error') {
      toast.error(params.get('message') || 'Google Drive connect failed');
      window.history.replaceState({}, '', '/sun/settings');
    }
  }, [qc]);

  const disconnectDrive = useMutation({
    mutationFn: () => settingsApi.googleDriveDisconnect(),
    onSuccess: () => {
      toast.success('Google Drive disconnected');
      qc.invalidateQueries({ queryKey: ['google-drive-status'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  async function connectDrive() {
    const id = resolveClientId(clientId);
    const secret = clientSecret.trim();
    if (!id.includes('apps.googleusercontent.com')) {
      toast.error('Paste the Google Client ID. It ends with .apps.googleusercontent.com');
      return;
    }
    if (!secret) {
      toast.error('Paste the Google Client secret (starts with GOCSPX-)');
      return;
    }
    try {
      setConnecting(true);
      const { data } = await settingsApi.googleDriveConnect({ clientId: id, clientSecret: secret });
      if (data.data.authUrl) {
        window.location.href = data.data.authUrl;
        return;
      }
      toast.success(data.data.email ? `Google Drive connected as ${data.data.email}` : 'Google Drive connected');
      setClientSecret('');
      qc.invalidateQueries({ queryKey: ['google-drive-status'] });
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setConnecting(false);
    }
  }

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
      : user?.role === 'admin'
        ? 'Admin'
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

      {canManageDrive && (
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Google Drive</CardTitle>
            </div>
            <CardDescription>
              Admission photos, proofs, and other panel documents are stored in{' '}
              <span className="font-medium text-foreground">komal&apos;s Makeover / student name current-date</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {driveQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking connection…
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border/50 bg-muted/30 p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {driveQuery.data?.connected ? 'Connected' : 'Not connected'}
                      </p>
                      <Badge variant={driveQuery.data?.connected ? 'success' : 'secondary'}>
                        {driveQuery.data?.connected ? 'Active' : 'Off'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {driveQuery.data?.connected
                        ? `Saving to ${driveQuery.data.email || DRIVE_ACCOUNT}`
                        : `New setup: connect the Drive for ${DRIVE_ACCOUNT}. Do not use the old komalsmakeover project.`}
                    </p>
                  </div>
                  {(driveQuery.data?.connected || driveQuery.data?.appConfigured) && (
                    <Button
                      variant="outline"
                      onClick={() => disconnectDrive.mutate()}
                      disabled={disconnectDrive.isPending}
                    >
                      {disconnectDrive.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                      {driveQuery.data?.connected ? 'Disconnect' : 'Clear old setup'}
                    </Button>
                  )}
                </div>

                {!driveQuery.data?.connected && (
                  <div className="space-y-3 rounded-xl border border-border/50 p-4">
                    <p className="text-sm font-medium">New Google Cloud app for {DRIVE_ACCOUNT}</p>
                    <ol className="list-decimal pl-4 space-y-1.5 text-xs text-muted-foreground">
                      <li>
                        Open{' '}
                        <a
                          className="underline text-foreground"
                          href="https://console.cloud.google.com/"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Google Cloud Console
                        </a>{' '}
                        signed in as <strong className="text-foreground">{DRIVE_ACCOUNT}</strong>
                      </li>
                      <li>Create a <strong className="text-foreground">new project</strong> (do not open komalsmakeover-68050)</li>
                      <li>Enable <strong className="text-foreground">Google Drive API</strong></li>
                      <li>
                        OAuth consent screen → External → add test user <strong className="text-foreground">{DRIVE_ACCOUNT}</strong>
                      </li>
                      <li>
                        Credentials → Create OAuth client → Web application. Authorized redirect URI:
                        <code className="mt-1 block break-all rounded-md bg-muted px-2 py-1 text-[11px] text-foreground">
                          {driveQuery.data?.redirectUri || 'https://vanityvow.com/api/v1/settings/google-drive/callback'}
                        </code>
                      </li>
                      <li>Paste the new Client ID and Client secret below, then Connect. Allow access as {DRIVE_ACCOUNT}.</li>
                    </ol>
                    <div className="hidden" aria-hidden="true">
                      <input type="text" name="username" autoComplete="username" />
                      <input type="password" name="password" autoComplete="current-password" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Client ID</Label>
                      <Input
                        name="google-drive-client-id"
                        autoComplete="off"
                        spellCheck={false}
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="xxxxx.apps.googleusercontent.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Client secret</Label>
                      <Input
                        type="text"
                        name="google-drive-client-secret"
                        autoComplete="off"
                        spellCheck={false}
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        placeholder="GOCSPX-..."
                      />
                    </div>
                    <Button className="w-full sm:w-auto" onClick={connectDrive} disabled={connecting}>
                      {connecting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                      Connect Google Drive
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
