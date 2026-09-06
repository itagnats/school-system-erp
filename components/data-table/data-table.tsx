"use client";

import {
  flexRender,
  useTable,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import type { ReactNode } from "react";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/feedback";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "./data-table-pagination";
import {
  tableFeaturesConfig,
  type ColumnMetaHints,
  type PrimeColumnDef,
  type PrimeTableFeatures,
} from "./table-features";

/**
 * The single table implementation for the whole application (scaffold.md §19).
 *
 * It owns the four data states, sorting, pagination, alignment and the
 * horizontal scroll container. Feature modules supply columns and data and
 * nothing else, which is what stops a second, slightly different table
 * appearing per module.
 *
 * Server-driven or client-driven is a per-call decision:
 *   - pass `total` to page on the server: the table renders exactly the rows it
 *     is handed and uses `total` for the range readout;
 *   - pass `sorting` with `onSortingChange` to sort on the server;
 *   - omit either and the table does that job itself over the array given.
 *
 * Row height, cell padding and the type scale come from the density tokens, so
 * no column should be setting its own.
 */
export interface DataTableProps<TData extends RowData> {
  columns: PrimeColumnDef<TData>[];
  data: TData[] | undefined;

  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;

  /** Stable row identity, so keys survive a re-sort. */
  getRowId?: (row: TData) => string;

  /** Total rows on the server. Presence switches on manual pagination. */
  total?: number;
  /** 1-based. */
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;

  /** Provide with onSortingChange to sort on the server. */
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;

  onRowClick?: (row: TData) => void;

  /** Shown when there is no data. Supply one that offers the right next step. */
  emptyState?: ReactNode;
  /** Shown while loading. Defaults to a skeleton matching the column count. */
  loadingState?: ReactNode;

  /** Rendered above the table, inside the same panel. */
  toolbar?: ReactNode;
  /** Replaces the default pagination footer. */
  footer?: ReactNode;

  className?: string;
  /** Constrain the body height and keep the header visible while scrolling. */
  maxBodyHeight?: string;
}

const ALIGN_CLASS = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

export function DataTable<TData extends RowData>({
  columns,
  data,
  isLoading = false,
  error,
  onRetry,
  getRowId,
  total,
  page = 1,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  sorting,
  onSortingChange,
  onRowClick,
  emptyState,
  loadingState,
  toolbar,
  footer,
  className,
  maxBodyHeight,
}: DataTableProps<TData>) {
  const isServerPaged = total !== undefined;
  const isServerSorted = sorting !== undefined && onSortingChange !== undefined;

  const table = useTable<PrimeTableFeatures, TData>({
    features: tableFeaturesConfig,
    data: data ?? [],
    columns,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    manualPagination: isServerPaged,
    manualSorting: isServerSorted,
    rowCount: total,
    state: {
      // Sorting is only handed over when the caller controls it; otherwise the
      // table keeps its own so a simple list needs no state plumbing.
      ...(isServerSorted ? { sorting } : {}),
      pagination: { pageIndex: page - 1, pageSize },
    },
    onSortingChange: onSortingChange
      ? (updater) => {
          const next =
            typeof updater === "function" ? updater(sorting ?? []) : updater;
          onSortingChange(next);
        }
      : undefined,
  });

  const rows = table.getRowModel().rows;
  const columnCount = table.getAllLeafColumns().length;

  const renderBody = () => {
    if (error) return <ErrorState error={error} onRetry={onRetry} />;

    if (isLoading || data === undefined) {
      return <>{loadingState ?? <TableSkeleton columns={columnCount || 5} />}</>;
    }

    if (rows.length === 0) {
      return (
        <>
          {emptyState ?? (
            <EmptyState
              variant="no-results"
              title="No matching records"
              description="Try adjusting the search or filters."
            />
          )}
        </>
      );
    }

    return (
      <div
        className={cn("w-full overflow-x-auto", maxBodyHeight && "overflow-y-auto")}
        style={maxBodyHeight ? { maxHeight: maxBodyHeight } : undefined}
      >
        <Table>
          <TableHeader className={cn(maxBodyHeight && "sticky top-0 z-10")}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="bg-surface-sunken hover:bg-surface-sunken"
              >
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | ColumnMetaHints
                    | undefined;
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={
                        sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : header.column.getCanSort()
                              ? "none"
                              : undefined
                      }
                      // Height and cell padding come from TableHead itself now
                      // that it reads the density tokens; only the per-column
                      // width is genuinely dynamic.
                      style={{ width: meta?.width }}
                      className={cn(
                        "text-xs font-medium tracking-wide text-muted-foreground uppercase",
                        ALIGN_CLASS[meta?.align ?? "left"],
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                // A clickable row is a real control, so it is reachable and
                // operable from the keyboard rather than mouse-only.
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? "button" : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowClick(row.original);
                        }
                      }
                    : undefined
                }
                className={cn(
                  "hairline-b",
                  onRowClick && "cursor-pointer focus-visible:bg-accent/60",
                )}
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as
                    | ColumnMetaHints
                    | undefined;
                  return (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "text-sm",
                        ALIGN_CLASS[meta?.align ?? "left"],
                        meta?.cellClassName,
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const showPagination =
    !error && !isLoading && data !== undefined && rows.length > 0 && !!onPageChange;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-hairline bg-card shadow-xs",
        className,
      )}
    >
      {toolbar ? <div className="px-3.5 py-2.5 hairline-b">{toolbar}</div> : null}

      {renderBody()}

      {footer ??
        (showPagination ? (
          <div className="px-3.5 py-2 hairline-t">
            <DataTablePagination
              page={page}
              pageSize={pageSize}
              total={total ?? rows.length}
              onPageChange={onPageChange!}
              onPageSizeChange={onPageSizeChange}
            />
          </div>
        ) : null)}
    </div>
  );
}
