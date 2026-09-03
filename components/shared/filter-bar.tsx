import { FilterX } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Row that holds a search box, filter selects and table-level actions.
 *
 * "Clear filters" only appears when something is actually filtered, and it is
 * the caller that decides what active means, because a default value differs
 * per screen. Showing a permanently visible clear button trains users to ignore
 * it.
 */
export function FilterBar({
  children,
  actions,
  activeCount = 0,
  onClear,
  className,
}: {
  /** Search input and filter selects. */
  children: ReactNode;
  /** Table-level actions, e.g. Add student. */
  actions?: ReactNode;
  activeCount?: number;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      style={{ marginBottom: "0.75rem" }}
      data-print="hide"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {children}
        {activeCount > 0 && onClear ? (
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onClear}>
            <FilterX className="size-3.5" aria-hidden />
            Clear
            <span className="text-muted-foreground">({activeCount})</span>
          </Button>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
