'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Plus, Search, Trash2, Pencil, LayoutGrid, List, Loader2, Package, TrendingUp, DollarSign, ShoppingBag } from 'lucide-react';
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
import { useAuthStore } from '@/store';
import { Product } from '@/types';

import { Pagination } from '@/components/ui/pagination';
import { useDebounce } from '@/hooks/useDebounce';

export default function ProductsPage() {
  const userRole = useAuthStore((s) => s.user?.role) || 'admin';
  const isStaff = userRole === 'staff';

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [stockStatus, setStockStatus] = useState<'available' | 'out_of_stock' | 'all'>('all');
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'auto' | 'grid' | 'table'>('table');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const qc = useQueryClient();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stockStatus]);

  const form = useForm({
    defaultValues: {
      name: '', sku: '', cost_price: '', selling_price: '',
      quantity_available: '0', vendor_id: 'none', description: '',
    },
  });

  const editForm = useForm({
    defaultValues: {
      name: '', sku: '', cost_price: '', selling_price: '',
      quantity_available: '0', vendor_id: 'none', description: '',
    },
  });

  const handleEditClick = (p: Product) => {
    setEditingProduct(p);
    editForm.reset({
      name: p.name || '',
      sku: p.sku || '',
      cost_price: String(p.cost_price || ''),
      selling_price: String(p.selling_price || ''),
      quantity_available: String(p.quantity_available ?? '0'),
      vendor_id: p.vendor_id ? String(p.vendor_id) : 'none',
      description: p.description || '',
    });
    setEditOpen(true);
  };

  // Fetch Summary Cards metrics
  const { data: summaryData } = useQuery({
    queryKey: ['products-summary'],
    queryFn: async () => (await productsApi.summary()).data.data,
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: async () => (await vendorsApi.list({ limit: 100 })).data.data,
  });

  const { data: productsResponse, isLoading } = useQuery({
    queryKey: ['products', debouncedSearch, stockStatus, page, limit],
    queryFn: async () =>
      (await productsApi.list({
        search: debouncedSearch || undefined,
        stock_status: stockStatus,
        page,
        limit,
      })).data,
  });

  const allProducts = productsResponse?.data || [];
  const meta = productsResponse?.meta || { page: 1, limit: 10, total: 0, totalPages: 1 };
  const totalCount = meta.total;

  const createMutation = useMutation({
    mutationFn: (v: Record<string, string>) =>
      productsApi.create({
        ...v,
        cost_price: Number(v.cost_price),
        selling_price: Number(v.selling_price),
        quantity_available: Number(v.quantity_available || 0),
        vendor_id: v.vendor_id && v.vendor_id !== 'none' ? Number(v.vendor_id) : null,
      }),
    onSuccess: () => {
      toast.success('Product created');
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['products-summary'] });
      setOpen(false);
      form.reset({
        name: '', sku: '', cost_price: '', selling_price: '',
        quantity_available: '0', vendor_id: 'none', description: '',
      });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: (v: Record<string, string>) => {
      if (!editingProduct) throw new Error('No product selected');
      return productsApi.update(editingProduct.id, {
        ...v,
        cost_price: Number(v.cost_price),
        selling_price: Number(v.selling_price),
        quantity_available: Number(v.quantity_available || 0),
        vendor_id: v.vendor_id && v.vendor_id !== 'none' ? Number(v.vendor_id) : null,
      });
    },
    onSuccess: () => {
      toast.success('Product updated');
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['products-summary'] });
      setEditOpen(false);
      setEditingProduct(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productsApi.remove(id),
    onSuccess: () => {
      toast.success('Product deleted');
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['products-summary'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // Calculate Product Row metrics
  const computeProductMetrics = (p: Product) => {
    const costPrice = Number(p.cost_price || 0);
    const sellingPrice = Number(p.selling_price || 0);
    const qtyAvailable = Number(p.quantity_available || 0);

    const totalSellingPrice = sellingPrice * qtyAvailable;
    const totalProfit = (sellingPrice - costPrice) * qtyAvailable;
    const profitPercent = costPrice > 0 ? (((sellingPrice - costPrice) * 100) / costPrice).toFixed(1) : '0';

    return {
      costPrice,
      sellingPrice,
      qtyAvailable,
      totalSellingPrice,
      totalProfit,
      profitPercent,
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div>
          <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" /> Products & Inventory
          </h1>
          <p className="text-sm text-muted-foreground">Inventory valuation, sales & profitability</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" /> Add Product</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader><DialogTitle>New Product</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-3">
              <div className="space-y-1"><Label>Product Name *</Label><Input {...form.register('name', { required: true })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Cost Price (₹) *</Label><Input type="number" step="0.01" {...form.register('cost_price', { required: true })} /></div>
                <div className="space-y-1"><Label>Selling Price (₹) *</Label><Input type="number" step="0.01" {...form.register('selling_price', { required: true })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Quantity of units *</Label><Input type="number" {...form.register('quantity_available', { required: true })} /></div>
                <div className="space-y-1"><Label>SKU / Code</Label><Input placeholder="Optional" {...form.register('sku')} /></div>
              </div>
              <div className="space-y-1">
                <Label>Vendor</Label>
                <Select value={form.watch('vendor_id')} onValueChange={(v) => form.setValue('vendor_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vendors?.filter((v) => Boolean(v.is_active)).map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Description</Label><Textarea rows={2} {...form.register('description')} /></div>
              <Button type="submit" className="w-full mt-2" disabled={createMutation.isPending}>Create Product</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Product Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader><DialogTitle>Edit Product</DialogTitle></DialogHeader>
            <form onSubmit={editForm.handleSubmit((v) => updateMutation.mutate(v))} className="space-y-3">
              <div className="space-y-1"><Label>Product Name *</Label><Input {...editForm.register('name', { required: true })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Cost Price (₹) *</Label><Input type="number" step="0.01" {...editForm.register('cost_price', { required: true })} /></div>
                <div className="space-y-1"><Label>Selling Price (₹) *</Label><Input type="number" step="0.01" {...editForm.register('selling_price', { required: true })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Quantity of units *</Label><Input type="number" {...editForm.register('quantity_available', { required: true })} /></div>
                <div className="space-y-1"><Label>SKU / Code</Label><Input placeholder="Optional" {...editForm.register('sku')} /></div>
              </div>
              <div className="space-y-1">
                <Label>Vendor</Label>
                <Select value={editForm.watch('vendor_id')} onValueChange={(v) => editForm.setValue('vendor_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vendors?.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Description</Label><Textarea rows={2} {...editForm.register('description')} /></div>
              <Button type="submit" className="w-full mt-2" disabled={updateMutation.isPending}>Update Product</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 6 Summary Cards (Admins only) */}
      {!isStaff && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Available Stock - Total Cost Price */}
          <Card className="bg-card shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Available Stock — Total Cost Price</p>
                <h3 className="text-lg font-bold mt-1 text-foreground">
                  {formatCurrency(summaryData?.total_cost_available || 0)}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <DollarSign className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Available Stock - Total Selling Price */}
          <Card className="bg-card shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Available Stock — Total Selling Price</p>
                <h3 className="text-lg font-bold mt-1 text-foreground">
                  {formatCurrency(summaryData?.total_selling_available || 0)}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Available Stock - Total Profit */}
          <Card className="bg-card shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Available Stock — Total Profit</p>
                <h3 className="text-lg font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(summaryData?.total_profit_available || 0)}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Products Sold - Total Cost Price */}
          <Card className="bg-card shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Products Sold — Total Cost Price</p>
                <h3 className="text-lg font-bold mt-1 text-foreground">
                  {formatCurrency(summaryData?.total_cost_sold || 0)}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 5: Products Sold - Total Selling Price */}
          <Card className="bg-card shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Products Sold — Total Revenue</p>
                <h3 className="text-lg font-bold mt-1 text-foreground">
                  {formatCurrency(summaryData?.total_selling_sold || 0)}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 6: Products Sold - Total Profit */}
          <Card className="bg-card shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Products Sold — Total Profit</p>
                <h3 className="text-lg font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(summaryData?.total_profit_sold || 0)}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="p-4 sm:p-6 space-y-4">
          {/* Top Row: Tabs & View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <Button
                size="sm"
                variant={stockStatus === 'available' ? 'default' : 'outline'}
                onClick={() => setStockStatus('available')}
              >
                Available Stock
              </Button>
              <Button
                size="sm"
                variant={stockStatus === 'out_of_stock' ? 'default' : 'outline'}
                onClick={() => setStockStatus('out_of_stock')}
              >
                Out of Stock
              </Button>
              <Button
                size="sm"
                variant={stockStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setStockStatus('all')}
              >
                All Products
              </Button>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {totalCount > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({allProducts.length} of {totalCount})
                </span>
              )}
              <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/20">
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
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 h-9 text-xs sm:text-sm w-full"
              placeholder="Search products by name, SKU, or vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-36" />
              ))}
            </div>
          ) : (
            <>
              {/* Card / Grid View */}
              <div className={
                viewMode === 'grid'
                  ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
                  : viewMode === 'table'
                  ? 'hidden'
                  : 'space-y-3 block md:hidden'
              }>
                {allProducts.map((p) => {
                  const m = computeProductMetrics(p);
                  return (
                    <div key={p.id} className="rounded-xl border border-border/80 p-4 space-y-3 bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-base">
                              <Link href={`/sun/products/${p.id}`} className="hover:text-primary transition-colors">
                                {p.name}
                              </Link>
                            </h3>
                            {p.vendor_name && <p className="text-xs text-muted-foreground font-medium">Vendor: {p.vendor_name}</p>}
                          </div>
                          <Badge variant={m.qtyAvailable > 0 ? 'success' : 'destructive'}>
                            {m.qtyAvailable > 0 ? `Stock: ${m.qtyAvailable}` : 'Out of Stock'}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-muted-foreground pt-2 border-t border-border/50">
                        {!isStaff && <div className="flex justify-between"><span>Cost Price / unit</span><span className="text-foreground font-medium">{formatCurrency(m.costPrice)}</span></div>}
                        <div className="flex justify-between"><span>Selling Price / unit</span><span className="text-foreground font-medium">{formatCurrency(m.sellingPrice)}</span></div>
                        <div className="flex justify-between"><span>Quantity of units</span><span className="text-foreground font-medium">{m.qtyAvailable}</span></div>
                        <div className="flex justify-between"><span>Total Selling Price</span><span className="text-foreground font-semibold">{formatCurrency(m.totalSellingPrice)}</span></div>
                        {!isStaff && <div className="flex justify-between"><span>Profit %</span><span className="text-emerald-600 font-semibold">{m.profitPercent}%</span></div>}
                        {!isStaff && (
                          <div className="flex justify-between font-bold text-sm pt-1 border-t border-border/40">
                            <span className="text-foreground">Total Profit</span>
                            <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(m.totalProfit)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-border/50">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs h-8"
                          onClick={() => handleEditClick(p)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Delete product "${p.name}"?`)) deleteMutation.mutate(p.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {!allProducts.length && (
                  <p className="py-8 text-center text-xs text-muted-foreground col-span-full">No products found</p>
                )}
              </div>

              {/* Table View */}
              <div className={
                viewMode === 'table'
                  ? 'overflow-x-auto border rounded-lg'
                  : viewMode === 'grid'
                  ? 'hidden'
                  : 'hidden md:block overflow-x-auto border rounded-lg'
              }>
                <table className="w-full min-w-[1050px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Product Name</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Vendor Name</th>
                      {!isStaff && <th className="px-3 py-2.5 font-medium whitespace-nowrap">Cost Price / unit</th>}
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Selling Price / unit</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Quantity of units</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Total Selling Price</th>
                      {!isStaff && <th className="px-3 py-2.5 font-medium whitespace-nowrap">Total Profit</th>}
                      {!isStaff && <th className="px-3 py-2.5 font-medium whitespace-nowrap">Profit %</th>}
                      <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allProducts.map((p) => {
                      const m = computeProductMetrics(p);
                      return (
                        <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                            <Link href={`/sun/products/${p.id}`} className="hover:text-primary transition-colors">
                              <div>{p.name}</div>
                            </Link>
                            {p.sku && <div className="text-[11px] text-muted-foreground font-mono">SKU: {p.sku}</div>}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">{p.vendor_name || '—'}</td>
                          {!isStaff && <td className="px-3 py-2.5 whitespace-nowrap">{formatCurrency(m.costPrice)}</td>}
                          <td className="px-3 py-2.5 whitespace-nowrap font-medium">{formatCurrency(m.sellingPrice)}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap font-medium">
                            <Badge variant={m.qtyAvailable > 0 ? 'secondary' : 'destructive'} className="font-mono">
                              {m.qtyAvailable}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap font-semibold">{formatCurrency(m.totalSellingPrice)}</td>
                          {!isStaff && (
                            <td className="px-3 py-2.5 whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(m.totalProfit)}
                            </td>
                          )}
                          {!isStaff && (
                            <td className="px-3 py-2.5 whitespace-nowrap font-medium text-emerald-600">
                              {m.profitPercent}%
                            </td>
                          )}
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" title="Edit product" onClick={() => handleEditClick(p)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                title="Delete product"
                                onClick={() => {
                                  if (confirm(`Delete product "${p.name}"?`)) deleteMutation.mutate(p.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!allProducts.length && (
                      <tr><td colSpan={9} className="py-8 text-center text-xs text-muted-foreground">No products found</td></tr>
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
