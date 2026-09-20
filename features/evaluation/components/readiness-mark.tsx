import { Ban, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { READINESS_LABEL } from "../constants";
import type { FormReadiness } from "@/types";

/**
 * Whether one kind of form is configured, in a table cell.
 *
 * The glyph is never the only signal. Each mark carries its state as text for a
 * screen reader and as a title for a pointer, because a tick and a cross differ
 * only in shape and color - and the third state, "not used", is a deliberate
 * choice that must not read as a failure.
 */
export function ReadinessMark({ readiness }: Readonly<{ readiness: FormReadiness }>) {
  const label = READINESS_LABEL[readiness];
  const { Icon, className } = MARKS[readiness];

  return (
    <span
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-full border",
        className,
      )}
      title={label}
    >
      <Icon aria-hidden className="size-3.5" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * Literal class strings, not interpolation.
 *
 * Tailwind cannot see `bg-${tone}-soft` and would generate none of these.
 */
const MARKS: Record<FormReadiness, { Icon: typeof Check; className: string }> = {
  ready: {
    Icon: Check,
    className: "border-success/30 bg-success-soft text-success-soft-foreground",
  },
  "not-configured": {
    Icon: X,
    className: "border-error/30 bg-error-soft text-error-soft-foreground",
  },
  "not-applicable": {
    Icon: Ban,
    className: "border-hairline bg-surface-sunken text-muted-foreground",
  },
};
