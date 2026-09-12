import { api, apiPath } from "@/lib/api";
import { costSheetListSchema } from "@/lib/api/contracts";
import type { PaginatedResult } from "@/types";
import type {
  CostSheetUpdateInput,
  SheetGroupAddInput,
  SheetItemAddInput,
  SheetItemUpdateInput,
} from "@/lib/api/contracts";
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

/* -------------------------------------------------------------------------- */
/* Sheet contents (direction.md §12a)                                         */
/* -------------------------------------------------------------------------- */

/**
 * Copy a catalogue item onto the sheet.
 *
 * No price is sent. It comes from the catalogue at the moment of copying, so
 * the line's provenance is a fact rather than something the client asserted.
 */
export async function addSheetItem(
  costSheetId: string,
  input: SheetItemAddInput,
): Promise<CostSheetDetailResponse> {
  return api.post<CostSheetDetailResponse>(apiPath("costs", costSheetId, "items"), {
    body: input,
  });
}

/** Start a new, empty group on the sheet from a catalogue group. */
export async function addSheetGroup(
  costSheetId: string,
  input: SheetGroupAddInput,
): Promise<CostSheetDetailResponse> {
  return api.post<CostSheetDetailResponse>(apiPath("costs", costSheetId, "items"), {
    body: input,
  });
}

export async function updateSheetItem(
  costSheetId: string,
  itemId: string,
  input: SheetItemUpdateInput,
): Promise<CostSheetDetailResponse> {
  return api.patch<CostSheetDetailResponse>(
    apiPath("costs", costSheetId, "items", itemId),
    { body: input },
  );
}

/** Put one line back on the catalogue's current price. */
export async function realignSheetItem(
  costSheetId: string,
  itemId: string,
): Promise<CostSheetDetailResponse> {
  return api.patch<CostSheetDetailResponse>(
    `${apiPath("costs", costSheetId, "items", itemId)}?realign=1`,
    { body: {} },
  );
}

export async function removeSheetItem(
  costSheetId: string,
  itemId: string,
): Promise<CostSheetDetailResponse> {
  return api.delete<CostSheetDetailResponse>(
    apiPath("costs", costSheetId, "items", itemId),
  );
}
