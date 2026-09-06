"use client";

import Link from "next/link";
import { DataTable, DataTableColumnHeader, type PrimeColumnDef } from "@/components/data-table";
import { EmptyState } from "@/components/feedback";
import { FilterBar, FilterSelect, SearchInput, StatusBadge } from "@/components/shared";
import { useListTable } from "@/hooks";
import { routes } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type { CostSheetStatus, Option, SemesterCode } from "@/types";
import { COST_STATUS_LABEL, COST_STATUS_OPTIONS, COST_STATUS_TONE } from "../constants";
import { useCostSheets } from "../hooks/use-cost-sheets";
import type { CostSheetRow } from "../types";

/**
 * The cost sheet list (direction.md §11-13).
 *
 * Total and cost per student arrive already calculated. The arithmetic behind
 * them is on the detail page, where there is room to show it rather than
 * assert it.
 */
export function CostSheetsScreen({
  courseOptions,
  semesterOptions,
}: {
  courseOptions: Option[];
  semesterOptions: SemesterCode[];
}) {
  const table = useListTable({ sort: "courseCode" });

  const courseId = table.getFilter("courseId");
  const semester = table.getFilter("semester");
  const status = table.getFilter("status");

  const query = useCostSheets({
    search: table.search,
    page: table.page,
    pageSize: table.pageSize,
    sort: table.sort,
    direction: table.direction,
    courseId: courseId === "all" ? undefined : courseId,
    semester: semester === "all" ? undefined : semester,
    status: status === "all" ? undefined : (status as CostSheetStatus),
  });

  const semesterFilterOptions: Option[] = semesterOptions.map((code) => ({
    value: code,
    label: code,
  }));

  return (
    <>
      <FilterBar activeCount={table.activeCount} onClear={table.clearAll}>
        <SearchInput
          value={table.search}
          onValueChange={table.setSearch}
          placeholder="Search course or semester"
          aria-label="Search cost sheets"
          className="w-full max-w-xs"
        />
        <FilterSelect
          label="Course"
          value={courseId}
          options={courseOptions}
          onValueChange={(value) => table.setFilter("courseId", value)}
        />
        <FilterSelect
          label="Semester"
          value={semester}
          options={semesterFilterOptions}
          onValueChange={(value) => table.setFilter("semester", value)}
        />
        <FilterSelect
          label="Status"
          value={status}
          options={COST_STATUS_OPTIONS}
          onValueChange={(value) => table.setFilter("status", value)}
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
            title="No cost sheets match these filters"
            description="Not every course offering has a sheet yet."
          />
        }
        {...table.tableProps(query.data)}
      />
    </>
  );
}

const columns: PrimeColumnDef<CostSheetRow>[] = [
  {
    accessorKey: "courseCode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Course" />,
    cell: ({ row }) => (
      <div className="min-w-0">
        <Link
          href={routes.costSheet(row.original.id)}
          className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {row.original.courseCode}
        </Link>
        <p className="truncate text-xs text-muted-foreground">{row.original.courseName}</p>
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
    accessorKey: "studentCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Students" align="right" />
    ),
    cell: ({ row }) => <span data-numeric>{row.original.studentCount}</span>,
    meta: { align: "right", width: "7rem" },
  },
  {
    accessorKey: "totalCost",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total cost" align="right" />
    ),
    cell: ({ row }) => (
      <span data-numeric>
        {formatCurrency(row.original.totalCost, row.original.currency)}
      </span>
    ),
    meta: { align: "right", width: "10rem" },
  },
  {
    accessorKey: "costPerStudent",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Per student" align="right" />
    ),
    cell: ({ row }) => {
      const value = row.original.costPerStudent;
      // Null, not zero: a sheet with nobody enrolled has no per-student figure,
      // and zero is a number a reader would believe.
      if (value === null) {
        return <span className="text-muted-foreground">No students</span>;
      }
      return (
        <span className="font-medium" data-numeric>
          {formatCurrency(value, row.original.currency)}
        </span>
      );
    },
    meta: { align: "right", width: "10rem" },
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <StatusBadge
        tone={COST_STATUS_TONE[row.original.status]}
        label={COST_STATUS_LABEL[row.original.status]}
      />
    ),
    meta: { width: "8rem" },
  },
];
