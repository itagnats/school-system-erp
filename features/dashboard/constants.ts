import type { EvaluationWindowStatus, StatusTone } from "@/types";

/**
 * How an evaluation window reads on the dashboard.
 *
 * Deliberately a second copy of the map in `features/evaluation/constants.ts`
 * rather than an import. No feature in this application imports another — it is
 * a one-line grep to check and it currently holds everywhere — and the
 * dashboard, which summarises every domain, is exactly the module that would
 * quietly end the invariant. Four strings are the price.
 *
 * If these ever need to agree by construction, the place to move them is a
 * shared constants module, not a cross-feature import.
 */
export const WINDOW_STATUS_LABEL: Record<EvaluationWindowStatus, string> = {
  draft: "Draft",
  open: "Open",
  closed: "Closed",
  published: "Published",
};

export const WINDOW_STATUS_TONE: Record<EvaluationWindowStatus, StatusTone> = {
  draft: "neutral",
  open: "success",
  closed: "warning",
  published: "info",
};
