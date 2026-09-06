import "server-only";

import { enrollmentTable, semesterTable } from "@/server/repositories";
import { matchesSearch, paginate, sortRows, type ListQueryInput } from "@/server/query";
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

export function academicYearOptions(): number[] {
  return [...new Set(semesterTable.map((s) => s.academicYear))].sort((a, b) => b - a);
}
