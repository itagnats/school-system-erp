/** Static application metadata. No secrets, no runtime values. */
export const APP = {
  name: "PRIME",
  fullName: "PRIME School Management",
  description:
    "Course, enrollment, cost and 360 degree evaluation management for a school.",
  /** Shown in the sidebar footer and the design system page. */
  version: "0.1.0",
} as const;

/** Default weighting for the evaluation score (direction.md §20). */
export const DEFAULT_EVALUATION_WEIGHTS = {
  student: 30,
  inspector: 20,
  teacher: 35,
  ta: 15,
} as const;

/** Grade thresholds, highest first (direction.md §22). */
export const GRADE_THRESHOLDS = [
  { min: 90, grade: "A" },
  { min: 80, grade: "B" },
  { min: 70, grade: "C" },
  { min: 60, grade: "D" },
  { min: 0, grade: "F" },
] as const;

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
