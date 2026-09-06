import type { EnrollmentStatus, ListQuery, SemesterCode } from "@/types";

export interface EnrollmentQueryParams extends ListQuery {
  courseId?: string;
  semester?: SemesterCode;
  status?: EnrollmentStatus;
  evaluationGroupId?: string;
}
