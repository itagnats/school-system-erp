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
import { formatCurrency, formatDate } from "@/lib/utils";
import type { InvoiceStatus, Option } from "@/types";
import {
  INVOICE_STATUS_LABEL,
  INVOICE_STATUS_OPTIONS,
  INVOICE_STATUS_TONE,
} from "../constants";
import { useInvoices } from "../hooks/use-invoices";
import type { InvoiceRow } from "../types";

/**
 * The invoice list (direction.md §13b).
 *
 * One row per student per semester. The totals arrive derived, and the credit
 * column is kept beside the total rather than folded into it: a bill that is
 * lower than the package price should say why on the row, not only inside the
 * document.
 */
export function InvoicesScreen({
  programOptions,
  semesterOptions,
}: {
  programOptions: Option[];
  semesterOptions: Option[];
}) {
  const table = useListTable({ sort: "number" });

  const status = table.getFilter("status");
  const semester = table.getFilter("semester");
  const programId = table.getFilter("programId");

  const query = useInvoices({
    search: table.search,
    page: table.page,
    pageSize: table.pageSize,
    sort: table.sort,
    direction: table.direction,
    status: status === "all" ? undefined : (status as InvoiceStatus),
    semester: semester === "all" ? undefined : semester,
    programId: programId === "all" ? undefined : programId,
  });

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
          placeholder="Search number or student"
          aria-label="Search invoices"
          className="w-full max-w-xs"
        />
        <FilterSelect
          label="Status"
          value={status}
          options={INVOICE_STATUS_OPTIONS}
          onValueChange={(value) => table.setFilter("status", value)}
        />
        <FilterSelect
          label="Semester"
          value={semester}
          options={semesterOptions}
          onValueChange={(value) => table.setFilter("semester", value)}
        />
        <FilterSelect
          label="Program"
          value={programId}
          options={programOptions}
          onValueChange={(value) => table.setFilter("programId", value)}
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
            title="No invoices match these filters"
            description="An invoice exists for every student enrolled in a program term."
          />
        }
        {...table.tableProps(query.data)}
      />
    </>
  );
}

const OPTIONAL_COLUMNS: HideableColumn[] = [
  { id: "semesterCode", label: "Semester" },
  { id: "programCode", label: "Program" },
  { id: "dueOn", label: "Due" },
  { id: "creditTotal", label: "Credits" },
];

const columns: PrimeColumnDef<InvoiceRow>[] = [
  {
    accessorKey: "number",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Invoice" />,
    cell: ({ row }) => (
      <div className="min-w-0">
        <Link
          href={routes.invoice(row.original.id)}
          className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {row.original.number}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {row.original.studentCode} · {row.original.studentName}
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
    accessorKey: "programCode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Program" />,
    cell: ({ row }) => (
      <span className="truncate text-sm">{row.original.programCode}</span>
    ),
    meta: { width: "9rem" },
  },
  {
    accessorKey: "dueOn",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Due" />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground" data-numeric>
        {formatDate(row.original.dueOn)}
      </span>
    ),
    meta: { width: "9rem" },
  },
  {
    accessorKey: "creditTotal",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Credits" align="right" />
    ),
    cell: ({ row }) => {
      // A dash rather than a zero: most invoices have no credit, and a column
      // of zeros reads as an amount rather than as an absence.
      if (row.original.creditTotal === 0) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <span className="text-warning-soft-foreground" data-numeric>
          −{formatCurrency(row.original.creditTotal, row.original.currency)}
        </span>
      );
    },
    meta: { align: "right", width: "9rem" },
  },
  {
    accessorKey: "total",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total" align="right" />
    ),
    cell: ({ row }) => (
      <span className="font-medium" data-numeric>
        {formatCurrency(row.original.total, row.original.currency)}
      </span>
    ),
    meta: { align: "right", width: "10rem" },
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <StatusBadge
        tone={INVOICE_STATUS_TONE[row.original.status]}
        label={INVOICE_STATUS_LABEL[row.original.status]}
      />
    ),
    meta: { width: "8rem" },
  },
];
