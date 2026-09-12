"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HttpError } from "@/lib/api";
import { queryKeys } from "@/lib/constants";
import type {
  CatalogueGroupCreateInput,
  CatalogueGroupUpdateInput,
  CatalogueItemCreateInput,
  CatalogueItemUpdateInput,
} from "@/lib/api/contracts";
import type { CatalogueGroup } from "@/types";
import {
  createCatalogueGroup,
  createCatalogueItem,
  deleteCatalogueItem,
  fetchCatalogue,
  updateCatalogueGroup,
  updateCatalogueItem,
  type CatalogueQueryParams,
} from "../services/catalogue-service";

export function useCatalogue(params: CatalogueQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.catalogue.list(params),
    queryFn: () => fetchCatalogue(params),
  });
}

/**
 * Every catalogue write (direction.md §12a).
 *
 * Gathered into one hook because they share a cache update: each returns the
 * affected group, and the screen holds the catalogue as a list of groups. Only
 * the message differs.
 *
 * As everywhere else in PRIME, the response is written into the cache rather
 * than invalidated. The BFF stores nothing, so a refetch would return the seed
 * and undo the change a second after it was made (docs/decisions/why-bff.md).
 */
export type CatalogueAction =
  | { kind: "create-group"; input: CatalogueGroupCreateInput }
  | { kind: "update-group"; groupId: string; input: CatalogueGroupUpdateInput }
  | { kind: "create-item"; groupId: string; input: CatalogueItemCreateInput }
  | {
      kind: "update-item";
      groupId: string;
      itemId: string;
      input: CatalogueItemUpdateInput;
    }
  | { kind: "delete-item"; groupId: string; itemId: string };

const ACTION_MESSAGE: Record<CatalogueAction["kind"], string> = {
  "create-group": "Cost group created",
  "update-group": "Cost group updated",
  "create-item": "Cost item created",
  "update-item": "Cost item updated",
  "delete-item": "Cost item deleted",
};

export function useCatalogueMutations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (action: CatalogueAction) => runAction(action),
    onSuccess: (group, action) => {
      writeGroupIntoCache(queryClient, group, action.kind === "create-group");
      toast.success(ACTION_MESSAGE[action.kind]);
    },
    onError: (error) => {
      // A refusal carries its reason on a field, and the dialog shows it there.
      // A toast saying the same thing twice makes the page noisier, not clearer.
      if (error instanceof HttpError && error.fieldErrors) return;
      toast.error("That change could not be applied. Please try again.");
    },
  });
}

function runAction(action: CatalogueAction): Promise<CatalogueGroup> {
  switch (action.kind) {
    case "create-group":
      return createCatalogueGroup(action.input);
    case "update-group":
      return updateCatalogueGroup(action.groupId, action.input);
    case "create-item":
      return createCatalogueItem(action.groupId, action.input);
    case "update-item":
      return updateCatalogueItem(action.groupId, action.itemId, action.input);
    case "delete-item":
      return deleteCatalogueItem(action.groupId, action.itemId);
  }
}

/** Replace one group in every cached catalogue query, or append a new one. */
function writeGroupIntoCache(
  queryClient: ReturnType<typeof useQueryClient>,
  group: CatalogueGroup,
  isNew: boolean,
) {
  queryClient.setQueriesData<CatalogueGroup[]>(
    { queryKey: queryKeys.catalogue.all },
    (cached) => {
      if (!Array.isArray(cached)) return cached;
      if (isNew) return [...cached, group];
      return cached.map((entry) => (entry.id === group.id ? group : entry));
    },
  );
}
