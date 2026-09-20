"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SemesterCreateInput, SemesterUpdateInput } from "@/lib/api/contracts";
import { queryKeys } from "@/lib/constants";
import type { PaginatedResult } from "@/types";
import { createSemester, updateSemester } from "../services/semester-service";
import type { SemesterListRow } from "../types";

/**
 * Semester writes (direction.md §1, added 2026-09-20).
 *
 * The same cache decision `use-course-mutations` explains and for the same
 * reason: the BFF validates a write and stores nothing, so invalidating the
 * list would refetch the seed and visibly undo the change a second after it was
 * made. The server's own response is written into the cache instead, and the
 * change lasts until reload — which is what the shell already promises.
 *
 * Nothing here is optimistic. A semester form can be rejected by the server on
 * a duplicate code or a bad date range, and a rejected value has to come back
 * as a field error rather than as a row that silently reverts.
 */

function patchCachedLists(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (rows: SemesterListRow[]) => SemesterListRow[],
) {
  queryClient.setQueriesData<PaginatedResult<SemesterListRow>>(
    { queryKey: queryKeys.semesters.all },
    (previous) => (previous ? { ...previous, items: updater(previous.items) } : previous),
  );
}

export function useCreateSemester() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SemesterCreateInput) => createSemester(input),
    onSuccess: (semester) => {
      patchCachedLists(queryClient, (rows) => [semester, ...rows]);
      queryClient.setQueryData(queryKeys.semesters.detail(semester.code), semester);
      toast.success(`${semester.code} created`);
    },
  });
}

export function useUpdateSemester() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ code, input }: { code: string; input: SemesterUpdateInput }) =>
      updateSemester(code, input),
    onSuccess: (semester) => {
      patchCachedLists(queryClient, (rows) =>
        rows.map((row) => (row.id === semester.id ? semester : row)),
      );
      queryClient.setQueryData(queryKeys.semesters.detail(semester.code), semester);
      toast.success(`${semester.code} updated`);
    },
  });
}
