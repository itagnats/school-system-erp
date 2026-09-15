"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HttpError } from "@/lib/api";
import type {
  CostSheetUpdateInput,
  SheetGroupAddInput,
  SheetItemAddInput,
  SheetItemUpdateInput,
} from "@/lib/api/contracts";
import { queryKeys } from "@/lib/constants";
import {
  addSheetGroup,
  addSheetItem,
  realignSheetItem,
  removeSheetItem,
  updateCostSheet,
  updateSheetItem,
} from "../services/cost-service";
import type { CostSheetRow } from "../types";
import type { PaginatedResult } from "@/types";

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

/**
 * Every write that changes what is *on* a sheet (direction.md §12a).
 *
 * One hook rather than five, because they are one operation from the screen's
 * point of view: change the contents, and render whatever the server says the
 * sheet now totals. Each variant returns the full recomputed detail, so the
 * cache update is identical and only the message differs.
 *
 * None of them is optimistic. Adding a line changes the total, the markup
 * amount, each group's share and the per-student figure — guessing those in the
 * browser would mean writing the cost formula a second time in the one place
 * the architecture forbids.
 */
export type SheetContentAction =
  | { kind: "add-item"; input: SheetItemAddInput }
  | { kind: "add-group"; input: SheetGroupAddInput }
  | { kind: "update-item"; itemId: string; input: SheetItemUpdateInput }
  | { kind: "realign-item"; itemId: string }
  | { kind: "remove-item"; itemId: string };

const ACTION_MESSAGE: Record<SheetContentAction["kind"], string> = {
  "add-item": "Line added from the catalogue",
  "add-group": "Cost group added",
  "update-item": "Line updated",
  "realign-item": "Line moved back onto the catalogue price",
  "remove-item": "Line removed",
};

export function useSheetContents(
  costSheetId: string,
  /**
   * Where the recomputed detail lands.
   *
   * Passed in rather than derived, because the same five writes serve a course
   * sheet and a programme one and the two live in different key spaces. A
   * single key space would let a programme detail overwrite a course detail.
   */
  detailKey: readonly unknown[] = queryKeys.costs.detail(costSheetId),
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (action: SheetContentAction) => runAction(costSheetId, action),
    onSuccess: (detail, action) => {
      queryClient.setQueryData(detailKey, detail);
      patchCachedRows(queryClient, costSheetId, detail);
      toast.success(ACTION_MESSAGE[action.kind]);
    },
    onError: (error) => {
      // A 422 carries its reason on a field and the form shows it there; a
      // toast as well would say the same thing twice.
      if (error instanceof HttpError && error.fieldErrors) return;
      toast.error("That change could not be applied. Please try again.");
    },
  });
}

/**
 * Keep the cached list rows in step with the sheet just edited.
 *
 * A patch, never an invalidation. Invalidating would refetch the seed and
 * visibly undo the change a second after it was made, because the BFF stores
 * nothing (docs/decisions/why-bff.md). The two figures copied across are taken
 * from the server's own recomputed breakdown rather than recalculated here.
 */
function patchCachedRows(
  queryClient: QueryClient,
  costSheetId: string,
  detail: { breakdown: { totalCost: number; costPerStudent: number | null; studentCount: number } },
) {
  // A programme sheet id matches no row in the course list, so this is a
  // harmless no-op for one rather than something to branch on.
  queryClient.setQueriesData<PaginatedResult<CostSheetRow>>(
    { queryKey: queryKeys.costs.all },
    (cached) =>
      cached && "items" in cached
        ? {
            ...cached,
            items: cached.items.map((row) =>
              row.id === costSheetId
                ? {
                    ...row,
                    totalCost: detail.breakdown.totalCost,
                    costPerStudent: detail.breakdown.costPerStudent,
                    studentCount: detail.breakdown.studentCount,
                  }
                : row,
            ),
          }
        : cached,
  );
}

function runAction(costSheetId: string, action: SheetContentAction) {
  switch (action.kind) {
    case "add-item":
      return addSheetItem(costSheetId, action.input);
    case "add-group":
      return addSheetGroup(costSheetId, action.input);
    case "update-item":
      return updateSheetItem(costSheetId, action.itemId, action.input);
    case "realign-item":
      return realignSheetItem(costSheetId, action.itemId);
    case "remove-item":
      return removeSheetItem(costSheetId, action.itemId);
  }
}
