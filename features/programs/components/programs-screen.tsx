"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import {
  DataTable,
  DataTableColumnHeader,
  DataTableViewOptions,
  type HideableColumn,
  type PrimeColumnDef,
} from "@/components/data-table";
import { EmptyState } from "@/components/feedback";
import { FilterBar, FilterSelect, SearchInput, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useListTable } from "@/hooks";
import { routes } from "@/lib/constants";
import type { ProgramStatus, ProgramSummary, SemesterCode } from "@/types";
import { PROGRAM_STATUS_LABEL, PROGRAM_STATUS_OPTIONS, PROGRAM_STATUS_TONE } from "../constants";
import { usePrograms } from "../hooks/use-programs";
import { ProgramFormDialog } from "./program-form-dialog";

/**
 * The curriculum list (direction.md §4a, revised 2026-09-21).
 *
 * **A row is one program**, where it was one program *term* until this date.
 * Four rows reading BSC-IT 202501, 202502, 202601, 202602 described one
 * program with a history as four unrelated things, and gave the school's five
 * programs no page of their own. The terms moved one level down, onto the
 * program they belong to.
 *
 * **No money at all**, not even the package price (§13a). A price belongs to
 * a term, because the same curriculum is worth different money in different
 * semesters — so there is no single price to put on this row, and the nearest
 * thing would be an average nobody charges.
 */
export function ProgramsScreen({ semesterOptions }: { semesterOptions: SemesterCode[] }) {
  const table = useListTable({ sort: "code" });
  const [creating, setCreating] = useState(false);

  const status = table.getFilter("status");

  const query = usePrograms({
    search: table.search,
    page: table.page,
    pageSize: table.pageSize,
    sort: table.sort,
    direction: table.direction,
    status: status === "all" ? undefined : (status as ProgramStatus),
  });

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
            <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5">
              <Plus aria-hidden /> New program
            </Button>
          </>
        }
      >
        <SearchInput
          value={table.search}
          onValueChange={table.setSearch}
          placeholder="Search code, name or credential"
          aria-label="Search programs"
          className="w-full max-w-xs"
        />
        <FilterSelect
          label="Status"
          value={status}
          options={PROGRAM_STATUS_OPTIONS}
          onValueChange={(value) => table.setFilter("status", value)}
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
            title="No programs match these filters"
            description="A program gathers courses into a package per semester."
          />
        }
        {...table.tableProps(query.data)}
      />

      <ProgramFormDialog
        open={creating}
        onOpenChange={setCreating}
        semesterOptions={semesterOptions}
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
  { id: "credential", label: "Credential" },
  { id: "termCount", label: "Terms" },
  { id: "studentCount", label: "Students" },
  { id: "latestSemesterCode", label: "Latest term" },
];

const columns: PrimeColumnDef<ProgramSummary>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Program" />,
    cell: ({ row }) => (
      <div className="min-w-0">
        <Link
          href={routes.program(row.original.id)}
          className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {row.original.code}
        </Link>
        <p className="truncate text-xs text-muted-foreground">{row.original.name}</p>
      </div>
    ),
  },
  {
    accessorKey: "credential",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Credential" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.credential}</span>
    ),
  },
  {
    accessorKey: "termCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Terms" align="right" />
    ),
    cell: ({ row }) => <span data-numeric>{row.original.termCount}</span>,
    meta: { align: "right", width: "6rem" },
  },
  {
    accessorKey: "studentCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Students" align="right" />
    ),
    /* Distinct people, not memberships. A student holds one term per
       semester (§7a), so BSC-IT's four terms are 121 memberships and 57
       people — summing them would overstate the program by more than
       double. */
    cell: ({ row }) => <span data-numeric>{row.original.studentCount}</span>,
    meta: { align: "right", width: "6.5rem" },
  },
  {
    accessorKey: "latestSemesterCode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Latest term" />,
    cell: ({ row }) =>
      row.original.latestSemesterCode ? (
        <span data-numeric>{row.original.latestSemesterCode}</span>
      ) : (
        <span className="text-muted-foreground">Never run</span>
      ),
    meta: { width: "8rem" },
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <StatusBadge
        tone={PROGRAM_STATUS_TONE[row.original.status]}
        label={PROGRAM_STATUS_LABEL[row.original.status]}
      />
    ),
    meta: { width: "8rem" },
  },
];
