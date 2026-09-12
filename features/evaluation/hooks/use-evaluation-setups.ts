"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { EvaluationSetupUpdateInput } from "@/lib/api/contracts";
import { queryKeys } from "@/lib/constants";
import {
  fetchEvaluationSetup,
  fetchEvaluationSetups,
  updateEvaluationSetup,
} from "../services/evaluation-service";
import type { EvaluationSetupFilters } from "../types";

export function useEvaluationSetups(filters: EvaluationSetupFilters) {
  return useQuery({
    queryKey: queryKeys.evaluation.list(filters),
    queryFn: () => fetchEvaluationSetups(filters),
    // Keep the current page on screen while the next one loads; DataTable
    // dims it rather than replacing it. See its isFetching prop.
    placeholderData: keepPreviousData,
  });
}

export function useEvaluationSetup(id: string) {
  return useQuery({
    queryKey: queryKeys.evaluation.setup(id),
    queryFn: () => fetchEvaluationSetup(id),
    enabled: Boolean(id),
  });
}

/**
 * Save a configuration change.
 *
 * Not optimistic. The server recomputes the weight summary, the readiness of
 * each form kind and the relation counts from the new blend, and guessing those
 * in the browser would mean writing the same arithmetic twice - which is the
 * failure the calculation layer exists to prevent.
 *
 * The response is written into the cache rather than invalidated. The BFF
 * stores nothing (docs/decisions/why-bff.md), so a refetch would return the
 * seed and silently discard the edit the user just made.
 */
export function useUpdateEvaluationSetup(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EvaluationSetupUpdateInput) => updateEvaluationSetup(id, input),
    onSuccess: (detail) => {
      queryClient.setQueryData(queryKeys.evaluation.setup(id), detail);
      toast.success("Evaluation settings saved");
    },
    onError: () => {
      toast.error("Those settings could not be saved. Please try again.");
    },
  });
}
