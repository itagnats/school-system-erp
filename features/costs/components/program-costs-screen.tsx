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
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { CostSheetStatus, Option, SemesterCode } from "@/types";
import {
  COST_STATUS_LABEL,
  COST_STATUS_OPTIONS,
  COST_STATUS_TONE,
  profitToneClass,
} from "../constants";
import { useProgramCostSheets } from "../hooks/use-program-cost-sheet";
import type { ProgramCostRow } from "../types";

/**
 * The index of Cost Management (direction.md §11, revised 2026-09-16).
 *
 * The program term is where a costing is finished — it owns the indirect
 * pool, the driver, the markup and the price — so it is what the cost area
 * leads with. Course sheets are contributing parts and list separately.
 *
 * Every figure arrives calculated. The arithmetic is on the sheet itself, where
 * there is room to show it rather than assert it.
 */
export function ProgramCostsScreen({
  programOptions,
  semesterOptions,
}: {
  programOptions: Option[];
  semesterOptions: SemesterCode[];
}) {
  const table = useListTable({ sort: "programCode" });

  const programId = table.getFilter("programId");
  const semester = table.getFilter("semester");
  const status = table.getFilter("status");

  const query = useProgramCostSheets({
    search: table.search,
    page: table.page,
    pageSize: table.pageSize,
    sort: table.sort,
    direction: table.direction,
    programId: programId === "all" ? undefined : programId,
    semester: semester === "all" ? undefined : semester,
    status: status === "all" ? undefined : (status as CostSheetStatus),
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
          aria-label="Search program cost sheets"
          className="w-full max-w-xs"
        />
        <FilterSelect
          label="Program"
          value={programId}
          options={programOptions}
          onValueChange={(value) => table.setFilter("programId", value)}
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
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        getRowId={(row) => row.id}
        emptyState={
          <EmptyState
            variant="no-results"
            title="No program cost sheets match these filters"
            description="Every program term has one; try clearing a filter."
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
 * Not the program, not the total, not the price: hiding the link is a table
 * nobody can navigate, and hiding either side of the cost-against-price
 * comparison is hiding the reason the list exists.
 */
const OPTIONAL_COLUMNS: HideableColumn[] = [
  { id: "semesterCode", label: "Semester" },
  { id: "courseCount", label: "Courses" },
  { id: "studentCount", label: "Students" },
  { id: "indirectTotal", label: "Indirect pool" },
  { id: "revenue", label: "Invoiced" },
  { id: "collected", label: "Collected" },
  { id: "netProfit", label: "Net profit" },
  { id: "marginPercent", label: "Margin" },
];

const columns: PrimeColumnDef<ProgramCostRow>[] = [
  {
    accessorKey: "programCode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Program" />,
    cell: ({ row }) => (
      <div className="min-w-0">
        <Link
          href={routes.programCost(row.original.programTermId)}
          className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {row.original.programCode}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {row.original.programName}
        </p>
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
    accessorKey: "courseCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Courses" align="right" />
    ),
    cell: ({ row }) => (
      <div className="text-right">
        <span data-numeric>{row.original.courseCount}</span>
        {/* Unknown, never zero (§13a): a curriculum course with no direct sheet
            still takes its share of the pool, but nobody has stated its cost. */}
        {row.original.missingCostSheets > 0 ? (
          <p className="text-xs text-warning-soft-foreground">
            {row.original.missingCostSheets} uncosted
          </p>
        ) : null}
      </div>
    ),
    meta: { align: "right", width: "7rem" },
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
    accessorKey: "indirectTotal",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Indirect pool" align="right" />
    ),
    cell: ({ row }) => (
      <span data-numeric>
        {formatCurrency(row.original.indirectTotal, row.original.currency)}
      </span>
    ),
    meta: { align: "right", width: "10rem" },
  },
  {
    accessorKey: "totalCost",
    // "Program cost" rather than "Total cost" since the P&L arrived beside it
    // (§13a, 2026-09-20). This is the sheet - direct + indirect + markup for
    // the whole term - while net profit is measured against the attributed
    // cost, which charges each course only for the members who took it. They
    // match to the satang on 17 of the 19 seeded terms and diverge on 2, so
    // under one name the two that diverge would read as arithmetic that
    // failed rather than as two different questions.
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Program cost" align="right" />
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
    cell: ({ row }) =>
      row.original.costPerStudent === null ? (
        // Null is not zero: nobody is enrolled, so there is no per-head figure.
        <span className="text-muted-foreground">No students</span>
      ) : (
        <span data-numeric>
          {formatCurrency(row.original.costPerStudent, row.original.currency)}
        </span>
      ),
    meta: { align: "right", width: "10rem" },
  },
  {
    accessorKey: "packagePrice",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Charged" align="right" />
    ),
    cell: ({ row }) => (
      <div className="text-right">
        <span data-numeric>
          {formatCurrency(row.original.packagePrice, row.original.currency)}
        </span>
        {/* The whole point of the row: what it costs against what it charges.
            The preferred price is the sellable figure the cost implies, so a
            package below it is a package sold at a loss. */}
        {row.original.preferredPrice !== null &&
        row.original.packagePrice < row.original.preferredPrice ? (
          <p className="text-xs text-warning-soft-foreground">
            below {formatCurrency(row.original.preferredPrice, row.original.currency)}
          </p>
        ) : null}
      </div>
    ),
    meta: { align: "right", width: "11rem" },
  },
  {
    accessorKey: "revenue",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Invoiced" align="right" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground" data-numeric>
        {formatCurrency(row.original.revenue, row.original.currency)}
      </span>
    ),
    meta: { align: "right", width: "10rem" },
  },
  {
    accessorKey: "collected",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Collected" align="right" />
    ),
    cell: ({ row }) => (
      // The figure net profit is measured against, so it sits next to it.
      <span data-numeric>
        {formatCurrency(row.original.collected, row.original.currency)}
      </span>
    ),
    meta: { align: "right", width: "10rem" },
  },
  {
    accessorKey: "netProfit",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Net profit" align="right" />
    ),
    cell: ({ row }) => {
      const { collected, revenue, netProfit, currency } = row.original;
      // Net profit is measured on **collected** (§13a), so what suppresses it
      // is collecting nothing - not invoicing nothing. The version of this
      // cell on the old Curriculum screen tested `revenue` instead, so a term
      // that had billed and been paid nothing showed its whole attributed
      // cost as a net loss, as though that were a result (`AUD-016`).
      if (collected === 0) {
        return (
          <span className="text-muted-foreground">
            {revenue === 0 ? "Not billed" : "Nothing collected"}
          </span>
        );
      }
      // The sign is in the number as well as in the color, so the figure still
      // reads for someone who cannot tell the two tones apart.
      return (
        <span className={`font-medium ${profitToneClass(netProfit)}`} data-numeric>
          {formatCurrency(netProfit, currency)}
        </span>
      );
    },
    meta: { align: "right", width: "11rem" },
  },
  {
    accessorKey: "marginPercent",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Margin" align="right" />
    ),
    cell: ({ row }) => {
      const { marginPercent: margin, missingCostSheets, revenue } = row.original;
      // Null here means nothing collected, which is the same condition the
      // cell above tests. Both now say so the same way.
      if (margin === null) {
        return (
          <span className="text-muted-foreground">
            {revenue === 0 ? "Not billed" : "Nothing collected"}
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className={profitToneClass(margin)} data-numeric>
            {formatPercent(margin, 1)}
          </span>
          {missingCostSheets > 0 ? (
            // A margin computed from an incomplete cost is flattering, not
            // accurate. Saying so beats showing a number that looks finished.
            <span
              className="text-[10px] text-warning-soft-foreground"
              title={`${missingCostSheets} course(s) have no cost sheet, so cost is understated`}
            >
              partial
            </span>
          ) : null}
        </span>
      );
    },
    meta: { align: "right", width: "8rem" },
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
    meta: { width: "9rem" },
  },
];
