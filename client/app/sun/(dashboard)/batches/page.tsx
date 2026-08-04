'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { batchesApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Skeleton } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';

export default function BatchesPage() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const form = useForm({
    defaultValues: {
      name: '', description: '', course_fee: '', offer_fee: '',
      start_date: '', end_date: '', status: 'upcoming', max_students: '',
    },
  });

  const { data: batches, isLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => (await batchesApi.list()).data.data,
  });

  const createMutation = useMutation({
    mutationFn: (v: Record<string, string>) =>
      batchesApi.create({
        ...v,
        course_fee: Number(v.course_fee),
        offer_fee: v.offer_fee ? Number(v.offer_fee) : null,
        max_students: v.max_students ? Number(v.max_students) : null,
      }),
    onSuccess: () => {
      toast.success('Batch created');
      qc.invalidateQueries({ queryKey: ['batches'] });
      setOpen(false);
      form.reset();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => batchesApi.remove(id),
    onSuccess: () => {
      toast.success('Batch deleted');
      qc.invalidateQueries({ queryKey: ['batches'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Batches</h1>
          <p className="text-sm text-muted-foreground">Courses, fees & profitability</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add Batch</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Batch</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-3">
              <div className="space-y-1"><Label>Name</Label><Input {...form.register('name', { required: true })} /></div>
              <div className="space-y-1"><Label>Description</Label><Textarea {...form.register('description')} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Course fee</Label><Input type="number" {...form.register('course_fee', { required: true })} /></div>
                <div className="space-y-1"><Label>Offer fee</Label><Input type="number" {...form.register('offer_fee')} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Start</Label><Input type="date" {...form.register('start_date')} /></div>
                <div className="space-y-1"><Label>End</Label><Input type="date" {...form.register('end_date')} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select defaultValue="upcoming" onValueChange={(v) => form.setValue('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['upcoming', 'ongoing', 'completed', 'cancelled'].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Max students</Label><Input type="number" {...form.register('max_students')} /></div>
              </div>
              <Button type="submit" className="w-full">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {batches?.map((b) => (
            <Card key={b.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{b.name}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(b.start_date)} – {formatDate(b.end_date)}
                  </p>
                </div>
                <Badge variant={b.status === 'ongoing' ? 'success' : b.status === 'upcoming' ? 'warning' : 'secondary'}>
                  {b.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Course fee</span><span>{formatCurrency(b.course_fee)}</span></div>
                {b.offer_fee != null && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Offer</span><span>{formatCurrency(b.offer_fee)}</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Students</span><span>{b.student_count ?? 0}</span></div>
                <div className="flex justify-between font-medium"><span className="text-muted-foreground">Profit</span><span>{formatCurrency(b.profit ?? 0)}</span></div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => {
                    if (confirm('Delete this batch? Blocked if students exist.')) deleteMutation.mutate(b.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
