'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { admissionsApi, batchesApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getErrorMessage } from '@/lib/api';

export default function PublicAdmissionPage() {
  const [done, setDone] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  const form = useForm({
    defaultValues: {
      first_name: '', last_name: '', phone: '', email: '', city: '', state: '',
      address_line1: '', pincode: '', batch_id: '', preferred_batch_note: '',
    },
  });

  const { data: batches } = useQuery({
    queryKey: ['public-batches'],
    queryFn: async () => (await batchesApi.public()).data.data,
  });

  const submit = useMutation({
    mutationFn: async (v: Record<string, string>) => {
      const fd = new FormData();
      Object.entries(v).forEach(([k, val]) => { if (val) fd.append(k, val); });
      if (photo) fd.append('photo', photo);
      if (proof) fd.append('proof', proof);
      return admissionsApi.submit(fd);
    },
    onSuccess: () => {
      setDone(true);
      toast.success('Application submitted!');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-emerald-500" />
          <h1 className="font-display text-2xl font-semibold">Application Received</h1>
          <p className="mt-2 text-muted-foreground">We&apos;ll review your application and get back to you soon.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-64 w-64 rounded-full bg-rose-200/30 blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Komal&apos;s Makeovers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Admission Application</p>
        </div>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Apply for admission</CardTitle>
            <CardDescription>Fill in your details. Mobile-friendly & secure.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit((v) => submit.mutate(v))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>First name *</Label><Input {...form.register('first_name', { required: true })} /></div>
                <div className="space-y-1"><Label>Last name</Label><Input {...form.register('last_name')} /></div>
              </div>
              <div className="space-y-1"><Label>Phone *</Label><Input type="tel" {...form.register('phone', { required: true })} /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" {...form.register('email')} /></div>
              <div className="space-y-1"><Label>Address</Label><Input {...form.register('address_line1')} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>City</Label><Input {...form.register('city')} /></div>
                <div className="space-y-1"><Label>State</Label><Input {...form.register('state')} /></div>
              </div>
              <div className="space-y-1"><Label>Pincode</Label><Input {...form.register('pincode')} /></div>
              <div className="space-y-1">
                <Label>Preferred batch</Label>
                <Select onValueChange={(v) => form.setValue('batch_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                  <SelectContent>
                    {batches?.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Notes</Label><Textarea {...form.register('preferred_batch_note')} /></div>
              <div className="space-y-1">
                <Label>Photo (selfie / camera)</Label>
                <Input type="file" accept="image/*" capture="user" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
              </div>
              <div className="space-y-1">
                <Label>ID / proof document</Label>
                <Input type="file" accept="image/*,application/pdf" onChange={(e) => setProof(e.target.files?.[0] || null)} />
              </div>
              <Button type="submit" className="w-full" disabled={submit.isPending}>
                {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Application
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
