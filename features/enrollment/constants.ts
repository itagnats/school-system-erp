import type { EnrollmentStatus, Option, ProgramTermStatus, StatusTone } from "@/types";
import {
  ENROLLMENT_STATUSES,
  EVALUATION_GROUP_LETTERS,
  evaluationGroupName,
} from "@/types";

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

/**
 * The group filter, keyed by letter rather than by group id.
 *
 * An evaluation group belongs to one course-semester (direction.md §15), so its
 * id is scoped and no single id spans the list. The letter is the part that
 * repeats: filtering to "A" answers "show me every first group", which is the
 * only cross-course question this filter can honestly answer.
 */
export const EVALUATION_GROUP_OPTIONS: Option[] = EVALUATION_GROUP_LETTERS.map(
  (letter) => ({ value: letter, label: evaluationGroupName(letter) }),
);

/**
 * Programme term status, duplicated from `features/programs/constants.ts`.
 *
 * Deliberate, not an oversight. `CLAUDE.md` forbids a third cross-feature
 * import while `AUD-012` is open, and `features/dashboard/constants.ts`
 * already made the same copy for the same reason. Four literals in two places
 * is cheaper than an edge between two domains - and the day a shared module
 * exists, both copies collapse into it together.
 */
export const TERM_STATUS_TONE: Record<ProgramTermStatus, StatusTone> = {
  planning: "neutral",
  open: "success",
  closed: "info",
};

export const TERM_STATUS_LABEL: Record<ProgramTermStatus, string> = {
  planning: "Planning",
  open: "Open",
  closed: "Closed",
};

export const TERM_STATUS_OPTIONS: Option<ProgramTermStatus>[] = (
  ["planning", "open", "closed"] as const
).map((value) => ({ value, label: TERM_STATUS_LABEL[value] }));
