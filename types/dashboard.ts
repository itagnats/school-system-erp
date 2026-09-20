import type { SemesterCode } from "./common";
import type { EnrollmentStatus } from "./enrollment";
import type { StudentProgramTerm } from "./student";
import type { EvaluationKind, EvaluationRole, EvaluationWindowStatus, RatingValue } from "./evaluation";
import type { SemesterStatus } from "./semester";

/**
 * The dashboard (`direction.md` §24).
 *
 * One flat summary rather than a metric per endpoint. Every figure on the page
 * describes the same moment — the current semester — and splitting them across
 * calls would let the tiles disagree with the panels below them while each was
 * individually correct.
 *
 * §24 also draws the boundary: "do not turn the dashboard into a full analytics
 * platform." There is no date range, no comparison period and no drill-down
 * here. Anything a reader wants to interrogate is a link to the module that
 * owns it.
 */

/** The semester every figure below is measured against. */
export interface DashboardSemester {
  code: SemesterCode;
  name: string;
  status: SemesterStatus;
  startDate: string;
  endDate: string;
}

export interface DashboardEvaluationRow {
  setupId: string;
  courseCode: string;
  courseName: string;
  shortName: string;
  status: EvaluationWindowStatus;
  /** People being assessed in this evaluation, across every assessee role. */
  subjectCount: number;
  /** Of those, how many have a score yet. */
  scoredCount: number;
  /**
   * Mean share of the blend that has reported, 0-100.
   *
   * Below 100 means some role has not submitted and every score in the
   * evaluation is provisional — which is the one thing worth knowing about an
   * evaluation still in progress.
   */
  coveragePercent: number;
}

export interface DashboardCourseRow {
  id: string;
  code: string;
  name: string;
  credits: number;
  /** Enrollments in this course for the current semester. */
  enrolledCount: number;
}

export interface DashboardSummary {
  /** Null when no semester is active; the screen then says so rather than showing zeros. */
  semester: DashboardSemester | null;

  activeCourseCount: number;
  /** Distinct students with an enrollment in the current semester. */
  enrolledStudentCount: number;

  /**
   * Mean coverage across the current semester's evaluations, 0-100.
   *
   * Null when nothing is being assessed yet. Null and zero are different
   * claims: one is "no evaluation has opened", the other is "they opened and
   * nobody has answered".
   */
  evaluationCoveragePercent: number | null;
  /** Mean score on the rating scale, not a percentage. Null when nothing is scored. */
  averageScore: number | null;
  scaleMax: RatingValue;

  /** Enrollments per semester, oldest first, for the trend chart. */
  enrollmentTrend: { label: string; value: number }[];

  /** Evaluations in the current semester that have left draft. */
  evaluations: DashboardEvaluationRow[];

  /** The busiest courses running this semester. Capped; see `courseCount`. */
  courses: DashboardCourseRow[];
  /** How many courses run this semester in total, so the panel can say what it is showing. */
  courseCount: number;
}

/* -------------------------------------------------------------------------- */
/* The student's own dashboard (direction.md §3a, §24)                        */
/* -------------------------------------------------------------------------- */

/**
 * One row of "your courses".
 *
 * Carries its own semester because this list is **not scoped to the active
 * one**. The seeded student is enrolled in 202502 and 202602 and the active
 * semester is 202601, so a dashboard filtered to "now" would be empty for the
 * only student who can sign in - and an empty landing page demonstrates
 * nothing. Showing every semester and labeling each row is the honest version:
 * nothing is hidden and nothing is passed off as current.
 */
export interface StudentCourseRow {
  enrollmentId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  credits: number;
  semesterCode: SemesterCode;
  /** Whether this is the semester the school is currently running. */
  isCurrentSemester: boolean;
  status: EnrollmentStatus;
}

/** One thing the student still owes, condensed from their evaluation queue. */
export interface StudentTaskRow {
  assignmentId: string;
  courseCode: string;
  shortName: string;
  kind: EvaluationKind;
  /** Who they are being asked about. */
  assesseeRole: EvaluationRole;
  subjectCount: number;
  completedCount: number;
  /** False once the window has closed; the row is then a record, not a task. */
  windowOpen: boolean;
}

/**
 * Everything on a student's dashboard.
 *
 * A different shape from `DashboardSummary` rather than a filtered version of
 * it, because it answers a different question. The staff dashboard asks how the
 * school is doing; this one asks what *you* are enrolled in and what you still
 * owe. Sharing a type would have meant one screen reading fields that are
 * always null for it.
 */
export interface StudentDashboardSummary {
  /** Null when the principal's student record cannot be found. The screen says so. */
  student: {
    id: string;
    /** The printed identifier, e.g. `ST-2026-007` - not the internal id. */
    studentId: string;
    fullName: string;
    program: string;
    major: string;
    yearLevel: number;
  } | null;

  /** The most recent program membership: what they are on, and where they got to. */
  standing: {
    programName: string;
    semesterCode: SemesterCode;
    status: StudentProgramTerm["status"];
  } | null;

  /** Every course enrollment they hold, newest semester first. */
  courses: StudentCourseRow[];
  /** How many distinct semesters those span, so the tile can say what it counts. */
  semesterCount: number;

  /** What they still owe, unfinished first. Empty when their queue is clear. */
  tasks: StudentTaskRow[];
  /** Assignments with nothing left to do, for the "N of M" on the tile. */
  taskTotal: number;

  /** The semester the school is running, for labeling rather than filtering. */
  currentSemesterCode: SemesterCode | null;
}
