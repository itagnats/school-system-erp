import type { CatalogueDrift, CatalogueStatus, Option, StatusTone } from "@/types";

/**
 * The catalogue's vocabulary, mapped onto the shared one.
 *
 * `StatusBadge` knows six tones and nothing about costing, so the meaning is
 * attached here (design-system skill, the layering boundary).
 */
export const CATALOGUE_STATUS_TONE: Record<CatalogueStatus, StatusTone> = {
  active: "success",
  archived: "neutral",
};

export const CATALOGUE_STATUS_LABEL: Record<CatalogueStatus, string> = {
  active: "Active",
  archived: "Archived",
};

export const CATALOGUE_STATUS_OPTIONS: Option<CatalogueStatus>[] = (
  ["active", "archived"] as const
).map((value) => ({ value, label: CATALOGUE_STATUS_LABEL[value] }));

/**
 * How a sheet line stands against the catalogue (direction.md §12a).
 *
 * `current` is deliberately unlabelled on screen: most lines match, and a badge
 * on every row would make the two that do not harder to find rather than
 * easier.
 */
export const DRIFT_LABEL: Record<CatalogueDrift, string> = {
  none: "One-off",
  current: "From catalogue",
  differs: "Differs from catalogue",
  orphaned: "Catalogue entry removed",
};

export const DRIFT_TONE: Record<CatalogueDrift, StatusTone> = {
  none: "neutral",
  current: "success",
  differs: "warning",
  orphaned: "error",
};

/** Said on the catalogue screen, because the rule is not guessable from the UI. */
export const SNAPSHOT_NOTE =
  "A sheet takes a copy when an item is added, so changing a price here never rewrites a sheet that already used it. Sheets show which of their lines have since fallen behind.";
