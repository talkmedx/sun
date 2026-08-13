'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Shield, Search, LayoutGrid, List, Loader2, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usersApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Skeleton } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/store';
import { getErrorMessage } from '@/lib/api';
import { isSuperAdmin, ROLE_DESCRIPTIONS } from '@/lib/permissions';
import { User } from '@/types';
import { Pagination } from '@/components/ui/pagination';
import { useDebounce } from '@/hooks/useDebounce';

const roleBadge = (role: string) =>
  (role === 'super_admin' ? 'default' : 'secondary') as 'default' | 'secondary';

const roleLabel = (role: string) =>
  (role === 'super_admin' ? 'Super Admin' : 'Staff Member');

type UserFormValues = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
};

const emptyForm: UserFormValues = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'staff',
};

function RequiredMark() {
  return <span className="text-destructive"> *</span>;
}

function PasswordCell({ password }: { password?: string | null }) {
  const [visible, setVisible] = useState(false);

  if (!password) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <span className="font-mono text-xs truncate max-w-[120px]">
        {visible ? password : '•'.repeat(Math.max(8, Math.min(password.length, 12)))}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground"
        title={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

function PasswordInput({
  registerReturn,
  visible,
  onToggle,
  placeholder,
}: {
  registerReturn: ReturnType<ReturnType<typeof useForm<UserFormValues>>['register']>;
  visible: boolean;
  onToggle: () => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} placeholder={placeholder} {...registerReturn} />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        onClick={onToggle}
        tabIndex={-1}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function RolesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'auto' | 'grid' | 'table'>('table');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  useEffect(() => {
    if (user && !isSuperAdmin(user.role)) {
      router.replace('/sun/dashboard');
    }
  }, [user, router]);

  const form = useForm<UserFormValues>({ defaultValues: emptyForm });
  const editForm = useForm<UserFormValues>({ defaultValues: emptyForm });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await usersApi.list()).data.data,
    enabled: isSuperAdmin(user?.role),
  });

  const filteredUsers = (users || []).filter((u) => {
    const matchesSearch =
      !debouncedSearch ||
      u.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(debouncedSearch.toLowerCase());
    const normalizedRole = u.role === 'super_admin' ? 'super_admin' : 'staff';
    const matchesRole = roleFilter === 'all' || normalizedRole === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalCount = filteredUsers.length;
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const displayedUsers = filteredUsers.slice((page - 1) * limit, page * limit);
  const superAdminCount = (users || []).filter((u) => u.role === 'super_admin').length;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter]);

  const createUser = useMutation({
    mutationFn: (v: UserFormValues) =>
      usersApi.createUser({
        name: v.name,
        email: v.email,
        phone: v.phone || undefined,
        password: v.password,
        role: v.role,
      }),
    onSuccess: () => {
      toast.success('User created');
      form.reset(emptyForm);
      setShowAddPassword(false);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, v }: { id: number; v: UserFormValues }) =>
      usersApi.updateUser(id, {
        name: v.name,
        email: v.email,
        phone: v.phone || undefined,
        password: v.password || undefined,
        role: v.role,
      }),
    onSuccess: () => {
      toast.success('User updated');
      setEditOpen(false);
      setEditingUser(null);
      setShowEditPassword(false);
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

  const deleteUser = useMutation({
    mutationFn: (id: number) => usersApi.deleteUser(id),
    onSuccess: () => {
      toast.success('User deleted');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const openEdit = (u: User) => {
    setEditingUser(u);
    editForm.reset({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      password: '',
      role: u.role === 'super_admin' ? 'super_admin' : 'staff',
    });
    setShowEditPassword(false);
    setEditOpen(true);
  };

  const canDelete = (u: User) => {
    if (u.id === user?.id) return false;
    if (u.role === 'super_admin' && superAdminCount <= 1) return false;
    return true;
  };

  const renderActions = (u: User, compact = false) => (
    <div className={`flex items-center ${compact ? 'justify-end gap-1' : 'gap-1.5'}`}>
      <Button
        size={compact ? 'icon' : 'sm'}
        variant={compact ? 'ghost' : 'outline'}
        className={compact ? 'h-8 w-8' : 'h-8 text-xs px-2.5'}
        title="Edit"
        onClick={() => openEdit(u)}
      >
        <Pencil className={compact ? 'h-4 w-4' : 'h-3.5 w-3.5 mr-1'} />
        {!compact && 'Edit'}
      </Button>
      {canDelete(u) && (
        <Button
          size={compact ? 'icon' : 'sm'}
          variant={compact ? 'ghost' : 'outline'}
          className={
            compact
              ? 'h-8 w-8 text-destructive hover:text-destructive'
              : 'h-8 text-xs px-2.5 text-destructive hover:bg-destructive/10'
          }
          title="Delete"
          onClick={() => {
            if (confirm(`Delete user "${u.name}"?`)) deleteUser.mutate(u.id);
          }}
        >
          <Trash2 className={compact ? 'h-4 w-4' : 'h-3.5 w-3.5 mr-1'} />
          {!compact && 'Delete'}
        </Button>
      )}
      {u.role !== 'super_admin' && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs px-2.5"
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
    </div>
  );

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
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) {
              form.reset(emptyForm);
              setShowAddPassword(false);
            }
          }}
        >
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
              onSubmit={form.handleSubmit((v) => createUser.mutate(v))}
              className="space-y-3"
            >
              <div className="space-y-1">
                <Label>Name<RequiredMark /></Label>
                <Input {...form.register('name', { required: true })} />
              </div>
              <div className="space-y-1">
                <Label>Email<RequiredMark /></Label>
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
                <Label>Password<RequiredMark /></Label>
                <PasswordInput
                  registerReturn={form.register('password', { required: true, minLength: 8 })}
                  visible={showAddPassword}
                  onToggle={() => setShowAddPassword((v) => !v)}
                  placeholder="At least 8 characters"
                />
              </div>
              <div className="space-y-1">
                <Label>Role<RequiredMark /></Label>
                <Select
                  value={form.watch('role')}
                  onValueChange={(v) => form.setValue('role', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="staff">Staff Member</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Super Admin: full access including roles. Staff Member: Students, Products, Expenses, and Admissions.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={createUser.isPending}>
                {createUser.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                Create user
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
                <SelectItem value="staff">Staff Member</SelectItem>
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
                        <Badge variant={roleBadge(u.role)}>{roleLabel(u.role)}</Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Password</span>
                        <PasswordCell password={u.password} />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/50">
                      {renderActions(u)}
                    </div>
                  </div>
                ))}
                {!displayedUsers.length && (
                  <div className="py-8 text-center text-muted-foreground col-span-full">No users found</div>
                )}
              </div>

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
                      <th className="pb-3 pr-3 font-medium">Password</th>
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
                          <PasswordCell password={u.password} />
                        </td>
                        <td className="py-3 pr-3">
                          <Badge variant={roleBadge(u.role)}>{roleLabel(u.role)}</Badge>
                        </td>
                        <td className="py-3 pr-3">
                          <Badge variant={u.is_active ? 'success' : 'destructive'}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3">
                          {renderActions(u, true)}
                        </td>
                      </tr>
                    ))}
                    {!displayedUsers.length && (
                      <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

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

      <Dialog
        open={editOpen}
        onOpenChange={(next) => {
          setEditOpen(next);
          if (!next) {
            setEditingUser(null);
            setShowEditPassword(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit team member</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit((v) => {
              if (!editingUser) return;
              updateUser.mutate({ id: editingUser.id, v });
            })}
            className="space-y-3"
          >
            <div className="space-y-1">
              <Label>Name<RequiredMark /></Label>
              <Input {...editForm.register('name', { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>Email<RequiredMark /></Label>
              <Input type="email" {...editForm.register('email', { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input
                type="tel"
                maxLength={10}
                placeholder="10-digit mobile"
                {...editForm.register('phone')}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  editForm.setValue('phone', val, { shouldValidate: true });
                }}
              />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <PasswordInput
                registerReturn={editForm.register('password', { minLength: 8 })}
                visible={showEditPassword}
                onToggle={() => setShowEditPassword((v) => !v)}
                placeholder="Leave blank to keep current"
              />
            </div>
            <div className="space-y-1">
              <Label>Role<RequiredMark /></Label>
              <Select
                value={editForm.watch('role')}
                onValueChange={(v) => editForm.setValue('role', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="staff">Staff Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={updateUser.isPending}>
              {updateUser.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Save changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
