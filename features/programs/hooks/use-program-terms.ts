"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ProgramTermUpdateInput } from "@/lib/api/contracts";
import { queryKeys } from "@/lib/constants";
import {
  fetchProgramTerm,
  fetchProgramTerms,
  updateProgramTerm,
} from "../services/program-service";
import type { ProgramQueryParams } from "../types";

export function useProgramTerms(params: ProgramQueryParams) {
  return useQuery({
    queryKey: queryKeys.programTerms.list(params),
    queryFn: () => fetchProgramTerms(params),
    // Keep the current page on screen while the next one loads; DataTable
    // dims it rather than replacing it. See its isFetching prop.
    placeholderData: keepPreviousData,
  });
}

export function useProgramTerm(id: string) {
  return useQuery({
    queryKey: queryKeys.programTerms.detail(id),
    queryFn: () => fetchProgramTerm(id),
    enabled: Boolean(id),
  });
}

/**
 * Editing a term: its price, its status, or its curriculum.
 *
 * Not optimistic, and the curriculum is the clearer case of why. The server
 * recomputes each course's position and its head count from the new array, so
 * guessing the result in the browser would mean counting enrollments here —
 * the join the architecture puts on the server. The response is written into
 * the cache rather than invalidated, because the BFF stores nothing and a
 * refetch would visibly undo the edit a second after it was made.
 *
 * One endpoint answers three edits, so the confirmation has to name the one
 * that happened. "Program term repriced" after a reorder is a small lie that
 * costs the reader their trust in every other message.
 */
export function useUpdateProgramTerm(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProgramTermUpdateInput) => updateProgramTerm(id, input),
    onSuccess: (detail, input) => {
      queryClient.setQueryData(queryKeys.programTerms.detail(id), detail);
      toast.success(input.courseIds ? "Curriculum saved" : "Program term repriced");
    },
    onError: (_error, input) => {
      // A 422 also lands the reason under the field, which is where a reader
      // can act on it; the toast is the part they notice.
      toast.error(
        input.courseIds
          ? "That curriculum could not be saved."
          : "That price could not be applied. Please try again.",
      );
    },
  });
}
