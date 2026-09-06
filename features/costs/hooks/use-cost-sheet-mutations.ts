"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CostSheetUpdateInput } from "@/lib/api/contracts";
import { queryKeys } from "@/lib/constants";
import { updateCostSheet } from "../services/cost-service";

/**
 * Adjust a cost sheet.
 *
 * Not optimistic, deliberately. The point of this mutation is that the *server*
 * recomputes the total, the markup amount, each group share and the per-student
 * figure from the new inputs. Guessing those in the browser would mean writing
 * the cost formula a second time in the one place the architecture says it must
 * never live, and a wrong guess would flash a wrong number at the user before
 * correcting itself.
 *
 * As elsewhere, the response is written into the cache rather than triggering
 * an invalidation: the BFF stores nothing, so a refetch would return the seed
 * and undo the change on screen. See docs/decisions/why-bff.md.
 */
export function useUpdateCostSheet(costSheetId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CostSheetUpdateInput) => updateCostSheet(costSheetId, input),
    onSuccess: (detail) => {
      queryClient.setQueryData(queryKeys.costs.detail(costSheetId), detail);
      toast.success("Cost sheet recalculated");
    },
    onError: () => {
      toast.error("That change could not be applied. Please try again.");
    },
  });
}
