'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { admissionsApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Skeleton } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';

export default function AdmissionsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admissions', search, status, page],
    queryFn: async () =>
      (await admissionsApi.list({
        search: search || undefined,
        status: status === 'all' ? undefined : status,
        page,
        limit: 20,
      })).data,
  });

  const approve = useMutation({
    mutationFn: (id: number) => admissionsApi.approve(id),
    onSuccess: () => {
      toast.success('Admission approved — student created');
      qc.invalidateQueries({ queryKey: ['admissions'] });
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
      qc.invalidateQueries({ queryKey: ['admissions'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const editLink = useMutation({
    mutationFn: (id: number) => admissionsApi.editLink(id),
    onSuccess: (res) => {
      const url = `${window.location.origin}${res.data.data.editUrl}`;
      navigator.clipboard.writeText(url);
      toast.success('Edit link copied to clipboard');
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
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row">
          <CardTitle className="text-base flex-1">Applications</CardTitle>
          <Input className="w-48" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {['pending', 'approved', 'rejected', 'edit_requested'].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-40 w-full" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3">Name</th><th className="pb-3">Phone</th><th className="pb-3">Batch</th>
                    <th className="pb-3">Status</th><th className="pb-3">Date</th><th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.map((a) => (
                    <tr key={a.id} className="border-b border-border/50">
                      <td className="py-3">
                        <Link href={`/sun/admissions/${a.id}`} className="font-medium hover:text-primary">
                          {a.first_name} {a.last_name}
                        </Link>
                      </td>
                      <td className="py-3">{a.phone}</td>
                      <td className="py-3">{a.batch_name || '—'}</td>
                      <td className="py-3"><Badge variant={statusVariant(a.status)}>{a.status}</Badge></td>
                      <td className="py-3">{formatDate(a.created_at)}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {a.status !== 'approved' && a.status !== 'rejected' && (
                            <>
                              <Button size="sm" onClick={() => approve.mutate(a.id)}>Approve</Button>
                              <Button size="sm" variant="outline" onClick={() => reject.mutate(a.id)}>Reject</Button>
                              <Button size="sm" variant="ghost" onClick={() => editLink.mutate(a.id)}>Edit link</Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
