import type {
  EnrollmentStatus,
  EvaluationWindowStatus,
  StatusTone,
  StudentProgramTerm,
} from "@/types";

/**
 * How an evaluation window reads on the dashboard.
 *
 * Deliberately a second copy of the map in `features/evaluation/constants.ts`
 * rather than an import. No feature in this application imports another — it is
 * a one-line grep to check and it currently holds everywhere — and the
 * dashboard, which summarises every domain, is exactly the module that would
 * quietly end the invariant. Four strings are the price.
 *
 * If these ever need to agree by construction, the place to move them is a
 * shared constants module, not a cross-feature import.
 */
export const WINDOW_STATUS_LABEL: Record<EvaluationWindowStatus, string> = {
  draft: "Draft",
  open: "Open",
  closed: "Closed",
  published: "Published",
};

export const WINDOW_STATUS_TONE: Record<EvaluationWindowStatus, StatusTone> = {
  draft: "neutral",
  open: "success",
  closed: "warning",
  published: "info",
};

/**
 * How an enrollment status reads on the student's dashboard.
 *
 * A third copy of a small map, and deliberate for the same reason the window
 * statuses above are a second one: no feature in this application imports
 * another (`AUD-012`), and the dashboard - which summarises every domain - is
 * precisely the module that would end that invariant if any module did. Six
 * strings and six tones are the price.
 *
 * Kept identical to `features/enrollment/constants.ts` on purpose, including
 * `dropped` and `cancelled` sharing the error tone and never the label: colour
 * cannot carry the difference between a student who left and an enrolment that
 * was never taken up.
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

/**
 * Where a student got to on a programme term (`direction.md` §8).
 *
 * **Status is progress, never outcome.** None of these says whether the student
 * passed - that derives from the grades and is not built yet - so the labels
 * stay in the vocabulary of where somebody is, and `completed` means the term
 * ended rather than that it went well.
 */
export const PROGRAM_STANDING_LABEL: Record<StudentProgramTerm["status"], string> = {
  pending: "Not started",
  active: "In progress",
  completed: "Completed",
  withdrawn: "Withdrawn",
};
