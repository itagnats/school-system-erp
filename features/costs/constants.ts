import type {
  CatalogDrift,
  CostKind,
  CostSheetStatus,
  Option,
  StatusTone,
} from "@/types";

export const COST_STATUS_TONE: Record<CostSheetStatus, StatusTone> = {
  draft: "neutral",
  review: "warning",
  approved: "success",
};

export const COST_STATUS_LABEL: Record<CostSheetStatus, string> = {
  draft: "Draft",
  review: "In review",
  approved: "Approved",
};

export const COST_STATUS_OPTIONS: Option<CostSheetStatus>[] = (
  ["draft", "review", "approved"] as const
).map((value) => ({ value, label: COST_STATUS_LABEL[value] }));

/**
 * Direct and indirect are the two halves of the total (direction.md §13), and
 * they also say which sheet a line can live on — so the label belongs wherever
 * a figure is broken down rather than only in a legend.
 */
export const COST_KIND_LABEL: Record<CostKind, string> = {
  direct: "Direct",
  indirect: "Indirect",
};

export const COST_KIND_TONE: Record<CostKind, StatusTone> = {
  direct: "accent",
  indirect: "info",
};

/**
 * How a sheet line stands against the catalog (direction.md §12a).
 *
 * Drift is a property of *a sheet line*, not of the catalog: it is computed on
 * read by `catalogDriftFor` and says whether this sheet's copy has fallen
 * behind the master. It lived in `features/cost-catalog/constants.ts` until
 * 2026-09-20 and was one of the two cross-feature imports `AUD-012` recorded —
 * yet the catalog screen never read it and the only consumer was
 * `sheet-groups-panel.tsx` here. Moving it deleted the edge outright rather
 * than trading it for a duplicate.
 *
 * `current` is deliberately unlabeled on screen: most lines match, and a badge
 * on every row would make the two that do not harder to find rather than
 * easier.
 */
export const DRIFT_LABEL: Record<CatalogDrift, string> = {
  none: "One-off",
  current: "From catalog",
  differs: "Differs from catalog",
  orphaned: "Catalog entry removed",
};

export const DRIFT_TONE: Record<CatalogDrift, StatusTone> = {
  none: "neutral",
  current: "success",
  differs: "warning",
  orphaned: "error",
};
