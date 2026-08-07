'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { admissionsApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Skeleton } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api';
import {
  User, Phone, Mail, MapPin, Calendar, Layers, FileText, CheckCircle2,
  XCircle, Link2, ExternalLink, IndianRupee, ShieldCheck, ArrowLeft
} from 'lucide-react';

export default function AdmissionDetailPage() {
  const id = Number(useParams().id);
  const router = useRouter();
  const qc = useQueryClient();

  const { data: a, isLoading } = useQuery({
    queryKey: ['admission', id],
    queryFn: async () => (await admissionsApi.get(id)).data.data,
  });

  const approve = useMutation({
    mutationFn: (id: number) => admissionsApi.approve(id),
    onSuccess: () => {
      toast.success('Admission approved — student record created');
      qc.invalidateQueries({ queryKey: ['admission', id] });
      qc.invalidateQueries({ queryKey: ['admissions-infinite'] });
      qc.invalidateQueries({ queryKey: ['pending-admissions-count'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const reject = useMutation({
    mutationFn: (id: number) => {
      const reason = prompt('Rejection reason:') || 'Not eligible';
      return admissionsApi.reject(id, reason);
    },
    onSuccess: () => {
      toast.success('Admission rejected');
      qc.invalidateQueries({ queryKey: ['admission', id] });
      qc.invalidateQueries({ queryKey: ['admissions-infinite'] });
      qc.invalidateQueries({ queryKey: ['pending-admissions-count'] });
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

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!a) return <p className="p-4 text-center text-muted-foreground">Admission application not found</p>;

  const statusVariant = (s: string) => {
    if (s === 'approved') return 'success' as const;
    if (s === 'rejected') return 'destructive' as const;
    if (s === 'pending') return 'warning' as const;
    return 'secondary' as const;
  };

  const committedFee = Number(a.fees_committed || a.batch_offer_fee || a.batch_course_fee || 0);
  const collectedFee = Number(a.fees_collected || 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-semibold">
                {a.first_name} {a.last_name}
              </h1>
              <Badge variant={statusVariant(a.status)} className="capitalize">
                {a.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Applied on {formatDate(a.created_at)}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => editLink.mutate(a.id)}
            disabled={editLink.isPending}
          >
            <Link2 className="h-4 w-4 mr-1.5" /> Edit Link
          </Button>

          {a.student_id && (
            <Link href={`/sun/students/${a.student_id}`}>
              <Button variant="secondary" size="sm">
                <ExternalLink className="h-4 w-4 mr-1.5" /> View Student Profile
              </Button>
            </Link>
          )}

          {a.status !== 'approved' && a.status !== 'rejected' && (
            <>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => approve.mutate(a.id)}
                disabled={approve.isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve Admission
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => reject.mutate(a.id)}
                disabled={reject.isPending}
              >
                <XCircle className="h-4 w-4 mr-1.5" /> Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Card 1: Student Information */}
        <Card className="bg-card shadow-xs">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-muted-foreground block">First Name</span>
                <span className="font-medium text-foreground">{a.first_name}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Last Name</span>
                <span className="font-medium text-foreground">{a.last_name || '—'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-muted-foreground block">Phone</span>
                <span className="font-medium font-mono text-foreground">{a.phone}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Alternate Phone</span>
                <span className="font-medium font-mono text-foreground">{a.alternate_phone || '—'}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block">Email Address</span>
              <span className="font-medium text-foreground">{a.email || '—'}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-muted-foreground block">Date of Birth</span>
                <span className="font-medium text-foreground">{a.date_of_birth ? formatDate(a.date_of_birth) : '—'}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Gender</span>
                <span className="font-medium text-foreground capitalize">{a.gender || '—'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Location & Address */}
        <Card className="bg-card shadow-xs">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Location & Address
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Address Line 1</span>
              <span className="font-medium text-foreground">{a.address_line1 || '—'}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Address Line 2</span>
              <span className="font-medium text-foreground">{a.address_line2 || '—'}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-xs text-muted-foreground block">City</span>
                <span className="font-medium text-foreground">{a.city || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">State</span>
                <span className="font-medium text-foreground">{a.state || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Pincode</span>
                <span className="font-medium text-foreground">{a.pincode || '—'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Batch & Fee Details */}
        <Card className="bg-card shadow-xs">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Batch & Fee Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Applied Batch</span>
              <span className="font-semibold text-foreground text-base">{a.batch_name || '—'}</span>
            </div>

            {(a.batch_start_date || a.batch_end_date) && (
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>
                  <span className="block font-medium text-foreground">Start Date</span>
                  <span>{a.batch_start_date ? formatDate(a.batch_start_date) : '—'}</span>
                </div>
                <div>
                  <span className="block font-medium text-foreground">End Date</span>
                  <span>{a.batch_end_date ? formatDate(a.batch_end_date) : '—'}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                <span className="text-xs font-medium text-muted-foreground block">Committed Fees</span>
                <span className="text-lg font-bold text-foreground">{formatCurrency(committedFee)}</span>
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 block">Collected Fees</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(collectedFee)}</span>
              </div>
            </div>

            {a.preferred_batch_note && (
              <div>
                <span className="text-xs text-muted-foreground block">Batch Preference Note</span>
                <p className="text-xs font-medium italic mt-0.5">{a.preferred_batch_note}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 4: Uploaded Proofs & Student Documents */}
        <Card className="bg-card shadow-xs">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Uploaded Proofs & Photos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-sm">
            {/* Student Photo */}
            <div>
              <span className="text-xs font-medium text-muted-foreground block mb-1.5">Student Photo</span>
              {a.photo_url ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`http://localhost:5001${a.photo_url}`}
                    alt="Student Photo"
                    className="h-28 w-28 rounded-xl object-cover border border-border shadow-xs"
                  />
                  <a
                    href={`http://localhost:5001${a.photo_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline font-medium inline-flex items-center"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> View Full Image
                  </a>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No photo uploaded</p>
              )}
            </div>

            {/* ID Proof / Payment Proof */}
            <div className="pt-3 border-t border-border/50">
              <span className="text-xs font-medium text-muted-foreground block mb-1.5">ID / Payment Proof</span>
              {a.proof_url ? (
                <div className="space-y-2">
                  <a
                    href={`http://localhost:5001${a.proof_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-lg border border-border/70 hover:border-primary/50 bg-muted/20 flex items-center justify-between transition-colors text-xs font-medium group"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span>View Uploaded Document</span>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                  </a>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No proof document uploaded</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {a.rejection_reason && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <span className="text-xs font-medium text-red-600 dark:text-red-400 block">Rejection Reason</span>
            <p className="text-sm font-medium mt-1 text-foreground">{a.rejection_reason}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
