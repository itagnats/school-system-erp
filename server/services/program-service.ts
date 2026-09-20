import "server-only";

import { calculateProgramProfit } from "@/lib/calculations";
import {
  courseTable,
  enrollmentTable,
  programEnrollmentTable,
  programTable,
  invoiceTable,
  programTermTable,
  studentTable,
} from "@/server/repositories";
import { matchesSearch, paginate, sortRows, type ListQueryInput } from "@/server/query";
import type { RemovalResult } from "@/server/http";
import { programCostBreakdownFor, type ProgramCostProfit } from "./cost-service";
import { invoicedRevenueForTerm } from "./invoice-service";
import { toSummary } from "./student-service";
import type { ProgramTermUpdateInput } from "@/lib/api/contracts";
import type {
  EnrollmentTermOption,
  PaginatedResult,
  Program,
  ProgramCurriculumEntry,
  ProgramProfit,
  ProgramTermStatus,
  ProgramRosterEntry,
  ProgramTerm,
  ProgramTermSummary,
} from "@/types";

/**
 * Program reads (direction.md §4a), and the profit calculation Cost
 * Management reads from (§13a).
 *
 * A cost sheet on its own answers "what did this course cost"; a program term
 * answers "did we make money", which is the question a school actually asks.
 * This file still computes that answer — `programTermProfit` and
 * `programProfitLookup` — because the join needs the curriculum, the roster
 * and the invoices, and this is where those meet.
 *
 * **It no longer puts the answer on a program screen.** Since 2026-09-20 the
 * shapes these reads return to the Academic menu carry the package price and
 * nothing else about money; the P&L is served to `/costs`. Keeping the
 * calculation here and the display there is deliberate: one implementation,
 * one place it belongs on screen.
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
  /**
   * Enrollment usefulness: open terms, then the ones that will open, then
   * history - and the newest semester first inside each band.
   *
   * The enrollment screen needs this and the curriculum screen does not, which
   * is why it is a separate key rather than a redefinition of `status`.
   * Sorting by status alphabetically puts `closed` first, which buries every
   * term a student can actually be enrolled into beneath ten that are over.
   */
  enrollment: (p) => `${ENROLLMENT_RANK[p.status]}:${invertSemester(p.semesterCode)}`,
};

const ENROLLMENT_RANK: Record<ProgramTermStatus, number> = {
  open: 0,
  planning: 1,
  closed: 2,
};

/** Newest first inside a band, using a string sort that stays ascending. */
function invertSemester(code: string): string {
  return String(999999 - Number(code)).padStart(6, "0");
}

/**
 * Cost per student for each course of a term, from the program's own costing.
 *
 * Read through `programCostBreakdownFor` rather than off a course sheet
 * directly (revised 2026-09-15). A course's cost is its direct costs **plus**
 * its derived share of the program's indirect pool, and taking the direct
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

/** Enrollment ids of students taking a program term, active or completed. */
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
 * Program members taking each course of a term's curriculum.
 *
 * A genuine join rather than the term head count reused: a student enrolled in
 * the program has not necessarily enrolled in every course of its curriculum,
 * and charging the program for absent students would overstate cost.
 *
 * Shared by the profit calculation and the curriculum table, which both need
 * it and would otherwise each write the join (§4a, §13a).
 */
function courseHeadCounts(
  term: ProgramTerm,
  memberIds: ReadonlySet<string>,
): Map<string, number> {
  const counts = new Map<string, number>(term.courseIds.map((id) => [id, 0]));

  for (const enrollment of enrollmentTable) {
    if (enrollment.semesterCode !== term.semesterCode) continue;
    if (!memberIds.has(enrollment.studentId)) continue;
    const current = counts.get(enrollment.courseId);
    if (current === undefined) continue;
    counts.set(enrollment.courseId, current + 1);
  }

  return counts;
}

/**
 * Profit for one program term.
 */
export function programTermProfit(term: ProgramTerm): ProgramProfit {
  const memberIds = new Set(studentIdsInTerm(term));
  const coursesById = new Map(courseTable.map((course) => [course.id, course]));
  const costPerStudent = costPerStudentByCourse(term);
  const headCounts = courseHeadCounts(term, memberIds);

  const courses = term.courseIds.map((courseId) => {
    const course = coursesById.get(courseId);

    return {
      courseId,
      courseCode: course?.code ?? courseId,
      courseName: course?.name ?? "Unknown course",
      costPerStudent: costPerStudent.get(courseId) ?? null,
      headCount: headCounts.get(courseId) ?? 0,
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

/**
 * The whole profit record for one term, by id.
 *
 * What the program cost *detail* page renders. `programProfitLookup` returns
 * the flat slice a table row needs; this returns the bands, the counts and the
 * per-course attribution a reader gets room for on a detail page.
 */
export function programProfitFor(programTermId: string): ProgramProfit | undefined {
  const term = programTermTable.find((entry) => entry.id === programTermId);
  return term ? programTermProfit(term) : undefined;
}

/**
 * The P&L slice Cost Management renders, keyed by program term (§13a, revised
 * 2026-09-20).
 *
 * Handed to `listProgramCostSheets` as a function rather than imported by it,
 * because `programTermProfit` already depends on `programCostBreakdownFor` and
 * an import in the other direction would close a cycle. The term map is built
 * once and closed over, so the caller pays one pass rather than one lookup per
 * row.
 */
export function programProfitLookup(): (programTermId: string) => ProgramCostProfit {
  const termsById = new Map(programTermTable.map((term) => [term.id, term]));

  return (programTermId: string) => {
    const term = termsById.get(programTermId);
    if (!term) {
      // A cost sheet whose term has gone is a broken row, not a free term.
      // Zeroes would read as "billed nothing and cost nothing", which is a
      // claim; null margin says the question has no answer here.
      return {
        listRevenue: 0,
        revenue: 0,
        collected: 0,
        outstanding: 0,
        attributedCost: 0,
        netProfit: 0,
        marginPercent: null,
      };
    }

    const profit = programTermProfit(term);
    return {
      listRevenue: profit.listRevenue,
      revenue: profit.revenue,
      collected: profit.collected,
      outstanding: profit.outstanding,
      attributedCost: profit.totalCost,
      netProfit: profit.netProfit,
      marginPercent: profit.marginPercent,
    };
  };
}

function buildSummaries(): ProgramTermSummary[] {
  const programsById = new Map(programTable.map((program) => [program.id, program]));

  const summaries: ProgramTermSummary[] = [];
  for (const term of programTermTable) {
    const program = programsById.get(term.programId);
    if (!program) continue;

    // The head count is a membership fact, so it is counted here rather than
    // read off a profit calculation. Calling `programTermProfit` for it would
    // join invoices and cost sheets to build a list that shows neither
    // (§13a, revised 2026-09-20).
    summaries.push({
      id: term.id,
      programId: program.id,
      programCode: program.code,
      programName: program.name,
      semesterCode: term.semesterCode,
      status: term.status,
      courseCount: term.courseIds.length,
      enrolledCount: new Set(studentIdsInTerm(term)).size,
      currency: term.currency,
      packagePrice: term.packagePrice,
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

/**
 * One program term as the Academic menu reads it (§4a).
 *
 * **No `profit`.** It carried one until 2026-09-20, and both readers of this
 * shape are academic screens — the curriculum page and the enrollment term
 * page — so a P&L was being computed and shipped to two screens that show no
 * money (§13a). Profitability is served to Cost Management by
 * `programTermProfit` and `programProfitLookup` instead.
 */
export interface ProgramTermDetail {
  program: Program;
  term: ProgramTerm;
  /** The curriculum in teaching order, with the take-up of each course. */
  curriculum: ProgramCurriculumEntry[];
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
    curriculum: termCurriculum(term),
    roster: programRoster(term),
  };
}

/**
 * The curriculum in teaching order (§4a).
 *
 * `courseIds` *is* the order, so the position is the index rather than a
 * stored field - there is no second place for it to disagree with.
 */
function termCurriculum(term: ProgramTerm): ProgramCurriculumEntry[] {
  const coursesById = new Map(courseTable.map((course) => [course.id, course]));
  const headCounts = courseHeadCounts(term, new Set(studentIdsInTerm(term)));

  return term.courseIds.map((courseId, index) => {
    const course = coursesById.get(courseId);
    return {
      courseId,
      courseCode: course?.code ?? courseId,
      courseName: course?.name ?? "Unknown course",
      credits: course?.credits ?? 0,
      position: index + 1,
      headCount: headCounts.get(courseId) ?? 0,
    };
  });
}

/** Who is under this program term. */
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

/** Program options for a filter bar. */
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
 * Adjust the price or the status of a term.
 *
 * Nothing is stored - see docs/decisions/why-bff.md. The response used to
 * carry the recalculated profit so the screen could show the consequence of a
 * new price; since 2026-09-20 the consequence is read under Cost Management
 * (§13a) and this returns the academic record only. The screen links there
 * rather than answering the question itself.
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
    // Rebuilt from `next` rather than reused: repricing does not move the
    // curriculum today, but reusing the old array would make that a silent
    // assumption the moment curriculum editing lands.
    curriculum: termCurriculum(next),
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
export function openProgramTermOptions(): EnrollmentTermOption[] {
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

/**
 * How many program memberships exist, withdrawn ones included.
 *
 * A plain count rather than a list: the system guide needs the size of the
 * table and nothing in it, and paginating a list to read `total` would be a
 * query built to be thrown away. Withdrawn rows count here because this is the
 * shape of the data, not a roster — `studentIdsInTerm` is the one that excludes
 * them, and it is about who is on a course.
 */
export function programEnrollmentCount(): number {
  return programEnrollmentTable.length;
}

/**
 * Remove a program term (decided 2026-09-16).
 *
 * Refused while anyone is a member or an invoice bills it. A term is what a
 * package was sold as, so deleting one that has been billed would leave an
 * invoice describing a curriculum nobody can look up.
 *
 * A term in `planning` with nobody in it is the case this exists for: created
 * by mistake, or superseded before it opened.
 */
export function deleteProgramTerm(programTermId: string): RemovalResult | undefined {
  const term = programTermTable.find((row) => row.id === programTermId);
  if (!term) return undefined;

  const members = programEnrollmentTable.filter(
    (row) =>
      row.programId === term.programId &&
      row.semesterCode === term.semesterCode &&
      row.status !== "withdrawn",
  ).length;
  // `programTermIds` is the join, not the semester: an invoice is per student
  // per semester and names the terms it bills, so a term with no invoice
  // against it can go even when that semester has been billed for others.
  const invoices = invoiceTable.filter((row) =>
    row.programTermIds.includes(term.id),
  ).length;

  if (members > 0 || invoices > 0) {
    const holds: string[] = [];
    if (members > 0) holds.push(`${members} ${members === 1 ? "student" : "students"}`);
    if (invoices > 0) holds.push(`${invoices} ${invoices === 1 ? "invoice" : "invoices"}`);
    return {
      ok: false,
      reason: `${holds.join(" and ")} still belong to this term. Withdraw its members first.`,
    };
  }

  return { ok: true };
}
