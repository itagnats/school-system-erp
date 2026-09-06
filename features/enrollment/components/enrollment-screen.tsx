"use client";

import Link from "next/link";
import { DataTable, DataTableColumnHeader, type PrimeColumnDef } from "@/components/data-table";
import { EmptyState } from "@/components/feedback";
import { FilterBar, FilterSelect, SearchInput, StatusBadge } from "@/components/shared";
import { useListTable } from "@/hooks";
import { routes } from "@/lib/constants";
import type { EnrollmentListItem, EnrollmentStatus, Option, SemesterCode } from "@/types";
import {
  ENROLLMENT_STATUS_LABEL,
  ENROLLMENT_STATUS_OPTIONS,
  ENROLLMENT_STATUS_TONE,
  EVALUATION_GROUP_OPTIONS,
} from "../constants";
import { useEnrollments } from "../hooks/use-enrollments";

/**
 * The enrollment roster (direction.md §6-8).
 *
 * Four filters, because an enrollment is only meaningful in context: which
 * course, which semester, what state, and which evaluation group. The BFF joins
 * the student and course in, so a row arrives ready to render.
 */
export function EnrollmentScreen({
  courseOptions,
  semesterOptions,
}: {
  courseOptions: Option[];
  semesterOptions: SemesterCode[];
}) {
  const table = useListTable({ sort: "student" });

  const courseId = table.getFilter("courseId");
  const semester = table.getFilter("semester");
  const status = table.getFilter("status");
  const groupId = table.getFilter("evaluationGroupId");

  const query = useEnrollments({
    search: table.search,
    page: table.page,
    pageSize: table.pageSize,
    sort: table.sort,
    direction: table.direction,
    courseId: courseId === "all" ? undefined : courseId,
    semester: semester === "all" ? undefined : semester,
    status: status === "all" ? undefined : (status as EnrollmentStatus),
    evaluationGroupId: groupId === "all" ? undefined : groupId,
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
          placeholder="Search student or course"
          aria-label="Search enrollments"
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
          options={ENROLLMENT_STATUS_OPTIONS}
          onValueChange={(value) => table.setFilter("status", value)}
        />
        <FilterSelect
          label="Group"
          value={groupId}
          options={EVALUATION_GROUP_OPTIONS}
          onValueChange={(value) => table.setFilter("evaluationGroupId", value)}
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
            title="No enrollments match these filters"
            description="A course only has a roster in the semesters it is offered in."
          />
        }
        {...table.tableProps(query.data)}
      />
    </>
  );
}

const columns: PrimeColumnDef<EnrollmentListItem>[] = [
  {
    id: "student",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Student" />,
    cell: ({ row }) => (
      <div className="min-w-0">
        <Link
          href={routes.student(row.original.student.id)}
          className="rounded-sm text-foreground underline-offset-4 hover:underline"
        >
          {row.original.student.fullName}
        </Link>
        <p className="truncate text-xs text-muted-foreground" data-numeric>
          {row.original.student.studentId}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "courseCode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Course" />,
    cell: ({ row }) => (
      <Link
        href={routes.course(row.original.courseId)}
        className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline"
      >
        {row.original.courseCode}
      </Link>
    ),
    meta: { width: "7rem" },
  },
  {
    accessorKey: "semesterCode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Semester" />,
    cell: ({ row }) => <span data-numeric>{row.original.semesterCode}</span>,
    meta: { width: "8rem" },
  },
  {
    id: "group",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Group" />,
    cell: ({ row }) =>
      row.original.evaluationGroupName ?? (
        // Ungrouped is a real state, not missing data: grouping happens after
        // enrollment, so saying so is more useful than an empty cell.
        <span className="text-muted-foreground">Not grouped</span>
      ),
    meta: { width: "12rem" },
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <StatusBadge
        tone={ENROLLMENT_STATUS_TONE[row.original.status]}
        label={ENROLLMENT_STATUS_LABEL[row.original.status]}
      />
    ),
    meta: { width: "8rem" },
  },
];
