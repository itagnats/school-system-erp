import "server-only";

import { calculateCostBreakdown, calculateProgramProfit } from "@/lib/calculations";
import {
  costSheetTable,
  courseTable,
  enrollmentTable,
  programEnrollmentTable,
  programTable,
  programTermTable,
  studentTable,
} from "@/server/repositories";
import { matchesSearch, paginate, sortRows, type ListQueryInput } from "@/server/query";
import { toSummary } from "./student-service";
import type { ProgramTermUpdateInput } from "@/lib/api/contracts";
import type {
  PaginatedResult,
  Program,
  ProgramProfit,
  ProgramRosterEntry,
  ProgramTerm,
  ProgramTermSummary,
} from "@/types";

/**
 * Programme reads, including the revenue side (direction.md §4a, §13a).
 *
 * This is the service that makes cost management mean something. A cost sheet
 * on its own answers "what did this course cost"; a programme term answers
 * "did we make money", which is the question a school actually asks.
 */

export interface ProgramQuery extends ListQueryInput {
  status?: string;
  semester?: string;
}

const SORTABLE: Record<string, (row: ProgramTermSummary) => string | number> = {
  programCode: (p) => p.programCode,
  programName: (p) => p.programName,
  semesterCode: (p) => p.semesterCode,
  status: (p) => p.status,
  courseCount: (p) => p.courseCount,
  enrolledCount: (p) => p.enrolledCount,
  packagePrice: (p) => p.packagePrice,
  revenue: (p) => p.revenue,
  netProfit: (p) => p.netProfit,
  marginPercent: (p) => p.marginPercent ?? Number.NEGATIVE_INFINITY,
};

/** Cost per student for a course in a semester, or null when it has no sheet. */
function costPerStudentFor(courseId: string, semesterCode: string): number | null {
  const sheet = costSheetTable.find(
    (s) => s.courseId === courseId && s.semesterCode === semesterCode,
  );
  if (!sheet) return null;
  return calculateCostBreakdown(sheet).costPerStudent;
}

/** Enrolment ids of students taking a programme term, active or completed. */
function studentIdsInTerm(term: ProgramTerm): string[] {
  return programEnrollmentTable
    .filter(
      (enrollment) =>
        enrollment.programId === term.programId &&
        enrollment.semesterCode === term.semesterCode &&
        enrollment.status !== "withdrawn",
    )
    .map((enrollment) => enrollment.studentId);
}

/**
 * Profit for one programme term.
 *
 * The head count per course is a genuine join rather than the term head count
 * reused: a student enrolled in the programme has not necessarily enrolled in
 * every course of its curriculum, and charging the programme for absent
 * students would overstate cost.
 */
export function programTermProfit(term: ProgramTerm): ProgramProfit {
  const memberIds = new Set(studentIdsInTerm(term));
  const coursesById = new Map(courseTable.map((course) => [course.id, course]));

  const courses = term.courseIds.map((courseId) => {
    const course = coursesById.get(courseId);
    const headCount = enrollmentTable.filter(
      (enrollment) =>
        enrollment.courseId === courseId &&
        enrollment.semesterCode === term.semesterCode &&
        memberIds.has(enrollment.studentId),
    ).length;

    return {
      courseId,
      courseCode: course?.code ?? courseId,
      courseName: course?.name ?? "Unknown course",
      costPerStudent: costPerStudentFor(courseId, term.semesterCode),
      headCount,
    };
  });

  return calculateProgramProfit({
    programTermId: term.id,
    currency: term.currency,
    packagePrice: term.packagePrice,
    enrolledCount: memberIds.size,
    courses,
  });
}

function buildSummaries(): ProgramTermSummary[] {
  const programsById = new Map(programTable.map((program) => [program.id, program]));

  const summaries: ProgramTermSummary[] = [];
  for (const term of programTermTable) {
    const program = programsById.get(term.programId);
    if (!program) continue;

    const profit = programTermProfit(term);
    summaries.push({
      id: term.id,
      programId: program.id,
      programCode: program.code,
      programName: program.name,
      semesterCode: term.semesterCode,
      status: term.status,
      courseCount: term.courseIds.length,
      enrolledCount: profit.enrolledCount,
      currency: term.currency,
      packagePrice: term.packagePrice,
      revenue: profit.revenue,
      totalCost: profit.totalCost,
      netProfit: profit.netProfit,
      marginPercent: profit.marginPercent,
      coursesMissingCostSheet: profit.coursesMissingCostSheet,
    });
  }
  return summaries;
}

export function listProgramTerms(query: ProgramQuery): PaginatedResult<ProgramTermSummary> {
  const filtered = buildSummaries().filter((row) => {
    if (query.status && row.status !== query.status) return false;
    if (query.semester && row.semesterCode !== query.semester) return false;
    return matchesSearch(query.search, row.programCode, row.programName, row.semesterCode);
  });

  const sorted = sortRows(filtered, SORTABLE, query.sort, query.direction, "programCode");
  return paginate(sorted, query.page, query.pageSize);
}

export interface ProgramTermDetail {
  program: Program;
  term: ProgramTerm;
  profit: ProgramProfit;
  roster: ProgramRosterEntry[];
}

export function getProgramTerm(programTermId: string): ProgramTermDetail | undefined {
  const term = programTermTable.find((t) => t.id === programTermId);
  if (!term) return undefined;

  const program = programTable.find((p) => p.id === term.programId);
  if (!program) return undefined;

  return {
    program,
    term,
    profit: programTermProfit(term),
    roster: programRoster(term),
  };
}

/** Who is under this programme term. */
function programRoster(term: ProgramTerm): ProgramRosterEntry[] {
  const studentsById = new Map(studentTable.map((student) => [student.id, student]));

  return programEnrollmentTable
    .filter(
      (enrollment) =>
        enrollment.programId === term.programId &&
        enrollment.semesterCode === term.semesterCode,
    )
    .flatMap((enrollment) => {
      const student = studentsById.get(enrollment.studentId);
      if (!student) return [];
      return [
        {
          enrollmentId: enrollment.id,
          student: toSummary(student),
          status: enrollment.status,
          enrolledAt: enrollment.enrolledAt,
        },
      ];
    })
    .sort((a, b) => a.student.studentId.localeCompare(b.student.studentId));
}

/** Programme options for a filter bar. */
export function programFilterOptions(): { value: string; label: string }[] {
  return programTable
    .filter((program) => program.status !== "draft")
    .map((program) => ({ value: program.id, label: `${program.code} - ${program.name}` }));
}

/** Terms a course appears in, for the course detail page. */
export function programTermsForCourse(courseId: string): ProgramTermSummary[] {
  const termIds = new Set(
    programTermTable.filter((t) => t.courseIds.includes(courseId)).map((t) => t.id),
  );
  return buildSummaries().filter((summary) => termIds.has(summary.id));
}

/**
 * Adjust the price or the status of a term, and recompute.
 *
 * Nothing is stored - see docs/decisions/why-bff.md - but the response carries
 * the recalculated profit, so the screen shows the consequence of the price
 * rather than merely acknowledging the change.
 */
export function updateProgramTerm(
  programTermId: string,
  input: ProgramTermUpdateInput,
): ProgramTermDetail | undefined {
  const current = getProgramTerm(programTermId);
  if (!current) return undefined;

  const next: ProgramTerm = {
    ...current.term,
    packagePrice: input.packagePrice ?? current.term.packagePrice,
    status: input.status ?? current.term.status,
  };

  return {
    program: current.program,
    term: next,
    profit: programTermProfit(next),
    roster: current.roster,
  };
}
