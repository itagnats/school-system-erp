import type { CostKind, CostSheetStatus, Option, StatusTone } from "@/types";

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
