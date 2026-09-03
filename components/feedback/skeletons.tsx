import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Shape-matched loading placeholders. Each one mirrors the real component it
 * stands in for, at the same density tokens, so the content does not jump when
 * the data lands.
 */

export function TableSkeleton({
  rows = 8,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)} aria-hidden>
      <div
        className="flex items-center gap-4 bg-surface-sunken hairline-b"
        style={{ height: "var(--row-h)", padding: "0 var(--cell-px)" }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 flex-1 rounded-sm" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 hairline-b"
          style={{ height: "var(--row-h)", padding: "0 var(--cell-px)" }}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn("h-2.5 rounded-sm", c === 0 ? "w-20" : "flex-1")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-md border border-hairline bg-card p-3.5", className)}
      aria-hidden
    >
      <Skeleton className="h-2.5 w-24 rounded-sm" />
      <Skeleton className="mt-3 h-6 w-16 rounded-sm" />
      <Skeleton className="mt-2 h-2 w-20 rounded-sm" />
    </div>
  );
}

export function FormSkeleton({
  fields = 4,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)} aria-hidden>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="h-2.5 w-24 rounded-sm" />
          <Skeleton className="rounded-sm" style={{ height: "var(--field-h)" }} />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-6", className)} aria-hidden>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-48 rounded-sm" />
        <Skeleton className="h-2.5 w-72 rounded-sm" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <TableSkeleton rows={5} />
    </div>
  );
}
