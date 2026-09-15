import "server-only";

import { calculateProgramProfit } from "@/lib/calculations";
import {
  courseTable,
  enrollmentTable,
  programEnrollmentTable,
  programTable,
  programTermTable,
  studentTable,
} from "@/server/repositories";
import { matchesSearch, paginate, sortRows, type ListQueryInput } from "@/server/query";
import { programCostBreakdownFor } from "./cost-service";
import { invoicedRevenueForTerm } from "./invoice-service";
import { toSummary } from "./student-service";
import type { ProgramTermUpdateInput } from "@/lib/api/contracts";
import type {
  EnrolmentTermOption,
  PaginatedResult,
  Program,
  ProgramProfit,
  ProgramTermStatus,
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
  listRevenue: (p) => p.listRevenue,
  revenue: (p) => p.revenue,
  collected: (p) => p.collected,
  outstanding: (p) => p.outstanding,
  netProfit: (p) => p.netProfit,
  marginPercent: (p) => p.marginPercent ?? Number.NEGATIVE_INFINITY,
  /**
   * Enrolment usefulness: open terms, then the ones that will open, then
   * history - and the newest semester first inside each band.
   *
   * The enrolment screen needs this and the curriculum screen does not, which
   * is why it is a separate key rather than a redefinition of `status`.
   * Sorting by status alphabetically puts `closed` first, which buries every
   * term a student can actually be enrolled into beneath ten that are over.
   */
  enrolment: (p) => `${ENROLMENT_RANK[p.status]}:${invertSemester(p.semesterCode)}`,
};

const ENROLMENT_RANK: Record<ProgramTermStatus, number> = {
  open: 0,
  planning: 1,
  closed: 2,
};

/** Newest first inside a band, using a string sort that stays ascending. */
function invertSemester(code: string): string {
  return String(999999 - Number(code)).padStart(6, "0");
}

/**
 * Cost per student for each course of a term, from the programme's own costing.
 *
 * Read through `programCostBreakdownFor` rather than off a course sheet
 * directly (revised 2026-09-15). A course's cost is its direct costs **plus**
 * its derived share of the programme's indirect pool, and taking the direct
 * half alone here would understate every course by the share — which is the
 * under-recovery this revision exists to remove.
 *
 * A course with no direct sheet still appears, with a null cost per student.
 * Unknown, never zero (§13a).
 */
function costPerStudentByCourse(term: ProgramTerm): Map<string, number | null> {
  const costing = programCostBreakdownFor(term);
  return new Map(
    (costing?.courses ?? []).map((course) => [course.courseId, course.costPerStudent]),
  );
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
  const costPerStudent = costPerStudentByCourse(term);

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
      costPerStudent: costPerStudent.get(courseId) ?? null,
      headCount,
    };
  });

  return calculateProgramProfit({
    programTermId: term.id,
    currency: term.currency,
    packagePrice: term.packagePrice,
    enrolledCount: memberIds.size,
    // Revenue comes from what was billed, not from what the price implies
    // (direction.md §13a, revised 2026-09-12).
    invoiced: invoicedRevenueForTerm(term.id),
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
      listRevenue: profit.listRevenue,
      revenue: profit.revenue,
      collected: profit.collected,
      outstanding: profit.outstanding,
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

/**
 * The terms a student can be enrolled into right now (direction.md 7a).
 *
 * Only `open` ones. A planning term has no roster yet and a closed one is
 * history, so putting either in the picker would be an invitation the server
 * then has to refuse.
 */
export function openProgramTermOptions(): EnrolmentTermOption[] {
  const programsById = new Map(programTable.map((program) => [program.id, program]));

  return programTermTable
    .filter((term) => term.status === "open")
    .flatMap((term) => {
      const program = programsById.get(term.programId);
      if (!program) return [];
      return [
        {
          id: term.id,
          programId: program.id,
          programCode: program.code,
          programName: program.name,
          semesterCode: term.semesterCode,
          courseCount: term.courseIds.length,
          packagePrice: term.packagePrice,
          currency: term.currency,
        },
      ];
    })
    .sort((a, b) =>
      a.semesterCode === b.semesterCode
        ? a.programCode.localeCompare(b.programCode)
        : a.semesterCode.localeCompare(b.semesterCode),
    );
}
