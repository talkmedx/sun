'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notificationsApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Skeleton } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await notificationsApi.list()).data.data,
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      toast.success('All marked as read');
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {data?.unreadCount ?? 0} unread
          </p>
        </div>
        <Button variant="outline" onClick={() => markAll.mutate()}>Mark all read</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Inbox</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? <Skeleton className="h-32 w-full" /> : data?.rows?.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => !n.is_read && markRead.mutate(n.id)}
              className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition hover:bg-muted/50 ${!n.is_read ? 'border-primary/30 bg-primary/5' : ''}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{n.title}</p>
                  <Badge variant="secondary">{n.type}</Badge>
                  {!n.is_read && <Badge variant="warning">New</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(n.created_at)}</p>
              </div>
            </button>
          ))}
          {!data?.rows?.length && !isLoading && (
            <p className="py-8 text-center text-muted-foreground">No notifications</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
