import { api } from "@/lib/api";
import { catalogListSchema } from "@/lib/api/contracts";
import type { CatalogGroup } from "@/types";

/**
 * The catalog, read for the "Add from catalog" picker.
 *
 * A deliberate second copy of the read half of
 * `features/cost-catalog/services/catalog-service.ts` (`AUD-012`, closed
 * 2026-09-20). No feature in this application imports another; the alternative
 * was a new rung in the layering chain for one `GET`, or a carve-out that would
 * turn a one-line grep into something only memory enforces.
 *
 * The duplication is source-level only. Both copies call the same endpoint,
 * parse with the same `catalogListSchema`, and are held under the same
 * `queryKeys.catalog` entry — so they cannot return different data or fall out
 * of step. What is repeated is fifteen lines of plumbing, not a rule.
 *
 * Writes are **not** duplicated. The catalog is maintained on its own screen;
 * a cost sheet only ever reads it and then takes a copy (direction.md §12a).
 */
const ROOT = "cost-catalog";

export interface CatalogPickerParams {
  search?: string;
  status?: string;
  kind?: string;
}

export async function fetchCatalogForPicker(
  params: CatalogPickerParams = {},
): Promise<CatalogGroup[]> {
  const raw = await api.get<unknown>(ROOT, { query: { ...params } });
  return catalogListSchema.parse(raw).groups as CatalogGroup[];
}
