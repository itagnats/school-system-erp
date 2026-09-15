import { api, apiPath } from "@/lib/api";
import { costSheetListSchema, programCostListSchema } from "@/lib/api/contracts";
import type { PaginatedResult } from "@/types";
import type {
  CostSheetUpdateInput,
  ProgramCostSheetUpdateInput,
  SheetGroupAddInput,
  SheetItemAddInput,
  SheetItemUpdateInput,
} from "@/lib/api/contracts";
import type {
  CostQueryParams,
  CostSheetDetailResponse,
  CostSheetRow,
  ProgramCostQueryParams,
  ProgramCostRow,
  ProgramCostSheetDetailResponse,
} from "../types";

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

/* -------------------------------------------------------------------------- */
/* Programme cost sheets (direction.md §11, §13)                              */
/* -------------------------------------------------------------------------- */

export async function fetchProgramCostSheet(
  programTermId: string,
): Promise<ProgramCostSheetDetailResponse> {
  return api.get<ProgramCostSheetDetailResponse>(
    apiPath("program-costs", programTermId),
  );
}

/**
 * Change the markup, the rounding step, the driver or the status.
 *
 * All four are programme-level (§13). The response carries the whole costing
 * recomputed — every course's share, every total — because all of them move
 * when the markup does, and re-deriving them here would be the cost formula
 * written a second time in the browser.
 */
export async function updateProgramCostSheet(
  programTermId: string,
  input: ProgramCostSheetUpdateInput,
): Promise<ProgramCostSheetDetailResponse> {
  return api.patch<ProgramCostSheetDetailResponse>(
    apiPath("program-costs", programTermId),
    { body: input },
  );
}

export async function fetchProgramCostSheets(
  params: ProgramCostQueryParams,
): Promise<PaginatedResult<ProgramCostRow>> {
  const raw = await api.get<unknown>("program-costs", { query: { ...params } });
  // Validated on the way in as well as on the way out: not trusting either
  // direction is the demonstration (scaffold.md 10).
  return programCostListSchema.parse(raw);
}
