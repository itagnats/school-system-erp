import type { ReactNode } from "react";
import { SakuraMark } from "@/components/decor";
import { cn } from "@/lib/utils";

/**
 * The title block every page opens with.
 *
 * Actions sit on the trailing edge and wrap below the title on narrow screens
 * rather than shrinking, because a truncated primary action is worse than a
 * taller header.
 */
export function PageHeader({
  title,
  description,
  actions,
  meta,
  bloom = false,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Primary and secondary actions for the page. */
  actions?: ReactNode;
  /** Context chips: status, semester, course code. Sits under the title. */
  meta?: ReactNode;
  /**
   * Set a blossom beside the title. For a page that greets or opens a section,
   * not for every list screen — the flourish stops meaning anything if it is
   * on all of them.
   */
  bloom?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-wrap items-start justify-between gap-3", className)}
      style={{ marginBottom: "var(--section-gap)" }}
    >
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
          {title}
          {bloom ? <SakuraMark className="size-5 shrink-0 text-seal" /> : null}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
        {meta ? <div className="mt-2 flex flex-wrap items-center gap-1.5">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2" data-print="hide">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
