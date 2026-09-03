"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS } from "@/config/app";
import { formatNumber } from "@/lib/utils";

/**
 * Pagination footer.
 *
 * The range readout ("21-40 of 137") is there on purpose: a page number alone
 * does not tell a user how much data they are looking at. Changing the page size
 * returns to page 1, because staying on page 7 of a now-shorter list lands the
 * user on an empty page.
 */
export function DataTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: {
  /** 1-based. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  disabled?: boolean;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  const canPrev = current > 1 && !disabled;
  const canNext = current < pageCount && !disabled;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2"
      data-print="hide"
    >
      <p className="text-xs text-muted-foreground" data-numeric>
        {total === 0
          ? "No records"
          : `${formatNumber(from)}-${formatNumber(to)} of ${formatNumber(total)}`}
      </p>

      <div className="flex items-center gap-2">
        {onPageSizeChange ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Rows</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
              disabled={disabled}
            >
              <SelectTrigger
                aria-label="Rows per page"
                className="w-[4.25rem]"
                style={{ height: "var(--control-h-sm)" }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <span className="px-1 text-xs text-muted-foreground" data-numeric>
          Page {current} of {pageCount}
        </span>

        <div className="flex items-center gap-0.5">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="First page"
            disabled={!canPrev}
            onClick={() => onPageChange(1)}
          >
            <ChevronsLeft className="size-3.5" aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={!canPrev}
            onClick={() => onPageChange(current - 1)}
          >
            <ChevronLeft className="size-3.5" aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={!canNext}
            onClick={() => onPageChange(current + 1)}
          >
            <ChevronRight className="size-3.5" aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Last page"
            disabled={!canNext}
            onClick={() => onPageChange(pageCount)}
          >
            <ChevronsRight className="size-3.5" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
