import "server-only";

import { mean, round } from "@/lib/calculations";
import type {
  DashboardCourseRow,
  DashboardEvaluationRow,
  DashboardSummary,
  RatingValue,
  StudentCourseRow,
  StudentDashboardSummary,
  StudentTaskRow,
} from "@/types";
import {
  courseTable,
  enrollmentTable,
  evaluationSetupTable,
  semesterTable,
  studentTable,
} from "../repositories";
import { evaluationQueue } from "./persona-service";
import { evaluationResults } from "./report-service";
import { studentProgramHistory } from "./student-service";

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

/**
 * The student's own dashboard (direction.md §3a).
 *
 * A separate read from `dashboardSummary` rather than a filtered one, because
 * the two answer different questions. The staff dashboard asks how the school
 * is doing - head counts, coverage, the busiest courses. This one asks what you
 * are enrolled in and what you still owe, and every figure on it is about one
 * person.
 *
 * **Deliberately not scoped to the active semester.** The staff dashboard
 * measures one moment and says so; this one is a record. The seeded student
 * holds enrollments in 202502 and 202602 while 202601 is active, so filtering
 * to "now" would render the landing page empty for the only student who can
 * sign in - a screen that is correct and demonstrates nothing. Every row
 * carries its semester and the current one is marked, so nothing is disguised
 * as current.
 *
 * `personaId` is what turns the evaluation queue into real work. It is the
 * account's own persona, not a URL parameter: this is the dashboard, and
 * reading somebody else's queue belongs to `/evaluation?as=`.
 */
export function studentDashboard(
  studentId: string,
  personaId?: string,
): StudentDashboardSummary {
  const active = semesterTable.find((row) => row.status === "active");
  const currentSemesterCode = active?.code ?? null;

  const student = studentTable.find((row) => row.id === studentId);
  if (!student) {
    // A principal whose record cannot be found gets an empty summary rather
    // than an exception. The screen renders the reason; a 500 on the landing
    // page would say nothing to the person who has to act on it.
    return {
      student: null,
      standing: null,
      courses: [],
      semesterCount: 0,
      tasks: [],
      taskTotal: 0,
      currentSemesterCode,
    };
  }

  const coursesById = new Map(courseTable.map((row) => [row.id, row]));

  const courses: StudentCourseRow[] = enrollmentTable
    .filter((row) => row.studentId === student.id)
    .flatMap((row) => {
      const course = coursesById.get(row.courseId);
      if (!course) return [];
      return [
        {
          enrollmentId: row.id,
          courseId: row.courseId,
          courseCode: course.code,
          courseName: course.name,
          credits: course.credits,
          semesterCode: row.semesterCode,
          isCurrentSemester: row.semesterCode === currentSemesterCode,
          status: row.status,
        },
      ];
    })
    // Newest semester first, then by code, so the most recent work is at the
    // top - the opposite of the trend chart, which reads oldest to newest
    // because a trend has a direction and a list of yours does not.
    .sort(
      (a, b) =>
        b.semesterCode.localeCompare(a.semesterCode) ||
        a.courseCode.localeCompare(b.courseCode),
    );

  const history = studentProgramHistory(student.id);
  const latest = history[0];

  const queue = personaId ? evaluationQueue(personaId) : undefined;
  const assignments = queue?.assignments ?? [];

  const tasks: StudentTaskRow[] = assignments
    .map((assignment) => ({
      assignmentId: assignment.id,
      courseCode: assignment.courseCode,
      shortName: assignment.shortName,
      kind: assignment.kind,
      assesseeRole: assignment.assesseeRole,
      subjectCount: assignment.subjects.length,
      completedCount: assignment.completedCount,
      windowOpen: assignment.windowOpen,
    }))
    // Unfinished first, and within that the least started: the reason to look
    // at this panel is to find what is still waiting.
    .sort((a, b) => {
      const aDone = a.completedCount >= a.subjectCount;
      const bDone = b.completedCount >= b.subjectCount;
      if (aDone !== bDone) return aDone ? 1 : -1;
      return a.completedCount - b.completedCount;
    });

  return {
    student: {
      id: student.id,
      studentId: student.studentId,
      fullName: `${student.personal.firstName} ${student.personal.lastName}`,
      program: student.academic.program,
      major: student.academic.major,
      yearLevel: student.academic.yearLevel,
    },
    standing: latest
      ? {
          programName: latest.programName,
          semesterCode: latest.semesterCode,
          status: latest.status,
        }
      : null,
    courses,
    semesterCount: new Set(courses.map((row) => row.semesterCode)).size,
    tasks,
    taskTotal: assignments.length,
    currentSemesterCode,
  };
}
