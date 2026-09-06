"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/constants";
import { fetchCourse, fetchCourses } from "../services/course-service";
import type { CourseQueryParams } from "../types";

/**
 * Course reads.
 *
 * The query key is built from the same params the URL carries, so two tabs on
 * different filters do not share a cache entry and a back navigation restores
 * from cache rather than refetching.
 */
export function useCourses(params: CourseQueryParams) {
  return useQuery({
    queryKey: queryKeys.courses.list(params),
    queryFn: () => fetchCourses(params),
  });
}

export function useCourse(courseId: string) {
  return useQuery({
    queryKey: queryKeys.courses.detail(courseId),
    queryFn: () => fetchCourse(courseId),
    enabled: Boolean(courseId),
  });
}
