'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import {
  LayoutGrid, List, Pencil, Trash2, FileText, Plus, Camera, Image as ImageIcon,
  ArrowLeft, Phone, Mail, Calendar, MapPin, Briefcase, GraduationCap,
  Wallet, ShoppingBag, TrendingUp, CreditCard, Building, User, Sparkles, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { studentsApi, productsApi, batchesApi, vendorsApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Badge, Skeleton } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';

const DOC_TYPES = ['Aadhar Card', 'Pan Card', 'Driving License', 'Voting Card', 'Rent Agreement', 'Other'];

export default function StudentProfilePage() {
  const params = useParams();
  const id = Number(params.id);
  const qc = useQueryClient();
  const [tab, setTab] = useState<'fees' | 'products' | 'documents'>('fees');
  const [viewMode, setViewMode] = useState<'auto' | 'grid' | 'table'>('table');

  // Searchable Product Dropdown State
  const [productSearch, setProductSearch] = useState('');
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Edit Student Dialog state
  const [editStudentOpen, setEditStudentOpen] = useState(false);
  const [sameAddress, setSameAddress] = useState(false);

  // Collect Fees Modal state
  const [collectFeesOpen, setCollectFeesOpen] = useState(false);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentFileKey, setPaymentFileKey] = useState(0);

  // Edit Fee state
  const [editFeeOpen, setEditFeeOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingFee, setEditingFee] = useState<any | null>(null);
  const [editFeeFile, setEditFeeFile] = useState<File | null>(null);
  const [editFeeFileKey, setEditFeeFileKey] = useState(0);

  // Edit Product Purchase state
  const [editProductOpen, setEditProductOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Upload & Edit Document State
  const [uploadDocOpen, setUploadDocOpen] = useState(false);
  const [docType, setDocType] = useState('Aadhar Card');
  const [customDocTitle, setCustomDocTitle] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docFileKey, setDocFileKey] = useState(0);

  const [editDocOpen, setEditDocOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [editDocType, setEditDocType] = useState('Aadhar Card');
  const [editCustomDocTitle, setEditCustomDocTitle] = useState('');
  const [editDocFile, setEditDocFile] = useState<File | null>(null);
  const [editDocFileKey, setEditDocFileKey] = useState(0);

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => (await studentsApi.get(id)).data.data,
  });

  const { data: batches } = useQuery({
    queryKey: ['batches-dropdown'],
    queryFn: async () => (await batchesApi.dropdown()).data.data,
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: async () => (await vendorsApi.list({ limit: 100 })).data.data,
  });

  const { data: fees } = useQuery({
    queryKey: ['student-fees', id],
    queryFn: async () => (await studentsApi.fees(id)).data.data,
    enabled: tab === 'fees',
  });

  const { data: purchases } = useQuery({
    queryKey: ['student-products', id],
    queryFn: async () => (await studentsApi.products(id)).data.data,
  });

  const { data: docs } = useQuery({
    queryKey: ['student-docs', id],
    queryFn: async () => (await studentsApi.documents(id)).data.data,
    enabled: tab === 'documents',
  });

  const { data: products } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => (await productsApi.list({ limit: 100 })).data.data,
  });

  const editStudentForm = useForm({
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      age: '',
      designation: '',
      admission_date: '',
      address_line1: '',
      address_line2: '',
      city: '',
      batch_id: 'none',
      fees_committed: '',
    },
  });

  const collectFeeForm = useForm({
    defaultValues: {
      amount: '',
      payment_date: new Date().toISOString().slice(0, 10),
      payment_mode: 'upi',
      vendor_id: 'none',
      mark_as_expense: false,
      notes: '',
    },
  });

  const editFeeForm = useForm({
    defaultValues: {
      amount: '',
      payment_date: '',
      payment_mode: 'upi',
      notes: '',
    },
  });

  const productForm = useForm({
    defaultValues: {
      product_id: '',
      quantity: '1',
      purchase_date: new Date().toISOString().slice(0, 10),
      notes: '',
    },
  });

  const editProductForm = useForm({
    defaultValues: {
      quantity: '1',
      purchase_date: '',
      payment_mode: 'cash',
      notes: '',
    },
  });

  // Filter products for searchable dropdown
  const filteredProducts = (products || []).filter((p) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.vendor_name && p.vendor_name.toLowerCase().includes(q))
    );
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateStudentMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async (values: any) =>
      studentsApi.update(id, {
        ...values,
        batch_id: values.batch_id && values.batch_id !== 'none' ? Number(values.batch_id) : null,
        fees_committed: values.fees_committed ? Number(values.fees_committed) : undefined,
        age: values.age ? Number(values.age) : null,
        designation: values.designation || null,
        admission_date: values.admission_date || null,
        address_line1: values.address_line1 || null,
        address_line2: values.address_line2 || null,
      }),
    onSuccess: () => {
      toast.success('Student details updated');
      qc.invalidateQueries({ queryKey: ['student', id] });
      setEditStudentOpen(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const addFee = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async (values: any) => {
      const fd = new FormData();
      fd.append('amount', values.amount);
      fd.append('payment_date', values.payment_date);
      fd.append('payment_mode', values.payment_mode || 'upi');
      if (values.vendor_id && values.vendor_id !== 'none') fd.append('vendor_id', values.vendor_id);
      if (values.mark_as_expense) fd.append('mark_as_expense', 'true');
      if (values.notes) fd.append('notes', values.notes);
      if (paymentFile) {
        fd.append('screenshot', paymentFile);
      }
      return studentsApi.addFee(id, fd);
    },
    onSuccess: () => {
      toast.success('Fee collected successfully');
      qc.invalidateQueries({ queryKey: ['student-fees', id] });
      qc.invalidateQueries({ queryKey: ['student', id] });
      setCollectFeesOpen(false);
      collectFeeForm.reset({
        amount: '',
        payment_date: new Date().toISOString().slice(0, 10),
        payment_mode: 'upi',
        vendor_id: 'none',
        mark_as_expense: false,
        notes: '',
      });
      setPaymentFile(null);
      setPaymentFileKey((k) => k + 1);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateFee = useMutation({
    mutationFn: async (values: { amount: string; payment_date: string; payment_mode: string; notes?: string }) => {
      if (!editingFee) throw new Error('No fee transaction selected');
      const fd = new FormData();
      fd.append('amount', values.amount);
      fd.append('payment_date', values.payment_date);
      fd.append('payment_mode', values.payment_mode);
      if (values.notes !== undefined) fd.append('notes', values.notes);
      if (editFeeFile) {
        fd.append('screenshot', editFeeFile);
      }
      return studentsApi.updateFee(id, Number(editingFee.id), fd);
    },
    onSuccess: () => {
      toast.success('Fee transaction updated');
      qc.invalidateQueries({ queryKey: ['student-fees', id] });
      qc.invalidateQueries({ queryKey: ['student', id] });
      setEditFeeOpen(false);
      setEditingFee(null);
      setEditFeeFile(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteFee = useMutation({
    mutationFn: (feeId: number) => studentsApi.deleteFee(id, feeId),
    onSuccess: () => {
      toast.success('Fee transaction deleted');
      qc.invalidateQueries({ queryKey: ['student-fees', id] });
      qc.invalidateQueries({ queryKey: ['student', id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const addProduct = useMutation({
    mutationFn: (values: { product_id: string; quantity: string; purchase_date?: string; notes?: string }) =>
      studentsApi.addProduct(id, {
        product_id: Number(values.product_id),
        quantity: Number(values.quantity),
        purchase_date: values.purchase_date || new Date().toISOString().slice(0, 10),
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Product sale recorded');
      qc.invalidateQueries({ queryKey: ['student-products', id] });
      productForm.reset({
        product_id: '',
        quantity: '1',
        purchase_date: new Date().toISOString().slice(0, 10),
        notes: '',
      });
      setSelectedProduct(null);
      setProductSearch('');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateProduct = useMutation({
    mutationFn: (values: { quantity: string; purchase_date: string; payment_mode?: string; notes?: string }) => {
      if (!editingProduct) throw new Error('No product sale selected');
      return studentsApi.updateProduct(id, Number(editingProduct.id), {
        quantity: Number(values.quantity),
        purchase_date: values.purchase_date,
        payment_mode: values.payment_mode,
        notes: values.notes,
      });
    },
    onSuccess: () => {
      toast.success('Product purchase updated');
      qc.invalidateQueries({ queryKey: ['student-products', id] });
      setEditProductOpen(false);
      setEditingProduct(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteProduct = useMutation({
    mutationFn: (spId: number) => studentsApi.deleteProduct(id, spId),
    onSuccess: () => {
      toast.success('Product purchase deleted');
      qc.invalidateQueries({ queryKey: ['student-products', id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const uploadPhoto = useMutation({
    mutationFn: (file: File) => studentsApi.uploadPhoto(id, file),
    onSuccess: () => {
      toast.success('Photo updated');
      qc.invalidateQueries({ queryKey: ['student', id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // Document Mutations
  const addDocMutation = useMutation({
    mutationFn: async () => {
      if (!docFile) throw new Error('Please select or capture a document file/photo');
      const titleToUse = docType === 'Other' ? (customDocTitle || 'Other Document') : docType;
      const fd = new FormData();
      fd.append('title', titleToUse);
      fd.append('file', docFile);
      return studentsApi.addDocument(id, fd);
    },
    onSuccess: () => {
      toast.success('Document uploaded successfully');
      qc.invalidateQueries({ queryKey: ['student-docs', id] });
      setUploadDocOpen(false);
      setDocType('Aadhar Card');
      setCustomDocTitle('');
      setDocFile(null);
      setDocFileKey((k) => k + 1);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateDocMutation = useMutation({
    mutationFn: async () => {
      if (!editingDoc) throw new Error('No document selected');
      const titleToUse = editDocType === 'Other' ? (editCustomDocTitle || 'Other Document') : editDocType;
      const fd = new FormData();
      fd.append('title', titleToUse);
      if (editDocFile) {
        fd.append('file', editDocFile);
      }
      return studentsApi.updateDocument(id, Number(editingDoc.id), fd);
    },
    onSuccess: () => {
      toast.success('Document updated successfully');
      qc.invalidateQueries({ queryKey: ['student-docs', id] });
      setEditDocOpen(false);
      setEditingDoc(null);
      setEditDocFile(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId: number) => studentsApi.deleteDocument(id, docId),
    onSuccess: () => {
      toast.success('Document deleted');
      qc.invalidateQueries({ queryKey: ['student-docs', id] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleEditStudentClick = () => {
    if (!student) return;
    editStudentForm.reset({
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      phone: student.phone || '',
      email: student.email || '',
      age: student.age != null ? String(student.age) : '',
      designation: student.designation || '',
      admission_date: student.admission_date
        ? new Date(student.admission_date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      address_line1: student.address_line1 || '',
      address_line2: student.address_line2 || '',
      city: student.city || '',
      batch_id: student.batch_id ? String(student.batch_id) : 'none',
      fees_committed: student.fees_committed != null ? String(student.fees_committed) : '',
    });
    setSameAddress(false);
    setEditStudentOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEditFeeClick = (f: any) => {
    setEditingFee(f);
    editFeeForm.reset({
      amount: String(f.amount || ''),
      payment_date: f.payment_date ? new Date(f.payment_date).toISOString().slice(0, 10) : '',
      payment_mode: f.payment_mode || 'upi',
      notes: f.notes || '',
    });
    setEditFeeFile(null);
    setEditFeeFileKey((k) => k + 1);
    setEditFeeOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEditProductClick = (p: any) => {
    setEditingProduct(p);
    editProductForm.reset({
      quantity: String(p.quantity || '1'),
      purchase_date: p.purchase_date ? new Date(p.purchase_date).toISOString().slice(0, 10) : '',
      payment_mode: p.payment_mode || 'cash',
      notes: p.notes || '',
    });
    setEditProductOpen(true);
  };

  if (isLoading) return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 col-span-2 w-full" />
      </div>
    </div>
  );

  if (!student) return (
    <div className="p-8 text-center space-y-4">
      <p className="text-lg font-medium text-muted-foreground">Student not found</p>
      <Button asChild variant="outline"><Link href="/sun/students">Back to Students</Link></Button>
    </div>
  );

  // Compute Product Profits metrics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalProductsSold = purchases?.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0) || 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalCostPrice = purchases?.reduce((sum: number, item: any) => sum + (Number(item.unit_cost_price || 0) * Number(item.quantity || 0)), 0) || 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalSellingPrice = purchases?.reduce((sum: number, item: any) => sum + Number(item.total_amount || 0), 0) || 0;
  const totalProfit = totalSellingPrice - totalCostPrice;
  const totalProfitPercent = totalCostPrice > 0 ? ((totalProfit * 100) / totalCostPrice).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Top Professional Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-card border border-border/60 shadow-xs">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground">
            <Link href="/sun/students"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {student.first_name} {student.last_name}
              </h1>
              <Badge variant={student.status === 'active' ? 'success' : 'secondary'} className="capitalize font-semibold text-xs px-2.5 py-0.5">
                {student.status}
              </Badge>
            </div>
            <p className="font-mono text-xs text-muted-foreground mt-0.5">ID: {student.student_code} • {student.batch_name || 'No Batch'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button variant="outline" size="sm" onClick={handleEditStudentClick} className="h-9 text-xs font-semibold px-3.5">
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Profile
          </Button>
          <Button size="sm" onClick={() => setCollectFeesOpen(true)} className="h-9 text-xs font-semibold px-4 shadow-sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Collect Fees
          </Button>
        </div>
      </div>

      {/* Edit Student Dialog */}
      <Dialog open={editStudentOpen} onOpenChange={setEditStudentOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Student Details</DialogTitle></DialogHeader>
          <form onSubmit={editStudentForm.handleSubmit((v) => updateStudentMutation.mutate(v))} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>First name *</Label><Input {...editStudentForm.register('first_name')} /></div>
              <div className="space-y-1"><Label>Last name</Label><Input {...editStudentForm.register('last_name')} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Phone *</Label><Input {...editStudentForm.register('phone')} /></div>
              <div className="space-y-1"><Label>Email</Label><Input {...editStudentForm.register('email')} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Age</Label><Input type="number" placeholder="e.g. 24" {...editStudentForm.register('age')} /></div>
              <div className="space-y-1"><Label>Designation</Label><Input placeholder="e.g. Student" {...editStudentForm.register('designation')} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Date of Admission</Label><Input type="date" {...editStudentForm.register('admission_date')} /></div>
              <div className="space-y-1"><Label>City</Label><Input {...editStudentForm.register('city')} /></div>
            </div>

            <div className="space-y-1">
              <Label>Permanent Address</Label>
              <Input placeholder="Address Line 1" {...editStudentForm.register('address_line1')} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>Current Address</Label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sameAddress}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSameAddress(checked);
                      if (checked) {
                        const perm = editStudentForm.getValues('address_line1');
                        editStudentForm.setValue('address_line2', perm);
                      }
                    }}
                    className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <span>Same as Permanent Address</span>
                </label>
              </div>
              <Input placeholder="Address Line 2" {...editStudentForm.register('address_line2')} />
            </div>

            <div className="space-y-1">
              <Label>Batch</Label>
              <Select
                value={editStudentForm.watch('batch_id') || 'none'}
                onValueChange={(v) => {
                  editStudentForm.setValue('batch_id', v);
                  if (v === 'none') {
                    editStudentForm.setValue('fees_committed', '');
                  } else {
                    const selectedBatch = batches?.find((b) => String(b.id) === v);
                    if (selectedBatch) {
                      const feeToSet = selectedBatch.offer_fee ?? selectedBatch.course_fee;
                      if (feeToSet != null) {
                        editStudentForm.setValue('fees_committed', String(feeToSet));
                      }
                    }
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {batches?.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name} ({formatCurrency(b.offer_fee ?? b.course_fee)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Fees committed (₹)</Label>
              <Input type="number" step="0.01" {...editStudentForm.register('fees_committed')} />
            </div>

            <Button type="submit" className="w-full mt-2" disabled={updateStudentMutation.isPending}>
              Update Student
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Collect Fees Pop-up Dialog */}
      <Dialog open={collectFeesOpen} onOpenChange={setCollectFeesOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Collect Fees</DialogTitle></DialogHeader>
          <form onSubmit={collectFeeForm.handleSubmit((v) => addFee.mutate(v))} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Amount (₹) *</Label>
                <Input type="number" step="0.01" placeholder="0.00" {...collectFeeForm.register('amount', { required: true })} />
              </div>
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input type="date" {...collectFeeForm.register('payment_date', { required: true })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Payment Mode</Label>
                <Select
                  value={collectFeeForm.watch('payment_mode')}
                  onValueChange={(v) => collectFeeForm.setValue('payment_mode', v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Vendor (Optional)</Label>
                <Select
                  value={collectFeeForm.watch('vendor_id')}
                  onValueChange={(v) => collectFeeForm.setValue('vendor_id', v)}
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
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  {...collectFeeForm.register('mark_as_expense')}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                />
                <span>Mark this as Expense</span>
              </label>
              <p className="text-[11px] text-muted-foreground ml-6 mt-0.5">
                Adds this payment as an expense in the Expenses module
              </p>
            </div>

            <div className="space-y-1">
              <Label>Notes / Reference</Label>
              <Textarea rows={2} placeholder="Optional notes or transaction reference" {...collectFeeForm.register('notes')} />
            </div>

            <div className="space-y-1">
              <Label>Proof / Screenshot (Optional)</Label>
              <Input
                key={paymentFileKey}
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setPaymentFile(e.target.files?.[0] || null)}
              />
            </div>

            <Button type="submit" className="w-full mt-2" disabled={addFee.isPending}>
              Collect Fees
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upload Document Pop-up Dialog */}
      <Dialog open={uploadDocOpen} onOpenChange={setUploadDocOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Upload Student Document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Select Document Type *</Label>
              <div className="grid grid-cols-2 gap-2">
                {DOC_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDocType(t)}
                    className={`px-3 py-2 text-xs rounded-lg border text-left font-medium transition-all ${
                      docType === t
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border bg-card hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {docType === 'Other' && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Document Name *</Label>
                <Input
                  placeholder="Enter document title (e.g. Birth Certificate)"
                  value={customDocTitle}
                  onChange={(e) => setCustomDocTitle(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2 pt-1 border-t border-border/60">
              <Label className="text-xs font-medium">Upload Document Options *</Label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-center space-y-1">
                  <ImageIcon className="h-6 w-6 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Upload File / Photo</span>
                  <span className="text-[10px] text-muted-foreground">From Files or Gallery</span>
                  <input
                    key={docFileKey}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setDocFile(e.target.files[0]);
                    }}
                  />
                </label>

                <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-center space-y-1">
                  <Camera className="h-6 w-6 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Capture Photo</span>
                  <span className="text-[10px] text-muted-foreground">Take with Camera</span>
                  <input
                    key={`cam-${docFileKey}`}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setDocFile(e.target.files[0]);
                    }}
                  />
                </label>
              </div>

              {docFile && (
                <div className="p-2.5 bg-muted/40 rounded-lg text-xs flex items-center justify-between font-medium">
                  <span className="truncate max-w-[200px]">{docFile.name}</span>
                  <span className="text-primary text-[11px]">{(docFile.size / 1024).toFixed(0)} KB</span>
                </div>
              )}
            </div>

            <Button
              type="button"
              className="w-full mt-2"
              disabled={addDocMutation.isPending || !docFile}
              onClick={() => addDocMutation.mutate()}
            >
              Upload Document
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit / Change Document Dialog */}
      <Dialog open={editDocOpen} onOpenChange={setEditDocOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Change / Re-take Document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Document Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {DOC_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEditDocType(t)}
                    className={`px-3 py-2 text-xs rounded-lg border text-left font-medium transition-all ${
                      editDocType === t
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border bg-card hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {editDocType === 'Other' && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Document Name *</Label>
                <Input
                  placeholder="Enter document title"
                  value={editCustomDocTitle}
                  onChange={(e) => setEditCustomDocTitle(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2 pt-1 border-t border-border/60">
              <Label className="text-xs font-medium">Re-take / Replace File (Optional)</Label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-center space-y-1">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <span className="text-xs font-semibold">Choose New File</span>
                  <input
                    key={editDocFileKey}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setEditDocFile(e.target.files[0]);
                    }}
                  />
                </label>

                <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-center space-y-1">
                  <Camera className="h-5 w-5 text-primary" />
                  <span className="text-xs font-semibold">Re-take Photo</span>
                  <input
                    key={`edit-cam-${editDocFileKey}`}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setEditDocFile(e.target.files[0]);
                    }}
                  />
                </label>
              </div>

              {editDocFile && (
                <div className="p-2 bg-muted/40 rounded-lg text-xs flex items-center justify-between font-medium">
                  <span className="truncate max-w-[200px]">{editDocFile.name}</span>
                  <span className="text-primary text-[11px]">{(editDocFile.size / 1024).toFixed(0)} KB</span>
                </div>
              )}
            </div>

            <Button
              type="button"
              className="w-full mt-2"
              disabled={updateDocMutation.isPending}
              onClick={() => updateDocMutation.mutate()}
            >
              Update Document
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side Student Overview Card (4 Cols on lg) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border border-border/60 shadow-sm overflow-hidden bg-card">
            {/* Header Accent Bar */}
            <div className="h-20 bg-gradient-to-r from-primary/30 via-primary/15 to-accent/30 relative" />

            <CardContent className="flex flex-col items-center gap-4 px-5 pb-5 -mt-12 relative">
              {/* Profile Avatar with Camera Trigger */}
              <div className="relative group">
                <div className="h-24 w-24 overflow-hidden rounded-2xl bg-card border-4 border-card shadow-lg flex items-center justify-center">
                  {student.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`http://localhost:5001${student.photo_url}`} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-primary bg-primary/10">
                      {student.first_name.charAt(0)}
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-md cursor-pointer hover:scale-110 transition-transform" title="Upload photo">
                  <Camera className="h-3.5 w-3.5" />
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadPhoto.mutate(e.target.files[0])}
                  />
                </label>
              </div>

              {/* Student Title & Code */}
              <div className="text-center space-y-1 w-full">
                <h2 className="font-display text-xl font-bold text-foreground">
                  {student.first_name} {student.last_name}
                </h2>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full font-medium">
                    {student.student_code}
                  </span>
                  <Badge variant={student.status === 'active' ? 'success' : 'secondary'} className="capitalize text-[11px]">
                    {student.status}
                  </Badge>
                </div>
              </div>

              {/* Personal Details Structured Box */}
              <div className="w-full rounded-xl bg-muted/30 border border-border/50 p-3.5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground/70" /> Phone</span>
                  <span className="font-semibold text-foreground">{student.phone}</span>
                </div>
                {student.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground/70" /> Email</span>
                    <span className="font-medium text-foreground truncate max-w-[150px]">{student.email}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5 text-muted-foreground/70" /> Batch</span>
                  <span className="font-semibold text-primary">{student.batch_name || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-muted-foreground/70" /> Age</span>
                  <span className="font-medium">{student.age || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-muted-foreground/70" /> Designation</span>
                  <span className="font-medium">{student.designation || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-muted-foreground/70" /> Admission Date</span>
                  <span className="font-medium">{student.admission_date ? formatDate(student.admission_date) : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Building className="h-3.5 w-3.5 text-muted-foreground/70" /> City</span>
                  <span className="font-medium">{student.city || '—'}</span>
                </div>
                <div className="flex flex-col gap-0.5 pt-1.5 border-t border-border/40">
                  <span className="text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground/70" /> Permanent Address</span>
                  <span className="font-medium text-foreground pl-5">{student.address_line1 || '—'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground/70" /> Current Address</span>
                  <span className="font-medium text-foreground pl-5">{student.address_line2 || student.address_line1 || '—'}</span>
                </div>
              </div>

              {/* Financial Fee Summary Grid */}
              <div className="w-full space-y-2 pt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fee Financial Overview</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-card border border-border/60 shadow-2xs">
                    <p className="text-[11px] font-medium text-muted-foreground">Committed</p>
                    <p className="font-bold text-sm text-foreground mt-0.5">{formatCurrency(student.fees_committed)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-2xs">
                    <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Collected</p>
                    <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(student.fees_paid)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 shadow-2xs">
                    <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">Pending</p>
                    <p className="font-bold text-sm text-rose-600 dark:text-rose-400 mt-0.5">{formatCurrency(student.pending_fees)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-2xs">
                    <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Expense</p>
                    <p className="font-bold text-sm text-amber-700 dark:text-amber-400 mt-0.5">{formatCurrency(student.expense_amount || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Product Profits Highlight Section */}
              <div className="w-full pt-2 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Product Profits
                  </span>
                  <Badge variant="outline" className="text-[11px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold bg-emerald-500/5">
                    +{totalProfitPercent}% profit
                  </Badge>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-br from-card to-muted/30 border border-border/60 shadow-2xs space-y-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">Products Sold</span><span className="font-semibold text-foreground">{totalProductsSold}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Cost Price</span><span className="font-medium">{formatCurrency(totalCostPrice)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Selling Price</span><span className="font-medium">{formatCurrency(totalSellingPrice)}</span></div>
                  <div className="flex justify-between pt-1.5 border-t border-border/50 font-bold text-sm">
                    <span className="text-foreground">Total Profit</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(totalProfit)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Main Content Area (8 Cols on lg) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Segmented Control Tabs */}
          <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-xl border border-border/50 max-w-fit">
            <button
              onClick={() => setTab('fees')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === 'fees'
                  ? 'bg-card text-primary shadow-xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Wallet className="h-4 w-4" />
              <span>Fees</span>
              {fees?.length ? <Badge variant="secondary" className="px-1.5 py-0 text-[10px] ml-1">{fees.length}</Badge> : null}
            </button>

            <button
              onClick={() => setTab('products')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === 'products'
                  ? 'bg-card text-primary shadow-xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Products</span>
              {purchases?.length ? <Badge variant="secondary" className="px-1.5 py-0 text-[10px] ml-1">{purchases.length}</Badge> : null}
            </button>

            <button
              onClick={() => setTab('documents')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === 'documents'
                  ? 'bg-card text-primary shadow-xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Documents</span>
              {docs?.length ? <Badge variant="secondary" className="px-1.5 py-0 text-[10px] ml-1">{docs.length}</Badge> : null}
            </button>
          </div>

          {tab === 'fees' && (
            <>
              {/* Edit Fee Dialog */}
              <Dialog open={editFeeOpen} onOpenChange={setEditFeeOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader><DialogTitle>Edit Fee Transaction</DialogTitle></DialogHeader>
                  <form onSubmit={editFeeForm.handleSubmit((v) => updateFee.mutate(v))} className="space-y-3">
                    <div className="space-y-1">
                      <Label>Amount (₹) *</Label>
                      <Input type="number" step="0.01" {...editFeeForm.register('amount', { required: true })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Payment Date *</Label>
                      <Input type="date" {...editFeeForm.register('payment_date', { required: true })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Payment Mode</Label>
                      <Select
                        value={editFeeForm.watch('payment_mode')}
                        onValueChange={(v) => editFeeForm.setValue('payment_mode', v)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>New Proof / Screenshot (optional)</Label>
                      <Input
                        key={editFeeFileKey}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setEditFeeFile(e.target.files?.[0] || null)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Notes</Label>
                      <Textarea rows={2} {...editFeeForm.register('notes')} />
                    </div>
                    <Button type="submit" className="w-full mt-2" disabled={updateFee.isPending}>
                      Update Fee
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Card className="border border-border/60 shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
                  <div>
                    <CardTitle className="text-base font-semibold">Payment History</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Recorded fee transactions and payment receipts</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => setCollectFeesOpen(true)} size="sm" className="h-9">
                      <Plus className="h-4 w-4 mr-1.5" /> Collect Fees
                    </Button>
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
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  {/* Grid View */}
                  <div className={
                    viewMode === 'grid'
                      ? 'grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                      : viewMode === 'table'
                      ? 'hidden'
                      : 'grid gap-3 grid-cols-1 sm:grid-cols-2 md:hidden'
                  }>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {fees?.map((f: any) => (
                      <div key={f.id} className="p-4 border border-border/60 rounded-xl bg-card hover:border-primary/40 transition-all space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">{formatCurrency(f.amount)}</span>
                          <Badge variant="outline" className="capitalize text-[11px] font-medium">{f.payment_mode}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex justify-between pt-1 border-t border-border/40">
                          <span>Payment Date</span>
                          <span className="font-medium text-foreground">{formatDate(f.payment_date)}</span>
                        </div>
                        {f.screenshot_url && (
                          <div className="pt-0.5">
                            <a
                              href={f.screenshot_url.startsWith('http') ? f.screenshot_url : `http://localhost:5001${f.screenshot_url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                            >
                              <FileText className="h-3.5 w-3.5" /> View Proof Receipt
                            </a>
                          </div>
                        )}
                        <div className="flex gap-2 pt-2 border-t border-border/50">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs h-7"
                            onClick={() => handleEditFeeClick(f)}
                          >
                            <Pencil className="h-3 w-3 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm('Delete fee transaction?')) deleteFee.mutate(f.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                    {!fees?.length && (
                      <p className="py-8 text-center text-xs text-muted-foreground col-span-full">No payment records found</p>
                    )}
                  </div>

                  {/* Table View */}
                  <div className={
                    viewMode === 'table'
                      ? 'overflow-x-auto border border-border/60 rounded-xl shadow-2xs'
                      : viewMode === 'grid'
                      ? 'hidden'
                      : 'hidden md:block overflow-x-auto border border-border/60 rounded-xl shadow-2xs'
                  }>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40 text-left text-muted-foreground text-xs uppercase tracking-wider">
                          <th className="px-4 py-3 font-semibold">Date</th>
                          <th className="px-4 py-3 font-semibold">Amount</th>
                          <th className="px-4 py-3 font-semibold">Payment Mode</th>
                          <th className="px-4 py-3 font-semibold">Proof</th>
                          <th className="px-4 py-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {fees?.map((f: any) => (
                          <tr key={f.id} className="border-b border-border/40 hover:bg-muted/20 text-xs transition-colors">
                            <td className="px-4 py-3.5 font-medium">{formatDate(f.payment_date)}</td>
                            <td className="px-4 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(f.amount)}</td>
                            <td className="px-4 py-3.5 capitalize"><Badge variant="outline" className="text-[11px] font-medium">{f.payment_mode}</Badge></td>
                            <td className="px-4 py-3.5">
                              {f.screenshot_url ? (
                                <a
                                  href={f.screenshot_url.startsWith('http') ? f.screenshot_url : `http://localhost:5001${f.screenshot_url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                                >
                                  <FileText className="h-3.5 w-3.5" /> View Proof
                                </a>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit fee" onClick={() => handleEditFeeClick(f)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Delete fee"
                                  onClick={() => {
                                    if (confirm('Delete fee transaction?')) deleteFee.mutate(f.id);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!fees?.length && (
                          <tr><td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">No payments recorded</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'products' && (
            <>
              <Card className="relative overflow-visible border border-border/60 shadow-xs">
                <CardHeader className="p-4 sm:p-6 pb-2">
                  <CardTitle className="text-base font-semibold">Sell Product to Student</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <form
                    onSubmit={productForm.handleSubmit((v) => addProduct.mutate(v))}
                    className="grid gap-3 sm:grid-cols-4"
                  >
                    {/* Searchable Product Selection Combobox */}
                    <div className="space-y-1 sm:col-span-2 relative">
                      <Label className="text-xs font-medium">Select Product *</Label>
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Search product name, SKU or vendor..."
                          value={selectedProduct ? `${selectedProduct.name} (${formatCurrency(selectedProduct.selling_price)})` : productSearch}
                          onChange={(e) => {
                            setProductSearch(e.target.value);
                            setSelectedProduct(null);
                            productForm.setValue('product_id', '');
                            setProductDropdownOpen(true);
                          }}
                          onFocus={() => setProductDropdownOpen(true)}
                          className="w-full pr-8 text-xs sm:text-sm"
                        />
                        {selectedProduct && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProduct(null);
                              setProductSearch('');
                              productForm.setValue('product_id', '');
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Search Results Dropdown List */}
                      {productDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-xl py-1">
                          {filteredProducts.length > 0 ? (
                            filteredProducts.map((p) => (
                              <div
                                key={p.id}
                                onClick={() => {
                                  setSelectedProduct(p);
                                  productForm.setValue('product_id', String(p.id));
                                  setProductDropdownOpen(false);
                                }}
                                className="px-3.5 py-2.5 text-xs hover:bg-accent hover:text-accent-foreground cursor-pointer border-b border-border/40 last:border-0 transition-colors"
                              >
                                <div className="flex items-center justify-between font-semibold text-foreground">
                                  <span>{p.name}</span>
                                  <span className="font-bold text-primary">{formatCurrency(p.selling_price)}</span>
                                </div>
                                <div style={{ color: '#666666' }} className="text-[11px] mt-0.5 flex justify-between font-normal">
                                  <span>Vendor: {p.vendor_name || 'None'}</span>
                                  <span>Stock: {p.quantity_available}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-3.5 py-3 text-xs text-muted-foreground text-center">
                              No products found matching &quot;{productSearch}&quot;
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Quantity</Label>
                      <Input type="number" min="1" {...productForm.register('quantity')} className="text-xs sm:text-sm" />
                    </div>

                    <div className="flex items-end">
                      <Button type="submit" className="w-full h-9 text-xs font-semibold" disabled={addProduct.isPending || !productForm.watch('product_id')}>
                        Record Sale
                      </Button>
                    </div>

                    <div className="space-y-1 sm:col-span-4">
                      <Label className="text-xs font-medium">Notes (Optional)</Label>
                      <Input
                        placeholder="Optional sale notes or transaction reference"
                        {...productForm.register('notes')}
                        className="text-xs sm:text-sm"
                      />
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Edit Product Purchase Dialog */}
              <Dialog open={editProductOpen} onOpenChange={setEditProductOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader><DialogTitle>Edit Product Purchase</DialogTitle></DialogHeader>
                  <form onSubmit={editProductForm.handleSubmit((v) => updateProduct.mutate(v))} className="space-y-3">
                    <div className="space-y-1">
                      <Label>Quantity *</Label>
                      <Input type="number" min="1" {...editProductForm.register('quantity', { required: true })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Purchase Date *</Label>
                      <Input type="date" {...editProductForm.register('purchase_date', { required: true })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Payment Mode</Label>
                      <Select
                        value={editProductForm.watch('payment_mode')}
                        onValueChange={(v) => editProductForm.setValue('payment_mode', v)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Notes</Label>
                      <Textarea rows={2} {...editProductForm.register('notes')} />
                    </div>
                    <Button type="submit" className="w-full mt-2" disabled={updateProduct.isPending}>
                      Update Purchase
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Card className="border border-border/60 shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
                  <div>
                    <CardTitle className="text-base font-semibold">Product Purchases</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Purchased items and profit calculations</p>
                  </div>
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
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  {/* Grid View */}
                  <div className={
                    viewMode === 'grid'
                      ? 'grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                      : viewMode === 'table'
                      ? 'hidden'
                      : 'grid gap-3 grid-cols-1 sm:grid-cols-2 md:hidden'
                  }>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {purchases?.map((p: any) => {
                      const costUnit = Number(p.unit_cost_price || 0);
                      const sellUnit = Number(p.unit_selling_price || 0);
                      const qty = Number(p.quantity || 0);
                      const totalSelling = Number(p.total_amount || sellUnit * qty);
                      const totalProf = (sellUnit - costUnit) * qty;
                      const profPct = costUnit > 0 ? (((sellUnit - costUnit) * 100) / costUnit).toFixed(1) : '0';

                      return (
                        <div key={p.id} className="p-4 border border-border/60 rounded-xl bg-card hover:border-primary/40 transition-all space-y-2.5 text-xs shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-foreground">{p.product_name}</span>
                            <Badge variant="secondary" className="font-semibold">{p.quantity} units</Badge>
                          </div>
                          <div style={{ color: '#666666' }} className="text-[11px] font-medium -mt-1">
                            Vendor: {p.vendor_name || '—'}
                          </div>

                          <div className="space-y-1 pt-2 border-t border-border/40">
                            <div className="flex justify-between"><span className="text-muted-foreground">Cost Price / unit</span><span className="font-medium">{formatCurrency(costUnit)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Selling Price / unit</span><span className="font-medium">{formatCurrency(sellUnit)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Total Selling Price</span><span className="font-semibold text-foreground">{formatCurrency(totalSelling)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Total Profit</span><span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalProf)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Profit %</span><span className="font-bold text-emerald-600 dark:text-emerald-400">{profPct}%</span></div>
                          </div>

                          <div className="flex gap-2 pt-2 border-t border-border/50">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs h-7"
                              onClick={() => handleEditProductClick(p)}
                            >
                              <Pencil className="h-3 w-3 mr-1" /> Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (confirm('Delete product purchase?')) deleteProduct.mutate(p.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {!purchases?.length && (
                      <p className="py-8 text-center text-xs text-muted-foreground col-span-full">No products purchased</p>
                    )}
                  </div>

                  {/* Table View */}
                  <div className={
                    viewMode === 'table'
                      ? 'overflow-x-auto border border-border/60 rounded-xl shadow-2xs'
                      : viewMode === 'grid'
                      ? 'hidden'
                      : 'hidden md:block overflow-x-auto border border-border/60 rounded-xl shadow-2xs'
                  }>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40 text-left text-muted-foreground text-xs uppercase tracking-wider">
                          <th className="px-4 py-3 font-semibold">Product Name</th>
                          <th className="px-4 py-3 font-semibold">Vendor Name</th>
                          <th className="px-4 py-3 font-semibold">Cost Price/unit</th>
                          <th className="px-4 py-3 font-semibold">Selling Price/unit</th>
                          <th className="px-4 py-3 font-semibold">Qty</th>
                          <th className="px-4 py-3 font-semibold">Total Selling Price</th>
                          <th className="px-4 py-3 font-semibold">Total Profit</th>
                          <th className="px-4 py-3 font-semibold">Profit %</th>
                          <th className="px-4 py-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {purchases?.map((p: any) => {
                          const costUnit = Number(p.unit_cost_price || 0);
                          const sellUnit = Number(p.unit_selling_price || 0);
                          const qty = Number(p.quantity || 0);
                          const totalSelling = Number(p.total_amount || sellUnit * qty);
                          const totalProf = (sellUnit - costUnit) * qty;
                          const profPct = costUnit > 0 ? (((sellUnit - costUnit) * 100) / costUnit).toFixed(1) : '0';

                          return (
                            <tr key={p.id} className="border-b border-border/40 hover:bg-muted/20 text-xs transition-colors">
                              <td className="px-4 py-3.5 font-bold text-foreground">{p.product_name}</td>
                              <td className="px-4 py-3.5 text-muted-foreground">{p.vendor_name || '—'}</td>
                              <td className="px-4 py-3.5">{formatCurrency(costUnit)}</td>
                              <td className="px-4 py-3.5">{formatCurrency(sellUnit)}</td>
                              <td className="px-4 py-3.5 font-semibold"><Badge variant="secondary">{p.quantity}</Badge></td>
                              <td className="px-4 py-3.5 font-semibold">{formatCurrency(totalSelling)}</td>
                              <td className="px-4 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalProf)}</td>
                              <td className="px-4 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">{profPct}%</td>
                              <td className="px-4 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit purchase" onClick={() => handleEditProductClick(p)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    title="Delete purchase"
                                    onClick={() => {
                                      if (confirm('Delete product purchase?')) deleteProduct.mutate(p.id);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {!purchases?.length && (
                          <tr><td colSpan={9} className="py-8 text-center text-xs text-muted-foreground">No products purchased</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'documents' && (
            <Card className="border border-border/60 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
                <div>
                  <CardTitle className="text-base font-semibold">Student Documents</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Uploaded proofs, IDs, and student documents</p>
                </div>
                <Button size="sm" onClick={() => setUploadDocOpen(true)} className="h-9">
                  <Plus className="h-4 w-4 mr-1.5" /> Upload Document
                </Button>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {docs?.map((d: any) => {
                  const fullUrl = d.file_url?.startsWith('http') ? d.file_url : `http://localhost:5001${d.file_url}`;
                  const isImage = d.file_type?.startsWith('image/') || d.file_url?.match(/\.(jpg|jpeg|png|webp|gif)$/i);

                  return (
                    <div
                      key={d.id}
                      onClick={() => window.open(fullUrl, '_blank')}
                      className="p-4 border border-border/60 rounded-xl bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer space-y-3 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-semibold text-xs text-primary border-primary/30 px-3 py-0.5 bg-primary/5">
                            {d.title || d.document_type || 'Document'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatDate(d.created_at)}</span>
                        </div>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2.5"
                            onClick={() => {
                              setEditingDoc(d);
                              setEditDocType(d.title && DOC_TYPES.includes(d.title) ? d.title : 'Other');
                              setEditCustomDocTitle(d.title || '');
                              setEditDocFile(null);
                              setEditDocFileKey((k) => k + 1);
                              setEditDocOpen(true);
                            }}
                          >
                            <Pencil className="h-3 w-3 mr-1" /> Change (Re-take)
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (confirm('Delete this document?')) deleteDocMutation.mutate(d.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5">
                        {isImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={fullUrl} alt="" className="h-16 w-16 object-cover rounded-xl border border-border shrink-0 shadow-2xs" />
                        ) : (
                          <div className="h-16 w-16 rounded-xl border border-border bg-muted/50 flex items-center justify-center text-primary shrink-0">
                            <FileText className="h-7 w-7" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{d.title || 'Document'}</p>
                          <p className="text-xs text-primary hover:underline flex items-center gap-1 mt-1 font-medium">
                            <FileText className="h-3.5 w-3.5" /> Click anywhere on card to view full document
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!docs?.length && (
                  <p className="py-10 text-center text-xs text-muted-foreground">No documents uploaded yet</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
