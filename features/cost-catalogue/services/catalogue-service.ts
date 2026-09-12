import { api, apiPath } from "@/lib/api";
import { catalogueListSchema } from "@/lib/api/contracts";
import type {
  CatalogueGroupCreateInput,
  CatalogueGroupUpdateInput,
  CatalogueItemCreateInput,
  CatalogueItemUpdateInput,
} from "@/lib/api/contracts";
import type { CatalogueGroup } from "@/types";

const ROOT = "cost-catalog";

export interface CatalogueQueryParams {
  search?: string;
  status?: string;
  kind?: string;
}

export async function fetchCatalogue(
  params: CatalogueQueryParams = {},
): Promise<CatalogueGroup[]> {
  const raw = await api.get<unknown>(ROOT, { query: { ...params } });
  return catalogueListSchema.parse(raw).groups as CatalogueGroup[];
}

export async function createCatalogueGroup(
  input: CatalogueGroupCreateInput,
): Promise<CatalogueGroup> {
  return api.post<CatalogueGroup>(ROOT, { body: input });
}

export async function updateCatalogueGroup(
  groupId: string,
  input: CatalogueGroupUpdateInput,
): Promise<CatalogueGroup> {
  return api.patch<CatalogueGroup>(apiPath(ROOT, groupId), { body: input });
}

/**
 * Every item write returns the whole group.
 *
 * The screen renders the catalogue by group, so the group is the unit the cache
 * holds. Returning just the item would leave the caller splicing it into the
 * tree, which is a second place for the two to disagree.
 */
export async function createCatalogueItem(
  groupId: string,
  input: CatalogueItemCreateInput,
): Promise<CatalogueGroup> {
  return api.post<CatalogueGroup>(apiPath(ROOT, groupId, "items"), { body: input });
}

export async function updateCatalogueItem(
  groupId: string,
  itemId: string,
  input: CatalogueItemUpdateInput,
): Promise<CatalogueGroup> {
  return api.patch<CatalogueGroup>(apiPath(ROOT, groupId, "items", itemId), {
    body: input,
  });
}

/** Refused with a 409 once a sheet has copied the item; archive it instead. */
export async function deleteCatalogueItem(
  groupId: string,
  itemId: string,
): Promise<CatalogueGroup> {
  return api.delete<CatalogueGroup>(apiPath(ROOT, groupId, "items", itemId));
}
