"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CourseCreateInput, CourseUpdateInput } from "@/lib/api/contracts";
import { queryKeys } from "@/lib/constants";
import type { Course, PaginatedResult } from "@/types";
import { createCourse, updateCourse } from "../services/course-service";

/**
 * Course writes.
 *
 * One decision here is worth stating, because the obvious code would look
 * broken. The BFF validates and shapes a write and then stores nothing
 * (docs/decisions/why-bff.md), so invalidating the list after a mutation would
 * refetch the seed and visibly undo the change a second after making it. That
 * reads as a bug, not as a scoping decision.
 *
 * So these write the server's own response into the cache instead. The change
 * survives navigation and stays until reload, which is exactly what the
 * "demo data resets on reload" note in the shell promises. Swap `setQueryData`
 * for `invalidateQueries` the day there is a real store behind this, and
 * nothing else about these hooks changes.
 */

/** Put an updated course into every cached list page that already holds it. */
function patchCachedLists(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (rows: Course[]) => Course[],
) {
  queryClient.setQueriesData<PaginatedResult<Course>>(
    { queryKey: queryKeys.courses.all },
    (previous) => (previous ? { ...previous, items: updater(previous.items) } : previous),
  );
}

export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CourseCreateInput) => createCourse(input),
    onSuccess: (course) => {
      patchCachedLists(queryClient, (rows) => [course, ...rows]);
      queryClient.setQueryData(queryKeys.courses.detail(course.id), course);
      toast.success(`${course.code} created`);
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, input }: { courseId: string; input: CourseUpdateInput }) =>
      updateCourse(courseId, input),
    onSuccess: (course) => {
      patchCachedLists(queryClient, (rows) =>
        rows.map((row) => (row.id === course.id ? course : row)),
      );
      queryClient.setQueryData(queryKeys.courses.detail(course.id), course);
      toast.success(`${course.code} updated`);
    },
  });
}

/**
 * The status toggle, and the one optimistic write in the application.
 *
 * Optimism is safe here precisely because the change is small, reversible and
 * unambiguous: one field, one of three known values, and no other record
 * depends on the result. It would not be safe on the course form, where a
 * rejected code has to come back as a field error rather than as a row that
 * silently reverts.
 */
export function useSetCourseStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ course, status }: { course: Course; status: Course["status"] }) =>
      updateCourse(course.id, { status }),

    onMutate: async ({ course, status }) => {
      // Stop an in-flight refetch from landing on top of the optimistic row.
      await queryClient.cancelQueries({ queryKey: queryKeys.courses.all });
      const snapshot = queryClient.getQueriesData<PaginatedResult<Course>>({
        queryKey: queryKeys.courses.all,
      });

      patchCachedLists(queryClient, (rows) =>
        rows.map((row) => (row.id === course.id ? { ...row, status } : row)),
      );

      return { snapshot };
    },

    onError: (_error, _variables, context) => {
      // Put every touched cache entry back exactly as it was.
      for (const [key, data] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, data);
      }
      toast.error("That status change did not stick. Please try again.");
    },

    onSuccess: (course) => {
      patchCachedLists(queryClient, (rows) =>
        rows.map((row) => (row.id === course.id ? course : row)),
      );
      queryClient.setQueryData(queryKeys.courses.detail(course.id), course);
    },
  });
}
