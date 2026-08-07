'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Search, FileText, Layers, Users, DollarSign, ShoppingBag, ArrowUpRight, TrendingUp } from 'lucide-react';
import { reportsApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge, Skeleton } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Pagination } from '@/components/ui/pagination';
import { useDebounce } from '@/hooks/useDebounce';

const tabs = [
  { id: 'students', label: 'Students', icon: Users },
  { id: 'fees', label: 'Fees', icon: DollarSign },
  { id: 'expenses', label: 'Expenses', icon: FileText },
  { id: 'vendors', label: 'Vendors', icon: Layers },
  { id: 'batches', label: 'Batches', icon: Layers },
  { id: 'inventory', label: 'Inventory', icon: ShoppingBag },
  { id: 'profit', label: 'Profit & Loss', icon: TrendingUp },
] as const;

type TabType = (typeof tabs)[number]['id'];

export default function ReportsPage() {
  const [tab, setTab] = useState<TabType>('students');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Reset pagination on tab or search change
  useEffect(() => {
    setPage(1);
    setSearch('');
  }, [tab]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading } = useQuery({
    queryKey: ['report', tab],
    queryFn: async () => {
      switch (tab) {
        case 'students':
          return (await reportsApi.students()).data.data;
        case 'fees':
          return (await reportsApi.fees()).data.data;
        case 'expenses':
          return (await reportsApi.expenses()).data.data;
        case 'vendors':
          return (await reportsApi.vendors()).data.data;
        case 'batches':
          return (await reportsApi.batches()).data.data;
        case 'inventory':
          return (await reportsApi.inventory()).data.data;
        case 'profit':
          return (await reportsApi.profit()).data.data;
      }
    },
  });

  function download(format: 'xlsx' | 'pdf') {
    const token = localStorage.getItem('accessToken');
    const url = reportsApi.exportUrl(tab === 'profit' ? 'batches' : tab, format);
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${tab}-report.${format === 'xlsx' ? 'xlsx' : 'pdf'}`;
        a.click();
      });
  }

  // Extract raw rows list depending on tab response structure
  const rawList = useMemo(() => {
    if (!data) return [];
    if (tab === 'fees' || tab === 'expenses') {
      return (data as { rows?: Record<string, any>[] })?.rows || [];
    }
    if (Array.isArray(data)) {
      return data as Record<string, any>[];
    }
    return [];
  }, [data, tab]);

  // Filter rows based on search term
  const filteredList = useMemo(() => {
    if (!debouncedSearch.trim()) return rawList;
    const q = debouncedSearch.toLowerCase();
    return rawList.filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? '').toLowerCase().includes(q)
      )
    );
  }, [rawList, debouncedSearch]);

  // Paginated rows
  const totalCount = filteredList.length;
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const paginatedList = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredList.slice(start, start + limit);
  }, [filteredList, page, limit]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4 border-border/60">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Export official Excel spreadsheets and PDF document summaries
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 shadow-xs" onClick={() => download('xlsx')}>
            <Download className="h-4 w-4 mr-1.5 text-emerald-600 dark:text-emerald-400" /> Excel (.xlsx)
          </Button>
          <Button variant="outline" size="sm" className="h-9 shadow-xs" onClick={() => download('pdf')}>
            <Download className="h-4 w-4 mr-1.5 text-rose-600 dark:text-rose-400" /> PDF Document
          </Button>
        </div>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-border/40 pb-3">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <Button
              key={t.id}
              size="sm"
              variant={isActive ? 'default' : 'ghost'}
              className={`h-9 px-3.5 font-medium transition-all ${
                isActive ? 'shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setTab(t.id)}
            >
              <Icon className="h-4 w-4 mr-1.5 opacity-80" />
              {t.label}
            </Button>
          );
        })}
      </div>

      {/* Profit Tab Special Analytics View */}
      {tab === 'profit' ? (
        <div className="space-y-6">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
          ) : (
            <>
              {/* Metric Cards */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="border-border/60 shadow-xs">
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fees Collected</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      {formatCurrency((data as any)?.fees_collected)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">FY {(data as any)?.financial_year || 'Current'}</p>
                  </CardContent>
                </Card>

                <Card className="border-border/60 shadow-xs">
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Expenses</p>
                    <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                      {formatCurrency((data as any)?.expenses)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">FY {(data as any)?.financial_year || 'Current'}</p>
                  </CardContent>
                </Card>

                <Card className="border-border/60 shadow-xs bg-primary/5 border-primary/20">
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider">Net Profit</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {formatCurrency((data as any)?.net_profit)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Fees Collected - Expenses</p>
                  </CardContent>
                </Card>
              </div>

              {/* Batches Profit Table */}
              <Card className="border-border/60 shadow-xs">
                <CardHeader className="py-4 border-b border-border/40">
                  <CardTitle className="text-base font-semibold">Batches Profit Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border/60 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          <th className="px-4 py-3.5">Batch Name</th>
                          <th className="px-4 py-3.5">Students</th>
                          <th className="px-4 py-3.5">Fees Collected</th>
                          <th className="px-4 py-3.5">Offer Expense</th>
                          <th className="px-4 py-3.5">Product Profit</th>
                          <th className="px-4 py-3.5">Expenses</th>
                          <th className="px-4 py-3.5 text-right">Total Batch Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {((data as any)?.batches || []).map((b: any, idx: number) => (
                          <tr key={idx} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3.5 font-medium">{b.name}</td>
                            <td className="px-4 py-3.5">{b.student_count || 0}</td>
                            <td className="px-4 py-3.5">{formatCurrency(b.fees_collected)}</td>
                            <td className="px-4 py-3.5 text-amber-600 dark:text-amber-400">{formatCurrency(b.batch_offer_expense)}</td>
                            <td className="px-4 py-3.5 text-emerald-600 dark:text-emerald-400">{formatCurrency(b.product_profit)}</td>
                            <td className="px-4 py-3.5 text-rose-600 dark:text-rose-400">{formatCurrency(b.expenses)}</td>
                            <td className="px-4 py-3.5 font-bold text-right text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(b.total_batch_profit)}
                            </td>
                          </tr>
                        ))}
                        {!((data as any)?.batches?.length) && (
                          <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-muted-foreground">No batch profit data available</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Product Profits Table */}
              <Card className="border-border/60 shadow-xs">
                <CardHeader className="py-4 border-b border-border/40">
                  <CardTitle className="text-base font-semibold">Products Sales & Profits</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border/60 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          <th className="px-4 py-3.5">Product Name</th>
                          <th className="px-4 py-3.5">Qty Sold</th>
                          <th className="px-4 py-3.5">Total Revenue</th>
                          <th className="px-4 py-3.5">Product Cost</th>
                          <th className="px-4 py-3.5 text-right">Net Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {((data as any)?.products || []).map((p: any, idx: number) => (
                          <tr key={idx} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3.5 font-medium">{p.name}</td>
                            <td className="px-4 py-3.5 font-semibold">{p.qty_sold || 0}</td>
                            <td className="px-4 py-3.5">{formatCurrency(p.revenue)}</td>
                            <td className="px-4 py-3.5 text-muted-foreground">{formatCurrency(p.cost)}</td>
                            <td className="px-4 py-3.5 font-bold text-right text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(p.profit)}
                            </td>
                          </tr>
                        ))}
                        {!((data as any)?.products?.length) && (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">No product profit data available</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      ) : (
        /* Regular Report Tables (Students, Fees, Expenses, Vendors, Batches, Inventory) */
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="py-4 border-b border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold capitalize">{tab} Summary Report</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Detailed system report view ({totalCount} total entries)
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${tab}...`}
                className="pl-9 h-9 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border/60 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {tab === 'students' && (
                          <>
                            <th className="px-4 py-3.5">Code</th>
                            <th className="px-4 py-3.5">Student Name</th>
                            <th className="px-4 py-3.5">Contact</th>
                            <th className="px-4 py-3.5">Batch</th>
                            <th className="px-4 py-3.5">Committed</th>
                            <th className="px-4 py-3.5">Paid</th>
                            <th className="px-4 py-3.5">Pending</th>
                            <th className="px-4 py-3.5 text-right">Status</th>
                          </>
                        )}

                        {tab === 'fees' && (
                          <>
                            <th className="px-4 py-3.5">Receipt #</th>
                            <th className="px-4 py-3.5">Student</th>
                            <th className="px-4 py-3.5">Batch</th>
                            <th className="px-4 py-3.5">Amount</th>
                            <th className="px-4 py-3.5">Mode</th>
                            <th className="px-4 py-3.5 text-right">Date</th>
                          </>
                        )}

                        {tab === 'expenses' && (
                          <>
                            <th className="px-4 py-3.5">Title</th>
                            <th className="px-4 py-3.5">Category</th>
                            <th className="px-4 py-3.5">Vendor</th>
                            <th className="px-4 py-3.5">Batch</th>
                            <th className="px-4 py-3.5">Amount</th>
                            <th className="px-4 py-3.5">Mode</th>
                            <th className="px-4 py-3.5 text-right">Date</th>
                          </>
                        )}

                        {tab === 'vendors' && (
                          <>
                            <th className="px-4 py-3.5">Vendor Name</th>
                            <th className="px-4 py-3.5">Contact Person</th>
                            <th className="px-4 py-3.5">Phone</th>
                            <th className="px-4 py-3.5">Email</th>
                            <th className="px-4 py-3.5">Expenses Count</th>
                            <th className="px-4 py-3.5 text-right">Total Expenses</th>
                          </>
                        )}

                        {tab === 'batches' && (
                          <>
                            <th className="px-4 py-3.5">Batch Name</th>
                            <th className="px-4 py-3.5">Start - End Date</th>
                            <th className="px-4 py-3.5">Students</th>
                            <th className="px-4 py-3.5">Fees Collected</th>
                            <th className="px-4 py-3.5">Offer Expense</th>
                            <th className="px-4 py-3.5">Product Profit</th>
                            <th className="px-4 py-3.5 text-right">Net Profit</th>
                          </>
                        )}

                        {tab === 'inventory' && (
                          <>
                            <th className="px-4 py-3.5">Product Name</th>
                            <th className="px-4 py-3.5">SKU</th>
                            <th className="px-4 py-3.5">Vendor</th>
                            <th className="px-4 py-3.5">Cost Price</th>
                            <th className="px-4 py-3.5">Selling Price</th>
                            <th className="px-4 py-3.5">Stock Available</th>
                            <th className="px-4 py-3.5 text-right">Stock Status</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {paginatedList.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-muted/20 transition-colors">
                          {tab === 'students' && (
                            <>
                              <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{row.student_code || '—'}</td>
                              <td className="px-4 py-3.5 font-medium">{row.first_name} {row.last_name}</td>
                              <td className="px-4 py-3.5 text-xs text-muted-foreground">{row.phone || '—'}</td>
                              <td className="px-4 py-3.5">{row.batch_name || '—'}</td>
                              <td className="px-4 py-3.5 font-medium">{formatCurrency(row.fees_committed)}</td>
                              <td className="px-4 py-3.5 text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(row.fees_paid)}</td>
                              <td className="px-4 py-3.5 text-amber-600 dark:text-amber-400 font-medium">{formatCurrency(row.pending)}</td>
                              <td className="px-4 py-3.5 text-right">
                                <Badge variant={row.status === 'active' ? 'success' : 'secondary'}>{row.status}</Badge>
                              </td>
                            </>
                          )}

                          {tab === 'fees' && (
                            <>
                              <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{row.receipt_no || `REC-${row.id}`}</td>
                              <td className="px-4 py-3.5 font-medium">{row.first_name} {row.last_name}</td>
                              <td className="px-4 py-3.5">{row.batch_name || '—'}</td>
                              <td className="px-4 py-3.5 font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(row.amount)}</td>
                              <td className="px-4 py-3.5 capitalize text-xs">{row.payment_mode || 'cash'}</td>
                              <td className="px-4 py-3.5 text-right text-xs text-muted-foreground">{formatDate(row.payment_date)}</td>
                            </>
                          )}

                          {tab === 'expenses' && (
                            <>
                              <td className="px-4 py-3.5 font-medium">{row.title}</td>
                              <td className="px-4 py-3.5 text-xs"><Badge variant="outline">{row.category || 'General'}</Badge></td>
                              <td className="px-4 py-3.5 text-xs">{row.vendor_name || '—'}</td>
                              <td className="px-4 py-3.5 text-xs">{row.batch_name || '—'}</td>
                              <td className="px-4 py-3.5 font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(row.amount)}</td>
                              <td className="px-4 py-3.5 capitalize text-xs">{row.payment_mode || 'cash'}</td>
                              <td className="px-4 py-3.5 text-right text-xs text-muted-foreground">{formatDate(row.expense_date)}</td>
                            </>
                          )}

                          {tab === 'vendors' && (
                            <>
                              <td className="px-4 py-3.5 font-medium">{row.name}</td>
                              <td className="px-4 py-3.5 text-xs">{row.contact_person || '—'}</td>
                              <td className="px-4 py-3.5 text-xs text-muted-foreground">{row.phone || '—'}</td>
                              <td className="px-4 py-3.5 text-xs text-muted-foreground">{row.email || '—'}</td>
                              <td className="px-4 py-3.5 font-medium">{row.expense_count || 0}</td>
                              <td className="px-4 py-3.5 text-right font-semibold">{formatCurrency(row.total_expenses)}</td>
                            </>
                          )}

                          {tab === 'batches' && (
                            <>
                              <td className="px-4 py-3.5 font-medium">{row.name}</td>
                              <td className="px-4 py-3.5 text-xs text-muted-foreground">
                                {formatDate(row.start_date)} – {formatDate(row.end_date)}
                              </td>
                              <td className="px-4 py-3.5 font-medium">{row.student_count || 0}</td>
                              <td className="px-4 py-3.5 text-emerald-600 dark:text-emerald-400">{formatCurrency(row.fees_collected)}</td>
                              <td className="px-4 py-3.5 text-amber-600 dark:text-amber-400">{formatCurrency(row.batch_offer_expense)}</td>
                              <td className="px-4 py-3.5 text-emerald-600 dark:text-emerald-400">{formatCurrency(row.product_profit)}</td>
                              <td className="px-4 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(row.total_batch_profit)}
                              </td>
                            </>
                          )}

                          {tab === 'inventory' && (
                            <>
                              <td className="px-4 py-3.5 font-medium">{row.name}</td>
                              <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{row.sku || '—'}</td>
                              <td className="px-4 py-3.5 text-xs">{row.vendor_name || '—'}</td>
                              <td className="px-4 py-3.5 text-muted-foreground">{formatCurrency(row.cost_price)}</td>
                              <td className="px-4 py-3.5 font-medium">{formatCurrency(row.selling_price)}</td>
                              <td className="px-4 py-3.5 font-semibold">{row.quantity_available ?? 0}</td>
                              <td className="px-4 py-3.5 text-right">
                                <Badge variant={(row.quantity_available ?? 0) > 0 ? 'success' : 'destructive'}>
                                  {(row.quantity_available ?? 0) > 0 ? 'In Stock' : 'Out of Stock'}
                                </Badge>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}

                      {!paginatedList.length && (
                        <tr>
                          <td colSpan={8} className="px-4 py-12 text-center text-xs text-muted-foreground">
                            No {tab} report records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="p-4 border-t border-border/40">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    total={totalCount}
                    limit={limit}
                    onPageChange={setPage}
                    onLimitChange={setLimit}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
