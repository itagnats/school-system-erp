"use client";

import Link from "next/link";
import { DataTable, DataTableColumnHeader, type PrimeColumnDef } from "@/components/data-table";
import { EmptyState } from "@/components/feedback";
import { FilterBar, FilterSelect, SearchInput } from "@/components/shared";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useListTable } from "@/hooks";
import { routes } from "@/lib/constants";
import { initials } from "@/lib/utils";
import type { Option, StudentSummary } from "@/types";
import { YEAR_LEVEL_OPTIONS, yearLevelLabel } from "../constants";
import { useStudents } from "../hooks/use-students";

/** The student list (direction.md §9). Rows are summaries, not full profiles. */
export function StudentsScreen({ programOptions }: { programOptions: string[] }) {
  const table = useListTable({ sort: "studentId" });

  const program = table.getFilter("program");
  const yearLevel = table.getFilter("yearLevel");

  const query = useStudents({
    search: table.search,
    page: table.page,
    pageSize: table.pageSize,
    sort: table.sort,
    direction: table.direction,
    program: program === "all" ? undefined : program,
    yearLevel: yearLevel === "all" ? undefined : yearLevel,
  });

  const programFilterOptions: Option[] = programOptions.map((name) => ({
    value: name,
    label: name,
  }));

  return (
    <>
      <FilterBar activeCount={table.activeCount} onClear={table.clearAll}>
        <SearchInput
          value={table.search}
          onValueChange={table.setSearch}
          placeholder="Search name, ID or email"
          aria-label="Search students"
          className="w-full max-w-xs"
        />
        <FilterSelect
          label="Program"
          value={program}
          options={programFilterOptions}
          onValueChange={(value) => table.setFilter("program", value)}
        />
        <FilterSelect
          label="Year"
          value={yearLevel}
          options={YEAR_LEVEL_OPTIONS}
          onValueChange={(value) => table.setFilter("yearLevel", value)}
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
            title="No students match these filters"
            description="Try a different search term, or clear the filters."
          />
        }
        {...table.tableProps(query.data)}
      />
    </>
  );
}

const columns: PrimeColumnDef<StudentSummary>[] = [
  {
    accessorKey: "studentId",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Student ID" />,
    cell: ({ row }) => (
      <Link
        href={routes.student(row.original.id)}
        className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline"
        data-numeric
      >
        {row.original.studentId}
      </Link>
    ),
    meta: { width: "10rem" },
  },
  {
    accessorKey: "fullName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <Avatar className="size-7 shrink-0">
          <AvatarFallback className="text-[10px]">
            {initials(row.original.fullName.split(" ")[0], row.original.fullName.split(" ")[1])}
          </AvatarFallback>
        </Avatar>
        <span className="truncate">{row.original.fullName}</span>
      </div>
    ),
  },
  {
    accessorKey: "program",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Program" />,
    cell: ({ row }) => row.original.program,
    meta: { width: "14rem" },
  },
  {
    accessorKey: "major",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Major" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.major}</span>
    ),
    meta: { width: "14rem" },
  },
  {
    accessorKey: "yearLevel",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Year" align="right" />
    ),
    cell: ({ row }) => yearLevelLabel(row.original.yearLevel),
    meta: { align: "right", width: "6rem" },
  },
];
