import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A labelled group of fields.
 *
 * The student profile is explicitly not one giant form (direction.md §10), so
 * this is the unit long forms are assembled from: each section states what it
 * covers, and the field grid is a plain two-column layout that collapses on
 * narrow screens.
 */
export function FormSection({
  title,
  description,
  columns = 2,
  className,
  children,
}: {
  title: string;
  description?: ReactNode;
  columns?: 1 | 2;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("grid gap-3 lg:grid-cols-[13rem_1fr] lg:gap-6", className)}>
      <div className="lg:pt-0.5">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div
        className={cn(
          "grid gap-3",
          columns === 2 ? "sm:grid-cols-2" : "grid-cols-1",
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** Full-width field inside a two-column FormSection grid. */
export function FormFieldWide({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("sm:col-span-full", className)}>{children}</div>;
}
