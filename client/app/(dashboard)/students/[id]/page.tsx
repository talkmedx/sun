'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { studentsApi, productsApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Badge, Skeleton } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';
import { useState } from 'react';

export default function StudentProfilePage() {
  const params = useParams();
  const id = Number(params.id);
  const qc = useQueryClient();
  const [tab, setTab] = useState<'fees' | 'products' | 'documents'>('fees');

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => (await studentsApi.get(id)).data.data,
  });

  const { data: fees } = useQuery({
    queryKey: ['student-fees', id],
    queryFn: async () => (await studentsApi.fees(id)).data.data,
    enabled: tab === 'fees',
  });

  const { data: purchases } = useQuery({
    queryKey: ['student-products', id],
    queryFn: async () => (await studentsApi.products(id)).data.data,
    enabled: tab === 'products',
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

  const feeForm = useForm({
    defaultValues: {
      amount: '',
      payment_date: new Date().toISOString().slice(0, 10),
      payment_mode: 'upi',
    },
  });
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentFileKey, setPaymentFileKey] = useState(0);
  const productForm = useForm({
    defaultValues: { product_id: '', quantity: '1', purchase_date: new Date().toISOString().slice(0, 10) },
  });

  const addFee = useMutation({
    mutationFn: async (values: { amount: string; payment_date: string; payment_mode: string }) => {
      const fd = new FormData();
      fd.append('amount', values.amount);
      fd.append('payment_date', values.payment_date);
      fd.append('payment_mode', values.payment_mode);
      if (paymentFile) {
        fd.append('screenshot', paymentFile);
      }
      return studentsApi.addFee(id, fd);
    },
    onSuccess: () => {
      toast.success('Fee recorded');
      qc.invalidateQueries({ queryKey: ['student-fees', id] });
      qc.invalidateQueries({ queryKey: ['student', id] });
      feeForm.reset({
        amount: '',
        payment_date: new Date().toISOString().slice(0, 10),
        payment_mode: 'upi',
      });
      setPaymentFile(null);
      setPaymentFileKey((k) => k + 1);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const addProduct = useMutation({
    mutationFn: (values: { product_id: string; quantity: string; purchase_date: string }) =>
      studentsApi.addProduct(id, {
        product_id: Number(values.product_id),
        quantity: Number(values.quantity),
        purchase_date: values.purchase_date,
      }),
    onSuccess: () => {
      toast.success('Product sale recorded');
      qc.invalidateQueries({ queryKey: ['student-products', id] });
      productForm.reset();
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

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!student) return <p>Student not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <Card className="w-full md:w-80">
          <CardContent className="flex flex-col items-center gap-3 p-6">
            <div className="relative h-28 w-28 overflow-hidden rounded-2xl bg-muted">
              {student.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`http://localhost:5001${student.photo_url}`} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-primary">
                  {student.first_name.charAt(0)}
                </div>
              )}
            </div>
            <label className="cursor-pointer text-xs text-primary hover:underline">
              Upload photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadPhoto.mutate(e.target.files[0])}
              />
            </label>
            <div className="text-center">
              <h1 className="font-display text-xl font-semibold">{student.first_name} {student.last_name}</h1>
              <p className="font-mono text-xs text-muted-foreground">{student.student_code}</p>
              <Badge className="mt-2" variant="success">{student.status}</Badge>
            </div>
            <div className="w-full space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{student.phone}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Batch</span><span>{student.batch_name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Committed</span><span>{formatCurrency(student.fees_committed)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span>{formatCurrency(student.fees_paid)}</span></div>
              <div className="flex justify-between font-medium"><span className="text-muted-foreground">Pending</span><span>{formatCurrency(student.pending_fees)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">City</span><span>{student.city || '—'}</span></div>
            </div>
          </CardContent>
        </Card>

        <div className="flex-1 space-y-4">
          <div className="flex gap-2">
            {(['fees', 'products', 'documents'] as const).map((t) => (
              <Button key={t} variant={tab === t ? 'default' : 'outline'} size="sm" onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Button>
            ))}
          </div>

          {tab === 'fees' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Record Payment</CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={feeForm.handleSubmit((v) => addFee.mutate(v))}
                    className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
                  >
                    <div className="space-y-1">
                      <Label>Amount</Label>
                      <Input type="number" step="0.01" {...feeForm.register('amount', { required: true })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Date</Label>
                      <Input type="date" {...feeForm.register('payment_date')} />
                    </div>
                    <div className="space-y-1">
                      <Label>Mode</Label>
                      <Select
                        defaultValue="upi"
                        onValueChange={(v) => feeForm.setValue('payment_mode', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['cash', 'upi', 'card', 'bank_transfer', 'cheque'].map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Attachment</Label>
                      <Input
                        key={paymentFileKey}
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setPaymentFile(e.target.files?.[0] || null)}
                      />
                      {paymentFile && (
                        <p className="truncate text-[11px] text-muted-foreground">{paymentFile.name}</p>
                      )}
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" className="w-full" disabled={addFee.isPending}>
                        {addFee.isPending ? 'Saving...' : 'Add'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Fee History</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Amount</th>
                        <th className="pb-2">Mode</th>
                        <th className="pb-2">FY</th>
                        <th className="pb-2">Attachment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(fees as Array<Record<string, unknown>> | undefined)?.map((f) => (
                        <tr key={String(f.id)} className="border-b border-border/50">
                          <td className="py-2">{formatDate(String(f.payment_date))}</td>
                          <td className="py-2">{formatCurrency(Number(f.amount))}</td>
                          <td className="py-2">{String(f.payment_mode)}</td>
                          <td className="py-2">{String(f.financial_year || '—')}</td>
                          <td className="py-2">
                            {f.screenshot_url ? (
                              <a
                                href={`http://localhost:5001${f.screenshot_url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline"
                              >
                                View
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'products' && (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Sell Product</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={productForm.handleSubmit((v) => addProduct.mutate(v))} className="grid gap-3 sm:grid-cols-4">
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Product</Label>
                      <Select onValueChange={(v) => productForm.setValue('product_id', v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {products?.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.name} (₹{p.selling_price} · stock {p.quantity_available})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label>Qty</Label><Input type="number" {...productForm.register('quantity')} /></div>
                    <div className="flex items-end"><Button type="submit" className="w-full">Sell</Button></div>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Purchase History</CardTitle></CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2">Product</th><th className="pb-2">Qty</th><th className="pb-2">Unit Price</th><th className="pb-2">Total</th><th className="pb-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(purchases as Array<Record<string, unknown>> | undefined)?.map((p) => (
                        <tr key={String(p.id)} className="border-b border-border/50">
                          <td className="py-2">{String(p.product_name)}</td>
                          <td className="py-2">{String(p.quantity)}</td>
                          <td className="py-2">{formatCurrency(Number(p.unit_selling_price))}</td>
                          <td className="py-2">{formatCurrency(Number(p.total_amount))}</td>
                          <td className="py-2">{formatDate(String(p.purchase_date))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'documents' && (
            <Card>
              <CardHeader><CardTitle className="text-base">Documents</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <label className="inline-flex cursor-pointer">
                  <Button type="button" variant="outline" asChild>
                    <span>Upload document</span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const fd = new FormData();
                      fd.append('file', file);
                      fd.append('title', file.name);
                      try {
                        await studentsApi.addDocument(id, fd);
                        toast.success('Uploaded');
                        qc.invalidateQueries({ queryKey: ['student-docs', id] });
                      } catch (err) {
                        toast.error(getErrorMessage(err));
                      }
                    }}
                  />
                </label>
                <ul className="space-y-2 text-sm">
                  {(docs as Array<Record<string, unknown>> | undefined)?.map((d) => (
                    <li key={String(d.id)} className="flex justify-between rounded-lg border p-3">
                      <span>{String(d.title)}</span>
                      <a className="text-primary hover:underline" href={`http://localhost:5001${d.file_url}`} target="_blank" rel="noreferrer">
                        View
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
