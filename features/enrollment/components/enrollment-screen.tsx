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
import type {
  EnrolmentTermOption,
  EnrollmentListItem,
  EnrollmentStatus,
  Option,
  SemesterCode,
} from "@/types";
import {
  ENROLLMENT_STATUS_LABEL,
  ENROLLMENT_STATUS_OPTIONS,
  ENROLLMENT_STATUS_TONE,
  EVALUATION_GROUP_OPTIONS,
} from "../constants";
import { useEnrollments } from "../hooks/use-enrollments";
import { AddStudentDialog } from "./add-student-dialog";

/**
 * The enrollment roster (direction.md §6-8).
 *
 * Five filters, because an enrollment is only meaningful in context: which
 * programme, which course, which semester, what state, and which evaluation
 * group. Programme comes first because that is what a student actually enrols
 * in - the course rows follow from the curriculum. The BFF joins the student
 * and course in, so a row arrives ready to render.
 */
export function EnrollmentScreen({
  courseOptions,
  programOptions,
  semesterOptions,
  termOptions,
  locked,
}: Readonly<{
  courseOptions: Option[];
  programOptions: Option[];
  semesterOptions: SemesterCode[];
  /** Programme terms currently taking enrolments, for the Add Student dialog. */
  termOptions: EnrolmentTermOption[];
  /**
   * Pins the table to one programme term.
   *
   * Set when this is the course-level section of a term page, where the
   * programme and semester are the page rather than a choice. Their filter
   * controls come off with them - a control whose value cannot change is
   * furniture - and so does Add Student, which the page header already owns.
   */
  locked?: { programId: string; semesterCode: SemesterCode };
}>) {
  const table = useListTable({ sort: "student" });

  const programId = locked?.programId ?? table.getFilter("programId");
  const courseId = table.getFilter("courseId");
  const semester = locked?.semesterCode ?? table.getFilter("semester");
  const status = table.getFilter("status");
  const groupId = table.getFilter("evaluationGroupId");

  const query = useEnrollments({
    search: table.search,
    page: table.page,
    pageSize: table.pageSize,
    sort: table.sort,
    direction: table.direction,
    programId: programId === "all" ? undefined : programId,
    courseId: courseId === "all" ? undefined : courseId,
    semester: semester === "all" ? undefined : semester,
    status: status === "all" ? undefined : (status as EnrollmentStatus),
    evaluationGroupId: groupId === "all" ? undefined : groupId,
  });

  /**
   * The term the filters already point at, if they point at exactly one.
   *
   * Enrolment belongs on the programme term page, where the term is in the URL
   * (direction.md 7a). This screen is the flat roster, so it can still open the
   * dialog - but when someone has already narrowed to one programme and one
   * semester, asking them to pick the term again is asking a question they
   * just answered.
   */
  const filteredTermId = termOptions.find(
    (term) => term.programId === programId && term.semesterCode === semester,
  )?.id;

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
          <>
            <DataTableViewOptions
              columns={OPTIONAL_COLUMNS}
              visibility={table.columnVisibility}
              onVisibilityChange={table.setColumnVisibility}
            />
            {locked ? null : (
              <AddStudentDialog
                terms={termOptions}
                semesterOptions={semesterOptions}
                defaultTermId={filteredTermId}
              />
            )}
          </>
        }
      >
        <SearchInput
          value={table.search}
          onValueChange={table.setSearch}
          placeholder="Search student or course"
          aria-label="Search enrollments"
          className="w-full max-w-xs"
        />
        {locked ? null : (
          <FilterSelect
            label="Programme"
            value={programId}
            options={programOptions}
            onValueChange={(value) => table.setFilter("programId", value)}
          />
        )}
        <FilterSelect
          label="Course"
          value={courseId}
          options={courseOptions}
          onValueChange={(value) => table.setFilter("courseId", value)}
        />
        {locked ? null : (
          <FilterSelect
            label="Semester"
            value={semester}
            options={semesterFilterOptions}
            onValueChange={(value) => table.setFilter("semester", value)}
          />
        )}
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
        isFetching={query.isFetching}
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

/**
 * The columns this screen is willing to let a user switch off.
 *
 * The identity column and the status are not on the list: hiding the link that
 * is the point of the row leaves a table nobody can navigate.
 */
const OPTIONAL_COLUMNS: HideableColumn[] = [
  { id: "semesterCode", label: "Semester" },
  { id: "group", label: "Group" },
];

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
