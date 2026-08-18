'use client';

import { useState, useEffect, useRef } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Plus, Search, Trash2, Pencil, LayoutGrid, List, FileText, Upload, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { expensesApi, batchesApi, vendorsApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Skeleton } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';
import { resolveUploadUrl } from '@/lib/uploads';
import { Expense } from '@/types';

import { Pagination } from '@/components/ui/pagination';
import { useDebounce } from '@/hooks/useDebounce';

export default function ExpensesPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [batchId, setBatchId] = useState('all');
  const [vendorId, setVendorId] = useState('all');
  const [financialYear, setFinancialYear] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [editProofFile, setEditProofFile] = useState<File | null>(null);

  const [viewMode, setViewMode] = useState<'auto' | 'grid' | 'table'>('table');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const qc = useQueryClient();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, batchId, vendorId, financialYear, startDate, endDate]);

  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      amount: '',
      category: '',
      batch_id: 'none',
      vendor_id: 'none',
      expense_date: new Date().toISOString().slice(0, 10),
      payment_mode: 'cash',
    },
  });

  const editForm = useForm({
    defaultValues: {
      title: '',
      description: '',
      amount: '',
      category: '',
      batch_id: 'none',
      vendor_id: 'none',
      expense_date: '',
      payment_mode: 'cash',
    },
  });

  const handleEditClick = (e: Expense) => {
    setEditingExpense(e);
    editForm.reset({
      title: e.title || '',
      description: e.description || '',
      amount: String(e.amount || ''),
      category: e.category || '',
      batch_id: e.batch_id ? String(e.batch_id) : 'none',
      vendor_id: e.vendor_id ? String(e.vendor_id) : 'none',
      expense_date: e.expense_date ? new Date(e.expense_date).toISOString().slice(0, 10) : '',
      payment_mode: e.payment_mode || 'cash',
    });
    setEditProofFile(null);
    setEditOpen(true);
  };

  const { data: batches } = useQuery({
    queryKey: ['batches-dropdown'],
    queryFn: async () => (await batchesApi.dropdown()).data.data,
  });
  
  const { data: vendors } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: async () => (await vendorsApi.list({ limit: 100 })).data.data,
  });

  const { data: expensesResponse, isLoading } = useQuery({
    queryKey: ['expenses', debouncedSearch, batchId, vendorId, financialYear, startDate, endDate, page, limit],
    queryFn: async () =>
      (await expensesApi.list({
        search: debouncedSearch || undefined,
        batch_id: batchId === 'all' ? undefined : batchId,
        vendor_id: vendorId === 'all' ? undefined : vendorId,
        financial_year: financialYear === 'all' ? undefined : financialYear,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page,
        limit,
      })).data,
  });

  const allExpenses = expensesResponse?.data || [];
  const meta = expensesResponse?.meta || { page: 1, limit: 10, total: 0, totalPages: 1 };
  const totalCount = meta.total;

  const createMutation = useMutation({
    mutationFn: (v: Record<string, string>) => {
      const fd = new FormData();
      Object.entries(v).forEach(([k, val]) => {
        if (val && val !== 'none') fd.append(k, val);
      });
      // When a vendor is selected, automatically set use_vendor_credit to true
      if (v.vendor_id && v.vendor_id !== 'none') {
        fd.append('use_vendor_credit', 'true');
        fd.set('payment_mode', 'vendor_credit');
      }
      if (proofFile) {
        fd.append('screenshot', proofFile);
      }
      return expensesApi.create(fd);
    },
    onSuccess: () => {
      toast.success('Expense added');
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['vendors'] });
      setOpen(false);
      form.reset({
        title: '', description: '', amount: '', category: '',
        batch_id: 'none', vendor_id: 'none',
        expense_date: new Date().toISOString().slice(0, 10), payment_mode: 'cash',
      });
      setProofFile(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: (v: Record<string, string>) => {
      if (!editingExpense) throw new Error('No expense selected');
      const fd = new FormData();
      fd.append('title', v.title);
      fd.append('amount', v.amount);
      if (v.category) fd.append('category', v.category);
      if (v.expense_date) fd.append('expense_date', v.expense_date);
      if (v.payment_mode) fd.append('payment_mode', v.payment_mode);
      if (v.description) fd.append('description', v.description);
      if (v.batch_id && v.batch_id !== 'none') fd.append('batch_id', v.batch_id);
      if (v.vendor_id && v.vendor_id !== 'none') fd.append('vendor_id', v.vendor_id);
      if (editProofFile) {
        fd.append('screenshot', editProofFile);
      }
      return expensesApi.update(editingExpense.id, fd);
    },
    onSuccess: () => {
      toast.success('Expense updated');
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['vendors'] });
      setEditOpen(false);
      setEditingExpense(null);
      setEditProofFile(null);
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
      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div>
          <h1 className="font-display text-2xl font-semibold">Expenses</h1>
          <p className="text-sm text-muted-foreground">Track spending & vendor credits</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" /> Add Expense</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader><DialogTitle>New Expense</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-3">
              <div className="space-y-1"><Label>Title *</Label><Input {...form.register('title', { required: true })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Amount (₹) *</Label><Input type="number" step="0.01" {...form.register('amount', { required: true })} /></div>
                <div className="space-y-1"><Label>Date *</Label><Input type="date" {...form.register('expense_date', { required: true })} /></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Category</Label><Input placeholder="e.g. Rent, Supplies" {...form.register('category')} /></div>
                <div className="space-y-1">
                  <Label>Payment Mode</Label>
                  <Select
                    value={form.watch('payment_mode')}
                    onValueChange={(v) => form.setValue('payment_mode', v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'vendor_credit'].map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Batch</Label>
                <Select
                  value={form.watch('batch_id')}
                  onValueChange={(v) => form.setValue('batch_id', v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {batches?.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Vendor</Label>
                <Select
                  value={form.watch('vendor_id')}
                  onValueChange={(v) => form.setValue('vendor_id', v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vendors?.filter((v) => Boolean(v.is_active)).map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.name} (credit ₹{v.pending_credit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.watch('vendor_id') !== 'none' && (
                  <p className="text-[11px] text-amber-600 font-medium">
                    Selecting a vendor will automatically reduce the vendor&apos;s pending credit balance.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Upload Proof <span className="text-xs text-muted-foreground font-normal">(Receipt / Screenshot)</span></Label>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                />
                {proofFile && <p className="text-xs text-emerald-600 font-medium">Selected: {proofFile.name}</p>}
              </div>

              <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} {...form.register('description')} /></div>
              <Button type="submit" className="w-full mt-2" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving...' : 'Save Expense'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Expense Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader><DialogTitle>Edit Expense</DialogTitle></DialogHeader>
            <form onSubmit={editForm.handleSubmit((v) => updateMutation.mutate(v))} className="space-y-3">
              <div className="space-y-1"><Label>Title *</Label><Input {...editForm.register('title', { required: true })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Amount (₹) *</Label><Input type="number" step="0.01" {...editForm.register('amount', { required: true })} /></div>
                <div className="space-y-1"><Label>Date *</Label><Input type="date" {...editForm.register('expense_date', { required: true })} /></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Category</Label><Input {...editForm.register('category')} /></div>
                <div className="space-y-1">
                  <Label>Payment Mode</Label>
                  <Select
                    value={editForm.watch('payment_mode')}
                    onValueChange={(v) => editForm.setValue('payment_mode', v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'vendor_credit'].map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Batch</Label>
                <Select
                  value={editForm.watch('batch_id')}
                  onValueChange={(v) => editForm.setValue('batch_id', v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {batches?.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
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
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Upload Proof <span className="text-xs text-muted-foreground font-normal">(Receipt / Screenshot)</span></Label>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setEditProofFile(e.target.files?.[0] || null)}
                />
                {editProofFile && <p className="text-xs text-emerald-600 font-medium">Selected: {editProofFile.name}</p>}
                {editingExpense?.screenshot_url && !editProofFile && (
                  <a
                    href={resolveUploadUrl(editingExpense.screenshot_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center mt-1"
                  >
                    <FileText className="h-3 w-3 mr-1" /> View Current Proof
                  </a>
                )}
              </div>

              <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} {...editForm.register('description')} /></div>
              <Button type="submit" className="w-full mt-2" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Updating...' : 'Update Expense'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Expense List</CardTitle>
              {totalCount > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({allExpenses.length} of {totalCount})
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

          {/* Filters Bar: Search, FY, Batches, Vendors, Date Range */}
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8 h-9 text-xs sm:text-sm w-full"
                  placeholder="Search by title, amount, mode, batch, vendor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Financial Year Dropdown */}
              <Select value={financialYear} onValueChange={(v) => setFinancialYear(v)}>
                <SelectTrigger className="h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Financial Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Financial Years</SelectItem>
                  <SelectItem value="FY2025-26">F.Y. 25-26</SelectItem>
                  <SelectItem value="FY2024-25">F.Y. 24-25</SelectItem>
                  <SelectItem value="FY2026-27">F.Y. 26-27</SelectItem>
                </SelectContent>
              </Select>

              {/* Batch Dropdown */}
              <Select value={batchId} onValueChange={(v) => setBatchId(v)}>
                <SelectTrigger className="h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Batch Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {batches?.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {/* Vendor Dropdown */}
              <Select value={vendorId} onValueChange={(v) => setVendorId(v)}>
                <SelectTrigger className="h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Vendor Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors?.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* Date Range: From */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground shrink-0 font-medium">From:</span>
                <Input
                  type="date"
                  className="h-9 text-xs w-full"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              {/* Date Range: To */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground shrink-0 font-medium">To:</span>
                <Input
                  type="date"
                  className="h-9 text-xs w-full"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                {(startDate || endDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs px-2 shrink-0"
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
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
                {allExpenses.map((e) => (
                  <div key={e.id} className="rounded-xl border border-border/80 p-4 space-y-3 bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-base">{e.title}</h3>
                        <span className="font-semibold text-base text-red-600 dark:text-red-400">
                          {formatCurrency(e.amount)}
                        </span>
                      </div>
                      {e.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.description}</p>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground pt-2 border-t border-border/50">
                      <div className="flex justify-between"><span>Batch</span><span className="text-foreground font-medium">{e.batch_name || '—'}</span></div>
                      <div className="flex justify-between"><span>Vendor</span><span className="text-foreground font-medium">{e.vendor_name || '—'}</span></div>
                      <div className="flex justify-between"><span>Date</span><span className="text-foreground font-medium">{formatDate(e.expense_date)}</span></div>
                      <div className="flex justify-between items-center">
                        <span>Mode</span>
                        <Badge variant="secondary" className="uppercase font-mono text-[10px]">
                          {e.payment_mode}
                        </Badge>
                      </div>
                      {e.screenshot_url && (
                        <div className="flex justify-between items-center pt-1">
                          <span>Proof</span>
                          <a
                            href={resolveUploadUrl(e.screenshot_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline font-medium inline-flex items-center"
                          >
                            <FileText className="h-3 w-3 mr-0.5" /> View Proof
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-border/50">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-8"
                        onClick={() => handleEditClick(e)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm(`Delete expense "${e.title}"?`)) deleteMutation.mutate(e.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                ))}
                {!allExpenses.length && (
                  <p className="py-8 text-center text-xs text-muted-foreground col-span-full">No expenses found</p>
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
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Title</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Amount</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Batch</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Vendor</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Date</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Mode</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Proof</th>
                      <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allExpenses.map((e) => (
                      <tr key={e.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                          <div>{e.title}</div>
                          {e.category && <div className="text-[11px] text-muted-foreground">{e.category}</div>}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-foreground">
                          {formatCurrency(e.amount)}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{e.batch_name || '—'}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{e.vendor_name || '—'}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                          {formatDate(e.expense_date)}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap uppercase text-xs font-mono">
                          <Badge variant="secondary" className="uppercase font-mono text-[10px]">
                            {e.payment_mode}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {e.screenshot_url ? (
                            <a
                              href={resolveUploadUrl(e.screenshot_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline font-medium inline-flex items-center text-xs"
                            >
                              <FileText className="h-3.5 w-3.5 mr-1" /> View
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" title="Edit expense" onClick={() => handleEditClick(e)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              title="Delete expense"
                              onClick={() => {
                                if (confirm(`Delete expense "${e.title}"?`)) deleteMutation.mutate(e.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!allExpenses.length && (
                      <tr><td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">No expenses found</td></tr>
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
