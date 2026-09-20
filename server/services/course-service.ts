import "server-only";

import {
  courseCostSheetTable,
  courseTable,
  enrollmentTable,
  programTermTable,
} from "@/server/repositories";
import { matchesSearch, paginate, sortRows, type ListQueryInput } from "@/server/query";
import type { RemovalResult } from "@/server/http";
import type { CourseCreateInput, CourseUpdateInput } from "@/lib/api/contracts";
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

/* -------------------------------------------------------------------------- */
/* Writes                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Writes are validated and shaped, and then change nothing.
 *
 * The deploy target is serverless, so there is no long-lived process to hold
 * state, and one mutable store shared across visitors would show a reviewer
 * whatever the previous visitor typed. See docs/decisions/why-bff.md.
 *
 * What is real here is everything a client can observe: the business rules run,
 * the correct status code comes back, and the response is the record as it
 * would have been saved.
 */

export type WriteResult<T> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors: Record<string, string> };

/**
 * A course code identifies the course to a human, so it has to be unique.
 *
 * This returns a field error rather than a 409, even though it is a conflict:
 * the problem is attributable to one input the user can see and fix, and
 * putting it under the Code field is worth more than the more literally correct
 * status code.
 */
function codeTaken(code: string, exceptId?: string): boolean {
  const normalized = code.trim().toUpperCase();
  return courseTable.some(
    (course) => course.id !== exceptId && course.code.toUpperCase() === normalized,
  );
}

export function createCourse(input: CourseCreateInput): WriteResult<Course> {
  if (codeTaken(input.code)) {
    return { ok: false, fieldErrors: { code: `${input.code} is already in use` } };
  }

  // The timestamps come from the request, not from the clock: a service that
  // reads Date.now() is no longer deterministic, and this one is called during
  // render on the server component path.
  const now = seedNow();
  return {
    ok: true,
    data: {
      id: `crs-${input.code.toLowerCase()}`,
      code: input.code.trim().toUpperCase(),
      name: input.name,
      description: input.description,
      credits: input.credits,
      status: input.status,
      offeredIn: input.offeredIn,
      createdAt: now,
      updatedAt: now,
    },
  };
}

export function updateCourse(
  courseId: string,
  input: CourseUpdateInput,
): WriteResult<Course> | undefined {
  const existing = getCourse(courseId);
  if (!existing) return undefined;

  if (input.code && codeTaken(input.code, existing.id)) {
    return { ok: false, fieldErrors: { code: `${input.code} is already in use` } };
  }

  return {
    ok: true,
    data: {
      ...existing,
      ...input,
      code: input.code ? input.code.trim().toUpperCase() : existing.code,
      updatedAt: seedNow(),
    },
  };
}

/**
 * The most recent timestamp in the dataset, used as "now".
 *
 * Reading the clock here would make two renders of the same page disagree, so
 * the seed supplies the present as well as the past.
 */
function seedNow(): string {
  return courseTable.reduce(
    (latest, course) => (course.updatedAt > latest ? course.updatedAt : latest),
    courseTable[0]?.updatedAt ?? "2026-01-05T00:00:00.000Z",
  );
}

/**
 * Remove a course (decided 2026-09-16).
 *
 * Refused while a curriculum lists it, anyone is enrolled in it, or a cost
 * sheet records what it cost. The curriculum is the important one: a program
 * term prices a package of named courses, and deleting one out from under it
 * would leave an invoice billing a course that does not exist.
 *
 * Archiving is the intended route for a course that is no longer taught, which
 * is why the status union already has `archived`. The reason says so.
 */
export function deleteCourse(courseId: string): RemovalResult | undefined {
  const course = courseTable.find((row) => row.id === courseId);
  if (!course) return undefined;

  const curricula = programTermTable.filter((term) => term.courseIds.includes(courseId)).length;
  const enrolled = enrollmentTable.filter(
    (row) => row.courseId === courseId && row.status !== "cancelled",
  ).length;
  const sheets = courseCostSheetTable.filter((sheet) => sheet.courseId === courseId).length;

  const holds: string[] = [];
  if (curricula > 0) holds.push(`${curricula} program term${curricula === 1 ? "" : "s"}`);
  if (enrolled > 0) holds.push(`${enrolled} enrollment${enrolled === 1 ? "" : "s"}`);
  if (sheets > 0) holds.push(`${sheets} cost sheet${sheets === 1 ? "" : "s"}`);

  if (holds.length > 0) {
    const list =
      holds.length === 1
        ? holds[0]
        : `${holds.slice(0, -1).join(", ")} and ${holds[holds.length - 1]}`;
    return {
      ok: false,
      reason: `${list} still reference ${course.code}. Archive it instead, so the record of what was taught survives.`,
    };
  }

  return { ok: true };
}
