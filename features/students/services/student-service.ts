import { api, apiPath } from "@/lib/api";
import { studentListSchema } from "@/lib/api/contracts";
import type { PaginatedResult, Student, StudentSummary } from "@/types";
import type { StudentQueryParams } from "../types";

export async function fetchStudents(
  params: StudentQueryParams,
): Promise<PaginatedResult<StudentSummary>> {
  const raw = await api.get<unknown>("students", { query: { ...params } });
  return studentListSchema.parse(raw);
}

/**
 * The full profile is not parsed against a contract yet. `Student` is a deep
 * nested shape, and writing that schema belongs with the edit forms, which will
 * need it for validation anyway rather than only for checking the wire.
 */
export async function fetchStudent(studentId: string): Promise<Student> {
  return api.get<Student>(apiPath("students", studentId));
}
