import { api, apiPath } from "@/lib/api";
import {
  enrolResultSchema,
  enrollmentListSchema,
  programTermListSchema,
  studentListSchema,
} from "@/lib/api/contracts";
import type { EnrolRequestInput } from "@/lib/api/contracts";
import type {
  EnrollmentResult,
  EnrollmentListItem,
  PaginatedResult,
  ProgramTermSummary,
  StudentSummary,
} from "@/types";
import type { EnrollmentTermQueryParams, EnrollmentQueryParams } from "../types";

export async function fetchEnrollments(
  params: EnrollmentQueryParams,
): Promise<PaginatedResult<EnrollmentListItem>> {
  const raw = await api.get<unknown>("enrollment", { query: { ...params } });
  return enrollmentListSchema.parse(raw);
}

/**
 * Candidate students for the two picker paths (direction.md 7).
 *
 * The same endpoint answers both questions, which is the point: "existing
 * profile" is every student on the program, and "previous course" is that
 * list narrowed to the people who held a place in a chosen earlier semester.
 * One request shape, one contract, one component.
 *
 * Filtered by program rather than showing everyone, because a student on
 * another program would be refused by the server: offering a choice that
 * cannot be taken is worse than not offering it.
 */
export async function fetchEnrolCandidates(params: {
  program: string;
  search?: string;
  semester?: string;
}): Promise<PaginatedResult<StudentSummary>> {
  const raw = await api.get<unknown>("students", {
    query: { ...params, page: 1, pageSize: 8, sort: "studentId", direction: "asc" },
  });
  return studentListSchema.parse(raw);
}

/**
 * Enrol one student into one program term.
 *
 * The response is validated on the way in, same as a read. A write is where an
 * unchecked shape does the most damage - these rows go straight into the
 * cached roster - so it is the last place to start trusting the server.
 */
export async function enrolStudent(input: EnrolRequestInput): Promise<EnrollmentResult> {
  const raw = await api.post<unknown>("enrollment", { body: input });
  return enrolResultSchema.parse(raw);
}

/**
 * Program terms, through the enrollment lens.
 *
 * The same `/api/programs` list the curriculum screen reads, asked for by this
 * feature rather than imported from it - a shared endpoint and a shared
 * contract are common ground; another feature module is not.
 */
export async function fetchEnrollmentTerms(
  params: EnrollmentTermQueryParams,
): Promise<PaginatedResult<ProgramTermSummary>> {
  // `/api/program-terms` since 2026-09-21; `/api/programs` is the programs.
  const raw = await api.get<unknown>("program-terms", { query: { ...params } });
  return programTermListSchema.parse(raw);
}

/**
 * Withdraw a student from a program term (direction.md 8).
 *
 * DELETE, because that is the caller intent; a status change, because that is
 * what the domain does with someone who leaves. The response says how many
 * course enrollments were cancelled with it, so the screen can state the
 * consequence rather than implying a row vanished.
 */
export async function withdrawFromTerm(
  programEnrollmentId: string,
): Promise<WithdrawalResult> {
  return api.delete<WithdrawalResult>(apiPath("enrollment", programEnrollmentId));
}

export interface WithdrawalResult {
  membership: { id: string; studentId: string; status: string; updatedAt: string };
  cancelled: number;
}
