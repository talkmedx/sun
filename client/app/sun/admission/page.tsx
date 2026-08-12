'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { admissionsApi, batchesApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getErrorMessage } from '@/lib/api';
import { AdmissionFormFields, type AdmissionFormValues } from '@/components/admissions/AdmissionFormFields';
import {
  admissionFormDefaults,
  buildAdmissionFormData,
  type AdmissionProofItem,
} from '@/components/admissions/admission-form-utils';

export default function PublicAdmissionPage() {
  const [done, setDone] = useState(false);
  const [sameAsPermanent, setSameAsPermanent] = useState(false);
  const [proofs, setProofs] = useState<AdmissionProofItem[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);

  const form = useForm<AdmissionFormValues>({
    defaultValues: admissionFormDefaults,
  });

  const { data: batches } = useQuery({
    queryKey: ['public-batches'],
    queryFn: async () => (await batchesApi.public()).data.data,
  });

  const submit = useMutation({
    mutationFn: async (v: AdmissionFormValues) =>
      admissionsApi.submit(buildAdmissionFormData(v, proofs, photo)),
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
            <form onSubmit={form.handleSubmit((v) => submit.mutate(v))} className="space-y-3">
              <AdmissionFormFields
                form={form}
                batches={batches}
                sameAsPermanent={sameAsPermanent}
                onSameAsPermanentChange={setSameAsPermanent}
                proofs={proofs}
                onProofsChange={setProofs}
                photo={photo}
                onPhotoChange={setPhoto}
              />

              <Button type="submit" className="w-full mt-2" disabled={submit.isPending}>
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
