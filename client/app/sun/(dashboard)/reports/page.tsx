'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { reportsApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

const tabs = ['students', 'fees', 'expenses', 'vendors', 'batches', 'inventory', 'profit'] as const;

export default function ReportsPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('profit');

  const { data, isLoading } = useQuery({
    queryKey: ['report', tab],
    queryFn: async () => {
      switch (tab) {
        case 'students': return (await reportsApi.students()).data.data;
        case 'fees': return (await reportsApi.fees()).data.data;
        case 'expenses': return (await reportsApi.expenses()).data.data;
        case 'vendors': return (await reportsApi.vendors()).data.data;
        case 'batches': return (await reportsApi.batches()).data.data;
        case 'inventory': return (await reportsApi.inventory()).data.data;
        case 'profit': return (await reportsApi.profit()).data.data;
      }
    },
  });

  function download(format: 'xlsx' | 'pdf') {
    const token = localStorage.getItem('accessToken');
    const url = reportsApi.exportUrl(tab === 'profit' ? 'batches' : tab, format);
    // Open with auth via fetch blob
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${tab}-report.${format === 'xlsx' ? 'xlsx' : 'pdf'}`;
        a.click();
      });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">Export Excel & PDF</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => download('xlsx')}><Download className="h-4 w-4" /> Excel</Button>
          <Button variant="outline" onClick={() => download('pdf')}><Download className="h-4 w-4" /> PDF</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button key={t} size="sm" variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base capitalize">{tab} Report</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-40 w-full" /> : tab === 'profit' ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Fees Collected</p><p className="text-xl font-semibold">{formatCurrency((data as { fees_collected?: number })?.fees_collected)}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Expenses</p><p className="text-xl font-semibold">{formatCurrency((data as { expenses?: number })?.expenses)}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Net Profit</p><p className="text-xl font-semibold">{formatCurrency((data as { net_profit?: number })?.net_profit)}</p></CardContent></Card>
              </div>
              <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <pre className="max-h-[28rem] overflow-auto rounded-lg bg-muted p-4 text-xs">
                {JSON.stringify(Array.isArray(data) ? data : (data as { rows?: unknown })?.rows || data, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
