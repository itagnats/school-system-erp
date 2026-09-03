"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { RowData } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import type { PrimeColumn } from "./table-features";

/**
 * Sortable column header.
 *
 * A non-sortable column renders as plain text rather than an inert button, so
 * keyboard users are not walked through controls that do nothing. The sort
 * direction is announced through aria-sort, which the table sets on the cell.
 */
export function DataTableColumnHeader<TData extends RowData, TValue>({
  column,
  title,
  align = "left",
  className,
}: {
  column: PrimeColumn<TData, TValue>;
  title: string;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  const alignClass =
    align === "right" ? "justify-end" : align === "center" ? "justify-center" : "";

  if (!column.getCanSort()) {
    return (
      <span className={cn("flex items-center", alignClass, className)}>{title}</span>
    );
  }

  const sorted = column.getIsSorted();
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ChevronsUpDown;

  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === "asc")}
      className={cn(
        "-mx-1 flex w-full items-center gap-1 rounded-sm px-1 py-0.5 transition-colors hover:text-foreground",
        sorted ? "text-foreground" : "text-muted-foreground",
        alignClass,
        className,
      )}
    >
      {title}
      <Icon
        aria-hidden
        className={cn("size-3", sorted ? "text-primary" : "text-muted-foreground/60")}
      />
    </button>
  );
}
