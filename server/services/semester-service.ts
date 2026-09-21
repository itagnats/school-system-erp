import "server-only";

import { enrollmentTable, semesterTable } from "@/server/repositories";
import { matchesSearch, paginate, sortRows, type ListQueryInput } from "@/server/query";
import type { WriteResult } from "./course-service";
import type {
  SemesterCreateInput,
  SemesterUpdateInput,
} from "@/lib/api/contracts";
import type { PaginatedResult, Semester } from "@/types";

/**
 * Semester reads (direction.md §5).
 *
 * A semester carries a derived enrollment count, which is why the list goes
 * through a service rather than returning rows straight from the table: the
 * count is not stored anywhere and must not be recomputed in a component.
 */

export interface SemesterQuery extends ListQueryInput {
  status?: string;
  academicYear?: string;
}

export interface SemesterListItem extends Semester {
  /** Enrollments recorded against this semester. */
  enrollmentCount: number;
}

const SORTABLE: Record<string, (row: SemesterListItem) => string | number> = {
  code: (s) => s.code,
  name: (s) => s.name,
  academicYear: (s) => s.academicYear,
  startDate: (s) => s.startDate,
  status: (s) => s.status,
  enrollmentCount: (s) => s.enrollmentCount,
};

function withCounts(semesters: Semester[]): SemesterListItem[] {
  const counts = new Map<string, number>();
  for (const enrollment of enrollmentTable) {
    counts.set(enrollment.semesterCode, (counts.get(enrollment.semesterCode) ?? 0) + 1);
  }
  return semesters.map((semester) => ({
    ...semester,
    enrollmentCount: counts.get(semester.code) ?? 0,
  }));
}

export function listSemesters(query: SemesterQuery): PaginatedResult<SemesterListItem> {
  const filtered = withCounts(semesterTable).filter((semester) => {
    if (query.status && semester.status !== query.status) return false;
    if (query.academicYear && String(semester.academicYear) !== query.academicYear) {
      return false;
    }
    return matchesSearch(query.search, semester.code, semester.name);
  });

  const sorted = sortRows(filtered, SORTABLE, query.sort, query.direction, "code");
  return paginate(sorted, query.page, query.pageSize);
}

export function getSemester(code: string): SemesterListItem | undefined {
  return withCounts(semesterTable).find(
    (semester) => semester.code === code || semester.id === code,
  );
}

/**
 * Every semester code, newest first (added 2026-09-21).
 *
 * Deliberately not `courseSemesterOptions`, which derives its list from what
 * courses are already offered in. A term-create picker fed from that could
 * never name a semester created today, because nothing is offered in it yet -
 * which is the dead end `AUD-035` describes, reintroduced one dropdown later.
 * A semester exists because somebody made it, not because a course points
 * at it.
 */
export function semesterCodeOptions(): string[] {
  return semesterTable.map((semester) => semester.code).sort((a, b) => b.localeCompare(a));
}

export function academicYearOptions(): number[] {
  return [...new Set(semesterTable.map((s) => s.academicYear))].sort((a, b) => b - a);
}

/* -------------------------------------------------------------------------- */
/* Writes (direction.md 1, added 2026-09-20)                                  */
/* -------------------------------------------------------------------------- */

// No `seedNow` here, unlike `course-service`: a `Semester` carries no
// `createdAt` or `updatedAt`, so a write has no timestamp to stamp and no
// reason to ask what the present is.

/**
 * The code a year and a term imply (direction.md 5).
 *
 * `YYYYNN`, so 2026 term 2 is `202602`. Derived rather than typed, because a
 * code that can disagree with the year and term beside it is a join key that
 * can point at the wrong semester.
 */
export function semesterCodeFor(academicYear: number, term: number): string {
  return `${academicYear}${String(term).padStart(2, "0")}`;
}

function codeTaken(code: string, exceptId?: string): boolean {
  return semesterTable.some(
    (semester) => semester.id !== exceptId && semester.code === code,
  );
}

/**
 * Create a semester.
 *
 * The uniqueness failure is reported on `term` rather than as a 409: the code
 * is derived, so the field the user can actually change is the term number,
 * and an error on a field they cannot see is an error they cannot act on. The
 * same reasoning `course-service` gives for putting a duplicate code under the
 * Code field.
 */
export function createSemester(input: SemesterCreateInput): WriteResult<SemesterListItem> {
  const code = semesterCodeFor(input.academicYear, input.term);
  if (codeTaken(code)) {
    return {
      ok: false,
      fieldErrors: { term: `${code} already exists - that year already has a term ${input.term}` },
    };
  }

  return {
    ok: true,
    data: {
      id: `sem-${code}`,
      code: code as Semester["code"],
      name: input.name,
      academicYear: input.academicYear,
      term: input.term,
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status,
      // A new semester has nobody in it. Derived everywhere else, and stated
      // as zero here rather than recounted, because there is nothing to count.
      enrollmentCount: 0,
    },
  };
}

/**
 * Edit a semester.
 *
 * **The code cannot move, and a year or term change is refused rather than
 * applied.** Every enrollment, cost sheet, program term and invoice joins on
 * `semesterCode`; renumbering a semester in place would leave all of them
 * pointing at a code that no longer names this record. Nothing is persisted in
 * this demo, so the damage would be invisible - which is exactly why the rule
 * is enforced rather than assumed.
 */
export function updateSemester(
  code: string,
  input: SemesterUpdateInput,
): WriteResult<SemesterListItem> | undefined {
  const existing = getSemester(code);
  if (!existing) return undefined;

  const nextYear = input.academicYear ?? existing.academicYear;
  const nextTerm = input.term ?? existing.term;
  const nextCode = semesterCodeFor(nextYear, nextTerm);
  if (nextCode !== existing.code) {
    return {
      ok: false,
      fieldErrors: {
        term:
          `A semester keeps its code once it exists. ${existing.code} is what ` +
          `enrollments, cost sheets and invoices join on - create ${nextCode} instead.`,
      },
    };
  }

  // Both dates exist here where the request may carry only one, so this is the
  // only place the ordering rule can be checked against the stored value.
  const startDate = input.startDate ?? existing.startDate;
  const endDate = input.endDate ?? existing.endDate;
  if (endDate <= startDate) {
    return {
      ok: false,
      fieldErrors: { endDate: "The end date must fall after the start date" },
    };
  }

  return {
    ok: true,
    data: { ...existing, ...input, startDate, endDate, code: existing.code },
  };
}
