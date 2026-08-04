'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { productsApi, vendorsApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Skeleton } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const form = useForm({
    defaultValues: {
      name: '', sku: '', cost_price: '', selling_price: '',
      quantity_available: '0', vendor_id: '', description: '',
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: async () => (await vendorsApi.list({ limit: 100 })).data.data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, page],
    queryFn: async () => (await productsApi.list({ search: search || undefined, page, limit: 20 })).data,
  });

  const createMutation = useMutation({
    mutationFn: (v: Record<string, string>) =>
      productsApi.create({
        ...v,
        cost_price: Number(v.cost_price),
        selling_price: Number(v.selling_price),
        quantity_available: Number(v.quantity_available || 0),
        vendor_id: v.vendor_id ? Number(v.vendor_id) : null,
      }),
    onSuccess: () => {
      toast.success('Product created');
      qc.invalidateQueries({ queryKey: ['products'] });
      setOpen(false);
      form.reset();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productsApi.remove(id),
    onSuccess: () => {
      toast.success('Product deleted');
      qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">Inventory with historical pricing</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add Product</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Product</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-3">
              <div className="space-y-1"><Label>Name</Label><Input {...form.register('name', { required: true })} /></div>
              <div className="space-y-1"><Label>SKU</Label><Input {...form.register('sku')} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Cost price</Label><Input type="number" {...form.register('cost_price', { required: true })} /></div>
                <div className="space-y-1"><Label>Selling price</Label><Input type="number" {...form.register('selling_price', { required: true })} /></div>
              </div>
              <div className="space-y-1"><Label>Quantity</Label><Input type="number" {...form.register('quantity_available')} /></div>
              <div className="space-y-1">
                <Label>Vendor</Label>
                <Select onValueChange={(v) => form.setValue('vendor_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {vendors?.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Description</Label><Textarea {...form.register('description')} /></div>
              <Button type="submit" className="w-full">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <CardTitle className="text-base flex-1">Inventory</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9 w-56" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-40 w-full" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3">Product</th><th className="pb-3">Cost</th><th className="pb-3">Sell</th>
                    <th className="pb-3">Profit %</th><th className="pb-3">Stock</th><th className="pb-3">Sold</th>
                    <th className="pb-3">Value</th><th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.map((p) => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-3">
                        <Link href={`/sun/products/${p.id}`} className="font-medium hover:text-primary">{p.name}</Link>
                        {p.quantity_available <= p.low_stock_threshold && (
                          <Badge variant="warning" className="ml-2">Low</Badge>
                        )}
                      </td>
                      <td className="py-3">{formatCurrency(p.cost_price)}</td>
                      <td className="py-3">{formatCurrency(p.selling_price)}</td>
                      <td className="py-3">{Number(p.profit_percent || 0).toFixed(1)}%</td>
                      <td className="py-3">{p.quantity_available}</td>
                      <td className="py-3">{p.quantity_sold}</td>
                      <td className="py-3">{formatCurrency(p.stock_value)}</td>
                      <td className="py-3">
                        <Button variant="ghost" size="icon" onClick={() => confirm('Delete? Blocked if sold.') && deleteMutation.mutate(p.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
