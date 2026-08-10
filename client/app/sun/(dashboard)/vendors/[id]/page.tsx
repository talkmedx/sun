'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, LayoutGrid, List, FileText, Pencil, Trash2, Power } from 'lucide-react';
import { toast } from 'sonner';
import { vendorsApi, expensesApi, batchesApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Badge, Skeleton } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';

export default function VendorDetailPage() {
  const id = Number(useParams().id);
  const qc = useQueryClient();
  const [tab, setTab] = useState<'credits' | 'expenses'>('credits');
  const [addCreditOpen, setAddCreditOpen] = useState(false);
  const [editCreditOpen, setEditCreditOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingCredit, setEditingCredit] = useState<any | null>(null);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [editExpenseOpen, setEditExpenseOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [useCredit, setUseCredit] = useState(false);
  const [viewMode, setViewMode] = useState<'auto' | 'grid' | 'table'>('table');

  const [billFile, setBillFile] = useState<File | null>(null);
  const [billKey, setBillKey] = useState(0);

  const [editBillFile, setEditBillFile] = useState<File | null>(null);
  const [editBillKey, setEditBillKey] = useState(0);

  const creditForm = useForm({
    defaultValues: {
      product_service_name: '',
      amount: '',
      description: '',
      transaction_date: new Date().toISOString().slice(0, 10),
    },
  });

  const editCreditForm = useForm({
    defaultValues: {
      amount: '',
      description: '',
      transaction_date: '',
    },
  });

  const addExpenseForm = useForm({
    defaultValues: {
      title: '', description: '', amount: '', category: '', batch_id: '',
      expense_date: new Date().toISOString().slice(0, 10), payment_mode: 'cash',
    },
  });

  const editExpenseForm = useForm({
    defaultValues: {
      title: '', description: '', amount: '', category: '', batch_id: '',
      expense_date: '', payment_mode: 'cash',
    },
  });

  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor', id],
    queryFn: async () => (await vendorsApi.get(id)).data.data,
  });

  const { data: batches } = useQuery({
    queryKey: ['batches-dropdown'],
    queryFn: async () => (await batchesApi.dropdown()).data.data,
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

  const toggleVendorActive = useMutation({
    mutationFn: () => vendorsApi.update(id, { is_active: vendor?.is_active ? 0 : 1 }),
    onSuccess: () => {
      toast.success(`Vendor marked ${vendor?.is_active ? 'Inactive' : 'Active'}`);
      qc.invalidateQueries({ queryKey: ['vendor', id] });
      qc.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const addCredit = useMutation({
    mutationFn: (v: {
      product_service_name?: string;
      amount: string;
      description?: string;
      transaction_date: string;
    }) => {
      const fd = new FormData();
      fd.append('amount', String(Number(v.amount)));
      fd.append('transaction_date', v.transaction_date || new Date().toISOString().slice(0, 10));

      const fullDesc = [v.product_service_name?.trim(), v.description?.trim()].filter(Boolean).join(' — ');
      if (fullDesc) fd.append('description', fullDesc);

      if (billFile) {
        fd.append('bill', billFile);
      }
      return vendorsApi.addCredit(id, fd);
    },
    onSuccess: () => {
      toast.success('Credit details added');
      qc.invalidateQueries({ queryKey: ['vendor', id] });
      qc.invalidateQueries({ queryKey: ['vendor-credits', id] });
      creditForm.reset();
      setBillFile(null);
      setBillKey((k) => k + 1);
      setAddCreditOpen(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateCredit = useMutation({
    mutationFn: (v: { amount: string; description?: string; transaction_date: string }) => {
      if (!editingCredit) throw new Error('No credit selected');
      const fd = new FormData();
      fd.append('amount', String(Number(v.amount)));
      fd.append('transaction_date', v.transaction_date || new Date().toISOString().slice(0, 10));
      if (v.description !== undefined) fd.append('description', v.description);
      if (editBillFile) fd.append('bill', editBillFile);
      return vendorsApi.updateCredit(id, Number(editingCredit.id), fd);
    },
    onSuccess: () => {
      toast.success('Credit entry updated');
      qc.invalidateQueries({ queryKey: ['vendor', id] });
      qc.invalidateQueries({ queryKey: ['vendor-credits', id] });
      setEditCreditOpen(false);
      setEditingCredit(null);
      setEditBillFile(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteCredit = useMutation({
    mutationFn: (creditId: number) => vendorsApi.removeCredit(id, creditId),
    onSuccess: () => {
      toast.success('Credit entry deleted');
      qc.invalidateQueries({ queryKey: ['vendor', id] });
      qc.invalidateQueries({ queryKey: ['vendor-credits', id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const createExpense = useMutation({
    mutationFn: (v: Record<string, string>) => {
      const fd = new FormData();
      Object.entries(v).forEach(([k, val]) => { if (val) fd.append(k, val); });
      fd.set('vendor_id', String(id));
      if (useCredit) {
        fd.append('use_vendor_credit', 'true');
        fd.set('payment_mode', 'vendor_credit');
      }
      return expensesApi.create(fd);
    },
    onSuccess: () => {
      toast.success('Expense added');
      qc.invalidateQueries({ queryKey: ['vendor', id] });
      qc.invalidateQueries({ queryKey: ['vendor-expenses', id] });
      setAddExpenseOpen(false);
      addExpenseForm.reset();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateExpense = useMutation({
    mutationFn: (v: Record<string, string>) => {
      if (!editingExpense) throw new Error('No expense selected');
      return expensesApi.update(editingExpense.id, {
        title: v.title,
        amount: Number(v.amount),
        category: v.category || null,
        expense_date: v.expense_date,
        payment_mode: v.payment_mode,
        batch_id: v.batch_id ? Number(v.batch_id) : null,
        vendor_id: id,
        description: v.description || null,
      });
    },
    onSuccess: () => {
      toast.success('Expense updated');
      qc.invalidateQueries({ queryKey: ['vendor', id] });
      qc.invalidateQueries({ queryKey: ['vendor-expenses', id] });
      setEditExpenseOpen(false);
      setEditingExpense(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteExpense = useMutation({
    mutationFn: (expenseId: number) => expensesApi.remove(expenseId),
    onSuccess: () => {
      toast.success('Expense deleted');
      qc.invalidateQueries({ queryKey: ['vendor', id] });
      qc.invalidateQueries({ queryKey: ['vendor-expenses', id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEditCreditClick = (c: any) => {
    setEditingCredit(c);
    editCreditForm.reset({
      amount: String(c.amount || ''),
      description: c.description || '',
      transaction_date: c.transaction_date ? new Date(c.transaction_date).toISOString().slice(0, 10) : '',
    });
    setEditBillFile(null);
    setEditBillKey((k) => k + 1);
    setEditCreditOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEditExpenseClick = (e: any) => {
    setEditingExpense(e);
    editExpenseForm.reset({
      title: e.title || '',
      description: e.description || '',
      amount: String(e.amount || ''),
      category: e.category || '',
      batch_id: e.batch_id ? String(e.batch_id) : '',
      expense_date: e.expense_date ? new Date(e.expense_date).toISOString().slice(0, 10) : '',
      payment_mode: e.payment_mode || 'cash',
    });
    setEditExpenseOpen(true);
  };

  const [editVendorOpen, setEditVendorOpen] = useState(false);
  const editVendorForm = useForm({
    defaultValues: { name: '', phone: '', contact_person: '', email: '', gstin: '', address: '', city: '' },
  });

  const handleEditVendorClick = () => {
    editVendorForm.reset({
      name: vendor?.name || '',
      phone: vendor?.phone || '',
      contact_person: vendor?.contact_person || '',
      email: vendor?.email || '',
      gstin: vendor?.gstin || '',
      address: vendor?.address || '',
      city: vendor?.city || '',
    });
    setEditVendorOpen(true);
  };

  const updateVendorMutation = useMutation({
    mutationFn: (v: Record<string, string>) => vendorsApi.update(id, v),
    onSuccess: () => {
      toast.success('Vendor updated');
      qc.invalidateQueries({ queryKey: ['vendor', id] });
      qc.invalidateQueries({ queryKey: ['vendors'] });
      setEditVendorOpen(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!vendor) return <p>Not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-2xl font-semibold">{vendor.name}</h1>
            <Badge variant={vendor.is_active ? 'success' : 'secondary'}>
              {vendor.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => toggleVendorActive.mutate()}
              disabled={toggleVendorActive.isPending}
            >
              <Power className="h-3.5 w-3.5" />
              {vendor.is_active ? 'Mark Inactive' : 'Mark Active'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleEditVendorClick}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{vendor.contact_person} · {vendor.phone}</p>
        </div>
      </div>

      {/* Edit Vendor Dialog */}
      <Dialog open={editVendorOpen} onOpenChange={setEditVendorOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Vendor Details</DialogTitle></DialogHeader>
          <form onSubmit={editVendorForm.handleSubmit((v) => updateVendorMutation.mutate(v))} className="space-y-3">
            <div className="space-y-1"><Label>Name</Label><Input {...editVendorForm.register('name', { required: true })} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input {...editVendorForm.register('phone', { required: true })} /></div>
            <div className="space-y-1"><Label>Contact person</Label><Input {...editVendorForm.register('contact_person')} /></div>
            <div className="space-y-1"><Label>Email</Label><Input {...editVendorForm.register('email')} /></div>
            <div className="space-y-1"><Label>GST Number</Label><Input placeholder="e.g. 27AAAAA0000A1Z5" {...editVendorForm.register('gstin')} /></div>
            <div className="space-y-1"><Label>Address</Label><Textarea placeholder="Street, Building, Suite..." {...editVendorForm.register('address')} /></div>
            <div className="space-y-1"><Label>City</Label><Input {...editVendorForm.register('city')} /></div>
            <Button type="submit" className="w-full" disabled={updateVendorMutation.isPending}>Update Vendor</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending Credit</p><p className="text-xl font-semibold text-amber-700 dark:text-amber-400">{formatCurrency(vendor.pending_credit)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">GSTIN</p><p className="text-sm font-mono font-semibold truncate">{vendor.gstin || '—'}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Address / City</p><p className="text-sm font-medium truncate">{vendor.address ? `${vendor.address}, ${vendor.city || ''}` : (vendor.city || '—')}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Email</p><p className="truncate text-sm font-semibold">{vendor.email || '—'}</p></CardContent></Card>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex gap-2">
          <Button size="sm" variant={tab === 'credits' ? 'default' : 'outline'} onClick={() => setTab('credits')}>Credits</Button>
          <Button size="sm" variant={tab === 'expenses' ? 'default' : 'outline'} onClick={() => setTab('expenses')}>Expenses</Button>
        </div>

        <div className="flex items-center gap-2">
          {tab === 'credits' && (
            <Dialog open={addCreditOpen} onOpenChange={setAddCreditOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Add Credit</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Credit for {vendor.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={creditForm.handleSubmit((v) => addCredit.mutate(v))} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Product / Service Name</Label>
                    <Input
                      placeholder="e.g. Cosmetics Supply, Hair Kit, Studio Rent"
                      {...creditForm.register('product_service_name', { required: true })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Credit Amount (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...creditForm.register('amount', { required: true })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Transaction Date</Label>
                    <Input
                      type="date"
                      {...creditForm.register('transaction_date')}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Description <span className="text-xs text-muted-foreground font-normal">(Optional)</span></Label>
                    <Textarea
                      rows={3}
                      placeholder="Enter additional description or notes..."
                      {...creditForm.register('description')}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Upload Bill / Invoice <span className="text-xs text-muted-foreground font-normal">(Optional — Photo/PDF or Camera)</span></Label>
                    <Input
                      key={billKey}
                      type="file"
                      accept="image/*,application/pdf"
                      capture="environment"
                      onChange={(e) => setBillFile(e.target.files?.[0] || null)}
                    />
                    {billFile && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        Selected: {billFile.name} ({Math.round(billFile.size / 1024)} KB)
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full mt-2" disabled={addCredit.isPending}>
                    {addCredit.isPending ? 'Submitting...' : 'Submit Credit'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {/* Edit Credit Dialog */}
          <Dialog open={editCreditOpen} onOpenChange={setEditCreditOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
              <DialogHeader><DialogTitle>Edit Credit Details</DialogTitle></DialogHeader>
              <form onSubmit={editCreditForm.handleSubmit((v) => updateCredit.mutate(v))} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Credit Amount (₹)</Label>
                  <Input type="number" step="0.01" {...editCreditForm.register('amount', { required: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Transaction Date</Label>
                  <Input type="date" {...editCreditForm.register('transaction_date')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Description <span className="text-xs text-muted-foreground font-normal">(Optional)</span></Label>
                  <Textarea rows={3} {...editCreditForm.register('description')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Update Bill / Invoice <span className="text-xs text-muted-foreground font-normal">(Optional — Photo/PDF or Camera)</span></Label>
                  <Input key={editBillKey} type="file" accept="image/*,application/pdf" capture="environment" onChange={(e) => setEditBillFile(e.target.files?.[0] || null)} />
                  {editBillFile && <p className="text-xs text-emerald-600 font-medium">Selected: {editBillFile.name}</p>}
                </div>
                <Button type="submit" className="w-full mt-2" disabled={updateCredit.isPending}>
                  {updateCredit.isPending ? 'Updating...' : 'Update Credit'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant={tab === 'expenses' ? 'default' : 'outline'}>
                <Plus className="h-4 w-4 mr-1.5" /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add Expense for {vendor.name}</DialogTitle></DialogHeader>
              <form onSubmit={addExpenseForm.handleSubmit((v) => createExpense.mutate(v))} className="space-y-3">
                <div className="space-y-1"><Label>Title</Label><Input {...addExpenseForm.register('title', { required: true })} /></div>
                <div className="space-y-1"><Label>Amount</Label><Input type="number" step="0.01" {...addExpenseForm.register('amount', { required: true })} /></div>
                <div className="space-y-1"><Label>Category</Label><Input {...addExpenseForm.register('category')} /></div>
                <div className="space-y-1"><Label>Date</Label><Input type="date" {...addExpenseForm.register('expense_date')} /></div>
                <div className="space-y-1">
                  <Label>Batch</Label>
                  <Select onValueChange={(v) => addExpenseForm.setValue('batch_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      {batches?.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Vendor</Label>
                  <Input value={vendor.name} disabled className="bg-muted font-medium" />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} />
                  Use vendor credit (auto-reduces pending credit ₹{vendor.pending_credit})
                </label>
                <div className="space-y-1"><Label>Notes</Label><Textarea {...addExpenseForm.register('description')} /></div>
                <Button type="submit" className="w-full" disabled={createExpense.isPending}>Save Expense</Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Expense Dialog */}
          <Dialog open={editExpenseOpen} onOpenChange={setEditExpenseOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Edit Expense</DialogTitle></DialogHeader>
              <form onSubmit={editExpenseForm.handleSubmit((v) => updateExpense.mutate(v))} className="space-y-3">
                <div className="space-y-1"><Label>Title</Label><Input {...editExpenseForm.register('title', { required: true })} /></div>
                <div className="space-y-1"><Label>Amount</Label><Input type="number" step="0.01" {...editExpenseForm.register('amount', { required: true })} /></div>
                <div className="space-y-1"><Label>Category</Label><Input {...editExpenseForm.register('category')} /></div>
                <div className="space-y-1"><Label>Date</Label><Input type="date" {...editExpenseForm.register('expense_date')} /></div>
                <div className="space-y-1">
                  <Label>Payment Mode</Label>
                  <Select
                    value={editExpenseForm.watch('payment_mode')}
                    onValueChange={(v) => editExpenseForm.setValue('payment_mode', v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'vendor_credit'].map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Batch</Label>
                  <Select
                    value={editExpenseForm.watch('batch_id') || 'none'}
                    onValueChange={(v) => editExpenseForm.setValue('batch_id', v === 'none' ? '' : v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {batches?.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Notes</Label><Textarea {...editExpenseForm.register('description')} /></div>
                <Button type="submit" className="w-full" disabled={updateExpense.isPending}>Update Expense</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {tab === 'credits' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 pb-2 sm:pb-2">
            <CardTitle className="text-base font-semibold">Credit History</CardTitle>
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
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 sm:pt-2">
            {/* Card View */}
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'
                : viewMode === 'table'
                ? 'hidden'
                : 'space-y-3 block md:hidden'
            }>
              {(credits as Array<Record<string, unknown>> | undefined)?.map((c) => (
                <div key={String(c.id)} className="rounded-lg border border-border/80 p-3 space-y-2 text-xs bg-card shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-amber-700 dark:text-amber-400">
                      {formatCurrency(Number(c.amount))}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="uppercase text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
                        {String(c.type)}
                      </span>
                      {Boolean(c.bill_url) && (
                        <a
                          href={`http://localhost:5001${c.bill_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-[10px] text-primary hover:underline font-medium"
                        >
                          <FileText className="h-3 w-3 mr-0.5" /> Bill
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1 border-t border-border/50">
                    <div>
                      <span className="block font-medium text-foreground">Date</span>
                      <span>{formatDate(String(c.transaction_date))}</span>
                    </div>
                    <div>
                      <span className="block font-medium text-foreground">Description</span>
                      <span className="truncate block">{String(c.description || '—')}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleEditCreditClick(c)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => confirm('Delete credit entry?') && deleteCredit.mutate(Number(c.id))}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
              {!(credits as Array<Record<string, unknown>> | undefined)?.length && (
                <p className="py-4 text-center text-xs text-muted-foreground col-span-full">No credits recorded</p>
              )}
            </div>

            {/* Table View */}
            <div className={
              viewMode === 'table'
                ? 'overflow-x-auto'
                : viewMode === 'grid'
                ? 'hidden'
                : 'hidden md:block overflow-x-auto'
            }>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2">Description</th>
                    <th className="pb-2">Bill / Invoice</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(credits as Array<Record<string, unknown>> | undefined)?.map((c) => (
                    <tr key={String(c.id)} className="border-b border-border/50">
                      <td className="py-2">{formatDate(String(c.transaction_date))}</td>
                      <td className="py-2">{String(c.type)}</td>
                      <td className="py-2 font-medium">{formatCurrency(Number(c.amount))}</td>
                      <td className="py-2">{String(c.description || '—')}</td>
                      <td className="py-2">
                        {Boolean(c.bill_url) ? (
                          <a
                            href={`http://localhost:5001${c.bill_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-xs text-primary hover:underline font-medium"
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" /> View Bill
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditCreditClick(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => confirm('Delete credit entry?') && deleteCredit.mutate(Number(c.id))}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!(credits as Array<Record<string, unknown>> | undefined)?.length && (
                    <tr><td colSpan={6} className="py-4 text-center text-xs text-muted-foreground">No credits recorded</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'expenses' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 pb-2 sm:pb-2">
            <CardTitle className="text-base font-semibold">Expense History</CardTitle>
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
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 sm:pt-2">
            {/* Card View */}
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'
                : viewMode === 'table'
                ? 'hidden'
                : 'space-y-3 block md:hidden'
            }>
              {(expenses as Array<Record<string, unknown>> | undefined)?.map((e) => (
                <div key={String(e.id)} className="rounded-lg border border-border/80 p-3 space-y-2 text-xs bg-card shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground">
                      {String(e.title)}
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(Number(e.amount))}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1 border-t border-border/50">
                    <div>
                      <span className="block font-medium text-foreground">Date</span>
                      <span>{formatDate(String(e.expense_date))}</span>
                    </div>
                    <div>
                      <span className="block font-medium text-foreground">Mode</span>
                      <span className="uppercase text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{String(e.payment_mode)}</span>
                    </div>
                    <div>
                      <span className="block font-medium text-foreground">Batch</span>
                      <span>{String(e.batch_name || '—')}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleEditExpenseClick(e)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => confirm('Delete expense?') && deleteExpense.mutate(Number(e.id))}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
              {!(expenses as Array<Record<string, unknown>> | undefined)?.length && (
                <p className="py-4 text-center text-xs text-muted-foreground col-span-full">No expenses recorded</p>
              )}
            </div>

            {/* Table View */}
            <div className={
              viewMode === 'table'
                ? 'overflow-x-auto'
                : viewMode === 'grid'
                ? 'hidden'
                : 'hidden md:block overflow-x-auto'
            }>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2">Title</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Mode</th>
                    <th className="pb-2">Batch</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(expenses as Array<Record<string, unknown>> | undefined)?.map((e) => (
                    <tr key={String(e.id)} className="border-b border-border/50">
                      <td className="py-2 font-medium">{String(e.title)}</td>
                      <td className="py-2 font-semibold">{formatCurrency(Number(e.amount))}</td>
                      <td className="py-2">{formatDate(String(e.expense_date))}</td>
                      <td className="py-2 uppercase text-xs font-mono">{String(e.payment_mode)}</td>
                      <td className="py-2">{String(e.batch_name || '—')}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditExpenseClick(e)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => confirm('Delete expense?') && deleteExpense.mutate(Number(e.id))}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!(expenses as Array<Record<string, unknown>> | undefined)?.length && (
                    <tr><td colSpan={6} className="py-4 text-center text-xs text-muted-foreground">No expenses recorded</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
