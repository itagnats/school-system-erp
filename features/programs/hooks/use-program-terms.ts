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
    queryKey: queryKeys.programs.list(params),
    queryFn: () => fetchProgramTerms(params),
    // Keep the current page on screen while the next one loads; DataTable
    // dims it rather than replacing it. See its isFetching prop.
    placeholderData: keepPreviousData,
  });
}

export function useProgramTerm(id: string) {
  return useQuery({
    queryKey: queryKeys.programs.detail(id),
    queryFn: () => fetchProgramTerm(id),
    enabled: Boolean(id),
  });
}

/**
 * Repricing a term.
 *
 * Not optimistic: the server recomputes revenue, margin and profit per student
 * from the new price, and guessing those in the browser would mean writing the
 * profit formula a second time. As elsewhere, the response is written into the
 * cache rather than invalidated, because the BFF stores nothing.
 */
export function useUpdateProgramTerm(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProgramTermUpdateInput) => updateProgramTerm(id, input),
    onSuccess: (detail) => {
      queryClient.setQueryData(queryKeys.programs.detail(id), detail);
      toast.success("Programme term repriced");
    },
    onError: () => {
      toast.error("That price could not be applied. Please try again.");
    },
  });
}
