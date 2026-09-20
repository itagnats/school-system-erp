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
import { formatCurrency } from "@/lib/utils";
import type { Option, ProgramTermStatus, ProgramTermSummary, SemesterCode } from "@/types";
import { TERM_STATUS_LABEL, TERM_STATUS_OPTIONS, TERM_STATUS_TONE } from "../constants";
import { useProgramTerms } from "../hooks/use-program-terms";

/**
 * The curriculum list (direction.md §4a).
 *
 * A row is one program term rather than one program, because the term is what
 * gathers courses into a package, carries the price, and is what a student
 * enrols in.
 *
 * **Profitability is not here** (§13a, revised 2026-09-20). Invoiced,
 * collected, attributed cost, net profit and margin all read under Cost
 * Management. What survives is the **package price**, because §4a lists it as
 * a curriculum attribute: it is what the package *is*, not what it earned.
 * Academic screens describe the offer; the money screens judge it.
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
          placeholder="Search program or semester"
          aria-label="Search programs"
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
            title="No program terms match these filters"
            description="A program only has a term in the semesters its courses are offered in."
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
];

const columns: PrimeColumnDef<ProgramTermSummary>[] = [
  {
    accessorKey: "programCode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Program" />,
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
