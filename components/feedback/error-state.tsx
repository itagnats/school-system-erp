import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Failure state for a data region.
 *
 * The message is produced by `toApiError`, which maps a failure onto a vetted
 * message. A raw server body or exception text is never rendered here: it leaks
 * internal detail and puts unescaped upstream content into the page.
 */
export function ErrorState({
  error,
  onRetry,
  className,
  compact = false,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}) {
  const { message, status } = toApiError(error);

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        compact ? "py-6" : "py-14",
        className,
      )}
    >
      <span className="mb-3 flex size-9 items-center justify-center rounded-sm bg-error-soft text-error-soft-foreground">
        <AlertTriangle className="size-4" aria-hidden />
      </span>
      <h3 className="text-base font-medium text-foreground">
        This could not be loaded
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      {status ? (
        <p className="mt-1 text-xs text-muted-foreground/70">Error {status}</p>
      ) : null}
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={onRetry}>
          <RotateCcw className="size-3.5" aria-hidden />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
