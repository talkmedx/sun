'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { vendorsApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';
import { useState } from 'react';

export default function VendorDetailPage() {
  const id = Number(useParams().id);
  const qc = useQueryClient();
  const [tab, setTab] = useState<'credits' | 'expenses'>('credits');
  const form = useForm({
    defaultValues: { amount: '', description: '', transaction_date: new Date().toISOString().slice(0, 10) },
  });

  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor', id],
    queryFn: async () => (await vendorsApi.get(id)).data.data,
  });

  const { data: credits } = useQuery({
    queryKey: ['vendor-credits', id],
    queryFn: async () => (await vendorsApi.credits(id)).data.data,
    enabled: tab === 'credits',
  });

  const { data: expenses } = useQuery({
    queryKey: ['vendor-expenses', id],
    queryFn: async () => (await vendorsApi.expenses(id)).data.data,
    enabled: tab === 'expenses',
  });

  const addCredit = useMutation({
    mutationFn: (v: Record<string, string>) => vendorsApi.addCredit(id, { ...v, amount: Number(v.amount) }),
    onSuccess: () => {
      toast.success('Credit added');
      qc.invalidateQueries({ queryKey: ['vendor', id] });
      qc.invalidateQueries({ queryKey: ['vendor-credits', id] });
      form.reset();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!vendor) return <p>Not found</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{vendor.name}</h1>
        <p className="text-sm text-muted-foreground">{vendor.contact_person} · {vendor.phone}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending Credit</p><p className="text-xl font-semibold">{formatCurrency(vendor.pending_credit)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">City</p><p className="text-xl font-semibold">{vendor.city || '—'}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Email</p><p className="truncate text-lg font-semibold">{vendor.email || '—'}</p></CardContent></Card>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant={tab === 'credits' ? 'default' : 'outline'} onClick={() => setTab('credits')}>Credits</Button>
        <Button size="sm" variant={tab === 'expenses' ? 'default' : 'outline'} onClick={() => setTab('expenses')}>Expenses</Button>
      </div>

      {tab === 'credits' && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Add Credit</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit((v) => addCredit.mutate(v))} className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1"><Label>Amount</Label><Input type="number" {...form.register('amount', { required: true })} /></div>
                <div className="space-y-1"><Label>Date</Label><Input type="date" {...form.register('transaction_date')} /></div>
                <div className="space-y-1"><Label>Description</Label><Input {...form.register('description')} /></div>
                <div className="flex items-end"><Button type="submit" className="w-full">Add</Button></div>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Credit History</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2">Date</th><th className="pb-2">Type</th><th className="pb-2">Amount</th><th className="pb-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {(credits as Array<Record<string, unknown>> | undefined)?.map((c) => (
                    <tr key={String(c.id)} className="border-b border-border/50">
                      <td className="py-2">{formatDate(String(c.transaction_date))}</td>
                      <td className="py-2">{String(c.type)}</td>
                      <td className="py-2">{formatCurrency(Number(c.amount))}</td>
                      <td className="py-2">{String(c.description || '—')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {tab === 'expenses' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Expense History</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2">Title</th><th className="pb-2">Amount</th><th className="pb-2">Date</th><th className="pb-2">Batch</th>
                </tr>
              </thead>
              <tbody>
                {(expenses as Array<Record<string, unknown>> | undefined)?.map((e) => (
                  <tr key={String(e.id)} className="border-b border-border/50">
                    <td className="py-2">{String(e.title)}</td>
                    <td className="py-2">{formatCurrency(Number(e.amount))}</td>
                    <td className="py-2">{formatDate(String(e.expense_date))}</td>
                    <td className="py-2">{String(e.batch_name || '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
