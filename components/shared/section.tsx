import type { ReactNode } from "react";
import { PetalCorner } from "@/components/decor";
import { cn } from "@/lib/utils";

/**
 * A titled panel. The standard container for anything that is not a full page:
 * a table, a form section, a breakdown.
 *
 * Structure comes from a hairline border, and `flush` removes the body padding
 * so a table can sit edge to edge inside the panel.
 */
export function Section({
  id,
  title,
  description,
  actions,
  footer,
  flush = false,
  decor = false,
  className,
  bodyClassName,
  children,
}: {
  /** Anchor target, so the panel can be linked to directly. */
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  /** Remove body padding, for tables that should meet the panel edges. */
  flush?: boolean;
  /**
   * Tuck a petal cluster into the top-right corner. For a panel that opens a
   * page, not for one holding a dense table — decoration behind data is noise.
   */
  decor?: boolean;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative overflow-hidden rounded-lg border border-hairline bg-card shadow-xs",
        // Clear the sticky header when linked to by anchor.
        id ? "scroll-mt-[calc(var(--header-h)+1rem)]" : undefined,
        className,
      )}
    >
      {decor ? <PetalCorner corner="top-right" /> : null}

      {title || actions ? (
        <header className="flex flex-wrap items-start justify-between gap-2 px-3.5 py-2.5 hairline-b">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-base font-medium text-foreground">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
          ) : null}
        </header>
      ) : null}

      <div className={cn(flush ? "" : "p-3.5", bodyClassName)}>{children}</div>

      {footer ? (
        <footer className="bg-surface-sunken px-3.5 py-2.5 hairline-t">{footer}</footer>
      ) : null}
    </section>
  );
}
