import { api, apiPath } from "@/lib/api";
import {
  evaluationSetupListSchema,
  type EvaluationSetupUpdateInput,
} from "@/lib/api/contracts";
import type {
  EvaluationSetupDetail,
  EvaluationSetupSummary,
  PaginatedResult,
} from "@/types";
import type { EvaluationSetupFilters } from "../types";

/**
 * Client-side callers for the evaluation endpoints.
 *
 * The list response is parsed against the contract; the detail response is not.
 * The detail nests groups, relations and a derived weight summary, and a schema
 * for it would exist only to re-check numbers the server has just computed. The
 * contract earns its keep on the request instead, which is the direction the
 * untrusted data travels.
 */

export async function fetchEvaluationSetups(
  filters: EvaluationSetupFilters,
): Promise<PaginatedResult<EvaluationSetupSummary>> {
  const raw = await api.get<unknown>("evaluation", { query: { ...filters } });
  return evaluationSetupListSchema.parse(raw) as PaginatedResult<EvaluationSetupSummary>;
}

export async function fetchEvaluationSetup(id: string): Promise<EvaluationSetupDetail> {
  return api.get<EvaluationSetupDetail>(apiPath("evaluation", id));
}

export async function updateEvaluationSetup(
  id: string,
  input: EvaluationSetupUpdateInput,
): Promise<EvaluationSetupDetail> {
  return api.patch<EvaluationSetupDetail>(apiPath("evaluation", id), { body: input });
}
