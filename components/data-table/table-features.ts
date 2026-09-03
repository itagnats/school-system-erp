import {
  columnVisibilityFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  type Column,
  type ColumnDef,
  type Row,
  type RowData,
} from "@tanstack/react-table";

/**
 * Per-column presentation hints.
 *
 * Alignment and width belong to the column definition rather than to each cell
 * renderer: a numeric column right-aligns its header and every cell, and doing
 * that once here is what keeps a score column from drifting out of alignment
 * with its own heading.
 */
export interface ColumnMetaHints {
  /** Cell and header alignment. Numeric columns should be right aligned. */
  align?: "left" | "center" | "right";
  /** Extra classes applied to every cell in the column. */
  cellClassName?: string;
  /** Fixed width, e.g. "8rem". Omit to size from content. */
  width?: string;
}

/**
 * The table feature set for the whole application.
 *
 * TanStack Table v9 is opt-in: features are registered statically and only the
 * registered ones exist on the instance, which keeps the bundle small but means
 * the feature set is part of the table's type. Declaring it once here is what
 * stops every module from having to name the generic, and it guarantees two
 * tables in different modules cannot quietly support different behaviour.
 *
 * `columnMeta` is typed here too, rather than through global declaration
 * merging, so a column can carry alignment and class hints with real types.
 *
 * Add a feature when a screen genuinely needs it (row selection for bulk
 * enrollment, column visibility for the cost sheet) and it becomes available to
 * every table at once.
 */
export const tableFeaturesConfig = tableFeatures({
  columnVisibilityFeature,
  rowSortingFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  columnMeta: {} as ColumnMetaHints,
});

export type PrimeTableFeatures = typeof tableFeaturesConfig;

/** Column definition for a PRIME table. Use this instead of raw ColumnDef. */
export type PrimeColumnDef<TData extends RowData, TValue = unknown> = ColumnDef<
  PrimeTableFeatures,
  TData,
  TValue
>;

export type PrimeColumn<TData extends RowData, TValue = unknown> = Column<
  PrimeTableFeatures,
  TData,
  TValue
>;

export type PrimeRow<TData extends RowData> = Row<PrimeTableFeatures, TData>;
