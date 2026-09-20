"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HttpError } from "@/lib/api";
import { queryKeys } from "@/lib/constants";
import type {
  CatalogGroupCreateInput,
  CatalogGroupUpdateInput,
  CatalogItemCreateInput,
  CatalogItemUpdateInput,
} from "@/lib/api/contracts";
import type { CatalogGroup } from "@/types";
import {
  createCatalogGroup,
  createCatalogItem,
  deleteCatalogItem,
  fetchCatalog,
  updateCatalogGroup,
  updateCatalogItem,
  type CatalogQueryParams,
} from "../services/catalog-service";

export function useCatalog(params: CatalogQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.catalog.list(params),
    queryFn: () => fetchCatalog(params),
  });
}

/**
 * Every catalog write (direction.md §12a).
 *
 * Gathered into one hook because they share a cache update: each returns the
 * affected group, and the screen holds the catalog as a list of groups. Only
 * the message differs.
 *
 * As everywhere else in PRIME, the response is written into the cache rather
 * than invalidated. The BFF stores nothing, so a refetch would return the seed
 * and undo the change a second after it was made (docs/decisions/why-bff.md).
 */
export type CatalogAction =
  | { kind: "create-group"; input: CatalogGroupCreateInput }
  | { kind: "update-group"; groupId: string; input: CatalogGroupUpdateInput }
  | { kind: "create-item"; groupId: string; input: CatalogItemCreateInput }
  | {
      kind: "update-item";
      groupId: string;
      itemId: string;
      input: CatalogItemUpdateInput;
    }
  | { kind: "delete-item"; groupId: string; itemId: string };

const ACTION_MESSAGE: Record<CatalogAction["kind"], string> = {
  "create-group": "Cost group created",
  "update-group": "Cost group updated",
  "create-item": "Cost item created",
  "update-item": "Cost item updated",
  "delete-item": "Cost item deleted",
};

export function useCatalogMutations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (action: CatalogAction) => runAction(action),
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

function runAction(action: CatalogAction): Promise<CatalogGroup> {
  switch (action.kind) {
    case "create-group":
      return createCatalogGroup(action.input);
    case "update-group":
      return updateCatalogGroup(action.groupId, action.input);
    case "create-item":
      return createCatalogItem(action.groupId, action.input);
    case "update-item":
      return updateCatalogItem(action.groupId, action.itemId, action.input);
    case "delete-item":
      return deleteCatalogItem(action.groupId, action.itemId);
  }
}

/** Replace one group in every cached catalog query, or append a new one. */
function writeGroupIntoCache(
  queryClient: ReturnType<typeof useQueryClient>,
  group: CatalogGroup,
  isNew: boolean,
) {
  queryClient.setQueriesData<CatalogGroup[]>(
    { queryKey: queryKeys.catalog.all },
    (cached) => {
      if (!Array.isArray(cached)) return cached;
      if (isNew) return [...cached, group];
      return cached.map((entry) => (entry.id === group.id ? group : entry));
    },
  );
}
