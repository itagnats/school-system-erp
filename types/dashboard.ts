import type { SemesterCode } from "./common";
import type { EvaluationWindowStatus, RatingValue } from "./evaluation";
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
