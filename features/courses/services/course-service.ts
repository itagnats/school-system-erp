import { api, apiPath } from "@/lib/api";
import { courseListSchema, courseSchema } from "@/lib/api/contracts";
import type { Course, PaginatedResult } from "@/types";
import type { CourseCreateInput, CourseUpdateInput } from "@/lib/api/contracts";
import type { CourseQueryParams } from "../types";

/**
 * Client-side callers of the course endpoints.
 *
 * The response is parsed rather than cast. A cast tells the compiler what to
 * believe; a parse checks it, so a contract change surfaces here instead of as
 * a component rendering undefined.
 */

export async function fetchCourses(
  params: CourseQueryParams,
): Promise<PaginatedResult<Course>> {
  const raw = await api.get<unknown>("courses", { query: { ...params } });
  return courseListSchema.parse(raw);
}

export async function fetchCourse(courseId: string): Promise<Course> {
  const raw = await api.get<unknown>(apiPath("courses", courseId));
  return courseSchema.parse(raw);
}

export async function createCourse(input: CourseCreateInput): Promise<Course> {
  const raw = await api.post<unknown>("courses", { body: input });
  return courseSchema.parse(raw);
}

export async function updateCourse(
  courseId: string,
  input: CourseUpdateInput,
): Promise<Course> {
  const raw = await api.patch<unknown>(apiPath("courses", courseId), { body: input });
  return courseSchema.parse(raw);
}
