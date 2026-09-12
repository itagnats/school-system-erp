import "server-only";

import { mean, round } from "@/lib/calculations";
import type {
  DashboardCourseRow,
  DashboardEvaluationRow,
  DashboardSummary,
  RatingValue,
} from "@/types";
import {
  courseTable,
  enrollmentTable,
  evaluationSetupTable,
  semesterTable,
} from "../repositories";
import { evaluationResults } from "./report-service";

/**
 * How many course rows the dashboard carries.
 *
 * The panel is an overview, not the course list — that screen exists and the
 * panel links to it. Seventeen courses run in the seeded active semester, and a
 * dashboard that reprints all of them has become the thing §24 says not to
 * build.
 */
const COURSE_LIMIT = 8;

/** Fallback scale when no evaluation has been configured to read one from. */
const DEFAULT_SCALE_MAX: RatingValue = 5;

/**
 * Everything the dashboard shows, in one read (`direction.md` §24).
 *
 * The page is a server component and calls this directly rather than through
 * `/api`: there is no search, filter, sort or paging here, so the extra network
 * hop would buy nothing. Interactive list screens take the other path.
 *
 * "Current" is the semester the seed marks `active`, never a clock reading.
 * Deriving it from `new Date()` would make the dashboard disagree with itself
 * between the server render and the client render the moment a semester ended,
 * and every figure below is scoped to that one semester so they cannot drift
 * apart.
 */
export function dashboardSummary(): DashboardSummary {
  const semester = semesterTable.find((row) => row.status === "active");
  const activeCourseCount = courseTable.filter((row) => row.status === "active").length;

  // Across every semester, not just the current one: a single point is not a
  // trend, and the chart is the one place on this page showing where the
  // current figure sits relative to the ones before it.
  const enrollmentTrend = [...semesterTable]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((row) => ({
      label: row.code,
      value: enrollmentTable.filter((entry) => entry.semesterCode === row.code).length,
    }));

  if (!semester) {
    return {
      semester: null,
      activeCourseCount,
      enrolledStudentCount: 0,
      evaluationCoveragePercent: null,
      averageScore: null,
      scaleMax: DEFAULT_SCALE_MAX,
      enrollmentTrend,
      evaluations: [],
      courses: [],
      courseCount: 0,
    };
  }

  const current = enrollmentTable.filter((row) => row.semesterCode === semester.code);
  // Distinct students, not enrollment rows: one person taking four courses is
  // one enrolled student, and counting rows would overstate the cohort by the
  // average course load.
  const enrolledStudentCount = new Set(current.map((row) => row.studentId)).size;

  const headCount = new Map<string, number>();
  for (const row of current) {
    headCount.set(row.courseId, (headCount.get(row.courseId) ?? 0) + 1);
  }

  const offered = courseTable.filter((row) => row.offeredIn.includes(semester.code));
  const courses: DashboardCourseRow[] = offered
    .map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      credits: row.credits,
      enrolledCount: headCount.get(row.id) ?? 0,
    }))
    .sort((a, b) => b.enrolledCount - a.enrolledCount || a.code.localeCompare(b.code))
    .slice(0, COURSE_LIMIT);

  const evaluation = evaluationProgress(semester.code);

  return {
    semester: {
      code: semester.code,
      name: semester.name,
      status: semester.status,
      startDate: semester.startDate,
      endDate: semester.endDate,
    },
    activeCourseCount,
    enrolledStudentCount,
    evaluationCoveragePercent: evaluation.coveragePercent,
    averageScore: evaluation.averageScore,
    scaleMax: evaluation.scaleMax,
    enrollmentTrend,
    evaluations: evaluation.rows,
    courses,
    courseCount: offered.length,
  };
}

/**
 * Evaluation progress for one semester.
 *
 * Drafts are excluded: an evaluation nobody can answer yet has no progress to
 * report, and counting it as 0% would drag the headline down for a reason that
 * is not about anybody's participation.
 */
function evaluationProgress(semesterCode: string): {
  rows: DashboardEvaluationRow[];
  coveragePercent: number | null;
  averageScore: number | null;
  scaleMax: RatingValue;
} {
  const setups = evaluationSetupTable.filter(
    (row) => row.semesterCode === semesterCode && row.status !== "draft",
  );

  const rows: DashboardEvaluationRow[] = [];
  const coverages: number[] = [];
  const scores: number[] = [];
  let scaleMax: RatingValue = DEFAULT_SCALE_MAX;

  for (const setup of setups) {
    const results = evaluationResults(setup.id);
    if (!results || results.rows.length === 0) continue;

    // From the setup rather than the results: both carry the same value, but
    // the setup types it as a RatingValue while the results row widens it.
    scaleMax = setup.scaleMax;

    const scored = results.rows.filter((row) => row.calculatedScore !== null);
    // Every subject, scored or not, counts toward coverage. A subject nobody
    // has assessed is the clearest case of incomplete, so dropping it from the
    // denominator would make an untouched evaluation read as complete.
    const setupCoverage = mean(results.rows.map((row) => row.coveragePercent)) ?? 0;

    coverages.push(...results.rows.map((row) => row.coveragePercent));
    scores.push(...scored.map((row) => row.calculatedScore as number));

    rows.push({
      setupId: setup.id,
      courseCode: results.courseCode,
      courseName: results.courseName,
      shortName: results.shortName,
      status: setup.status,
      subjectCount: results.rows.length,
      scoredCount: scored.length,
      coveragePercent: round(setupCoverage, 1),
    });
  }

  // Least complete first: the reason to look at this panel is to find what is
  // still waiting, and an evaluation that is finished needs no attention.
  rows.sort(
    (a, b) => a.coveragePercent - b.coveragePercent || a.courseCode.localeCompare(b.courseCode),
  );

  const coverage = mean(coverages);
  const average = mean(scores);

  return {
    rows,
    coveragePercent: coverage === null ? null : round(coverage, 1),
    averageScore: average === null ? null : round(average, 2),
    scaleMax,
  };
}
