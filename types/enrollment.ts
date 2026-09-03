import type { SemesterCode } from "./common";
import type { StudentSummary } from "./student";

/** direction.md §8. Order matters: it is the intended lifecycle progression. */
export const ENROLLMENT_STATUSES = [
  "pending",
  "enrolled",
  "active",
  "completed",
  "dropped",
  "cancelled",
] as const;

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

/** The three ways a student reaches an enrollment (direction.md §7). */
export type EnrollmentSource = "existing-profile" | "previous-course" | "new-student";

/**
 * Enrollment joins a student to a course in a specific semester. It is the
 * record that everything downstream (grouping, evaluation, ranking, reporting)
 * hangs off.
 */
export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  semesterCode: SemesterCode;
  status: EnrollmentStatus;
  /** Evaluation group assignment, absent until the student is grouped. */
  evaluationGroupId?: string;
  source: EnrollmentSource;
  enrolledAt: string;
  updatedAt: string;
}

/** Row shape for the enrollment table (direction.md §6). */
export interface EnrollmentListItem {
  id: string;
  student: StudentSummary;
  courseId: string;
  courseCode: string;
  semesterCode: SemesterCode;
  status: EnrollmentStatus;
  evaluationGroupName?: string;
}

export interface EnrollmentListFilters {
  search?: string;
  courseId?: string | "all";
  semester?: SemesterCode | "all";
  status?: EnrollmentStatus | "all";
  evaluationGroupId?: string | "all";
}
