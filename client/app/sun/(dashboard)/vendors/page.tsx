'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, LayoutGrid, List, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { vendorsApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Skeleton } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';
import { Vendor } from '@/types';

export default function VendorsPage() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [viewMode, setViewMode] = useState<'auto' | 'grid' | 'table'>('table');
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const qc = useQueryClient();

  const form = useForm({
    defaultValues: { name: '', phone: '', email: '', contact_person: '', gstin: '', address: '', city: '' },
  });
  const editForm = useForm({
    defaultValues: { name: '', phone: '', email: '', contact_person: '', gstin: '', address: '', city: '' },
  });

  const handleEditClick = (e: React.MouseEvent, v: Vendor) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingVendor(v);
    editForm.reset({
      name: v.name || '',
      phone: v.phone || '',
      email: v.email || '',
      contact_person: v.contact_person || '',
      gstin: v.gstin || '',
      address: v.address || '',
      city: v.city || '',
    });
    setEditOpen(true);
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['vendors-infinite', search],
    queryFn: async ({ pageParam = 1 }) =>
      (await vendorsApi.list({ search: search || undefined, page: pageParam, limit: 10 })).data,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.meta) return undefined;
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
  });

  const allVendors = data?.pages.flatMap((p) => p.data || []) || [];
  const totalCount = data?.pages[0]?.meta?.total ?? 0;

  // Infinite scroll
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    const target = loadMoreRef.current;
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const createMutation = useMutation({
    mutationFn: (v: Record<string, string>) => vendorsApi.create(v),
    onSuccess: () => {
      toast.success('Vendor created');
      qc.invalidateQueries({ queryKey: ['vendors-infinite'] });
      setOpen(false);
      form.reset();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: (v: Record<string, string>) => {
      if (!editingVendor) throw new Error('No vendor selected');
      return vendorsApi.update(editingVendor.id, v);
    },
    onSuccess: () => {
      toast.success('Vendor updated');
      qc.invalidateQueries({ queryKey: ['vendors-infinite'] });
      setEditOpen(false);
      setEditingVendor(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => vendorsApi.remove(id),
    onSuccess: () => {
      toast.success('Vendor deleted');
      qc.invalidateQueries({ queryKey: ['vendors-infinite'] });
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
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" /> Add Vendor</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Vendor</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-3">
              <div className="space-y-1"><Label>Name</Label><Input {...form.register('name', { required: true })} /></div>
              <div className="space-y-1"><Label>Phone</Label><Input {...form.register('phone', { required: true })} /></div>
              <div className="space-y-1"><Label>Contact person</Label><Input {...form.register('contact_person')} /></div>
              <div className="space-y-1"><Label>Email</Label><Input {...form.register('email')} /></div>
              <div className="space-y-1"><Label>GST Number</Label><Input placeholder="e.g. 27AAAAA0000A1Z5" {...form.register('gstin')} /></div>
              <div className="space-y-1"><Label>Address</Label><Textarea placeholder="Street, Building, Suite..." {...form.register('address')} /></div>
              <div className="space-y-1"><Label>City</Label><Input {...form.register('city')} /></div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>Create</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Vendor Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Vendor</DialogTitle></DialogHeader>
            <form onSubmit={editForm.handleSubmit((v) => updateMutation.mutate(v))} className="space-y-3">
              <div className="space-y-1"><Label>Name</Label><Input {...editForm.register('name', { required: true })} /></div>
              <div className="space-y-1"><Label>Phone</Label><Input {...editForm.register('phone', { required: true })} /></div>
              <div className="space-y-1"><Label>Contact person</Label><Input {...editForm.register('contact_person')} /></div>
              <div className="space-y-1"><Label>Email</Label><Input {...editForm.register('email')} /></div>
              <div className="space-y-1"><Label>GST Number</Label><Input placeholder="e.g. 27AAAAA0000A1Z5" {...editForm.register('gstin')} /></div>
              <div className="space-y-1"><Label>Address</Label><Textarea placeholder="Street, Building, Suite..." {...editForm.register('address')} /></div>
              <div className="space-y-1"><Label>City</Label><Input {...editForm.register('city')} /></div>
              <Button type="submit" className="w-full" disabled={updateMutation.isPending}>Update Vendor</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Vendor List</CardTitle>
              {totalCount > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({allVendors.length} of {totalCount})
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

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 h-9 text-xs sm:text-sm w-full"
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}
              </div>
            </div>
          ) : (
            <>
              {/* Card Grid View */}
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'
                  : viewMode === 'table'
                  ? 'hidden'
                  : 'grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden'
              }>
                {allVendors.map((v) => (
                  <Card key={v.id} className="h-full transition hover:border-primary/50 shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start justify-between">
                        <Link href={`/sun/vendors/${v.id}`} className="font-semibold text-base leading-tight hover:text-primary">
                          {v.name}
                        </Link>
                        <Badge variant={v.is_active ? 'success' : 'secondary'}>
                          {v.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{v.phone}</p>
                      {v.gstin && <p className="text-xs font-mono text-muted-foreground">GST: {v.gstin}</p>}
                      {v.address && <p className="text-xs text-muted-foreground line-clamp-1">{v.address}</p>}
                      <p className="text-xs">{v.city || '—'}</p>
                    </CardContent>
                    <div className="px-4 py-3 flex items-center justify-between border-t border-border/50 bg-muted/10">
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        Pending credit: {formatCurrency(v.pending_credit)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={(e) => handleEditClick(e, v)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (confirm('Delete vendor?')) deleteMutation.mutate(v.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {!allVendors.length && (
                  <div className="py-8 text-center text-muted-foreground col-span-full">No vendors found</div>
                )}
              </div>

              {/* Table View */}
              <div className={
                viewMode === 'table'
                  ? 'overflow-x-auto border border-border/60 rounded-xl shadow-xs bg-card'
                  : viewMode === 'grid'
                  ? 'hidden'
                  : 'hidden md:block overflow-x-auto border border-border/60 rounded-xl shadow-xs bg-card'
              }>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Phone</th>
                      <th className="px-4 py-3 font-semibold">GSTIN</th>
                      <th className="px-4 py-3 font-semibold">Address / City</th>
                      <th className="px-4 py-3 font-semibold">Pending Credit</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allVendors.map((v) => (
                      <tr key={v.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors text-xs">
                        <td className="px-4 py-3.5 font-medium text-foreground">
                          <Link href={`/sun/vendors/${v.id}`} className="hover:text-primary transition-colors font-semibold">
                            {v.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">{v.phone}</td>
                        <td className="px-4 py-3.5 font-mono text-muted-foreground">{v.gstin || '—'}</td>
                        <td className="px-4 py-3.5 text-muted-foreground">{v.address ? `${v.address}, ${v.city || ''}` : (v.city || '—')}</td>
                        <td className="px-4 py-3.5 font-semibold text-amber-700 dark:text-amber-400">
                          {formatCurrency(v.pending_credit)}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant={v.is_active ? 'success' : 'secondary'} className="text-[11px] font-medium">
                            {v.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-muted"
                              title="Edit vendor"
                              onClick={(e) => handleEditClick(e, v)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Delete vendor"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (confirm('Delete vendor?')) deleteMutation.mutate(v.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!allVendors.length && (
                      <tr><td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">No vendors found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Scroll Trigger sentinel & Loading state */}
              <div ref={loadMoreRef} className="mt-4 py-4 text-center">
                {isFetchingNextPage ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Loading next 10 vendors...</span>
                  </div>
                ) : hasNextPage ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => fetchNextPage()}
                  >
                    Scroll down or click to load next 10 (Showing {allVendors.length} of {totalCount})
                  </Button>
                ) : allVendors.length > 0 ? (
                  <p className="text-xs text-muted-foreground">All {totalCount} vendors loaded</p>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
