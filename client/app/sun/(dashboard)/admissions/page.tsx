'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Search, LayoutGrid, List, Loader2, Link2, MapPin, Eye, Plus, Upload, User, Phone, Mail, Layers, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { admissionsApi, batchesApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Skeleton } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';

import { Pagination } from '@/components/ui/pagination';
import { useDebounce } from '@/hooks/useDebounce';

export default function AdmissionsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [status, setStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'auto' | 'grid' | 'table'>('table');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Pop-up form states
  const [addOpen, setAddOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);

  // Reject modal state
  const [rejectOpen, setRejectOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rejectingAdmission, setRejectingAdmission] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const qc = useQueryClient();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const addForm = useForm({
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      alternate_phone: '',
      email: '',
      date_of_birth: '',
      gender: 'female',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      pincode: '',
      batch_id: 'none',
      preferred_batch_note: '',
    },
  });

  const { data: batches } = useQuery({
    queryKey: ['batches-dropdown'],
    queryFn: async () => (await batchesApi.dropdown()).data.data,
  });

  const { data: admissionsResponse, isLoading } = useQuery({
    queryKey: ['admissions', debouncedSearch, status, page, limit],
    queryFn: async () =>
      (await admissionsApi.list({
        search: debouncedSearch || undefined,
        status: status === 'all' ? undefined : status,
        page,
        limit,
      })).data,
  });

  const allAdmissions = admissionsResponse?.data || [];
  const meta = admissionsResponse?.meta || { page: 1, limit: 10, total: 0, totalPages: 1 };
  const totalCount = meta.total;

  const createAdmissionMutation = useMutation({
    mutationFn: async (v: Record<string, string>) => {
      const fd = new FormData();
      Object.entries(v).forEach(([k, val]) => {
        if (val && val !== 'none') fd.append(k, val);
      });
      if (photoFile) fd.append('photo', photoFile);
      if (proofFile) fd.append('proof', proofFile);
      return admissionsApi.submit(fd);
    },
    onSuccess: () => {
      toast.success('Admission application added');
      qc.invalidateQueries({ queryKey: ['admissions'] });
      qc.invalidateQueries({ queryKey: ['pending-admissions-count'] });
      setAddOpen(false);
      addForm.reset();
      setPhotoFile(null);
      setProofFile(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const approve = useMutation({
    mutationFn: (id: number) => admissionsApi.approve(id),
    onSuccess: () => {
      toast.success('Admission approved — student record created');
      qc.invalidateQueries({ queryKey: ['admissions'] });
      qc.invalidateQueries({ queryKey: ['pending-admissions-count'] });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => admissionsApi.reject(id, reason),
    onSuccess: () => {
      toast.success('Admission application rejected');
      qc.invalidateQueries({ queryKey: ['admissions'] });
      qc.invalidateQueries({ queryKey: ['pending-admissions-count'] });
      setRejectOpen(false);
      setRejectingAdmission(null);
      setRejectionReason('');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const editLink = useMutation({
    mutationFn: (id: number) => admissionsApi.editLink(id),
    onSuccess: (res) => {
      const url = `${window.location.origin}${res.data.data.editUrl}`;
      navigator.clipboard.writeText(url);
      toast.success('Edit link copied to clipboard & opening form');
      window.open(url, '_blank');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const statusVariant = (s: string) => {
    if (s === 'approved') return 'success' as const;
    if (s === 'rejected') return 'destructive' as const;
    if (s === 'pending') return 'warning' as const;
    return 'secondary' as const;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Admissions</h1>
          <p className="text-sm text-muted-foreground">
            Public form:{' '}
            <Link href="/sun/admission" className="text-primary hover:underline" target="_blank">
              /admission
            </Link>
          </p>
        </div>

        {/* Add Admission Pop-up Button */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" /> Add Admission</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader><DialogTitle>New Admission Application</DialogTitle></DialogHeader>
            <form onSubmit={addForm.handleSubmit((v) => createAdmissionMutation.mutate(v))} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>First Name *</Label>
                  <Input {...addForm.register('first_name', { required: true })} />
                </div>
                <div className="space-y-1">
                  <Label>Last Name</Label>
                  <Input {...addForm.register('last_name')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Phone *</Label>
                  <Input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit mobile"
                    {...addForm.register('phone', { required: true })}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      addForm.setValue('phone', val, { shouldValidate: true });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Alternate Phone</Label>
                  <Input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit mobile"
                    {...addForm.register('alternate_phone')}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      addForm.setValue('alternate_phone', val, { shouldValidate: true });
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Email Address</Label>
                <Input type="email" {...addForm.register('email')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Date of Birth</Label>
                  <Input type="date" {...addForm.register('date_of_birth')} />
                </div>
                <div className="space-y-1">
                  <Label>Gender</Label>
                  <Select
                    value={addForm.watch('gender')}
                    onValueChange={(v) => addForm.setValue('gender', v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Batch</Label>
                <Select
                  value={addForm.watch('batch_id')}
                  onValueChange={(v) => addForm.setValue('batch_id', v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {batches?.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1"><Label>City</Label><Input {...addForm.register('city')} /></div>
                <div className="space-y-1"><Label>State</Label><Input {...addForm.register('state')} /></div>
                <div className="space-y-1"><Label>Pincode</Label><Input {...addForm.register('pincode')} /></div>
              </div>

              <div className="space-y-1"><Label>Address Line 1</Label><Input {...addForm.register('address_line1')} /></div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Student Photo</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  />
                  {photoFile && <p className="text-[11px] text-emerald-600 font-medium">{photoFile.name}</p>}
                </div>
                <div className="space-y-1">
                  <Label>ID / Payment Proof</Label>
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  />
                  {proofFile && <p className="text-[11px] text-emerald-600 font-medium">{proofFile.name}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <Label>Preference Note</Label>
                <Textarea rows={2} placeholder="Any specific requirements..." {...addForm.register('preferred_batch_note')} />
              </div>

              <Button type="submit" className="w-full mt-2" disabled={createAdmissionMutation.isPending}>
                {createAdmissionMutation.isPending ? 'Submitting...' : 'Add Admission Application'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Applications</CardTitle>
              {totalCount > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({allAdmissions.length} of {totalCount})
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

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8 h-9 text-xs sm:text-sm w-full"
                placeholder="Search by student name, phone, city, or batch..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[125px] sm:w-40 h-9 text-xs sm:text-sm shrink-0">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                {['pending', 'approved', 'rejected', 'edit_requested'].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {isLoading ? (
            <div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
              </div>
              <div className="hidden md:block space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Card Grid View */}
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'
                  : viewMode === 'table'
                  ? 'hidden'
                  : 'grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden'
              }>
                {allAdmissions.map((a) => (
                  <div key={a.id} className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link href={`/sun/admissions/${a.id}`} className="font-semibold text-base hover:text-primary leading-tight block">
                          {a.first_name} {a.last_name}
                        </Link>
                        <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
                      </div>
                      <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                      <div>
                        <span className="text-muted-foreground block">Phone</span>
                        <span className="font-medium">{a.phone}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Location</span>
                        <span className="font-medium truncate flex items-center gap-0.5">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          {a.city || '—'}{a.state ? `, ${a.state}` : ''}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground block">Batch</span>
                        <span className="font-medium truncate block">{a.batch_name || '—'}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-border/50">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs px-2.5"
                        title="Copy & Open Edit Form Link"
                        onClick={() => editLink.mutate(a.id)}
                        disabled={editLink.isPending}
                      >
                        <Link2 className="h-3.5 w-3.5 mr-1" /> Edit Link
                      </Button>

                      {a.status !== 'approved' && a.status !== 'rejected' && (
                        <div className="flex items-center gap-1">
                          <Button size="sm" className="h-8 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => approve.mutate(a.id)}>
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs px-2.5 text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setRejectingAdmission(a);
                              setRejectionReason('');
                              setRejectOpen(true);
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!allAdmissions.length && (
                  <div className="py-8 text-center text-muted-foreground col-span-full">No admissions found</div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className={
                viewMode === 'table'
                  ? 'overflow-x-auto border rounded-lg'
                  : viewMode === 'grid'
                  ? 'hidden'
                  : 'hidden md:block overflow-x-auto border rounded-lg'
              }>
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Student Name</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Phone</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Location</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Batch</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Status</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Date</th>
                      <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allAdmissions.map((a) => (
                      <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <Link href={`/sun/admissions/${a.id}`} className="font-medium hover:text-primary flex items-center gap-1.5">
                            {a.first_name} {a.last_name}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap font-mono text-xs">{a.phone}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs">
                            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                            {a.city || '—'}{a.state ? `, ${a.state}` : ''}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{a.batch_name || '—'}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground">{formatDate(a.created_at)}</td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs px-2.5"
                              title="Copy & Open Student Edit Link"
                              onClick={() => editLink.mutate(a.id)}
                              disabled={editLink.isPending}
                            >
                              <Link2 className="h-3.5 w-3.5 mr-1" /> Edit Link
                            </Button>

                            <Link href={`/sun/admissions/${a.id}`}>
                              <Button size="sm" variant="secondary" className="h-8 text-xs px-2">
                                <Eye className="h-3.5 w-3.5 mr-1" /> Details
                              </Button>
                            </Link>

                            {a.status !== 'approved' && a.status !== 'rejected' && (
                              <>
                                <Button size="sm" className="h-8 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => approve.mutate(a.id)}>
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs px-2.5 text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    setRejectingAdmission(a);
                                    setRejectionReason('');
                                    setRejectOpen(true);
                                  }}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!allAdmissions.length && (
                      <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No admissions found</td></tr>
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

      {/* Reject Admission Application Dialog Modal */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2 text-base font-semibold">
              <AlertCircle className="h-5 w-5" />
              Reject Admission Application
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Please specify a reason for rejecting {rejectingAdmission ? <strong className="text-foreground">{rejectingAdmission.first_name} {rejectingAdmission.last_name || ''}</strong> : 'this application'}.
            </p>

            {/* Quick suggestion pills */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Quick reasons</Label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Seat unavailable in batch',
                  'Incomplete documentation',
                  'Does not meet eligibility',
                  'Cancelled by applicant',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectionReason(preset)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      rejectionReason === preset
                        ? 'border-destructive bg-destructive/10 text-destructive font-medium'
                        : 'border-border bg-muted/40 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Rejection Reason *</Label>
              <Textarea
                placeholder="Enter detailed reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="text-xs sm:text-sm resize-none"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={reject.isPending || !rejectionReason.trim()}
              onClick={() => {
                if (rejectingAdmission) {
                  reject.mutate({ id: rejectingAdmission.id, reason: rejectionReason.trim() });
                }
              }}
            >
              {reject.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Confirm Rejection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
