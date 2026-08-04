'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { admissionsApi, batchesApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/badge';
import { getErrorMessage } from '@/lib/api';

export default function EditAdmissionPage() {
  const token = String(useParams().token);
  const [done, setDone] = useState(false);
  const form = useForm();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admission-edit', token],
    queryFn: async () => (await admissionsApi.getByToken(token)).data.data,
  });

  const { data: batches } = useQuery({
    queryKey: ['public-batches'],
    queryFn: async () => (await batchesApi.public()).data.data,
  });

  useEffect(() => {
    if (data) {
      form.reset({
        first_name: data.first_name,
        last_name: data.last_name || '',
        phone: data.phone,
        email: data.email || '',
        city: data.city || '',
        state: data.state || '',
        batch_id: data.batch_id ? String(data.batch_id) : '',
      });
    }
  }, [data, form]);

  const update = useMutation({
    mutationFn: async (v: Record<string, string>) => {
      const fd = new FormData();
      Object.entries(v).forEach(([k, val]) => { if (val) fd.append(k, val); });
      return admissionsApi.updateByToken(token, fd);
    },
    onSuccess: () => {
      setDone(true);
      toast.success('Updated successfully');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading) return <div className="p-8"><Skeleton className="h-64 w-full max-w-lg mx-auto" /></div>;
  if (error) return <div className="p-8 text-center text-destructive">Invalid or expired edit link</div>;
  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-4">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <p className="font-medium">Your application has been updated.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Card>
        <CardHeader><CardTitle>Edit Application</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((v) => update.mutate(v as Record<string, string>))} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>First name</Label><Input {...form.register('first_name', { required: true })} /></div>
              <div className="space-y-1"><Label>Last name</Label><Input {...form.register('last_name')} /></div>
            </div>
            <div className="space-y-1"><Label>Phone</Label><Input {...form.register('phone', { required: true })} /></div>
            <div className="space-y-1"><Label>Email</Label><Input {...form.register('email')} /></div>
            <div className="space-y-1"><Label>City</Label><Input {...form.register('city')} /></div>
            <div className="space-y-1">
              <Label>Batch</Label>
              <Select
                defaultValue={data?.batch_id ? String(data.batch_id) : undefined}
                onValueChange={(v) => form.setValue('batch_id', v)}
              >
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {batches?.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={update.isPending}>
              {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
