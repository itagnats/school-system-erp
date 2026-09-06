import { api } from "@/lib/api";
import { costSheetListSchema } from "@/lib/api/contracts";
import type { PaginatedResult } from "@/types";
import type { CostQueryParams, CostSheetRow } from "../types";

export async function fetchCostSheets(
  params: CostQueryParams,
): Promise<PaginatedResult<CostSheetRow>> {
  const raw = await api.get<unknown>("costs", { query: { ...params } });
  return costSheetListSchema.parse(raw) as PaginatedResult<CostSheetRow>;
}
