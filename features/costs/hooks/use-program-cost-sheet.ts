"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { ProgramCostSheetUpdateInput } from "@/lib/api/contracts";
import { queryKeys } from "@/lib/constants";
import {
  fetchProgramCostSheet,
  fetchProgramCostSheets,
  updateProgramCostSheet,
} from "../services/cost-service";
import type {
  ProgramCostQueryParams,
  ProgramCostSheetDetailResponse,
} from "../types";

export function useProgramCostSheets(params: ProgramCostQueryParams) {
  return useQuery({
    queryKey: queryKeys.programCosts.list(params),
    queryFn: () => fetchProgramCostSheets(params),
    // Keep the current page on screen while the next one loads; DataTable dims
    // it rather than replacing it.
    placeholderData: keepPreviousData,
  });
}

/**
 * One programme cost sheet, seeded from the server render.
 *
 * Both halves of the screen read through this rather than holding their own
 * copy: the markup form and the line tables are different mutations, and two
 * local copies would let the distribution table and the totals disagree about
 * what is on the sheet.
 */
export function useProgramCostSheet(
  programTermId: string,
  initialData: ProgramCostSheetDetailResponse,
) {
  return useQuery({
    queryKey: queryKeys.programCosts.detail(programTermId),
    queryFn: () => fetchProgramCostSheet(programTermId),
    initialData,
    // The BFF stores nothing, so a background refetch would replace an edited
    // sheet with the seed (docs/decisions/why-bff.md).
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Change the markup, the rounding step, the driver or the status.
 *
 * Not optimistic. A markup change moves every course's share, every course
 * total, the programme total, the cost per student and the preferred price;
 * guessing those here would be the distribution written a second time in the
 * browser, which is what the calculation layer exists to prevent.
 */
export function useUpdateProgramCostSheet(programTermId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProgramCostSheetUpdateInput) =>
      updateProgramCostSheet(programTermId, input),
    onSuccess: (detail) => {
      queryClient.setQueryData(
        queryKeys.programCosts.detail(programTermId),
        detail,
      );
      toast.success("Programme costing recalculated");
    },
    onError: () => {
      toast.error("That change could not be applied. Please try again.");
    },
  });
}
