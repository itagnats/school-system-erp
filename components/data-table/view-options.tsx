"use client";

import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ColumnVisibility } from "./table-features";

/**
 * One column a screen is willing to let the user switch off.
 *
 * `id` must match the column definition's `id`, or its `accessorKey` where it
 * has none, because that is the key the table keeps visibility under.
 */
export interface HideableColumn {
  id: string;
  label: string;
}

/**
 * Column visibility menu.
 *
 * It takes an explicit list rather than reading the column definitions, for two
 * reasons. `header` is a render function throughout this application, so there
 * is no plain string to pull a menu label out of; and more importantly not every
 * column should be hideable. A list screen's identity column — the student ID,
 * the course code, the link that is the whole point of the row — is not an
 * optional column, and offering to hide it invites a user to make the table
 * useless and then wonder why. Naming the optional ones at the call site makes
 * that an explicit decision per screen, and it removes the need for the menu to
 * guard against everything being switched off at once.
 *
 * It lives in the filter bar rather than inside the table panel: that is where
 * table-level actions already sit, and a band of chrome inside every panel to
 * hold one button costs more than it returns.
 */
export function DataTableViewOptions({
  columns,
  visibility,
  onVisibilityChange,
  label = "Columns",
}: {
  columns: HideableColumn[];
  /** Absent or `true` means visible; `false` hides the column. */
  visibility: ColumnVisibility;
  onVisibilityChange: (visibility: ColumnVisibility) => void;
  /** Trigger text. Override where "Columns" would be ambiguous. */
  label?: string;
}) {
  if (columns.length === 0) return null;

  const hiddenCount = columns.filter((column) => visibility[column.id] === false).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Columns3 className="size-3.5" aria-hidden />
          {label}
          {hiddenCount > 0 ? (
            <span className="text-muted-foreground" data-numeric>
              ({columns.length - hiddenCount}/{columns.length})
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>Optional columns</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={visibility[column.id] !== false}
            onCheckedChange={(checked) =>
              onVisibilityChange({ ...visibility, [column.id]: checked })
            }
            // Keep the menu open: choosing which columns to show is nearly
            // always several decisions, and closing after each one makes the
            // user reopen the menu to see what they just did.
            onSelect={(event) => event.preventDefault()}
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={hiddenCount === 0}
          onSelect={() => onVisibilityChange({})}
        >
          Show all
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
