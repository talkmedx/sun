'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  onLimitChange?: (newLimit: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = '',
}: PaginationProps) {
  if (total <= 0) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  // Generate page numbers range e.g. [1, 2, 3, 4, 5]
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, page - 2);
      let end = Math.min(totalPages, page + 2);

      if (page <= 3) {
        start = 1;
        end = 5;
      } else if (page >= totalPages - 2) {
        start = totalPages - 4;
        end = totalPages;
      }

      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-1 border-t border-border/60 text-xs text-muted-foreground ${className}`}>
      {/* Items count summary & rows per page selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span>
          Showing <strong className="font-semibold text-foreground">{startItem}</strong> to{' '}
          <strong className="font-semibold text-foreground">{endItem}</strong> of{' '}
          <strong className="font-semibold text-foreground">{total}</strong> items
        </span>

        {onLimitChange && (
          <div className="flex items-center gap-1.5 ml-2 border-l border-border/60 pl-3">
            <span>Rows:</span>
            <Select value={String(limit)} onValueChange={(val) => onLimitChange(Number(val))}>
              <SelectTrigger className="h-7 w-[70px] text-xs font-medium bg-card">
                <SelectValue placeholder={String(limit)} />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)} className="text-xs">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Pagination Navigation Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-xs disabled:opacity-40"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          title="First page"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>

        {/* Previous Page */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs font-medium disabled:opacity-40"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
        </Button>

        {/* Numbered Page Buttons */}
        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((p, idx) =>
            typeof p === 'number' ? (
              <Button
                key={idx}
                variant={p === page ? 'default' : 'outline'}
                size="sm"
                className={`h-8 w-8 p-0 text-xs font-semibold ${
                  p === page ? 'shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            ) : (
              <span key={idx} className="px-1 text-muted-foreground select-none">
                {p}
              </span>
            )
          )}
        </div>

        {/* Next Page */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs font-medium disabled:opacity-40"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>

        {/* Last Page */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-xs disabled:opacity-40"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          title="Last page"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
