import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Indeterminate loading for a whole region.
 *
 * Prefer a skeleton when the shape of the result is known: it avoids the layout
 * jump a spinner causes. Use this for actions and for regions whose shape is
 * genuinely unpredictable.
 */
export function LoadingState({
  label = "Loading",
  className,
  compact = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-2 text-muted-foreground",
        compact ? "py-6" : "py-14",
        className,
      )}
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}
