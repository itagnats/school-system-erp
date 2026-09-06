"use client";

import Link from "next/link";
import { DataTable, DataTableColumnHeader, type PrimeColumnDef } from "@/components/data-table";
import { EmptyState } from "@/components/feedback";
import { FilterBar, FilterSelect, SearchInput, StatusBadge } from "@/components/shared";
import { useListTable } from "@/hooks";
import { routes } from "@/lib/constants";
import type {
  EvaluationSetupSummary,
  EvaluationWindowStatus,
  Option,
  SemesterCode,
} from "@/types";
import { WINDOW_STATUS_LABEL, WINDOW_STATUS_OPTIONS, WINDOW_STATUS_TONE } from "../constants";
import { useEvaluationSetups } from "../hooks/use-evaluation-setups";
import { ReadinessMark } from "./readiness-mark";

/**
 * Manage Evaluation (direction.md §14-15, §20).
 *
 * A row is one course-semester. That is the grain the configuration lives at:
 * groups, evaluators and the weight blend are all scoped to a course in a
 * semester, so listing groups instead would repeat the same settings five times
 * for a course with five groups.
 *
 * The two form columns are the point of the table. An administrator opening
 * this screen is not asking "what evaluations exist" - they are asking which
 * ones are not ready.
 */
export function ManageEvaluationScreen({
  semesterOptions,
  courseOptions,
}: Readonly<{ semesterOptions: SemesterCode[]; courseOptions: Option[] }>) {
  const table = useListTable({ sort: "courseCode" });

  const status = table.getFilter("status");
  const semester = table.getFilter("semester");
  const courseId = table.getFilter("courseId");

  const query = useEvaluationSetups({
    search: table.search,
    page: table.page,
    pageSize: table.pageSize,
    sort: table.sort,
    direction: table.direction,
    status: status === "all" ? undefined : (status as EvaluationWindowStatus),
    semester: semester === "all" ? undefined : (semester as SemesterCode),
    courseId: courseId === "all" ? undefined : courseId,
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
          placeholder="Search course or evaluation"
          aria-label="Search evaluations"
          className="w-full max-w-xs"
        />
        <FilterSelect
          label="Status"
          value={status}
          options={WINDOW_STATUS_OPTIONS}
          onValueChange={(value) => table.setFilter("status", value)}
        />
        <FilterSelect
          label="Semester"
          value={semester}
          options={semesterFilterOptions}
          onValueChange={(value) => table.setFilter("semester", value)}
        />
        <FilterSelect
          label="Course"
          value={courseId}
          options={courseOptions}
          onValueChange={(value) => table.setFilter("courseId", value)}
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
            title="No evaluations match these filters"
            description="An evaluation is set up per course and semester, and only once that cohort has been grouped."
          />
        }
        {...table.tableProps(query.data)}
      />
    </>
  );
}

const columns: PrimeColumnDef<EvaluationSetupSummary>[] = [
  {
    accessorKey: "courseCode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Course" />,
    cell: ({ row }) => (
      <div className="min-w-0">
        <Link
          href={routes.evaluationSetup(row.original.id)}
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
    accessorKey: "shortName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Reference" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.shortName}</span>
    ),
    meta: { width: "9rem" },
  },
  {
    accessorKey: "memberCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Students" align="right" />
    ),
    cell: ({ row }) => {
      const { memberCount, ungroupedCount } = row.original;
      return (
        <span className="inline-flex items-baseline gap-1.5">
          <span data-numeric>{memberCount}</span>
          {ungroupedCount > 0 ? (
            // Ungrouped students cannot be evaluated by their peers, so the
            // head count on its own overstates who is actually covered.
            <span
              className="text-[10px] text-warning-soft-foreground"
              title={`${ungroupedCount} student(s) are not in a group and will not be evaluated`}
            >
              {ungroupedCount} ungrouped
            </span>
          ) : null}
        </span>
      );
    },
    meta: { align: "right", width: "10rem" },
  },
  {
    accessorKey: "groupCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Groups" align="right" />
    ),
    cell: ({ row }) => <span data-numeric>{row.original.groupCount}</span>,
    meta: { align: "right", width: "6rem" },
  },
  {
    id: "criteriaForm",
    header: () => <span title="Rate one subject against the seven criteria">Criteria</span>,
    cell: ({ row }) => <ReadinessMark readiness={row.original.criteriaForm} />,
    meta: { align: "center", width: "6rem" },
  },
  {
    id: "rankingForm",
    header: () => <span title="Put every subject in scope into an order">Ranking</span>,
    cell: ({ row }) => <ReadinessMark readiness={row.original.rankingForm} />,
    meta: { align: "center", width: "6rem" },
  },
  {
    id: "weight",
    header: () => <span>Blend</span>,
    cell: ({ row }) => {
      const remaining = row.original.weightRemainingPercent;
      if (remaining === 0) {
        return <span className="text-xs text-muted-foreground">Balanced</span>;
      }
      // A blend that does not total 100 scales every score in the course, and
      // nothing downstream would flag it. Say so here, on the overview.
      return (
        <span className="text-xs font-medium text-error" data-numeric>
          {remaining > 0 ? `${remaining}% short` : `${-remaining}% over`}
        </span>
      );
    },
    meta: { width: "8rem" },
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Window" />,
    cell: ({ row }) => (
      <StatusBadge
        tone={WINDOW_STATUS_TONE[row.original.status]}
        label={WINDOW_STATUS_LABEL[row.original.status]}
      />
    ),
    meta: { width: "8rem" },
  },
];
