'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { admissionsApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Skeleton } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export default function AdmissionDetailPage() {
  const id = Number(useParams().id);
  const { data: a, isLoading } = useQuery({
    queryKey: ['admission', id],
    queryFn: async () => (await admissionsApi.get(id)).data.data,
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!a) return <p>Not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl font-semibold">{a.first_name} {a.last_name}</h1>
        <Badge>{a.status}</Badge>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Application Details</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{a.phone}</p></div>
          <div><span className="text-muted-foreground">Email</span><p className="font-medium">{a.email || '—'}</p></div>
          <div><span className="text-muted-foreground">Batch</span><p className="font-medium">{a.batch_name || '—'}</p></div>
          <div><span className="text-muted-foreground">City</span><p className="font-medium">{a.city || '—'}</p></div>
          <div><span className="text-muted-foreground">Submitted</span><p className="font-medium">{formatDate(a.created_at)}</p></div>
          {a.rejection_reason && (
            <div className="sm:col-span-2"><span className="text-muted-foreground">Rejection reason</span><p className="font-medium">{a.rejection_reason}</p></div>
          )}
          {a.photo_url && (
            <div>
              <span className="text-muted-foreground">Photo</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`http://localhost:5001${a.photo_url}`} alt="" className="mt-2 h-32 rounded-lg object-cover" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
