import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DescriptionItem {
  label: string;
  value: ReactNode;
  /** Span both columns, for long values such as a description. */
  wide?: boolean;
}

/**
 * Label/value pairs for read-only detail views: course details, student
 * profile sections, cost sheet meta.
 *
 * Rendered as a real `dl` so the pairing is available to assistive technology
 * rather than being implied by layout alone.
 */
export function DescriptionList({
  items,
  columns = 2,
  className,
}: {
  items: DescriptionItem[];
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-3",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={cn("min-w-0", item.wide && "sm:col-span-full")}
        >
          <dt className="text-xs tracking-wide text-muted-foreground uppercase">
            {item.label}
          </dt>
          <dd className="mt-0.5 text-base break-words text-foreground">
            {item.value === null || item.value === undefined || item.value === "" ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
