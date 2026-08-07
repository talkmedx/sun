'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  IndianRupee, Users, Wallet, Store, Layers, TrendingUp,
  Package, AlertCircle, Boxes, Tag
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ComposedChart, Line,
} from 'recharts';
import { dashboardApi, batchesApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/badge';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { DashboardSummary } from '@/types';

function shortMonth(month: string) {
  const [y, m] = month.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[Number(m) - 1]} ${y.slice(2)}`;
}

function ChartFrame({
  loading,
  mounted,
  children,
}: {
  loading?: boolean;
  mounted?: boolean;
  children: React.ReactNode;
}) {
  if (loading || !mounted) return <Skeleton className="h-[280px] w-full rounded-lg" />;
  return (
    <div className="h-[280px] w-full min-w-0 relative">
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [batchId, setBatchId] = useState<string>('all');
  const [financialYear, setFinancialYear] = useState<string>('all');

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: batches } = useQuery({
    queryKey: ['batches-dropdown'],
    queryFn: async () => (await batchesApi.dropdown()).data.data,
  });

  const bid = batchId === 'all' ? undefined : Number(batchId);
  const fyParam = financialYear === 'all' ? undefined : financialYear;

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary', bid, fyParam],
    queryFn: async () => (await dashboardApi.summary(bid, fyParam)).data.data,
  });

  const { data: charts, isLoading: chartsLoading } = useQuery({
    queryKey: ['dashboard-charts', bid, fyParam],
    queryFn: async () => (await dashboardApi.charts(bid, fyParam)).data.data,
  });

  const isParticularBatch = batchId !== 'all';

  // Define summary cards dynamically depending on whether "All Batches" or a "Particular Batch" is selected
  const displayCards: {
    key: keyof DashboardSummary;
    label: string;
    icon: React.ElementType;
    href: string;
    currency?: boolean;
  }[] = isParticularBatch
    ? [
        { key: 'batch_revenue', label: 'Batch Revenue', icon: IndianRupee, href: `/batches?id=${batchId}`, currency: true },
        { key: 'offer_expense', label: 'Offer Expense', icon: Tag, href: `/batches?id=${batchId}`, currency: true },
        { key: 'fees_profit', label: 'Fees Profit', icon: TrendingUp, href: `/batches?id=${batchId}`, currency: true },
        { key: 'product_profit', label: 'Product Profit', icon: Package, href: '/products', currency: true },
        { key: 'expenses', label: 'Expenses', icon: Wallet, href: `/expenses?batch_id=${batchId}`, currency: true },
        { key: 'batch_profit', label: 'Total Batch Profit', icon: TrendingUp, href: `/batches?id=${batchId}`, currency: true },
        { key: 'total_students', label: 'Students in Batch', icon: Users, href: `/students?batch_id=${batchId}` },
        { key: 'total_fees_collected', label: 'Fees Collected', icon: IndianRupee, href: `/students?batch_id=${batchId}`, currency: true },
        { key: 'pending_fees', label: 'Pending Fees', icon: AlertCircle, href: `/students?batch_id=${batchId}`, currency: true },
      ]
    : [
        { key: 'total_fees_collected', label: 'Fees Collected', icon: IndianRupee, href: '/reports?tab=fees', currency: true },
        { key: 'total_fees_committed', label: 'Fees Committed', icon: TrendingUp, href: '/reports?tab=fees', currency: true },
        { key: 'pending_fees', label: 'Pending Fees', icon: AlertCircle, href: '/students?filter=pending', currency: true },
        { key: 'current_fy_expenses', label: 'F.Y. Expenses', icon: Wallet, href: '/expenses', currency: true },
        { key: 'financial_year_profit', label: 'F.Y. Profit', icon: TrendingUp, href: '/reports?tab=profit', currency: true },
        { key: 'vendors', label: 'Vendors', icon: Store, href: '/vendors' },
        { key: 'batches', label: 'No. of Batches', icon: Layers, href: '/batches' },
        { key: 'pending_vendor_payments', label: 'Pending Vendor Payments', icon: Store, href: '/vendors', currency: true },
        { key: 'product_profit', label: 'Product Profit', icon: Package, href: '/reports?tab=inventory', currency: true },
        { key: 'stock_value', label: 'Stock Value', icon: Boxes, href: '/products', currency: true },
        { key: 'total_students', label: 'Students', icon: Users, href: '/students' },
      ];

  const feesData = (charts?.monthly_fees || []).map((d) => ({
    ...d,
    label: shortMonth(d.month),
  }));
  const expensesData = (charts?.monthly_expenses || []).map((d) => ({
    ...d,
    label: shortMonth(d.month),
  }));
  const profitData = (charts?.profit || []).map((d) => ({
    ...d,
    label: shortMonth(d.month),
  }));
  const studentsData = (charts?.students || []).map((d) => ({
    ...d,
    label: shortMonth(d.month),
  }));
  const salesData = (charts?.product_sales || []).map((d) => ({
    ...d,
    label: shortMonth(d.month),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Financial year {summary?.financial_year || financialYear} overview
          </p>
        </div>

        {/* Top Nav Dropdowns: Financial Year & Batches */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Financial Year Dropdown */}
          <Select value={financialYear} onValueChange={setFinancialYear}>
            <SelectTrigger className="w-[145px] h-9 text-xs sm:text-sm">
              <SelectValue placeholder="Financial Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FY2025-26">F.Y. 25-26</SelectItem>
              <SelectItem value="FY2024-25">F.Y. 24-25</SelectItem>
              <SelectItem value="FY2026-27">F.Y. 26-27</SelectItem>
              <SelectItem value="all">All F.Y. Years</SelectItem>
            </SelectContent>
          </Select>

          {/* Batches Dropdown */}
          <Select value={batchId} onValueChange={setBatchId}>
            <SelectTrigger className="w-[185px] h-9 text-xs sm:text-sm">
              <SelectValue placeholder="All Batches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches?.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {summaryLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          : displayCards.map((card, i) => {
              const Icon = card.icon;
              const value = summary?.[card.key] ?? 0;
              return (
                <motion.a
                  key={card.key}
                  href={card.href}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="block"
                >
                  <Card className="h-full transition-all hover:border-primary/30 hover:shadow-md">
                    <CardContent className="flex items-start gap-3 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{card.label}</p>
                        <p className="mt-1 truncate text-lg font-semibold tracking-tight">
                          {card.currency ? formatCurrency(Number(value)) : formatNumber(Number(value))}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.a>
              );
            })}
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Fees</CardTitle>
            <CardDescription>Fee collections over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartFrame loading={chartsLoading} mounted={mounted}>
              <ResponsiveContainer width="100%" height={280} minWidth={0}>
                <AreaChart data={feesData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="feesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c43d6e" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#c43d6e" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} width={56} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="total" name="Fees" stroke="#c43d6e" strokeWidth={2} fill="url(#feesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartFrame>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Expenses</CardTitle>
            <CardDescription>Spending over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartFrame loading={chartsLoading} mounted={mounted}>
              <ResponsiveContainer width="100%" height={280} minWidth={0}>
                <BarChart data={expensesData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} width={56} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="total" name="Expenses" fill="#4a6fa5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profit</CardTitle>
            <CardDescription>Fees vs expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartFrame loading={chartsLoading} mounted={mounted}>
              <ResponsiveContainer width="100%" height={280} minWidth={0}>
                <ComposedChart data={profitData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} width={56} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="fees" name="Fees" stroke="#2d9f6f" fill="rgba(45,159,111,0.12)" strokeWidth={2} />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#e25555" fill="rgba(226,85,85,0.12)" strokeWidth={2} />
                  <Line type="monotone" dataKey="profit" name="Profit" stroke="#c43d6e" strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartFrame>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Students & Product Sales</CardTitle>
            <CardDescription>Growth and retail</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartFrame loading={chartsLoading} mounted={mounted}>
              <ResponsiveContainer width="100%" height={280} minWidth={0}>
                <ComposedChart
                  data={salesData.map((s, i) => ({
                    ...s,
                    students: studentsData[i]?.total ?? 0,
                  }))}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} width={56} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={36} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="total" name="Sales ₹" fill="#c43d6e" radius={[6, 6, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="students" name="Students" stroke="#4a6fa5" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartFrame>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
