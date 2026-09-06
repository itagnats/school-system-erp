import type { CourseStatus, Option, StatusTone } from "@/types";

/**
 * Course vocabulary. Shared components never learn these words: they take a
 * tone and a label, and this file supplies both (direction.md §29).
 */

export const COURSE_STATUS_TONE: Record<CourseStatus, StatusTone> = {
  draft: "neutral",
  active: "success",
  archived: "warning",
};

export const COURSE_STATUS_LABEL: Record<CourseStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};

export const COURSE_STATUS_OPTIONS: Option<CourseStatus>[] = (
  ["draft", "active", "archived"] as const
).map((value) => ({ value, label: COURSE_STATUS_LABEL[value] }));
