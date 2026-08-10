'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Shield, Search, LayoutGrid, List, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usersApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Skeleton } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/store';
import { getErrorMessage } from '@/lib/api';
import { isSuperAdmin, ROLE_DESCRIPTIONS } from '@/lib/permissions';

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

import { Pagination } from '@/components/ui/pagination';
import { useDebounce } from '@/hooks/useDebounce';

export default function RolesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'auto' | 'grid' | 'table'>('table');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    if (user && !isSuperAdmin(user.role)) {
      router.replace('/sun/dashboard');
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

  // Filter users based on search and role
  const filteredUsers = (users || []).filter((u) => {
    const matchesSearch =
      !debouncedSearch ||
      u.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalCount = filteredUsers.length;
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const displayedUsers = filteredUsers.slice((page - 1) * limit, page * limit);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter]);

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
              <Plus className="h-4 w-4 mr-1.5" /> Add Role / User
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
                <Input
                  type="tel"
                  maxLength={10}
                  placeholder="10-digit mobile"
                  {...form.register('phone')}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    form.setValue('phone', val, { shouldValidate: true });
                  }}
                />
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
        <CardHeader className="p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Team & Roles</CardTitle>
              {filteredUsers.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({displayedUsers.length} of {filteredUsers.length})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/20 shrink-0">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8"
                title="Grid view"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8"
                title="Table view"
                onClick={() => setViewMode('table')}
              >
                <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8 h-9 text-xs sm:text-sm w-full"
                placeholder="Search team members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[125px] sm:w-40 h-9 text-xs sm:text-sm shrink-0">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
              </div>
              <div className="hidden md:block space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Card Grid View */}
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'
                  : viewMode === 'table'
                  ? 'hidden'
                  : 'grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden'
              }>
                {displayedUsers.map((u) => (
                  <div key={u.id} className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-base leading-tight">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <Badge variant={u.is_active ? 'success' : 'destructive'}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                      <div>
                        <span className="text-muted-foreground block">Role</span>
                        {u.role === 'super_admin' ? (
                          <Badge variant={roleBadge(u.role)}>{roleLabel(u.role)}</Badge>
                        ) : (
                          <Select
                            value={u.role}
                            onValueChange={(role) => updateRole.mutate({ id: u.id, role })}
                          >
                            <SelectTrigger className="h-7 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Phone</span>
                        <span className="font-medium truncate block">{u.phone || '—'}</span>
                      </div>
                    </div>

                    {u.role !== 'super_admin' && (
                      <div className="flex items-center justify-end pt-2 border-t border-border/50">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs px-3"
                          onClick={() =>
                            toggleActive.mutate({
                              id: u.id,
                              is_active: !u.is_active,
                            })
                          }
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {!displayedUsers.length && (
                  <div className="py-8 text-center text-muted-foreground col-span-full">No users found</div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className={
                viewMode === 'table'
                  ? 'overflow-x-auto'
                  : viewMode === 'grid'
                  ? 'hidden'
                  : 'hidden md:block overflow-x-auto'
              }>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 pr-3 font-medium">Name</th>
                      <th className="pb-3 pr-3 font-medium">Email</th>
                      <th className="pb-3 pr-3 font-medium">Role</th>
                      <th className="pb-3 pr-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedUsers.map((u) => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-muted/40">
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
                    {!displayedUsers.length && (
                      <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <Pagination
                page={page}
                totalPages={totalPages}
                total={totalCount}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={setLimit}
                className="mt-4"
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
