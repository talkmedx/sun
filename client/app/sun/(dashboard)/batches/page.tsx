'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, LayoutGrid, List, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { batchesApi, coursesApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Skeleton } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';
import { Batch, Course } from '@/types';

const DEFAULT_COURSES = [
  { name: 'Nail Art', duration_days: 60, default_fee: 25000 },
  { name: 'Hair Styling', duration_days: 75, default_fee: 35000 },
  { name: 'Professional Makeup', duration_days: 90, default_fee: 55000 },
  { name: 'Bridal Makeup', duration_days: 90, default_fee: 45000 },
  { name: 'Cosmetology', duration_days: 180, default_fee: 85000 },
  { name: 'Personal Grooming', duration_days: 30, default_fee: 15000 },
];

export default function BatchesPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'ongoing' | 'upcoming' | 'completed'>('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [viewMode, setViewMode] = useState<'auto' | 'grid' | 'table'>('table');
  const qc = useQueryClient();

  // Fetch dynamic courses list
  const { data: dbCourses } = useQuery({
    queryKey: ['courses-list'],
    queryFn: async () => (await coursesApi.list()).data.data,
  });

  const availableCourses = useMemo(() => {
    if (dbCourses && dbCourses.length > 0) return dbCourses;
    return DEFAULT_COURSES.map((c, i) => ({ id: i + 1, ...c, is_active: 1 } as Course));
  }, [dbCourses]);

  // Selected course state for auto-calculation
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [editSelectedCourse, setEditSelectedCourse] = useState<string>('');

  const form = useForm({
    defaultValues: {
      name: '', description: '', course_fee: '', offer_fee: '',
      start_date: '', end_date: '', status: 'upcoming', max_students: '',
    },
  });

  const editForm = useForm({
    defaultValues: {
      name: '', description: '', course_fee: '', offer_fee: '',
      start_date: '', end_date: '', status: 'upcoming', max_students: '',
    },
  });

  // Calculate end date based on start date and course duration in days
  const calcEndDate = (startDateStr: string, courseName: string) => {
    if (!startDateStr || !courseName) return '';
    const courseObj = availableCourses.find((c) => c.name === courseName);
    if (!courseObj) return '';
    const d = new Date(startDateStr);
    if (isNaN(d.getTime())) return '';
    const totalDays = Number(courseObj.duration_days) || 90;
    d.setDate(d.getDate() + totalDays);
    return d.toISOString().slice(0, 10);
  };

  const handleCourseChange = (courseName: string) => {
    setSelectedCourse(courseName);
    const courseObj = availableCourses.find((c) => c.name === courseName);
    if (courseObj) {
      if (!form.getValues('course_fee') && courseObj.default_fee) {
        form.setValue('course_fee', String(courseObj.default_fee));
      }
      if (!form.getValues('name')) {
        form.setValue('name', `${courseName} Batch`);
      }
      const startDate = form.getValues('start_date');
      if (startDate) {
        const endDate = calcEndDate(startDate, courseName);
        if (endDate) form.setValue('end_date', endDate);
      }
    }
  };

  const handleStartDateChange = (startDate: string) => {
    form.setValue('start_date', startDate);
    if (selectedCourse) {
      const endDate = calcEndDate(startDate, selectedCourse);
      if (endDate) form.setValue('end_date', endDate);
    }
  };

  const handleEditCourseChange = (courseName: string) => {
    setEditSelectedCourse(courseName);
    const startDate = editForm.getValues('start_date');
    if (startDate) {
      const endDate = calcEndDate(startDate, courseName);
      if (endDate) editForm.setValue('end_date', endDate);
    }
  };

  const handleEditStartDateChange = (startDate: string) => {
    editForm.setValue('start_date', startDate);
    if (editSelectedCourse) {
      const endDate = calcEndDate(startDate, editSelectedCourse);
      if (endDate) editForm.setValue('end_date', endDate);
    }
  };

  const handleEditClick = (b: Batch) => {
    setEditingBatch(b);
    // Find if batch name matches known course
    const matchedCourse = availableCourses.find((c) => b.name?.includes(c.name))?.name || '';
    setEditSelectedCourse(matchedCourse);

    editForm.reset({
      name: b.name || '',
      description: b.description || '',
      course_fee: String(b.course_fee || ''),
      offer_fee: b.offer_fee != null ? String(b.offer_fee) : '',
      start_date: b.start_date ? new Date(b.start_date).toISOString().slice(0, 10) : '',
      end_date: b.end_date ? new Date(b.end_date).toISOString().slice(0, 10) : '',
      status: b.status || 'upcoming',
      max_students: b.max_students != null ? String(b.max_students) : '',
    });
    setEditOpen(true);
  };

  const { data: rawBatches, isLoading } = useQuery({
    queryKey: ['batches', search, activeTab, yearFilter, courseFilter],
    queryFn: async () =>
      (await batchesApi.list({
        search: search || undefined,
        status: activeTab === 'all' ? undefined : activeTab,
        year: yearFilter === 'all' ? undefined : Number(yearFilter),
        course: courseFilter === 'all' ? undefined : courseFilter,
      })).data.data,
  });

  // Ensure chronological order (latest to oldest by start_date)
  const batches = useMemo(() => {
    if (!rawBatches) return [];
    return [...rawBatches].sort((a, b) => {
      const dateA = new Date(a.start_date || 0).getTime();
      const dateB = new Date(b.start_date || 0).getTime();
      return dateB - dateA;
    });
  }, [rawBatches]);

  const createMutation = useMutation({
    mutationFn: (v: Record<string, string>) =>
      batchesApi.create({
        ...v,
        course_fee: Number(v.course_fee),
        offer_fee: v.offer_fee ? Number(v.offer_fee) : null,
        max_students: v.max_students ? Number(v.max_students) : null,
      }),
    onSuccess: () => {
      toast.success('Batch created');
      qc.invalidateQueries({ queryKey: ['batches'] });
      setOpen(false);
      form.reset();
      setSelectedCourse('');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: (v: Record<string, string>) => {
      if (!editingBatch) throw new Error('No batch selected');
      return batchesApi.update(editingBatch.id, {
        ...v,
        course_fee: Number(v.course_fee),
        offer_fee: v.offer_fee ? Number(v.offer_fee) : null,
        max_students: v.max_students ? Number(v.max_students) : null,
      });
    },
    onSuccess: () => {
      toast.success('Batch updated');
      qc.invalidateQueries({ queryKey: ['batches'] });
      setEditOpen(false);
      setEditingBatch(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => batchesApi.remove(id),
    onSuccess: () => {
      toast.success('Batch deleted');
      qc.invalidateQueries({ queryKey: ['batches'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // Helper for batch financial metrics calculation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const computeBatchMetrics = (b: any) => {
    const studentCount = Number(b.student_count || 0);
    const courseFee = Number(b.course_fee || 0);
    const offerFee = b.offer_fee != null ? Number(b.offer_fee) : null;
    
    // Batch Revenue = Course Fees x No. of students
    const batchRevenue = courseFee * studentCount;
    
    // Batch Offer Expense = (Course Fee - Offer Price) x No. of students (if offer price exists)
    const offerDiscountPerStudent = offerFee != null ? Math.max(0, courseFee - offerFee) : 0;
    const batchOfferExpense = offerDiscountPerStudent * studentCount;
    
    // Fees Profit = Batch Revenue - Batch Offer Expense
    const feesProfit = batchRevenue - batchOfferExpense;

    const feesCollected = Number(b.fees_collected || 0);
    const productProfit = Number(b.product_profit || 0);
    const expenses = Number(b.expenses || 0);

    // Total Batch Profit = (Fees Profit + Product Profits) - Expenses
    const totalBatchProfit = (feesProfit + productProfit) - expenses;

    return {
      studentCount,
      courseFee,
      offerFee,
      feesCollected,
      batchRevenue,
      batchOfferExpense,
      feesProfit,
      productProfit,
      expenses,
      totalBatchProfit,
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div>
          <h1 className="font-display text-2xl font-semibold">Batches</h1>
          <p className="text-sm text-muted-foreground">Courses, fees & profitability</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" /> Add Batch</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Batch</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-3">
              <div className="space-y-1">
                <Label>Course</Label>
                <Select value={selectedCourse} onValueChange={handleCourseChange}>
                  <SelectTrigger><SelectValue placeholder="Select course..." /></SelectTrigger>
                  <SelectContent>
                    {availableCourses.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name} ({c.duration_days} days)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1"><Label>Name</Label><Input {...form.register('name', { required: true })} /></div>
              <div className="space-y-1"><Label>Description</Label><Textarea {...form.register('description')} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Course fee</Label><Input type="number" {...form.register('course_fee', { required: true })} /></div>
                <div className="space-y-1"><Label>Offer</Label><Input type="number" placeholder="Optional" {...form.register('offer_fee')} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Start</Label>
                  <Input
                    type="date"
                    {...form.register('start_date')}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>End <span className="text-[10px] text-muted-foreground font-normal">(Auto-calculated)</span></Label>
                  <Input type="date" {...form.register('end_date')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select defaultValue="upcoming" onValueChange={(v) => form.setValue('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['upcoming', 'ongoing', 'completed', 'cancelled'].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Max students</Label><Input type="number" {...form.register('max_students')} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>Create</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Batch Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Batch</DialogTitle></DialogHeader>
            <form onSubmit={editForm.handleSubmit((v) => updateMutation.mutate(v))} className="space-y-3">
              <div className="space-y-1">
                <Label>Course</Label>
                <Select value={editSelectedCourse} onValueChange={handleEditCourseChange}>
                  <SelectTrigger><SelectValue placeholder="Select course..." /></SelectTrigger>
                  <SelectContent>
                    {availableCourses.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name} ({c.duration_days} days)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1"><Label>Name</Label><Input {...editForm.register('name', { required: true })} /></div>
              <div className="space-y-1"><Label>Description</Label><Textarea {...editForm.register('description')} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Course fee</Label><Input type="number" {...editForm.register('course_fee', { required: true })} /></div>
                <div className="space-y-1"><Label>Offer</Label><Input type="number" placeholder="Optional" {...editForm.register('offer_fee')} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Start</Label>
                  <Input
                    type="date"
                    {...editForm.register('start_date')}
                    onChange={(e) => handleEditStartDateChange(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>End <span className="text-[10px] text-muted-foreground font-normal">(Auto-calculated)</span></Label>
                  <Input type="date" {...editForm.register('end_date')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select
                    value={editForm.watch('status')}
                    onValueChange={(v) => editForm.setValue('status', v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['upcoming', 'ongoing', 'completed', 'cancelled'].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Max students</Label><Input type="number" {...editForm.register('max_students')} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={updateMutation.isPending}>Update Batch</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6 space-y-4">
          {/* Top Row: Tabs & View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <Button
                size="sm"
                variant={activeTab === 'ongoing' ? 'default' : 'outline'}
                onClick={() => setActiveTab('ongoing')}
              >
                Current Batches
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'upcoming' ? 'default' : 'outline'}
                onClick={() => setActiveTab('upcoming')}
              >
                Upcoming Batches
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'completed' ? 'default' : 'outline'}
                onClick={() => setActiveTab('completed')}
              >
                Completed Batches
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'all' ? 'default' : 'outline'}
                onClick={() => setActiveTab('all')}
              >
                All Batches
              </Button>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {batches && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({batches.length} {batches.length === 1 ? 'batch' : 'batches'})
                </span>
              )}
              <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/20">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  title="Grid view"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  title="Table view"
                  onClick={() => setViewMode('table')}
                >
                  <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Filters Bar: Search, Year, Course */}
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8 h-9 text-xs sm:text-sm w-full"
                placeholder="Search by batch name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={yearFilter} onValueChange={(v) => setYearFilter(v)}>
              <SelectTrigger className="h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
              </SelectContent>
            </Select>

            <Select value={courseFilter} onValueChange={(v) => setCourseFilter(v)}>
              <SelectTrigger className="h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Course Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {availableCourses.map((c) => (
                  <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : (
            <>
              {/* Card View */}
              <div className={
                viewMode === 'grid'
                  ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
                  : viewMode === 'table'
                  ? 'hidden'
                  : 'space-y-3 block md:hidden'
              }>
                {batches?.map((b) => {
                  const m = computeBatchMetrics(b);
                  return (
                    <div key={b.id} className="rounded-xl border border-border/80 p-4 space-y-3 bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-base">{b.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(b.start_date)} – {formatDate(b.end_date)}
                          </p>
                        </div>
                        <Badge variant={b.status === 'ongoing' ? 'success' : b.status === 'upcoming' ? 'warning' : 'secondary'}>
                          {b.status}
                        </Badge>
                      </div>

                      <div className="space-y-1.5 text-xs text-muted-foreground pt-2 border-t border-border/50">
                        <div className="flex justify-between"><span>Course fee</span><span className="text-foreground font-medium">{formatCurrency(m.courseFee)}</span></div>
                        {m.offerFee != null && (
                          <div className="flex justify-between"><span>Offer</span><span className="text-foreground font-medium">{formatCurrency(m.offerFee)}</span></div>
                        )}
                        <div className="flex justify-between"><span>Students</span><span className="text-foreground font-medium">{m.studentCount}</span></div>
                        <div className="flex justify-between"><span>Fees Collected</span><span className="text-foreground font-medium">{formatCurrency(m.feesCollected)}</span></div>
                        <div className="flex justify-between"><span>Batch Revenue</span><span className="text-foreground font-medium">{formatCurrency(m.batchRevenue)}</span></div>
                        <div className="flex justify-between"><span>Batch Offer Expense</span><span className="text-foreground font-medium">{formatCurrency(m.batchOfferExpense)}</span></div>
                        <div className="flex justify-between font-medium"><span>Fees Profit</span><span className="text-foreground">{formatCurrency(m.feesProfit)}</span></div>
                        <div className="flex justify-between"><span>Product Profits</span><span className="text-foreground font-medium">{formatCurrency(m.productProfit)}</span></div>
                        <div className="flex justify-between"><span>Expenses</span><span className="text-foreground font-medium">{formatCurrency(m.expenses)}</span></div>
                        <div className="flex justify-between font-bold text-sm pt-1 border-t border-border/40">
                          <span className="text-foreground">Total Batch Profit</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(m.totalBatchProfit)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-border/50">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs h-8"
                          onClick={() => handleEditClick(b)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm('Delete this batch? Blocked if students exist.')) deleteMutation.mutate(b.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {!batches?.length && (
                  <p className="py-8 text-center text-xs text-muted-foreground col-span-full">No batches found</p>
                )}
              </div>

              {/* Table View */}
              <div className={
                viewMode === 'table'
                  ? 'overflow-x-auto border rounded-lg'
                  : viewMode === 'grid'
                  ? 'hidden'
                  : 'hidden md:block overflow-x-auto border rounded-lg'
              }>
                <table className="w-full min-w-[1300px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Batch Name</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Start – End Date</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Status</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Course / Offer</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Students</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Fees Collected</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Batch Revenue</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Offer Expense</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Fees Profit</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Product Profits</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Expenses</th>
                      <th className="px-3 py-2.5 font-medium whitespace-nowrap">Total Batch Profit</th>
                      <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches?.map((b) => {
                      const m = computeBatchMetrics(b);
                      return (
                        <tr key={b.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2.5 font-medium whitespace-nowrap">{b.name}</td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(b.start_date)} – {formatDate(b.end_date)}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <Badge variant={b.status === 'ongoing' ? 'success' : b.status === 'upcoming' ? 'warning' : 'secondary'}>
                              {b.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                            <div>{formatCurrency(m.courseFee)}</div>
                            {m.offerFee != null && <div className="text-muted-foreground font-mono">Offer: {formatCurrency(m.offerFee)}</div>}
                          </td>
                          <td className="px-3 py-2.5 font-medium whitespace-nowrap">{m.studentCount}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap">{formatCurrency(m.feesCollected)}</td>
                          <td className="px-3 py-2.5 font-medium whitespace-nowrap">{formatCurrency(m.batchRevenue)}</td>
                          <td className="px-3 py-2.5 text-amber-700 dark:text-amber-400 whitespace-nowrap">{formatCurrency(m.batchOfferExpense)}</td>
                          <td className="px-3 py-2.5 font-medium whitespace-nowrap">{formatCurrency(m.feesProfit)}</td>
                          <td className="px-3 py-2.5 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{formatCurrency(m.productProfit)}</td>
                          <td className="px-3 py-2.5 text-red-600 dark:text-red-400 whitespace-nowrap">{formatCurrency(m.expenses)}</td>
                          <td className="px-3 py-2.5 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{formatCurrency(m.totalBatchProfit)}</td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" title="Edit batch" onClick={() => handleEditClick(b)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                title="Delete batch"
                                onClick={() => {
                                  if (confirm('Delete this batch? Blocked if students exist.')) deleteMutation.mutate(b.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!batches?.length && (
                      <tr><td colSpan={13} className="py-8 text-center text-xs text-muted-foreground">No batches found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
