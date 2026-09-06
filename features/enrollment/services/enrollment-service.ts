import { api } from "@/lib/api";
import { enrollmentListSchema } from "@/lib/api/contracts";
import type { EnrollmentListItem, PaginatedResult } from "@/types";
import type { EnrollmentQueryParams } from "../types";

export async function fetchEnrollments(
  params: EnrollmentQueryParams,
): Promise<PaginatedResult<EnrollmentListItem>> {
  const raw = await api.get<unknown>("enrollment", { query: { ...params } });
  return enrollmentListSchema.parse(raw);
}
