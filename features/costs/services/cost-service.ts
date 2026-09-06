import { api, apiPath } from "@/lib/api";
import { costSheetListSchema } from "@/lib/api/contracts";
import type { PaginatedResult } from "@/types";
import type { CostSheetUpdateInput } from "@/lib/api/contracts";
import type { CostQueryParams, CostSheetDetailResponse, CostSheetRow } from "../types";

export async function fetchCostSheets(
  params: CostQueryParams,
): Promise<PaginatedResult<CostSheetRow>> {
  const raw = await api.get<unknown>("costs", { query: { ...params } });
  return costSheetListSchema.parse(raw) as PaginatedResult<CostSheetRow>;
}

export async function fetchCostSheet(costSheetId: string): Promise<CostSheetDetailResponse> {
  return api.get<CostSheetDetailResponse>(apiPath("costs", costSheetId));
}

/**
 * Adjust markup, head count or status.
 *
 * The response carries the recomputed breakdown rather than an acknowledgement,
 * so the screen renders figures the server derived instead of deriving them
 * again in the browser.
 */
export async function updateCostSheet(
  costSheetId: string,
  input: CostSheetUpdateInput,
): Promise<CostSheetDetailResponse> {
  return api.patch<CostSheetDetailResponse>(apiPath("costs", costSheetId), {
    body: input,
  });
}
