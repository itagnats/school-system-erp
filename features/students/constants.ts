import type { Option } from "@/types";

/**
 * Student vocabulary.
 *
 * A student has no status union, so what this file carries is the year-level
 * labeling that every screen would otherwise invent for itself.
 */

export function yearLevelLabel(level: number): string {
  return `Year ${level}`;
}

export const YEAR_LEVEL_OPTIONS: Option[] = [1, 2, 3, 4].map((level) => ({
  value: String(level),
  label: yearLevelLabel(level),
}));
