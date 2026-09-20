"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { EnrolRequestInput } from "@/lib/api/contracts";
import { queryKeys } from "@/lib/constants";
import type { EnrollmentResult, EnrollmentListItem, PaginatedResult } from "@/types";
import { enrolStudent, fetchEnrolCandidates } from "../services/enrollment-service";

/**
 * Enrollment writes.
 *
 * The cache is **patched, never invalidated** — the same decision as
 * `use-course-mutations`, and for the same reason: the BFF validates and
 * shapes a write and then stores nothing, so a refetch would pull the seed
 * back and visibly undo the enrollment a second after it was made. That reads
 * as a bug rather than as a documented scope boundary.
 *
 * One enrollment produces several rows, which is the part that differs from
 * every other write here. They are unshifted onto the front of each cached
 * page rather than merged in sort order: the roster is sorted by student name
 * server-side, and guessing where the new rows belong would mean reimplementing
 * that comparator in the browser. On top is honest — it is where a person looks
 * for the thing they just did — and the true order returns on the next reload.
 */
export function useEnrolStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EnrolRequestInput) => enrolStudent(input),
    onSuccess: (result: EnrollmentResult) => {
      queryClient.setQueriesData<PaginatedResult<EnrollmentListItem>>(
        { queryKey: queryKeys.enrollment.all },
        (previous) => {
          if (!previous) return previous;
          // Guard against a double submit putting the same row in twice: the
          // ids are derived from student, course and semester, so a repeat
          // carries the ids that are already there.
          const existing = new Set(previous.items.map((row) => row.id));
          const added = result.enrollments.filter((row) => !existing.has(row.id));
          if (added.length === 0) return previous;
          return {
            ...previous,
            items: [...added, ...previous.items],
            total: previous.total + added.length,
          };
        },
      );

      const courses = result.enrollments.length;
      toast.success(
        `${result.student.fullName} enrolled in ${result.programName} ${result.semesterCode}`,
        { description: `${courses} course ${courses === 1 ? "enrollment" : "enrollments"} created from the curriculum` },
      );
    },
  });
}

/**
 * Students who can be enrolled into the chosen term.
 *
 * Disabled until a program is known, because "every student" is not a useful
 * list and a request for it would only be thrown away. `semester` switches the
 * question from "on this program" to "on this program last term", which is
 * the whole difference between the two picker paths.
 */
export function useEnrolCandidates(params: {
  program?: string;
  search: string;
  semester?: string;
}) {
  return useQuery({
    queryKey: queryKeys.students.list({ ...params, picker: true }),
    queryFn: () =>
      fetchEnrolCandidates({
        program: params.program ?? "",
        search: params.search,
        semester: params.semester,
      }),
    enabled: Boolean(params.program),
  });
}
