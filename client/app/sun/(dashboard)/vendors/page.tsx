'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { vendorsApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Skeleton } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';

export default function VendorsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const form = useForm({ defaultValues: { name: '', phone: '', email: '', contact_person: '', city: '' } });

  const { data, isLoading } = useQuery({
    queryKey: ['vendors', search, page],
    queryFn: async () => (await vendorsApi.list({ search: search || undefined, page, limit: 20 })).data,
  });

  const createMutation = useMutation({
    mutationFn: (v: Record<string, string>) => vendorsApi.create(v),
    onSuccess: () => {
      toast.success('Vendor created');
      qc.invalidateQueries({ queryKey: ['vendors'] });
      setOpen(false);
      form.reset();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Vendors</h1>
          <p className="text-sm text-muted-foreground">Suppliers, credits & bills</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add Vendor</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Vendor</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-3">
              <div className="space-y-1"><Label>Name</Label><Input {...form.register('name', { required: true })} /></div>
              <div className="space-y-1"><Label>Phone</Label><Input {...form.register('phone', { required: true })} /></div>
              <div className="space-y-1"><Label>Contact person</Label><Input {...form.register('contact_person')} /></div>
              <div className="space-y-1"><Label>Email</Label><Input {...form.register('email')} /></div>
              <div className="space-y-1"><Label>City</Label><Input {...form.register('city')} /></div>
              <Button type="submit" className="w-full">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <CardTitle className="text-base flex-1">Vendor List</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9 w-56" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-40 w-full" /> : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data?.data?.map((v) => (
                <Link key={v.id} href={`/sun/vendors/${v.id}`}>
                  <Card className="h-full transition hover:border-primary/30">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start justify-between">
                        <p className="font-medium">{v.name}</p>
                        <Badge variant={v.is_active ? 'success' : 'secondary'}>{v.is_active ? 'Active' : 'Inactive'}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{v.phone}</p>
                      <p className="text-sm">{v.city || '—'}</p>
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        Pending credit: {formatCurrency(v.pending_credit)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
