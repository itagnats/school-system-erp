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
  type ColumnVisibility,
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
  /**
   * A request is in flight while rows are already on screen — a page change, a
   * new filter, a refetch after a mutation.
   *
   * Distinct from `isLoading`, which means there is nothing to show yet. Paging
   * forward is not a first load: replacing the rows with a skeleton throws away
   * the only context the user has and collapses the panel to the skeleton's
   * height, so the footer jumps out from under the cursor that just clicked it.
   * Keep the stale rows, mark them stale, and let the footer stay put.
   */
  isFetching?: boolean;
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

  /**
   * Provide with onColumnVisibilityChange to control which columns render.
   *
   * Controlled rather than internal because the menu that drives it sits in the
   * filter bar, outside this panel. Handing a feature module the table instance
   * so it could call `column.toggleVisibility()` would put TanStack's API back
   * in feature code, which is the thing `PrimeColumnDef` exists to prevent.
   */
  columnVisibility?: ColumnVisibility;
  onColumnVisibilityChange?: (visibility: ColumnVisibility) => void;

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

/**
 * The aria-sort value for a header cell.
 *
 * A sortable column that is not currently sorted must announce "none"; a column
 * that cannot sort at all announces nothing, because aria-sort on a static
 * header tells a screen reader the column is sortable when it is not.
 */
function ariaSortFor(
  sorted: false | "asc" | "desc",
  canSort: boolean,
): "ascending" | "descending" | "none" | undefined {
  if (sorted === "asc") return "ascending";
  if (sorted === "desc") return "descending";
  return canSort ? "none" : undefined;
}

/**
 * Whether the rows on screen no longer match the request in flight.
 *
 * Kept out of the component so the condition reads as one idea: marking rows
 * stale only means anything when there are rows worth keeping. With nothing
 * rendered yet, or an error showing, the skeleton and the error panel are still
 * the right answer.
 */
function showsStaleRows(state: {
  isFetching: boolean;
  isLoading: boolean;
  hasError: boolean;
  hasData: boolean;
  rowCount: number;
}): boolean {
  const { isFetching, isLoading, hasError, hasData, rowCount } = state;
  return isFetching && !isLoading && !hasError && hasData && rowCount > 0;
}

/**
 * The marker shown over stale rows.
 *
 * A label rather than a spinner, deliberately. Reduced motion collapses every
 * animation in the application to 0.01ms and the one carve-out is the spinner
 * inside a pending Button; a second spinner here would simply sit frozen for
 * the people who asked for less motion. Static text says the same thing to
 * everyone. The overlay is inert, so the pagination footer underneath it stays
 * clickable and paging forward twice in a row still works.
 */
function BusyOverlay({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div
      aria-hidden
      data-print="hide"
      className="pointer-events-none absolute inset-0 grid place-items-center"
    >
      <span className="rounded-full border border-hairline bg-surface-raised px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-xs">
        Updating…
      </span>
    </div>
  );
}

/**
 * Builds the table instance from the caller's props.
 *
 * Server-driven and client-driven tables differ only in which slices of state
 * the caller controls, and every one of those decisions is a branch. Making them
 * here keeps them in one place and leaves the component below about rendering,
 * which is the only reason it stays readable as the option list grows.
 *
 * A slice is handed over only when the caller supplies both the value and the
 * setter. Passing a value with no setter would freeze that state: the table
 * would render what it was given and have no way to ask for anything else.
 */
function usePrimeTable<TData extends RowData>(options: {
  columns: PrimeColumnDef<TData>[];
  data: TData[] | undefined;
  getRowId?: (row: TData) => string;
  total?: number;
  page: number;
  pageSize: number;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  columnVisibility?: ColumnVisibility;
  onColumnVisibilityChange?: (visibility: ColumnVisibility) => void;
}) {
  const {
    columns,
    data,
    getRowId,
    total,
    page,
    pageSize,
    sorting,
    onSortingChange,
    columnVisibility,
    onColumnVisibilityChange,
  } = options;

  const isServerSorted = sorting !== undefined && onSortingChange !== undefined;
  const isControlledVisibility =
    columnVisibility !== undefined && onColumnVisibilityChange !== undefined;

  return useTable<PrimeTableFeatures, TData>({
    features: tableFeaturesConfig,
    data: data ?? [],
    columns,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    manualPagination: total !== undefined,
    manualSorting: isServerSorted,
    rowCount: total,
    state: {
      // Sorting is only handed over when the caller controls it; otherwise the
      // table keeps its own so a simple list needs no state plumbing.
      ...(isServerSorted ? { sorting } : {}),
      ...(isControlledVisibility ? { columnVisibility } : {}),
      pagination: { pageIndex: page - 1, pageSize },
    },
    onSortingChange: onSortingChange
      ? (updater) => {
          const next =
            typeof updater === "function" ? updater(sorting ?? []) : updater;
          onSortingChange(next);
        }
      : undefined,
    onColumnVisibilityChange: onColumnVisibilityChange
      ? (updater) => {
          const next =
            typeof updater === "function" ? updater(columnVisibility ?? {}) : updater;
          onColumnVisibilityChange(next);
        }
      : undefined,
  });
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
  isFetching = false,
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
  columnVisibility,
  onColumnVisibilityChange,
  onRowClick,
  emptyState,
  loadingState,
  toolbar,
  footer,
  className,
  maxBodyHeight,
}: DataTableProps<TData>) {
  const table = usePrimeTable({
    columns,
    data,
    getRowId,
    total,
    page,
    pageSize,
    sorting,
    onSortingChange,
    columnVisibility,
    onColumnVisibilityChange,
  });

  const rows = table.getRowModel().rows;
  const columnCount = table.getAllLeafColumns().length;

  const isBusy = showsStaleRows({
    isFetching,
    isLoading,
    hasError: Boolean(error),
    hasData: data !== undefined,
    rowCount: rows.length,
  });

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
        aria-busy={isBusy}
        className={cn(
          "w-full overflow-x-auto transition-opacity duration-normal ease-standard",
          maxBodyHeight && "overflow-y-auto",
          // Stale rows are still readable rows, but they must not be mistaken
          // for current ones, and a row click mid-fetch would open whatever the
          // old page happened to have in that position.
          isBusy && "pointer-events-none opacity-60",
        )}
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
                      aria-sort={ariaSortFor(sorted, header.column.getCanSort())}
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
        "relative overflow-hidden rounded-md border border-hairline bg-card shadow-xs",
        className,
      )}
    >
      {toolbar ? <div className="px-3.5 py-2.5 hairline-b">{toolbar}</div> : null}

      {renderBody()}

      <BusyOverlay show={isBusy} />

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
