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
import type { Option, ProgramTermStatus, ProgramTermSummary, SemesterCode } from "@/types";
import {
  TERM_STATUS_LABEL,
  TERM_STATUS_OPTIONS,
  TERM_STATUS_TONE,
} from "../constants";
import { useEnrollmentTerms } from "../hooks/use-enrollment-terms";

/**
 * Enrollment, entered from the program (direction.md §7a, decided
 * 2026-09-16).
 *
 * A student joins a program term, so the first question this screen answers
 * is which term — and the students follow from it. The previous version opened
 * on 1,500 course-enrollment rows spanning every program and semester, which
 * is a searchable index rather than a place to do anything.
 *
 * Same rows as the Curriculum screen, read through a different lens. Curriculum
 * asks what a term earns and costs; this asks who is in it and whether it is
 * taking anyone. Neither set of columns belongs on the other screen, which is
 * what makes two views of one list worth having rather than a duplicate.
 */
export function EnrollmentTermsScreen({
  semesterOptions,
}: Readonly<{ semesterOptions: SemesterCode[] }>) {
  // Open terms first, then planning, then history - see the `enrollment` sort
  // key in the program service. Sorting by semester put five planning terms
  // above every term a student can actually be enrolled into, which is how you
  // end up hunting for a button that is one screen further down.
  const table = useListTable({ sort: "enrollment" });

  const status = table.getFilter("status");
  const semester = table.getFilter("semester");

  const query = useEnrollmentTerms({
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
          aria-label="Search program terms"
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
 * Program and semester together are the row's identity, and status says
 * whether anyone can be enrolled into it, so none of the three can be hidden.
 */
const OPTIONAL_COLUMNS: HideableColumn[] = [
  { id: "enrolledCount", label: "Students" },
  { id: "courseCount", label: "Courses" },
];

const columns: PrimeColumnDef<ProgramTermSummary>[] = [
  {
    accessorKey: "programCode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Program" />,
    cell: ({ row }) => (
      <Link
        href={routes.enrollmentTerm(row.original.id)}
        className="font-medium text-primary hover:underline"
      >
        {row.original.programCode}
        <span className="ml-1.5 font-normal text-muted-foreground">
          {row.original.programName}
        </span>
      </Link>
    ),
  },
  {
    accessorKey: "semesterCode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Semester" />,
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
  },
  {
    accessorKey: "enrolledCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Students" align="right" />
    ),
    cell: ({ row }) => <div className="text-right tabular-nums">{row.original.enrolledCount}</div>,
  },
  {
    accessorKey: "courseCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Courses" align="right" />
    ),
    cell: ({ row }) => <div className="text-right tabular-nums">{row.original.courseCount}</div>,
  },
];
