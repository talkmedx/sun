'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, LayoutGrid, List, Search, BookOpen, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { coursesApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Skeleton } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api';
import { Course } from '@/types';

import { Pagination } from '@/components/ui/pagination';
import { useDebounce } from '@/hooks/useDebounce';

export default function CoursesPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [viewMode, setViewMode] = useState<'auto' | 'grid' | 'table'>('table');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const qc = useQueryClient();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const form = useForm({
    defaultValues: {
      name: '',
      duration_days: '90',
      default_fee: '',
      description: '',
    },
  });

  const editForm = useForm({
    defaultValues: {
      name: '',
      duration_days: '90',
      default_fee: '',
      description: '',
      is_active: '1',
    },
  });

  const handleEditClick = (c: Course) => {
    setEditingCourse(c);
    editForm.reset({
      name: c.name || '',
      duration_days: String(c.duration_days || 90),
      default_fee: c.default_fee != null ? String(c.default_fee) : '',
      description: c.description || '',
      is_active: String(c.is_active ?? 1),
    });
    setEditOpen(true);
  };

  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses', debouncedSearch],
    queryFn: async () => (await coursesApi.list({ search: debouncedSearch || undefined })).data.data,
  });

  const createMutation = useMutation({
    mutationFn: (v: { name: string; duration_days: string; default_fee?: string; description?: string }) =>
      coursesApi.create({
        name: v.name,
        duration_days: Number(v.duration_days),
        default_fee: v.default_fee ? Number(v.default_fee) : undefined,
        description: v.description || undefined,
      }),
    onSuccess: () => {
      toast.success('Course created');
      qc.invalidateQueries({ queryKey: ['courses'] });
      setOpen(false);
      form.reset({ name: '', duration_days: '90', default_fee: '', description: '' });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: (v: { name: string; duration_days: string; default_fee?: string; description?: string; is_active?: string }) => {
      if (!editingCourse) throw new Error('No course selected');
      return coursesApi.update(editingCourse.id, {
        name: v.name,
        duration_days: Number(v.duration_days),
        default_fee: v.default_fee ? Number(v.default_fee) : undefined,
        description: v.description || undefined,
        is_active: v.is_active ? Number(v.is_active) : undefined,
      });
    },
    onSuccess: () => {
      toast.success('Course updated');
      qc.invalidateQueries({ queryKey: ['courses'] });
      setEditOpen(false);
      setEditingCourse(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => coursesApi.remove(id),
    onSuccess: () => {
      toast.success('Course deleted');
      qc.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // Helper to format days into approximate months display
  const formatDurationMonths = (days: number) => {
    const months = (days / 30).toFixed(1).replace(/\.0$/, '');
    return `${days} Days (${months} ${Number(months) === 1 ? 'Month' : 'Months'})`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div>
          <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> Courses
          </h1>
          <p className="text-sm text-muted-foreground">Manage courses, duration in days & standard fees</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" /> Add Course</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader><DialogTitle>New Course</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Course Name *</Label>
                <Input placeholder="e.g. Hair Styling Masterclass" {...form.register('name', { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>Duration in Days *</Label>
                <Input type="number" min="1" placeholder="90" {...form.register('duration_days', { required: true })} />
                <p className="text-[11px] text-muted-foreground">
                  approx. {form.watch('duration_days') ? (Number(form.watch('duration_days')) / 30).toFixed(1) : 0} months
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Default Course Fee (₹)</Label>
                <Input type="number" placeholder="Optional" {...form.register('default_fee')} />
              </div>
              <div className="space-y-1.5">
                <Label>Description <span className="text-xs text-muted-foreground font-normal">(Optional)</span></Label>
                <Textarea rows={2} placeholder="Course outline, syllabus, notes..." {...form.register('description')} />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Course'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Course Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader><DialogTitle>Edit Course</DialogTitle></DialogHeader>
            <form onSubmit={editForm.handleSubmit((v) => updateMutation.mutate(v))} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Course Name *</Label>
                <Input {...editForm.register('name', { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>Duration in Days *</Label>
                <Input type="number" min="1" {...editForm.register('duration_days', { required: true })} />
                <p className="text-[11px] text-muted-foreground">
                  approx. {editForm.watch('duration_days') ? (Number(editForm.watch('duration_days')) / 30).toFixed(1) : 0} months
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Default Course Fee (₹)</Label>
                <Input type="number" placeholder="Optional" {...editForm.register('default_fee')} />
              </div>
              <div className="space-y-1.5">
                <Label>Description <span className="text-xs text-muted-foreground font-normal">(Optional)</span></Label>
                <Textarea rows={2} {...editForm.register('description')} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={editForm.watch('is_active')}
                  onValueChange={(v) => editForm.setValue('is_active', v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Active</SelectItem>
                    <SelectItem value="0">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full mt-2" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Updating...' : 'Update Course'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">List of Courses</CardTitle>
              {courses && courses.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({courses.length} {courses.length === 1 ? 'course' : 'courses'})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/20 shrink-0">
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

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 h-9 text-xs sm:text-sm w-full"
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (() => {
            const totalCount = courses?.length || 0;
            const totalPages = Math.ceil(totalCount / limit) || 1;
            const paginatedCourses = courses ? courses.slice((page - 1) * limit, page * limit) : [];

            return (
              <>
                {/* Card / Grid View */}
                <div className={
                  viewMode === 'grid'
                    ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
                    : viewMode === 'table'
                    ? 'hidden'
                    : 'space-y-3 block md:hidden'
                }>
                  {paginatedCourses.map((c) => (
                    <div key={c.id} className="rounded-xl border border-border/80 p-4 space-y-3 bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold text-base">
                            <Link href={`/sun/courses/${c.id}`} className="hover:text-primary transition-colors">
                              {c.name}
                            </Link>
                          </h3>
                          <Badge variant={c.is_active ? 'success' : 'secondary'}>
                            {c.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        {c.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs text-muted-foreground pt-2 border-t border-border/50">
                        <div className="flex justify-between items-center">
                          <span className="inline-flex items-center"><Clock className="h-3.5 w-3.5 mr-1" /> Duration</span>
                          <span className="text-foreground font-medium">{formatDurationMonths(c.duration_days)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Default Fee</span>
                          <span className="text-foreground font-semibold">
                            {c.default_fee != null ? formatCurrency(c.default_fee) : '—'}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-border/50">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs h-8"
                          onClick={() => handleEditClick(c)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Delete course "${c.name}"?`)) deleteMutation.mutate(c.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!paginatedCourses.length && (
                    <p className="py-8 text-center text-xs text-muted-foreground col-span-full">No courses found</p>
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
                  <table className="w-full min-w-[700px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                        <th className="px-3 py-2.5 font-medium whitespace-nowrap">Course Name</th>
                        <th className="px-3 py-2.5 font-medium whitespace-nowrap">Duration in Days</th>
                        <th className="px-3 py-2.5 font-medium whitespace-nowrap">Default Fee</th>
                        <th className="px-3 py-2.5 font-medium whitespace-nowrap">Status</th>
                        <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCourses.map((c) => (
                        <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                            <Link href={`/sun/courses/${c.id}`} className="hover:text-primary transition-colors">
                              <div>{c.name}</div>
                            </Link>
                            {c.description && <div className="text-xs text-muted-foreground max-w-xs truncate">{c.description}</div>}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap font-medium">
                            {formatDurationMonths(c.duration_days)}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap font-semibold">
                            {c.default_fee != null ? formatCurrency(c.default_fee) : '—'}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <Badge variant={c.is_active ? 'success' : 'secondary'}>
                              {c.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" title="Edit course" onClick={() => handleEditClick(c)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                title="Delete course"
                                onClick={() => {
                                  if (confirm(`Delete course "${c.name}"?`)) deleteMutation.mutate(c.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!paginatedCourses.length && (
                        <tr><td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">No courses found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  total={totalCount}
                  limit={limit}
                  onPageChange={setPage}
                  onLimitChange={setLimit}
                  className="mt-4"
                />
              </>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
