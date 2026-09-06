import "server-only";

import { courseTable } from "@/server/repositories";
import { matchesSearch, paginate, sortRows, type ListQueryInput } from "@/server/query";
import type { Course, PaginatedResult, SemesterCode } from "@/types";

/**
 * Course reads (direction.md §4).
 *
 * Both the route handler and any server component call these; that shared
 * bottom is what makes the hybrid boundary safe.
 */

export interface CourseQuery extends ListQueryInput {
  status?: string;
  semester?: string;
}

const SORTABLE: Record<string, (course: Course) => string | number> = {
  code: (c) => c.code,
  name: (c) => c.name,
  credits: (c) => c.credits,
  status: (c) => c.status,
  offerings: (c) => c.offeredIn.length,
  updatedAt: (c) => c.updatedAt,
};

export function listCourses(query: CourseQuery): PaginatedResult<Course> {
  const filtered = courseTable.filter((course) => {
    if (query.status && course.status !== query.status) return false;
    if (query.semester && !course.offeredIn.includes(query.semester)) return false;
    return matchesSearch(query.search, course.code, course.name, course.description);
  });

  const sorted = sortRows(filtered, SORTABLE, query.sort, query.direction, "code");
  return paginate(sorted, query.page, query.pageSize);
}

export function getCourse(courseId: string): Course | undefined {
  return courseTable.find((course) => course.id === courseId || course.code === courseId);
}

/** Distinct semester codes any course is offered in, for the filter bar. */
export function courseSemesterOptions(): SemesterCode[] {
  const codes = new Set<SemesterCode>();
  for (const course of courseTable) {
    for (const code of course.offeredIn) codes.add(code);
  }
  return [...codes].sort((a, b) => b.localeCompare(a));
}

/** Course options for a filter bar, active courses first. */
export function courseFilterOptions(): { value: string; label: string }[] {
  return courseTable
    .filter((course) => course.status !== "draft")
    .map((course) => ({ value: course.id, label: `${course.code} - ${course.name}` }));
}
