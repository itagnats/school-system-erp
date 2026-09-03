import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A single documented example: what it is, when to reach for it, and the thing
 * itself rendered live.
 *
 * `note` is where a usage rule goes. A design system that only shows what a
 * component looks like leaves the reader to guess when to use it, which is how
 * two components end up doing the same job.
 */
export function Demo({
  id,
  title,
  note,
  children,
  className,
  contentClassName,
}: {
  /** Anchor target, so a single component can be linked to directly. */
  id?: string;
  title: string;
  note?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "flex flex-col gap-2",
        id ? "scroll-mt-[calc(var(--header-h)+1rem)]" : undefined,
        className,
      )}
    >
      <div>
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        {note ? (
          <p className="mt-0.5 max-w-prose text-xs text-muted-foreground">{note}</p>
        ) : null}
      </div>
      <div
        className={cn(
          "rounded-md border border-hairline bg-surface-sunken p-3.5",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Label/value row for documenting a scale. */
export function SpecRow({
  name,
  value,
  children,
}: {
  name: string;
  value: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5 hairline-b last:border-b-0">
      <code className="w-40 shrink-0 text-xs text-foreground">{name}</code>
      <span className="w-20 shrink-0 text-xs text-muted-foreground" data-numeric>
        {value}
      </span>
      {children ? <div className="min-w-0 flex-1">{children}</div> : null}
    </div>
  );
}
