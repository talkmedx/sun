'use client';

import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Shield } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usersApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/store';
import { getErrorMessage } from '@/lib/api';
import { isSuperAdmin, ROLE_DESCRIPTIONS } from '@/lib/permissions';
import { useState } from 'react';

const roleBadge = (role: string) => {
  if (role === 'super_admin') return 'default' as const;
  if (role === 'admin') return 'warning' as const;
  return 'secondary' as const;
};

const roleLabel = (role: string) => {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'admin') return 'Admin';
  if (role === 'staff') return 'Staff Member';
  return role;
};

export default function RolesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user && !isSuperAdmin(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const form = useForm({
    defaultValues: { name: '', email: '', phone: '', password: '', role: 'staff' },
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await usersApi.list()).data.data,
    enabled: isSuperAdmin(user?.role),
  });

  const createUser = useMutation({
    mutationFn: (v: {
      name: string;
      email: string;
      phone?: string;
      password: string;
      role: string;
    }) => usersApi.createUser(v),
    onSuccess: () => {
      toast.success('User created');
      form.reset({ name: '', email: '', phone: '', password: '', role: 'staff' });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => usersApi.updateRole(id, role),
    onSuccess: () => {
      toast.success('Role updated');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      usersApi.setActive(id, is_active),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (!isSuperAdmin(user?.role)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Roles</h1>
          <p className="text-sm text-muted-foreground">
            Manage team members and assign access roles
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Add Role / User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add team member with role</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={form.handleSubmit((v) =>
                createUser.mutate({
                  name: v.name,
                  email: v.email,
                  phone: v.phone || undefined,
                  password: v.password,
                  role: v.role,
                })
              )}
              className="space-y-3"
            >
              <div className="space-y-1">
                <Label>Name</Label>
                <Input {...form.register('name', { required: true })} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" {...form.register('email', { required: true })} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input {...form.register('phone')} />
              </div>
              <div className="space-y-1">
                <Label>Password</Label>
                <Input
                  type="password"
                  {...form.register('password', { required: true, minLength: 8 })}
                />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Select
                  defaultValue="staff"
                  onValueChange={(v) => form.setValue('role', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Staff: Expenses, Vendors, Products, Admissions only. Admin: full access.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={createUser.isPending}>
                Create user
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {ROLE_DESCRIPTIONS.map((r) => (
          <Card key={r.key}>
            <CardContent className="flex items-start gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-sm">{r.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team & Roles</CardTitle>
          <CardDescription>All users with assigned roles</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-3">Name</th>
                    <th className="pb-3 pr-3">Email</th>
                    <th className="pb-3 pr-3">Role</th>
                    <th className="pb-3 pr-3">Status</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((u) => (
                    <tr key={u.id} className="border-b border-border/50">
                      <td className="py-3 pr-3 font-medium">{u.name}</td>
                      <td className="py-3 pr-3">{u.email}</td>
                      <td className="py-3 pr-3">
                        {u.role === 'super_admin' ? (
                          <Badge variant={roleBadge(u.role)}>{roleLabel(u.role)}</Badge>
                        ) : (
                          <Select
                            value={u.role}
                            onValueChange={(role) => updateRole.mutate({ id: u.id, role })}
                          >
                            <SelectTrigger className="h-8 w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="staff">Staff Member</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <Badge variant={u.is_active ? 'success' : 'destructive'}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {u.role !== 'super_admin' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              toggleActive.mutate({
                                id: u.id,
                                is_active: !u.is_active,
                              })
                            }
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
