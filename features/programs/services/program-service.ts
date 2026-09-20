import { api, apiPath } from "@/lib/api";
import { programTermListSchema, type ProgramTermUpdateInput } from "@/lib/api/contracts";
import type { PaginatedResult, ProgramTermSummary } from "@/types";
import type { ProgramQueryParams } from "../types";

/**
 * The detail response is not parsed against a contract: it nests the roster and
 * the curriculum, and writing that schema belongs with the curriculum editor
 * that will need it for validation rather than only for checking the wire.
 *
 * `profit` left this shape on 2026-09-20 (direction.md 13a). The curriculum
 * screen is academic; what a term earned is read under Cost Management.
 */
export interface ProgramTermDetailResponse {
  program: { id: string; code: string; name: string; credential: string; description: string };
  term: {
    id: string;
    programId: string;
    semesterCode: string;
    courseIds: string[];
    packagePrice: number;
    currency: string;
    status: "planning" | "open" | "closed";
  };
  curriculum: import("@/types").ProgramCurriculumEntry[];
  roster: import("@/types").ProgramRosterEntry[];
}

export async function fetchProgramTerms(
  params: ProgramQueryParams,
): Promise<PaginatedResult<ProgramTermSummary>> {
  const raw = await api.get<unknown>("programs", { query: { ...params } });
  return programTermListSchema.parse(raw) as PaginatedResult<ProgramTermSummary>;
}

export async function fetchProgramTerm(id: string): Promise<ProgramTermDetailResponse> {
  return api.get<ProgramTermDetailResponse>(apiPath("programs", id));
}

export async function updateProgramTerm(
  id: string,
  input: ProgramTermUpdateInput,
): Promise<ProgramTermDetailResponse> {
  return api.patch<ProgramTermDetailResponse>(apiPath("programs", id), { body: input });
}
