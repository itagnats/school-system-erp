import { GRADE_THRESHOLDS } from "@/config/app";
import type { Grade } from "@/types";
import { clamp } from "./number";

/**
 * Grade is derived from the final score, never stored (direction.md §22).
 *
 * Keeping this a pure function of the score is the whole point: there is no way
 * for a persisted grade to drift out of step with the score it came from.
 */
export function calculateGrade(finalScore: number): Grade {
  const score = clamp(finalScore, 0, 100);
  const match = GRADE_THRESHOLDS.find((t) => score >= t.min);
  // The table ends at min 0, so a match always exists; F is the safety net.
  return (match?.grade ?? "F") as Grade;
}

/** Inclusive display range for a grade, for legends and the design system. */
export function gradeRange(grade: Grade): { min: number; max: number } {
  const index = GRADE_THRESHOLDS.findIndex((t) => t.grade === grade);
  if (index === -1) return { min: 0, max: 0 };
  const min = GRADE_THRESHOLDS[index].min;
  const max = index === 0 ? 100 : GRADE_THRESHOLDS[index - 1].min - 1;
  return { min, max };
}
