import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The empty state carries an action, because "nothing here" is only useful if
 * it also says what to do about it. Two variants exist for a reason:
 *
 *   - `empty`  : the collection has no records yet. Offer the create action.
 *   - `no-results`: filters excluded everything. Offer to clear the filters.
 *
 * Telling a user to create a record when they have simply over-filtered is the
 * classic version of this mistake, so the caller must choose.
 */
export function EmptyState({
  variant = "empty",
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  variant?: "empty" | "no-results";
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-variant={variant}
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className,
      )}
    >
      <span className="mb-3 flex size-9 items-center justify-center rounded-sm bg-muted text-muted-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
