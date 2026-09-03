import type { ReactNode } from "react";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { LoadingState } from "./loading-state";

/**
 * Resolves the loading -> success -> empty -> error progression in one place
 * (scaffold.md §20).
 *
 * Feature pages wrap a data region in this instead of writing the same four
 * branches over and over, which is how one of the four quietly goes missing.
 *
 * `isEmpty` is the caller's decision because emptiness is domain-specific: an
 * empty array, a zero total, or a sheet with no cost groups.
 */
export function QueryBoundary<T>({
  data,
  isLoading,
  error,
  isEmpty,
  onRetry,
  loading,
  empty,
  children,
}: {
  data: T | undefined;
  isLoading: boolean;
  error: unknown;
  /** Called only when data is defined. Defaults to an empty-array check. */
  isEmpty?: (data: T) => boolean;
  onRetry?: () => void;
  /** Override the loading view, normally with a shape-matched skeleton. */
  loading?: ReactNode;
  /** Override the empty view. Supply one whenever a create action makes sense. */
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (isLoading || data === undefined) return <>{loading ?? <LoadingState />}</>;

  const empties =
    isEmpty?.(data) ?? (Array.isArray(data) ? data.length === 0 : false);

  if (empties) {
    return (
      <>
        {empty ?? (
          <EmptyState title="Nothing to show" description="There are no records here yet." />
        )}
      </>
    );
  }

  return <>{children(data)}</>;
}
