import type { CatalogStatus, Option, StatusTone } from "@/types";

/**
 * The catalog's vocabulary, mapped onto the shared one.
 *
 * `StatusBadge` knows six tones and nothing about costing, so the meaning is
 * attached here (design-system skill, the layering boundary).
 */
export const CATALOG_STATUS_TONE: Record<CatalogStatus, StatusTone> = {
  active: "success",
  archived: "neutral",
};

export const CATALOG_STATUS_LABEL: Record<CatalogStatus, string> = {
  active: "Active",
  archived: "Archived",
};

export const CATALOG_STATUS_OPTIONS: Option<CatalogStatus>[] = (
  ["active", "archived"] as const
).map((value) => ({ value, label: CATALOG_STATUS_LABEL[value] }));

/**
 * Drift lives in `features/costs/constants.ts`, not here. It describes a *sheet
 * line's* standing against the master, so its only reader is the sheet panel —
 * see the note there (`AUD-012`, 2026-09-20).
 */

/** Said on the catalog screen, because the rule is not guessable from the UI. */
export const SNAPSHOT_NOTE =
  "A sheet takes a copy when an item is added, so changing a price here never rewrites a sheet that already used it. Sheets show which of their lines have since fallen behind.";
