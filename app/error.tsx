"use client";

import { ErrorState } from "@/components/feedback";

/**
 * Route-level error boundary. Next passes the thrown error here; ErrorState
 * maps it onto a vetted message rather than printing the raw exception, which
 * would expose internals in production.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60svh] items-center justify-center p-6">
      <ErrorState error={error} onRetry={reset} />
    </div>
  );
}
