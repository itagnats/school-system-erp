"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/constants";
import { fetchActiveCourses } from "../services/course-picker-service";

/**
 * Active courses, for composing a curriculum.
 *
 * The read-only twin of `features/courses/hooks/use-courses.ts`, kept separate
 * so `features/programs/` imports no other feature (`AUD-012`). The key is
 * `queryKeys.courses.list` either way, so the two share a cache entry and a
 * reader who came from the Courses screen opens this already warm.
 *
 * `enabled` guards the dialog rather than the page: the query should not run
 * until somebody asks to add a course, because most visits never do.
 */
export function useCoursePicker(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.courses.list({ status: "active", pageSize: 100, sort: "code" }),
    queryFn: fetchActiveCourses,
    enabled,
  });
}
