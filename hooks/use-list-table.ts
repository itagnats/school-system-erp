"use client";

import type { SortingState } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";
import type { ColumnVisibility } from "@/components/data-table";
import { useListQueryParams, type ListQueryState } from "./use-list-query-params";
import type { PaginatedResult } from "@/types";

/**
 * Bridges URL list state to the props `DataTable` expects.
 *
 * Without this, every list screen repeats the same translation: the URL keeps
 * `sort` and `direction` as two flat strings so it stays readable and
 * shareable, while TanStack Table wants a `SortingState` array. Doing that
 * conversion once means five screens cannot drift into five slightly different
 * versions of it.
 *
 * Sorting and paging are handed to the server, which is what `total` signals to
 * `DataTable`: it renders exactly the rows it is given rather than slicing them
 * again in the browser.
 */
export function useListTable(defaults?: Partial<ListQueryState>) {
  const params = useListQueryParams(defaults);
  const { sort, direction, setSort } = params;

  const sorting = useMemo<SortingState>(
    () => (sort ? [{ id: sort, desc: direction === "desc" }] : []),
    [sort, direction],
  );

  // Not URL state, deliberately. The rule in CLAUDE.md puts search, filters,
  // sort and paging in the address bar so a view is shareable, and those all
  // describe *which records* are on screen. Which columns someone chose to look
  // at is a personal preference, not part of the view being shared, and five
  // column ids would make every shared link unreadable.
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({});

  const onSortingChange = useCallback(
    (next: SortingState) => {
      const first = next[0];
      setSort(first?.id, first?.desc ? "desc" : "asc");
    },
    [setSort],
  );

  /** Props common to every server-driven table, spread at the call site. */
  const tableProps = useCallback(
    <T>(result: PaginatedResult<T> | undefined) => ({
      data: result?.items,
      total: result?.total,
      page: params.page,
      pageSize: params.pageSize,
      onPageChange: params.setPage,
      onPageSizeChange: params.setPageSize,
      sorting,
      onSortingChange,
      columnVisibility,
      onColumnVisibilityChange: setColumnVisibility,
    }),
    [
      params.page,
      params.pageSize,
      params.setPage,
      params.setPageSize,
      sorting,
      onSortingChange,
      columnVisibility,
    ],
  );

  return {
    ...params,
    sorting,
    onSortingChange,
    columnVisibility,
    setColumnVisibility,
    tableProps,
  };
}
