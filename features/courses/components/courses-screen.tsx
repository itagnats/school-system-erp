"use client";

import { Archive, Pencil, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  DataTable,
  DataTableColumnHeader,
  DataTableViewOptions,
  type HideableColumn,
  DataTableRowActions,
  type PrimeColumnDef,
} from "@/components/data-table";
import { EmptyState } from "@/components/feedback";
import { FilterBar, FilterSelect, SearchInput, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useListTable } from "@/hooks";
import { routes } from "@/lib/constants";
import type { Course, CourseStatus, Option, SemesterCode } from "@/types";
import { COURSE_STATUS_LABEL, COURSE_STATUS_OPTIONS, COURSE_STATUS_TONE } from "../constants";
import { useCourses } from "../hooks/use-courses";
import { useSetCourseStatus } from "../hooks/use-course-mutations";
import { CourseFormDialog } from "./course-form-dialog";

/**
 * The course list (direction.md §4).
 *
 * A client screen because everything on it is interactive: search, two filters,
 * sorting and paging all live in the URL and all resolve on the server. The
 * table renders exactly the rows the BFF returns.
 */
export function CoursesScreen({ semesterOptions }: { semesterOptions: SemesterCode[] }) {
  const table = useListTable({ sort: "code" });
  const [editing, setEditing] = useState<Course | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const setStatus = useSetCourseStatus();

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(course: Course) {
    setEditing(course);
    setDialogOpen(true);
  }

  const status = table.getFilter("status");
  const semester = table.getFilter("semester");

  const query = useCourses({
    search: table.search,
    page: table.page,
    pageSize: table.pageSize,
    sort: table.sort,
    direction: table.direction,
    status: status === "all" ? undefined : (status as CourseStatus),
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
          <>
            <DataTableViewOptions
              columns={OPTIONAL_COLUMNS}
              visibility={table.columnVisibility}
              onVisibilityChange={table.setColumnVisibility}
            />
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="size-3.5" aria-hidden />
              New course
            </Button>
          </>
        }
      >
        <SearchInput
          value={table.search}
          onValueChange={table.setSearch}
          placeholder="Search code, name or description"
          aria-label="Search courses"
          className="w-full max-w-xs"
        />
        <FilterSelect
          label="Status"
          value={status}
          options={COURSE_STATUS_OPTIONS}
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
        columns={buildColumns({
          onEdit: openEdit,
          onToggleStatus: (course) =>
            setStatus.mutate({
              course,
              status: course.status === "archived" ? "active" : "archived",
            }),
        })}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        getRowId={(row) => row.id}
        emptyState={
          <EmptyState
            variant="no-results"
            title="No courses match these filters"
            description="Try a different search term, or clear the filters to see every course."
          />
        }
        {...table.tableProps(query.data)}
      />

      <CourseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        course={editing}
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
  { id: "credits", label: "Credits" },
  { id: "offerings", label: "Semesters" },
];

function buildColumns({
  onEdit,
  onToggleStatus,
}: {
  onEdit: (course: Course) => void;
  onToggleStatus: (course: Course) => void;
}): PrimeColumnDef<Course>[] {
  return [
    {
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      cell: ({ row }) => (
        <Link
          href={routes.course(row.original.id)}
          className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {row.original.code}
        </Link>
      ),
      meta: { width: "7rem" },
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-foreground">{row.original.name}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.description}</p>
        </div>
      ),
    },
    {
      accessorKey: "credits",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Credits" align="right" />
      ),
      cell: ({ row }) => row.original.credits,
      meta: { align: "right", width: "6rem" },
    },
    {
      id: "offerings",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Semesters" align="right" />
      ),
      cell: ({ row }) => {
        const codes = row.original.offeredIn;
        // A draft course has never been scheduled. Saying so beats a bare zero,
        // which reads as a data problem rather than a state.
        if (codes.length === 0) {
          return <span className="text-muted-foreground">Not scheduled</span>;
        }
        return <span data-numeric>{codes.join(", ")}</span>;
      },
      meta: { align: "right", width: "12rem" },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <StatusBadge
          tone={COURSE_STATUS_TONE[row.original.status]}
          label={COURSE_STATUS_LABEL[row.original.status]}
        />
      ),
      meta: { width: "8rem" },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const course = row.original;
        const archived = course.status === "archived";
        return (
          <DataTableRowActions
            label={course.code}
            actions={[
              { label: "Edit course", icon: Pencil, onSelect: () => onEdit(course) },
              {
                label: archived ? "Restore to active" : "Archive course",
                icon: archived ? RotateCcw : Archive,
                onSelect: () => onToggleStatus(course),
              },
            ]}
          />
        );
      },
      meta: { align: "right", width: "4rem" },
    },
    ];
}
