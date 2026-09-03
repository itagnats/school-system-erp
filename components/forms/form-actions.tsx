"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Submit/cancel row for a form.
 *
 * The submit button is disabled while a request is in flight and shows a
 * spinner, which is the difference between a form that feels broken on a slow
 * connection and one that does not. `isDirty` optionally guards the submit so a
 * user cannot save a form they have not changed.
 */
export function FormActions({
  isSubmitting = false,
  isDirty,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  onCancel,
  align = "end",
  secondary,
  error,
  className,
}: {
  isSubmitting?: boolean;
  /** When provided, submit stays disabled until the form is dirty. */
  isDirty?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  align?: "start" | "end" | "between";
  /** Extra action, e.g. Save as draft. */
  secondary?: ReactNode;
  /** Form-level failure message, shown beside the actions. */
  error?: string;
  className?: string;
}) {
  const disabled = isSubmitting || isDirty === false;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 pt-1",
        align === "end" && "justify-end",
        align === "between" && "justify-between",
        className,
      )}
    >
      {error ? (
        <p role="alert" className="mr-auto text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}

      {secondary}

      {onCancel ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {cancelLabel}
        </Button>
      ) : null}

      <Button type="submit" size="sm" disabled={disabled} className="gap-1.5">
        {isSubmitting ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
        {submitLabel}
      </Button>
    </div>
  );
}
