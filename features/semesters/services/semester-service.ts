import { api, apiPath } from "@/lib/api";
import {
  semesterListSchema,
  semesterSchema,
  type SemesterCreateInput,
  type SemesterUpdateInput,
} from "@/lib/api/contracts";
import type { PaginatedResult } from "@/types";
import type { SemesterListRow, SemesterQueryParams } from "../types";

export async function fetchSemesters(
  params: SemesterQueryParams,
): Promise<PaginatedResult<SemesterListRow>> {
  const raw = await api.get<unknown>("semesters", { query: { ...params } });
  return semesterListSchema.parse(raw) as PaginatedResult<SemesterListRow>;
}

export async function fetchSemester(code: string): Promise<SemesterListRow> {
  const raw = await api.get<unknown>(apiPath("semesters", code));
  return semesterSchema.parse(raw) as SemesterListRow;
}

export async function createSemester(input: SemesterCreateInput): Promise<SemesterListRow> {
  const raw = await api.post<unknown>("semesters", { body: input });
  return semesterSchema.parse(raw) as SemesterListRow;
}

export async function updateSemester(
  code: string,
  input: SemesterUpdateInput,
): Promise<SemesterListRow> {
  const raw = await api.patch<unknown>(apiPath("semesters", code), { body: input });
  return semesterSchema.parse(raw) as SemesterListRow;
}
