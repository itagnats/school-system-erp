"use client";

import { MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface RowAction {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  /** Renders in the destructive tone and is separated from the rest. */
  destructive?: boolean;
}

/**
 * Row action menu.
 *
 * Destructive entries are pushed below a separator so a mis-aimed click lands
 * on nothing rather than on "Delete". The label names the row it belongs to for
 * assistive technology, because a column of identical "Open menu" buttons is
 * unusable with a screen reader.
 */
export function DataTableRowActions({
  actions,
  label,
}: {
  actions: RowAction[];
  /** Identifies the row, e.g. the student name or course code. */
  label: string;
}) {
  const normal = actions.filter((a) => !a.destructive);
  const destructive = actions.filter((a) => a.destructive);

  if (actions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${label}`}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="size-3.5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {normal.map((action) => {
          const Icon = action.icon;
          return (
            <DropdownMenuItem
              key={action.label}
              disabled={action.disabled}
              onClick={(event) => {
                event.stopPropagation();
                action.onSelect();
              }}
              className="gap-2"
            >
              {Icon ? <Icon className="size-3.5 text-muted-foreground" aria-hidden /> : null}
              {action.label}
            </DropdownMenuItem>
          );
        })}

        {normal.length > 0 && destructive.length > 0 ? <DropdownMenuSeparator /> : null}

        {destructive.map((action) => {
          const Icon = action.icon;
          return (
            <DropdownMenuItem
              key={action.label}
              disabled={action.disabled}
              variant="destructive"
              onClick={(event) => {
                event.stopPropagation();
                action.onSelect();
              }}
              className="gap-2"
            >
              {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
              {action.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
