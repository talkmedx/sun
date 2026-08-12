'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ArrowLeft, BookOpen, Clock, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { coursesApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Badge, Skeleton } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';

function formatDurationMonths(days: number) {
  const months = (days / 30).toFixed(1).replace(/\.0$/, '');
  return `${days} Days (${months} ${Number(months) === 1 ? 'Month' : 'Months'})`;
}

export default function CourseDetailPage() {
  const id = Number(useParams().id);
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const feeForm = useForm({ defaultValues: { default_fee: '', change_reason: '' } });
  const editForm = useForm({
    defaultValues: {
      name: '',
      duration_days: '90',
      description: '',
      is_active: '1',
    },
  });

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: async () => (await coursesApi.get(id)).data.data,
  });

  const { data: history } = useQuery({
    queryKey: ['course-fee-history', id],
    queryFn: async () => (await coursesApi.feeHistory(id)).data.data,
  });

  const handleEditClick = () => {
    if (!course) return;
    editForm.reset({
      name: course.name || '',
      duration_days: String(course.duration_days || 90),
      description: course.description || '',
      is_active: String(course.is_active ?? 1),
    });
    setEditOpen(true);
  };

  const updateDetails = useMutation({
    mutationFn: (v: Record<string, string>) =>
      coursesApi.update(id, {
        name: v.name,
        duration_days: Number(v.duration_days),
        description: v.description || null,
        is_active: Number(v.is_active),
      }),
    onSuccess: () => {
      toast.success('Course updated');
      qc.invalidateQueries({ queryKey: ['course', id] });
      qc.invalidateQueries({ queryKey: ['courses'] });
      setEditOpen(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateFee = useMutation({
    mutationFn: (v: Record<string, string>) =>
      coursesApi.update(id, {
        default_fee: Number(v.default_fee),
        change_reason: v.change_reason || 'Fee update',
      }),
    onSuccess: () => {
      toast.success('Course fee updated (history preserved)');
      qc.invalidateQueries({ queryKey: ['course', id] });
      qc.invalidateQueries({ queryKey: ['course-fee-history', id] });
      qc.invalidateQueries({ queryKey: ['courses'] });
      feeForm.reset({ default_fee: '', change_reason: '' });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!course) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-lg font-medium text-muted-foreground">Course not found</p>
        <Button asChild variant="outline"><Link href="/sun/courses">Back to Courses</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-card border border-border/60 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="outline" size="icon" asChild className="h-9 w-9 shrink-0">
            <Link href="/sun/courses"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight truncate">{course.name}</h1>
              <Badge variant={course.is_active ? 'success' : 'secondary'}>
                {course.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {course.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{course.description}</p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleEditClick} className="shrink-0">
          <Pencil className="h-4 w-4 mr-1.5" /> Edit Course
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Course Details</DialogTitle></DialogHeader>
          <form onSubmit={editForm.handleSubmit((v) => updateDetails.mutate(v))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Course Name *</Label>
              <Input {...editForm.register('name', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration in Days *</Label>
              <Input type="number" min="1" {...editForm.register('duration_days', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} {...editForm.register('description')} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={editForm.watch('is_active')} onValueChange={(v) => editForm.setValue('is_active', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Active</SelectItem>
                  <SelectItem value="0">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={updateDetails.isPending}>Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Default Fee</p>
              <p className="text-xl font-semibold">{course.default_fee != null ? formatCurrency(course.default_fee) : '—'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="text-base font-semibold">{formatDurationMonths(course.duration_days)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Fee Records</p>
            <p className="text-xl font-semibold">{(history as unknown[] | undefined)?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Update Course Fee</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              Changing the fee creates a new history record. Existing batches keep the fee set when they were created — completed batches are never updated retroactively.
            </p>
            <form onSubmit={feeForm.handleSubmit((v) => updateFee.mutate(v))} className="space-y-3">
              <div className="space-y-1">
                <Label>New Default Fee (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={course.default_fee ?? ''}
                  {...feeForm.register('default_fee', { required: true })}
                />
              </div>
              <div className="space-y-1">
                <Label>Reason for change</Label>
                <Input placeholder="e.g. Annual fee revision 2026" {...feeForm.register('change_reason')} />
              </div>
              <Button type="submit" disabled={updateFee.isPending}>Update fee</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">About Fee History</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Each fee change is recorded with the effective date and reason.</p>
            <p>When you create a new batch, it uses the current default fee at that time. Past batches and completed courses retain their original fees.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fees History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2">From</th>
                  <th className="pb-2">To</th>
                  <th className="pb-2">Default Fee</th>
                  <th className="pb-2">Reason</th>
                  <th className="pb-2">Changed By</th>
                </tr>
              </thead>
              <tbody>
                {(history as Array<Record<string, unknown>> | undefined)?.map((h) => (
                  <tr key={String(h.id)} className="border-b border-border/50">
                    <td className="py-2">{formatDate(String(h.effective_from))}</td>
                    <td className="py-2">{h.effective_to ? formatDate(String(h.effective_to)) : 'Current'}</td>
                    <td className="py-2 font-semibold">{formatCurrency(Number(h.default_fee))}</td>
                    <td className="py-2">{String(h.change_reason || '—')}</td>
                    <td className="py-2">{String(h.changed_by_name || '—')}</td>
                  </tr>
                ))}
                {!(history as Array<Record<string, unknown>> | undefined)?.length && (
                  <tr><td colSpan={5} className="py-4 text-center text-xs text-muted-foreground">No fee history yet</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {(history as Array<Record<string, unknown>> | undefined)?.map((h) => (
              <div key={String(h.id)} className="rounded-lg border border-border/80 p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-base">{formatCurrency(Number(h.default_fee))}</span>
                  <Badge variant={h.effective_to ? 'secondary' : 'success'}>
                    {h.effective_to ? 'Past' : 'Current'}
                  </Badge>
                </div>
                <div className="text-muted-foreground">
                  {formatDate(String(h.effective_from))} – {h.effective_to ? formatDate(String(h.effective_to)) : 'Current'}
                </div>
                <div>{String(h.change_reason || '—')}</div>
                <div className="text-muted-foreground">By: {String(h.changed_by_name || '—')}</div>
              </div>
            ))}
            {!(history as Array<Record<string, unknown>> | undefined)?.length && (
              <p className="py-4 text-center text-xs text-muted-foreground">No fee history yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
