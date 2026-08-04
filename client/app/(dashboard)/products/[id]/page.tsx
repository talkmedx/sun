'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { productsApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';

export default function ProductDetailPage() {
  const id = Number(useParams().id);
  const qc = useQueryClient();
  const priceForm = useForm({ defaultValues: { cost_price: '', selling_price: '', change_reason: '' } });
  const stockForm = useForm({ defaultValues: { quantity: '1', type: 'add' as 'add' | 'remove' } });

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => (await productsApi.get(id)).data.data,
  });

  const { data: history } = useQuery({
    queryKey: ['product-history', id],
    queryFn: async () => (await productsApi.priceHistory(id)).data.data,
  });

  const updatePrice = useMutation({
    mutationFn: (v: Record<string, string>) =>
      productsApi.update(id, {
        cost_price: Number(v.cost_price),
        selling_price: Number(v.selling_price),
        change_reason: v.change_reason,
      }),
    onSuccess: () => {
      toast.success('Price updated (history preserved)');
      qc.invalidateQueries({ queryKey: ['product', id] });
      qc.invalidateQueries({ queryKey: ['product-history', id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const adjustStock = useMutation({
    mutationFn: (v: { quantity: string; type: 'add' | 'remove' }) =>
      productsApi.stock(id, Number(v.quantity), v.type),
    onSuccess: () => {
      toast.success('Stock updated');
      qc.invalidateQueries({ queryKey: ['product', id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!product) return <p>Not found</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{product.name}</h1>
        <p className="text-sm text-muted-foreground">{product.sku || 'No SKU'} · {product.vendor_name || 'No vendor'}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Cost</p><p className="text-xl font-semibold">{formatCurrency(product.cost_price)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Selling</p><p className="text-xl font-semibold">{formatCurrency(product.selling_price)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Available</p><p className="text-xl font-semibold">{product.quantity_available}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Sold</p><p className="text-xl font-semibold">{product.quantity_sold}</p></CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Update Price</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              Changing price never affects already sold products. A new history row is created.
            </p>
            <form
              onSubmit={priceForm.handleSubmit((v) => updatePrice.mutate(v))}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Cost</Label><Input type="number" defaultValue={product.cost_price} {...priceForm.register('cost_price')} /></div>
                <div className="space-y-1"><Label>Selling</Label><Input type="number" defaultValue={product.selling_price} {...priceForm.register('selling_price')} /></div>
              </div>
              <div className="space-y-1"><Label>Reason</Label><Input {...priceForm.register('change_reason')} /></div>
              <Button type="submit">Update price</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Adjust Stock</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={stockForm.handleSubmit((v) => adjustStock.mutate(v))} className="space-y-3">
              <div className="space-y-1"><Label>Quantity</Label><Input type="number" {...stockForm.register('quantity')} /></div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => stockForm.setValue('type', 'add')}>Add</Button>
                <Button type="button" variant="outline" onClick={() => stockForm.setValue('type', 'remove')}>Remove</Button>
              </div>
              <Button type="submit">Apply ({stockForm.watch('type')})</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Price History</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2">From</th><th className="pb-2">To</th><th className="pb-2">Cost</th>
                <th className="pb-2">Sell</th><th className="pb-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {(history as Array<Record<string, unknown>> | undefined)?.map((h) => (
                <tr key={String(h.id)} className="border-b border-border/50">
                  <td className="py-2">{formatDate(String(h.effective_from))}</td>
                  <td className="py-2">{h.effective_to ? formatDate(String(h.effective_to)) : 'Current'}</td>
                  <td className="py-2">{formatCurrency(Number(h.cost_price))}</td>
                  <td className="py-2">{formatCurrency(Number(h.selling_price))}</td>
                  <td className="py-2">{String(h.change_reason || '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
