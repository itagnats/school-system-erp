"use client";

import Link from "next/link";
import { DataTable, DataTableColumnHeader, type PrimeColumnDef } from "@/components/data-table";
import { EmptyState } from "@/components/feedback";
import { FilterBar, FilterSelect, SearchInput, StatusBadge } from "@/components/shared";
import { useListTable } from "@/hooks";
import { routes } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { Option, SemesterStatus } from "@/types";
import {
  SEMESTER_STATUS_LABEL,
  SEMESTER_STATUS_OPTIONS,
  SEMESTER_STATUS_TONE,
} from "../constants";
import { useSemesters } from "../hooks/use-semesters";
import type { SemesterListRow } from "../types";

/** The semester list (direction.md §5). */
export function SemestersScreen({ yearOptions }: { yearOptions: number[] }) {
  const table = useListTable({ sort: "code", direction: "desc" });

  const status = table.getFilter("status");
  const academicYear = table.getFilter("academicYear");

  const query = useSemesters({
    search: table.search,
    page: table.page,
    pageSize: table.pageSize,
    sort: table.sort,
    direction: table.direction,
    status: status === "all" ? undefined : (status as SemesterStatus),
    academicYear: academicYear === "all" ? undefined : academicYear,
  });

  const yearFilterOptions: Option[] = yearOptions.map((year) => ({
    value: String(year),
    label: String(year),
  }));

  return (
    <>
      <FilterBar activeCount={table.activeCount} onClear={table.clearAll}>
        <SearchInput
          value={table.search}
          onValueChange={table.setSearch}
          placeholder="Search code or name"
          aria-label="Search semesters"
          className="w-full max-w-xs"
        />
        <FilterSelect
          label="Status"
          value={status}
          options={SEMESTER_STATUS_OPTIONS}
          onValueChange={(value) => table.setFilter("status", value)}
        />
        <FilterSelect
          label="Year"
          value={academicYear}
          options={yearFilterOptions}
          onValueChange={(value) => table.setFilter("academicYear", value)}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        isLoading={query.isPending}
        error={query.error}
        onRetry={() => query.refetch()}
        getRowId={(row) => row.id}
        emptyState={
          <EmptyState
            variant="no-results"
            title="No semesters match these filters"
            description="Clear the filters to see every term on record."
          />
        }
        {...table.tableProps(query.data)}
      />
    </>
  );
}

const columns: PrimeColumnDef<SemesterListRow>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
    cell: ({ row }) => (
      <Link
        href={routes.semester(row.original.code)}
        className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline"
        data-numeric
      >
        {row.original.code}
      </Link>
    ),
    meta: { width: "7rem" },
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => row.original.name,
  },
  {
    id: "dates",
    header: "Runs",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDate(row.original.startDate)} to {formatDate(row.original.endDate)}
      </span>
    ),
    meta: { width: "16rem" },
  },
  {
    accessorKey: "enrollmentCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Enrollments" align="right" />
    ),
    cell: ({ row }) => <span data-numeric>{row.original.enrollmentCount}</span>,
    meta: { align: "right", width: "8rem" },
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <StatusBadge
        tone={SEMESTER_STATUS_TONE[row.original.status]}
        label={SEMESTER_STATUS_LABEL[row.original.status]}
      />
    ),
    meta: { width: "8rem" },
  },
];
