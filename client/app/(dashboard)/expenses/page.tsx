'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { expensesApi, batchesApi, vendorsApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';

export default function ExpensesPage() {
  const [search, setSearch] = useState('');
  const [batchId, setBatchId] = useState('all');
  const [vendorId, setVendorId] = useState('all');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [useCredit, setUseCredit] = useState(false);
  const qc = useQueryClient();
  const form = useForm({
    defaultValues: {
      title: '', description: '', amount: '', category: '', batch_id: '', vendor_id: '',
      expense_date: new Date().toISOString().slice(0, 10), payment_mode: 'cash',
    },
  });

  const { data: batches } = useQuery({ queryKey: ['batches-dropdown'], queryFn: async () => (await batchesApi.dropdown()).data.data });
  const { data: vendors } = useQuery({ queryKey: ['vendors-list'], queryFn: async () => (await vendorsApi.list({ limit: 100 })).data.data });

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', search, batchId, vendorId, page],
    queryFn: async () =>
      (await expensesApi.list({
        search: search || undefined,
        batch_id: batchId === 'all' ? undefined : batchId,
        vendor_id: vendorId === 'all' ? undefined : vendorId,
        page,
        limit: 20,
      })).data,
  });

  const createMutation = useMutation({
    mutationFn: (v: Record<string, string>) => {
      const fd = new FormData();
      Object.entries(v).forEach(([k, val]) => { if (val) fd.append(k, val); });
      if (useCredit) {
        fd.append('use_vendor_credit', 'true');
        fd.set('payment_mode', 'vendor_credit');
      }
      return expensesApi.create(fd);
    },
    onSuccess: () => {
      toast.success('Expense added');
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['vendors'] });
      setOpen(false);
      form.reset();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => expensesApi.remove(id),
    onSuccess: () => {
      toast.success('Expense deleted');
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Expenses</h1>
          <p className="text-sm text-muted-foreground">Track spending & vendor credits</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add Expense</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Expense</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-3">
              <div className="space-y-1"><Label>Title</Label><Input {...form.register('title', { required: true })} /></div>
              <div className="space-y-1"><Label>Amount</Label><Input type="number" step="0.01" {...form.register('amount', { required: true })} /></div>
              <div className="space-y-1"><Label>Category</Label><Input {...form.register('category')} /></div>
              <div className="space-y-1"><Label>Date</Label><Input type="date" {...form.register('expense_date')} /></div>
              <div className="space-y-1">
                <Label>Batch</Label>
                <Select onValueChange={(v) => form.setValue('batch_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {batches?.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Vendor</Label>
                <Select onValueChange={(v) => form.setValue('vendor_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {vendors?.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.name} (credit ₹{v.pending_credit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} />
                Use vendor credit (auto-reduces pending credit)
              </label>
              <div className="space-y-1"><Label>Notes</Label><Textarea {...form.register('description')} /></div>
              <Button type="submit" className="w-full">Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row">
          <CardTitle className="text-base flex-1">Expense List</CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9 w-48" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />
            </div>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All batches</SelectItem>
                {batches?.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All vendors</SelectItem>
                {vendors?.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-40 w-full" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3">Title</th><th className="pb-3">Amount</th><th className="pb-3">Batch</th>
                    <th className="pb-3">Vendor</th><th className="pb-3">Date</th><th className="pb-3">Mode</th><th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.map((e) => (
                    <tr key={e.id} className="border-b border-border/50">
                      <td className="py-3 font-medium">{e.title}</td>
                      <td className="py-3">{formatCurrency(e.amount)}</td>
                      <td className="py-3">{e.batch_name || '—'}</td>
                      <td className="py-3">{e.vendor_name || '—'}</td>
                      <td className="py-3">{formatDate(e.expense_date)}</td>
                      <td className="py-3">{e.payment_mode}</td>
                      <td className="py-3">
                        <Button variant="ghost" size="icon" onClick={() => confirm('Delete?') && deleteMutation.mutate(e.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
