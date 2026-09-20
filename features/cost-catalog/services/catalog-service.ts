import { api, apiPath } from "@/lib/api";
import { catalogListSchema } from "@/lib/api/contracts";
import type {
  CatalogGroupCreateInput,
  CatalogGroupUpdateInput,
  CatalogItemCreateInput,
  CatalogItemUpdateInput,
} from "@/lib/api/contracts";
import type { CatalogGroup } from "@/types";

const ROOT = "cost-catalog";

export interface CatalogQueryParams {
  search?: string;
  status?: string;
  kind?: string;
}

export async function fetchCatalog(
  params: CatalogQueryParams = {},
): Promise<CatalogGroup[]> {
  const raw = await api.get<unknown>(ROOT, { query: { ...params } });
  return catalogListSchema.parse(raw).groups as CatalogGroup[];
}

export async function createCatalogGroup(
  input: CatalogGroupCreateInput,
): Promise<CatalogGroup> {
  return api.post<CatalogGroup>(ROOT, { body: input });
}

export async function updateCatalogGroup(
  groupId: string,
  input: CatalogGroupUpdateInput,
): Promise<CatalogGroup> {
  return api.patch<CatalogGroup>(apiPath(ROOT, groupId), { body: input });
}

/**
 * Every item write returns the whole group.
 *
 * The screen renders the catalog by group, so the group is the unit the cache
 * holds. Returning just the item would leave the caller splicing it into the
 * tree, which is a second place for the two to disagree.
 */
export async function createCatalogItem(
  groupId: string,
  input: CatalogItemCreateInput,
): Promise<CatalogGroup> {
  return api.post<CatalogGroup>(apiPath(ROOT, groupId, "items"), { body: input });
}

export async function updateCatalogItem(
  groupId: string,
  itemId: string,
  input: CatalogItemUpdateInput,
): Promise<CatalogGroup> {
  return api.patch<CatalogGroup>(apiPath(ROOT, groupId, "items", itemId), {
    body: input,
  });
}

/** Refused with a 409 once a sheet has copied the item; archive it instead. */
export async function deleteCatalogItem(
  groupId: string,
  itemId: string,
): Promise<CatalogGroup> {
  return api.delete<CatalogGroup>(apiPath(ROOT, groupId, "items", itemId));
}
