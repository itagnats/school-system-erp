"use client";

import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import {
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  DataTableViewOptions,
  type HideableColumn,
  type PrimeColumnDef,
} from "@/components/data-table";
import { EmptyState } from "@/components/feedback";
import { FilterBar, FilterSelect, SearchInput, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
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
import { SemesterFormDialog } from "./semester-form-dialog";

/**
 * The semester list (direction.md §5), with create and edit (§1, 2026-09-20).
 *
 * Semesters were read-only to the service until then - no `POST`, no `PATCH`,
 * no write half anywhere - against a §1 titled "Course & Semester Management".
 * `AUD-032`.
 */
export function SemestersScreen({ yearOptions }: { yearOptions: number[] }) {
  const table = useListTable({ sort: "code", direction: "desc" });
  const [editing, setEditing] = useState<SemesterListRow | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(semester: SemesterListRow) {
    setEditing(semester);
    setDialogOpen(true);
  }

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
              New semester
            </Button>
          </>
        }
      >
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
        columns={buildColumns({ onEdit: openEdit })}
        isLoading={query.isPending}
        isFetching={query.isFetching}
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

      <SemesterFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        semester={editing}
        // The latest year on record, so a new semester opens somewhere
        // sensible. Reading a clock here would be non-deterministic on a
        // screen the server renders.
        defaultAcademicYear={yearOptions[0] ?? 2026}
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
  { id: "dates", label: "Runs" },
  { id: "enrollmentCount", label: "Enrollments" },
];

function buildColumns({
  onEdit,
}: {
  onEdit: (semester: SemesterListRow) => void;
}): PrimeColumnDef<SemesterListRow>[] {
  return [
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
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      // Edit only. There is no delete: a semester with one enrollment, cost
      // sheet or program term against it cannot go, and every seeded one has
      // all three - so the action would exist to be refused. `closed` is what
      // means a semester is over.
      <DataTableRowActions
        label={row.original.code}
        actions={[
          {
            label: "Edit semester",
            icon: Pencil,
            onSelect: () => onEdit(row.original),
          },
        ]}
      />
    ),
    meta: { align: "right", width: "4rem" },
  },
  ];
}
