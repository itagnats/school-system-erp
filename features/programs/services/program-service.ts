import { api, apiPath } from "@/lib/api";
import {
  programListSchema,
  programTermListSchema,
  type ProgramCreateInput,
  type ProgramTermCreateInput,
  type ProgramTermUpdateInput,
} from "@/lib/api/contracts";
import type {
  PaginatedResult,
  Program,
  ProgramCostSheet,
  ProgramCurriculumEntry,
  ProgramRosterEntry,
  ProgramSummary,
  ProgramTerm,
  ProgramTermSummary,
} from "@/types";
import type { ProgramQueryParams } from "../types";

/**
 * Two resources since 2026-09-21. `/api/programs` returns programs;
 * `/api/program-terms` returns terms. They shared a path while the Curriculum
 * list was a list of terms.
 */
const PROGRAMS = "programs";
const TERMS = "program-terms";

/**
 * The detail responses are not parsed against a contract: they nest the
 * roster, the curriculum and a whole cost sheet, and those schemas would be
 * written for the wire alone rather than for validating anything.
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
  curriculum: ProgramCurriculumEntry[];
  roster: ProgramRosterEntry[];
}

export interface ProgramDetailResponse {
  program: Program;
  terms: ProgramTermSummary[];
  studentCount: number;
}

/**
 * What a create hands back.
 *
 * The whole graph, because none of it can be fetched afterwards (`AUD-036`):
 * the store takes no writes, so the client caches this or the work is lost.
 */
export interface ProgramTermCreatedResponse {
  term: ProgramTerm;
  curriculum: ProgramCurriculumEntry[];
  costSheet: ProgramCostSheet;
  /** Course codes this write schedules into the semester for the first time. */
  scheduled: string[];
}

export interface ProgramCreatedResponse extends ProgramTermCreatedResponse {
  program: Program;
}

/* Programs --------------------------------------------------------------- */

export async function fetchPrograms(
  params: ProgramQueryParams,
): Promise<PaginatedResult<ProgramSummary>> {
  const raw = await api.get<unknown>(PROGRAMS, { query: { ...params } });
  return programListSchema.parse(raw) as PaginatedResult<ProgramSummary>;
}

export async function fetchProgram(programId: string): Promise<ProgramDetailResponse> {
  return api.get<ProgramDetailResponse>(apiPath(PROGRAMS, programId));
}

export async function createProgram(
  input: ProgramCreateInput,
): Promise<ProgramCreatedResponse> {
  return api.post<ProgramCreatedResponse>(PROGRAMS, { body: input });
}

/* Program terms ---------------------------------------------------------- */

export async function fetchProgramTerms(
  params: ProgramQueryParams,
): Promise<PaginatedResult<ProgramTermSummary>> {
  const raw = await api.get<unknown>(TERMS, { query: { ...params } });
  return programTermListSchema.parse(raw) as PaginatedResult<ProgramTermSummary>;
}

export async function fetchProgramTerm(id: string): Promise<ProgramTermDetailResponse> {
  return api.get<ProgramTermDetailResponse>(apiPath(TERMS, id));
}

export async function createProgramTerm(
  input: ProgramTermCreateInput,
): Promise<ProgramTermCreatedResponse> {
  return api.post<ProgramTermCreatedResponse>(TERMS, { body: input });
}

export async function updateProgramTerm(
  id: string,
  input: ProgramTermUpdateInput,
): Promise<ProgramTermDetailResponse> {
  return api.patch<ProgramTermDetailResponse>(apiPath(TERMS, id), { body: input });
}
