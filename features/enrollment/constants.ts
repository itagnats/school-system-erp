import type { EnrollmentStatus, Option, StatusTone } from "@/types";
import { ENROLLMENT_STATUSES } from "@/types";

/**
 * Enrollment vocabulary (direction.md §8).
 *
 * The tone is visual weight only. `dropped` and `cancelled` share the error
 * tone but never the label, because the difference between them matters to a
 * registrar and colour cannot carry it.
 */

export const ENROLLMENT_STATUS_TONE: Record<EnrollmentStatus, StatusTone> = {
  pending: "warning",
  enrolled: "info",
  active: "success",
  completed: "neutral",
  dropped: "error",
  cancelled: "error",
};

export const ENROLLMENT_STATUS_LABEL: Record<EnrollmentStatus, string> = {
  pending: "Pending",
  enrolled: "Enrolled",
  active: "Active",
  completed: "Completed",
  dropped: "Dropped",
  cancelled: "Cancelled",
};

export const ENROLLMENT_STATUS_OPTIONS: Option<EnrollmentStatus>[] =
  ENROLLMENT_STATUSES.map((value) => ({
    value,
    label: ENROLLMENT_STATUS_LABEL[value],
  }));

/** Evaluation group ids the seed uses, for the group filter. */
export const EVALUATION_GROUP_OPTIONS: Option[] = [
  { value: "grp-a", label: "Evaluation Group A" },
  { value: "grp-b", label: "Evaluation Group B" },
  { value: "grp-c", label: "Evaluation Group C" },
  { value: "grp-d", label: "Evaluation Group D" },
];
