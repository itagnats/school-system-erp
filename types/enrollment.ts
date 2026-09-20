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

/**
 * What one enrollment produced (direction.md 7a).
 *
 * A student joins a program term and receives a course enrollment per
 * curriculum course, so the answer to "what did that do" is a list rather than
 * a record. Shaped as roster rows because that is where the client puts them.
 */
export interface EnrollmentResult {
  student: StudentSummary;
  programTermId: string;
  programId: string;
  programName: string;
  semesterCode: SemesterCode;
  source: EnrollmentSource;
  enrollments: EnrollmentListItem[];
}

/**
 * A program term that is currently taking enrollments.
 *
 * Carries what the Add Student dialog has to show before someone commits: the
 * program, the semester, how many course enrollments the act will create,
 * and what the package costs. A term that is planning or closed is not here,
 * because offering it and then refusing it is a worse screen than not
 * offering it.
 */
export interface EnrollmentTermOption {
  id: string;
  programId: string;
  programCode: string;
  programName: string;
  semesterCode: SemesterCode;
  courseCount: number;
  packagePrice: number;
  currency: string;
}

/**
 * One student on a program term (direction.md 7a).
 *
 * The roster grain is **one row per student**, not one per course enrollment.
 * A student joins a program term and receives the curriculum, so listing
 * them once with a course count answers "who is under this program"; the
 * course rows answer a different question and are listed separately.
 */
export interface TermRosterRow {
  enrollmentId: string;
  student: StudentSummary;
  status: "pending" | "active" | "completed" | "withdrawn";
  enrolledAt: string;
  /** Curriculum courses this student holds a live enrollment in. */
  courseCount: number;
  /** Courses of the curriculum they dropped or had cancelled. */
  unfinishedCount: number;
}
