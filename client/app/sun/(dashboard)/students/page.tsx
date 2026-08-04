'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { studentsApi, batchesApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Skeleton } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';

const schema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().optional(),
  phone: z.string().min(10),
  email: z.string().email().optional().or(z.literal('')),
  batch_id: z.string().optional(),
  city: z.string().optional(),
  fees_committed: z.string().optional(),
});

export default function StudentsPage() {
  const [search, setSearch] = useState('');
  const [batchId, setBatchId] = useState('all');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: batches } = useQuery({
    queryKey: ['batches-dropdown'],
    queryFn: async () => (await batchesApi.dropdown()).data.data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['students', search, batchId, page],
    queryFn: async () =>
      (await studentsApi.list({
        search: search || undefined,
        batch_id: batchId === 'all' ? undefined : batchId,
        page,
        limit: 20,
      })).data,
  });

  const form = useForm({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) =>
      studentsApi.create({
        ...values,
        batch_id: values.batch_id ? Number(values.batch_id) : null,
        fees_committed: values.fees_committed ? Number(values.fees_committed) : undefined,
      }),
    onSuccess: () => {
      toast.success('Student created');
      qc.invalidateQueries({ queryKey: ['students'] });
      setOpen(false);
      form.reset();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => studentsApi.remove(id),
    onSuccess: () => {
      toast.success('Student deleted');
      qc.invalidateQueries({ queryKey: ['students'] });
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
            <Button><Plus className="h-4 w-4" /> Add Student</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Student</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>First name</Label><Input {...form.register('first_name')} /></div>
                <div className="space-y-1"><Label>Last name</Label><Input {...form.register('last_name')} /></div>
              </div>
              <div className="space-y-1"><Label>Phone</Label><Input {...form.register('phone')} /></div>
              <div className="space-y-1"><Label>Email</Label><Input {...form.register('email')} /></div>
              <div className="space-y-1"><Label>City</Label><Input {...form.register('city')} /></div>
              <div className="space-y-1">
                <Label>Batch</Label>
                <Select onValueChange={(v) => form.setValue('batch_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                  <SelectContent>
                    {batches?.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Fees committed</Label><Input type="number" {...form.register('fees_committed')} /></div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <CardTitle className="text-base flex-1">All Students</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9 w-full sm:w-56" placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={batchId} onValueChange={(v) => { setBatchId(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All batches</SelectItem>
                {batches?.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
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
                  {data?.data?.map((s) => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-muted/40">
                      <td className="py-3 pr-3 font-mono text-xs">{s.student_code}</td>
                      <td className="py-3 pr-3">
                        <Link href={`/sun/students/${s.id}`} className="font-medium hover:text-primary">
                          {s.first_name} {s.last_name}
                        </Link>
                      </td>
                      <td className="py-3 pr-3">{s.phone}</td>
                      <td className="py-3 pr-3">{s.batch_name || '—'}</td>
                      <td className="py-3 pr-3">{formatCurrency(s.fees_paid)}</td>
                      <td className="py-3 pr-3">{formatCurrency(s.pending_fees)}</td>
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
                  {!data?.data?.length && (
                    <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No students found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total {data.meta.total}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                <span className="px-2 py-1">{page} / {data.meta.totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
