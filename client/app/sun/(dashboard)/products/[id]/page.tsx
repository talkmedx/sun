'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { productsApi, vendorsApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store';

export default function ProductDetailPage() {
  const id = Number(useParams().id);
  const qc = useQueryClient();
  const isStaff = useAuthStore((s) => s.user?.role) === 'staff';
  
  const [editOpen, setEditOpen] = useState(false);
  const [stockType, setStockType] = useState<'add' | 'remove'>('add');

  const priceForm = useForm({ defaultValues: { cost_price: '', selling_price: '', change_reason: '' } });
  const stockForm = useForm({ defaultValues: { quantity: '1', type: 'add' as 'add' | 'remove' } });

  const editForm = useForm({
    defaultValues: {
      name: '',
      vendor_id: 'none',
      cost_price: '',
      selling_price: '',
      quantity_available: '0',
      sku: '',
      description: '',
    },
  });

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => (await productsApi.get(id)).data.data,
  });

  const { data: history } = useQuery({
    queryKey: ['product-history', id],
    queryFn: async () => (await productsApi.priceHistory(id)).data.data,
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: async () => (await vendorsApi.list({ limit: 100 })).data.data,
  });

  const handleEditClick = () => {
    if (!product) return;
    editForm.reset({
      name: product.name || '',
      vendor_id: product.vendor_id ? String(product.vendor_id) : 'none',
      cost_price: String(product.cost_price || ''),
      selling_price: String(product.selling_price || ''),
      quantity_available: String(product.quantity_available ?? '0'),
      sku: product.sku || '',
      description: product.description || '',
    });
    setEditOpen(true);
  };

  const updateProductDetails = useMutation({
    mutationFn: (v: Record<string, string>) =>
      productsApi.update(id, {
        name: v.name,
        cost_price: Number(v.cost_price),
        selling_price: Number(v.selling_price),
        quantity_available: Number(v.quantity_available || 0),
        vendor_id: v.vendor_id && v.vendor_id !== 'none' ? Number(v.vendor_id) : null,
        sku: v.sku || null,
        description: v.description || null,
      }),
    onSuccess: () => {
      toast.success('Product updated');
      qc.invalidateQueries({ queryKey: ['product', id] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setEditOpen(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
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
  if (!product) return (
    <div className="p-8 text-center space-y-4">
      <p className="text-lg font-medium text-muted-foreground">Product not found</p>
      <Button asChild variant="outline"><Link href="/sun/products">Back to Products</Link></Button>
    </div>
  );

  const profitPerUnit = Number(product.selling_price) - Number(product.cost_price);
  const profitPercent = Number(product.cost_price) > 0
    ? ((profitPerUnit * 100) / Number(product.cost_price)).toFixed(1)
    : '0';
  const stockValue = Number(product.selling_price) * Number(product.quantity_available);
  const stockProfit = profitPerUnit * Number(product.quantity_available);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-card border border-border/60 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="outline" size="icon" asChild className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground">
            <Link href="/sun/products"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="min-w-0">
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight truncate">{product.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {product.sku ? `SKU: ${product.sku}` : 'No SKU'}
              {product.vendor_name && (
                <>
                  {' · '}
                  {product.vendor_id ? (
                    <Link href={`/sun/vendors/${product.vendor_id}`} className="hover:text-primary transition-colors">
                      {product.vendor_name}
                    </Link>
                  ) : (
                    product.vendor_name
                  )}
                </>
              )}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleEditClick} className="shrink-0">
          <Pencil className="h-4 w-4 mr-1.5" /> Edit Product
        </Button>
      </div>

      {/* Edit Product Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Product Details</DialogTitle></DialogHeader>
          <form onSubmit={editForm.handleSubmit((v) => updateProductDetails.mutate(v))} className="space-y-3">
            <div className="space-y-1">
              <Label>Product Name *</Label>
              <Input {...editForm.register('name', { required: true })} />
            </div>

            <div className="space-y-1">
              <Label>Vendor</Label>
              <Select
                value={editForm.watch('vendor_id')}
                onValueChange={(v) => editForm.setValue('vendor_id', v)}
              >
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {vendors?.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Cost Price (₹) *</Label><Input type="number" step="0.01" {...editForm.register('cost_price', { required: true })} /></div>
              <div className="space-y-1"><Label>Selling Price (₹) *</Label><Input type="number" step="0.01" {...editForm.register('selling_price', { required: true })} /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Quantity of units *</Label><Input type="number" {...editForm.register('quantity_available', { required: true })} /></div>
              <div className="space-y-1"><Label>SKU / Code</Label><Input placeholder="Optional" {...editForm.register('sku')} /></div>
            </div>

            <div className="space-y-1"><Label>Description</Label><Textarea rows={2} {...editForm.register('description')} /></div>
            
            <Button type="submit" className="w-full mt-2" disabled={updateProductDetails.isPending}>
              {updateProductDetails.isPending ? 'Updating...' : 'Save Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Cost Price / unit</p><p className="text-xl font-semibold">{formatCurrency(product.cost_price)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Selling Price / unit</p><p className="text-xl font-semibold">{formatCurrency(product.selling_price)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Available Units</p><p className="text-xl font-semibold">{product.quantity_available}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Units Sold</p><p className="text-xl font-semibold">{product.quantity_sold}</p></CardContent></Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {!isStaff && (
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Profit / unit</p><p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(profitPerUnit)}</p></CardContent></Card>
        )}
        {!isStaff && (
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Profit %</p><p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">{profitPercent}%</p></CardContent></Card>
        )}
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Stock Value</p><p className="text-xl font-semibold">{formatCurrency(stockValue)}</p></CardContent></Card>
        {!isStaff && (
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Stock Profit</p><p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(stockProfit)}</p></CardContent></Card>
        )}
      </div>

      {product.description && (
        <Card>
          <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{product.description}</p></CardContent>
        </Card>
      )}

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
            <form onSubmit={stockForm.handleSubmit((v) => adjustStock.mutate({ ...v, type: stockType }))} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Action Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={stockType === 'add' ? 'default' : 'outline'}
                    className={stockType === 'add' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-medium' : ''}
                    onClick={() => {
                      setStockType('add');
                      stockForm.setValue('type', 'add');
                    }}
                  >
                    + Add Stock
                  </Button>
                  <Button
                    type="button"
                    variant={stockType === 'remove' ? 'default' : 'outline'}
                    className={stockType === 'remove' ? 'bg-red-600 hover:bg-red-700 text-white font-medium' : ''}
                    onClick={() => {
                      setStockType('remove');
                      stockForm.setValue('type', 'remove');
                    }}
                  >
                    - Remove Stock
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Quantity to {stockType === 'add' ? 'Add' : 'Remove'}</Label>
                <Input type="number" min="1" {...stockForm.register('quantity', { required: true })} />
              </div>

              <Button type="submit" className="w-full" disabled={adjustStock.isPending}>
                {adjustStock.isPending ? 'Applying...' : `Apply (${stockType === 'add' ? '+ Add' : '- Remove'})`}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Price History</CardTitle></CardHeader>
        <CardContent>
          {/* Mobile Card View */}
          <div className="space-y-3 block md:hidden">
            {(history as Array<Record<string, unknown>> | undefined)?.map((h) => (
              <div key={String(h.id)} className="rounded-lg border border-border/80 p-3 space-y-2 text-xs bg-card shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                    Sell: {formatCurrency(Number(h.selling_price))}
                  </span>
                  <span className="text-muted-foreground">
                    Cost: {formatCurrency(Number(h.cost_price))}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1 border-t border-border/50">
                  <div>
                    <span className="block font-medium text-foreground">Effective</span>
                    <span>
                      {formatDate(String(h.effective_from))} – {h.effective_to ? formatDate(String(h.effective_to)) : 'Current'}
                    </span>
                  </div>
                  <div>
                    <span className="block font-medium text-foreground">Reason</span>
                    <span className="truncate block">{String(h.change_reason || '—')}</span>
                  </div>
                </div>
              </div>
            ))}
            {!(history as Array<Record<string, unknown>> | undefined)?.length && (
              <p className="py-4 text-center text-xs text-muted-foreground">No price history found</p>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
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
                {!(history as Array<Record<string, unknown>> | undefined)?.length && (
                  <tr><td colSpan={5} className="py-4 text-center text-xs text-muted-foreground">No price history found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
