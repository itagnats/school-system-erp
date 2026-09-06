import type { EnrollmentStatus, ListQuery, SemesterCode } from "@/types";

export interface EnrollmentQueryParams extends ListQuery {
  /** Enrolment is entered at the programme level (direction.md §7a). */
  programId?: string;
  courseId?: string;
  semester?: SemesterCode;
  status?: EnrollmentStatus;
  evaluationGroupId?: string;
}
