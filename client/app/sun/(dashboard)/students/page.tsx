'use client';

import { useState, useEffect, useRef } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Search, Pencil, Trash2, LayoutGrid, List, Loader2, Users, Wallet, CreditCard } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { studentsApi, batchesApi, dashboardApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Skeleton } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';

import { Pagination } from '@/components/ui/pagination';
import { useDebounce } from '@/hooks/useDebounce';

const schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  email: z.string().email().optional().or(z.literal('')),
  batch_id: z.string().optional(),
  city: z.string().optional(),
  fees_committed: z.string().optional(),
  age: z.string().optional(),
  designation: z.string().optional(),
  admission_date: z.string().optional(),
});

export default function StudentsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [batchId, setBatchId] = useState('all');
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'auto' | 'grid' | 'table'>('table');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const qc = useQueryClient();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, batchId]);

  const { data: batches } = useQuery({
    queryKey: ['batches-dropdown'],
    queryFn: async () => (await batchesApi.dropdown()).data.data,
  });

  const { data: batchSummary } = useQuery({
    queryKey: ['batch-summary-card', batchId],
    queryFn: async () => (await dashboardApi.summary(Number(batchId))).data.data,
    enabled: batchId !== 'all',
  });

  const { data: studentsResponse, isLoading } = useQuery({
    queryKey: ['students', debouncedSearch, batchId, page, limit],
    queryFn: async () =>
      (await studentsApi.list({
        search: debouncedSearch || undefined,
        batch_id: batchId === 'all' ? undefined : batchId,
        page,
        limit,
      })).data,
  });

  const allStudents = studentsResponse?.data || [];
  const meta = studentsResponse?.meta || { page: 1, limit: 10, total: 0, totalPages: 1 };
  const totalCount = meta.total;

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      batch_id: 'none',
      city: '',
      fees_committed: '',
      age: '',
      designation: '',
      admission_date: new Date().toISOString().slice(0, 10),
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) =>
      studentsApi.create({
        ...values,
        batch_id: values.batch_id && values.batch_id !== 'none' ? Number(values.batch_id) : null,
        fees_committed: values.fees_committed ? Number(values.fees_committed) : undefined,
        age: values.age ? Number(values.age) : undefined,
        designation: values.designation || undefined,
        admission_date: values.admission_date || undefined,
      }),
    onSuccess: () => {
      toast.success('Student created');
      qc.invalidateQueries({ queryKey: ['students-infinite'] });
      setOpen(false);
      form.reset({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        batch_id: 'none',
        city: '',
        fees_committed: '',
        age: '',
        designation: '',
        admission_date: new Date().toISOString().slice(0, 10),
      });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => studentsApi.remove(id),
    onSuccess: () => {
      toast.success('Student deleted');
      qc.invalidateQueries({ queryKey: ['students-infinite'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Students</h1>
          <p className="text-sm text-muted-foreground">Manage enrolled students and fees</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" /> Add Student</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader><DialogTitle>New Student</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>First name *</Label><Input {...form.register('first_name')} /></div>
                <div className="space-y-1"><Label>Last name</Label><Input {...form.register('last_name')} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Phone *</Label><Input {...form.register('phone')} /></div>
                <div className="space-y-1"><Label>Email</Label><Input {...form.register('email')} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Age</Label><Input type="number" placeholder="e.g. 24" {...form.register('age')} /></div>
                <div className="space-y-1"><Label>Designation</Label><Input placeholder="e.g. Student" {...form.register('designation')} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Date of Admission</Label><Input type="date" {...form.register('admission_date')} /></div>
                <div className="space-y-1"><Label>City</Label><Input {...form.register('city')} /></div>
              </div>
              <div className="space-y-1">
                <Label>Batch</Label>
                <Select
                  value={form.watch('batch_id') || 'none'}
                  onValueChange={(v) => {
                    form.setValue('batch_id', v);
                    if (v === 'none') {
                      form.setValue('fees_committed', '');
                    } else {
                      const selectedBatch = batches?.find((b) => String(b.id) === v);
                      if (selectedBatch) {
                        const feeToSet = selectedBatch.offer_fee ?? selectedBatch.course_fee;
                        if (feeToSet != null) {
                          form.setValue('fees_committed', String(feeToSet));
                        }
                      }
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {batches?.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name} ({formatCurrency(b.offer_fee ?? b.course_fee)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fees committed (₹)</Label>
                <Input type="number" step="0.01" placeholder="Auto-fetched when batch selected" {...form.register('fees_committed')} />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={createMutation.isPending}>Create Student</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">All Students</CardTitle>
              {totalCount > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({allStudents.length} of {totalCount})
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
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={batchId} onValueChange={(v) => setBatchId(v)}>
              <SelectTrigger className="w-[125px] sm:w-44 h-9 text-xs sm:text-sm shrink-0">
                <SelectValue placeholder="Batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All batches</SelectItem>
                {batches?.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {batchId !== 'all' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <Card className="bg-muted/20 border border-border/60 shadow-2xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">No. of Students</p>
                    <h3 className="text-xl font-bold mt-1 text-foreground">
                      {batchSummary?.total_students ?? totalCount}
                    </h3>
                  </div>
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/20 border border-border/60 shadow-2xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Total Fees Collected</p>
                    <h3 className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(batchSummary?.total_fees_collected ?? 0)}
                    </h3>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Wallet className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/20 border border-border/60 shadow-2xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Total Fees Committed</p>
                    <h3 className="text-xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                      {formatCurrency(batchSummary?.total_fees_committed ?? 0)}
                    </h3>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <CreditCard className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {isLoading ? (
            <div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}
              </div>
              <div className="hidden md:block space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            </div>
          ) : (
            <>
              {/* Responsive Card Grid View */}
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'
                  : viewMode === 'table'
                    ? 'hidden'
                    : 'grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden'
              }>
                {allStudents.map((s) => (
                  <div key={s.id} className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <Link href={`/sun/students/${s.id}`} className="font-semibold text-base hover:text-primary leading-tight block">
                          {s.first_name} {s.last_name}
                        </Link>
                        <span className="inline-block font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {s.student_code}
                        </span>
                      </div>
                      <Badge variant={s.status === 'active' ? 'success' : 'secondary'}>{s.status}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                      <div>
                        <span className="text-muted-foreground block">Phone</span>
                        <span className="font-medium">{s.phone}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Batch</span>
                        <span className="font-medium truncate block">{s.batch_name || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Paid</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(s.fees_paid)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Pending</span>
                        <span className={Number(s.pending_fees) > 0 ? "font-semibold text-amber-600 dark:text-amber-400" : "font-medium"}>
                          {formatCurrency(s.pending_fees)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                      <Button variant="outline" size="sm" asChild className="h-8 text-xs">
                        <Link href={`/sun/students/${s.id}`}>
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm('Delete this student?')) deleteMutation.mutate(s.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                ))}
                {!allStudents.length && (
                  <div className="py-8 text-center text-muted-foreground col-span-full">No students found</div>
                )}
              </div>

              {/* Responsive Table View */}
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
                      <th className="pb-3 pr-3 font-medium">Code</th>
                      <th className="pb-3 pr-3 font-medium">Name</th>
                      <th className="pb-3 pr-3 font-medium">Phone</th>
                      <th className="pb-3 pr-3 font-medium">Batch</th>
                      <th className="pb-3 pr-3 font-medium">Paid</th>
                      <th className="pb-3 pr-3 font-medium">Pending</th>
                      <th className="pb-3 pr-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allStudents.map((s) => (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-muted/40">
                        <td className="py-3 pr-3 font-mono text-xs">{s.student_code}</td>
                        <td className="py-3 pr-3">
                          <Link href={`/sun/students/${s.id}`} className="font-medium hover:text-primary">
                            {s.first_name} {s.last_name}
                          </Link>
                        </td>
                        <td className="py-3 pr-3">{s.phone}</td>
                        <td className="py-3 pr-3">{s.batch_name || '—'}</td>
                        <td className="py-3 pr-3 font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(s.fees_paid)}</td>
                        <td className="py-3 pr-3 font-medium">{formatCurrency(s.pending_fees)}</td>
                        <td className="py-3 pr-3"><Badge variant={s.status === 'active' ? 'success' : 'secondary'}>{s.status}</Badge></td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/sun/students/${s.id}`}><Pencil className="h-4 w-4" /></Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm('Delete this student?')) deleteMutation.mutate(s.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!allStudents.length && (
                      <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No students found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                limit={meta.limit}
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
