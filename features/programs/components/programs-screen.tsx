"use client";

import Link from "next/link";
import {
  DataTable,
  DataTableColumnHeader,
  DataTableViewOptions,
  type HideableColumn,
  type PrimeColumnDef,
} from "@/components/data-table";
import { EmptyState } from "@/components/feedback";
import { FilterBar, FilterSelect, SearchInput, StatusBadge } from "@/components/shared";
import { useListTable } from "@/hooks";
import { routes } from "@/lib/constants";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { Option, ProgramTermStatus, ProgramTermSummary, SemesterCode } from "@/types";
import {
  TERM_STATUS_LABEL,
  TERM_STATUS_OPTIONS,
  TERM_STATUS_TONE,
  profitToneClass,
} from "../constants";
import { useProgramTerms } from "../hooks/use-program-terms";

/**
 * Curriculum and profitability (direction.md §4a, §13a).
 *
 * A row is one programme term rather than one programme, because the money
 * question is always asked of a semester: the same curriculum priced the same
 * way makes or loses money depending on how many people took it.
 */
export function ProgramsScreen({ semesterOptions }: { semesterOptions: SemesterCode[] }) {
  const table = useListTable({ sort: "programCode" });

  const status = table.getFilter("status");
  const semester = table.getFilter("semester");

  const query = useProgramTerms({
    search: table.search,
    page: table.page,
    pageSize: table.pageSize,
    sort: table.sort,
    direction: table.direction,
    status: status === "all" ? undefined : (status as ProgramTermStatus),
    semester: semester === "all" ? undefined : semester,
  });

  const semesterFilterOptions: Option[] = semesterOptions.map((code) => ({
    value: code,
    label: code,
  }));

  return (
    <>
      <FilterBar
        activeCount={table.activeCount}
        onClear={table.clearAll}
        actions={
          <DataTableViewOptions
            columns={OPTIONAL_COLUMNS}
            visibility={table.columnVisibility}
            onVisibilityChange={table.setColumnVisibility}
          />
        }
      >
        <SearchInput
          value={table.search}
          onValueChange={table.setSearch}
          placeholder="Search programme or semester"
          aria-label="Search programmes"
          className="w-full max-w-xs"
        />
        <FilterSelect
          label="Status"
          value={status}
          options={TERM_STATUS_OPTIONS}
          onValueChange={(value) => table.setFilter("status", value)}
        />
        <FilterSelect
          label="Semester"
          value={semester}
          options={semesterFilterOptions}
          onValueChange={(value) => table.setFilter("semester", value)}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        getRowId={(row) => row.id}
        emptyState={
          <EmptyState
            variant="no-results"
            title="No programme terms match these filters"
            description="A programme only has a term in the semesters its courses are offered in."
          />
        }
        {...table.tableProps(query.data)}
      />
    </>
  );
}

/**
 * The columns this screen is willing to let a user switch off.
 *
 * The identity column and the status are not on the list: hiding the link that
 * is the point of the row leaves a table nobody can navigate.
 */
const OPTIONAL_COLUMNS: HideableColumn[] = [
  { id: "courseCount", label: "Courses" },
  { id: "enrolledCount", label: "Students" },
  { id: "packagePrice", label: "Package" },
  { id: "revenue", label: "Invoiced" },
  { id: "collected", label: "Collected" },
  { id: "totalCost", label: "Cost" },
  { id: "marginPercent", label: "Margin" },
];

const columns: PrimeColumnDef<ProgramTermSummary>[] = [
  {
    accessorKey: "programCode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Programme" />,
    cell: ({ row }) => (
      <div className="min-w-0">
        <Link
          href={routes.programTerm(row.original.id)}
          className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {row.original.programCode}
        </Link>
        <p className="truncate text-xs text-muted-foreground">{row.original.programName}</p>
      </div>
    ),
  },
  {
    accessorKey: "semesterCode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Semester" />,
    cell: ({ row }) => <span data-numeric>{row.original.semesterCode}</span>,
    meta: { width: "8rem" },
  },
  {
    accessorKey: "courseCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Courses" align="right" />
    ),
    cell: ({ row }) => <span data-numeric>{row.original.courseCount}</span>,
    meta: { align: "right", width: "6rem" },
  },
  {
    accessorKey: "enrolledCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Students" align="right" />
    ),
    cell: ({ row }) => <span data-numeric>{row.original.enrolledCount}</span>,
    meta: { align: "right", width: "6rem" },
  },
  {
    accessorKey: "packagePrice",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Package" align="right" />
    ),
    cell: ({ row }) => (
      <span data-numeric>
        {formatCurrency(row.original.packagePrice, row.original.currency)}
      </span>
    ),
    meta: { align: "right", width: "9rem" },
  },
  {
    accessorKey: "revenue",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Invoiced" align="right" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground" data-numeric>
        {formatCurrency(row.original.revenue, row.original.currency)}
      </span>
    ),
    meta: { align: "right", width: "10rem" },
  },
  {
    accessorKey: "collected",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Collected" align="right" />
    ),
    cell: ({ row }) => (
      // The figure net profit is measured against, so it sits beside the
      // invoiced total rather than only on the detail page.
      <span data-numeric>
        {formatCurrency(row.original.collected, row.original.currency)}
      </span>
    ),
    meta: { align: "right", width: "10rem" },
  },
  {
    accessorKey: "totalCost",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cost" align="right" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground" data-numeric>
        {formatCurrency(row.original.totalCost, row.original.currency)}
      </span>
    ),
    meta: { align: "right", width: "10rem" },
  },
  {
    accessorKey: "netProfit",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Net profit" align="right" />
    ),
    cell: ({ row }) => {
      // A term whose invoices are all drafts has billed nothing, so its "net
      // profit" is the cost carried and not a result. Showing the negative
      // figure without saying so makes a planning term read as a failing one.
      if (row.original.revenue === 0) {
        return <span className="text-muted-foreground">Not billed</span>;
      }
      // The sign is in the number as well as in the colour, so the figure still
      // reads for someone who cannot tell the two tones apart.
      return (
        <span
          className={`font-medium ${profitToneClass(row.original.netProfit)}`}
          data-numeric
        >
          {formatCurrency(row.original.netProfit, row.original.currency)}
        </span>
      );
    },
    meta: { align: "right", width: "11rem" },
  },
  {
    accessorKey: "marginPercent",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Margin" align="right" />
    ),
    cell: ({ row }) => {
      const { marginPercent: margin, coursesMissingCostSheet } = row.original;
      if (margin === null) {
        return (
          <span className="text-muted-foreground">
            {row.original.revenue === 0 ? "Not billed" : "Nothing collected"}
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className={profitToneClass(margin)} data-numeric>
            {formatPercent(margin, 1)}
          </span>
          {coursesMissingCostSheet > 0 ? (
            // A margin computed from an incomplete cost is flattering, not
            // accurate. Saying so beats showing a number that looks finished.
            <span
              className="text-[10px] text-warning-soft-foreground"
              title={`${coursesMissingCostSheet} course(s) have no cost sheet, so cost is understated`}
            >
              partial
            </span>
          ) : null}
        </span>
      );
    },
    meta: { align: "right", width: "8rem" },
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <StatusBadge
        tone={TERM_STATUS_TONE[row.original.status]}
        label={TERM_STATUS_LABEL[row.original.status]}
      />
    ),
    meta: { width: "8rem" },
  },
];
