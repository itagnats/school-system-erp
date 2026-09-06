import { api, apiPath } from "@/lib/api";
import { semesterListSchema, semesterSchema } from "@/lib/api/contracts";
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
