import type {
  EnrollmentStatus,
  ListQuery,
  ProgramTermStatus,
  SemesterCode,
} from "@/types";

export interface EnrollmentQueryParams extends ListQuery {
  /** Enrolment is entered at the programme level (direction.md §7a). */
  programId?: string;
  courseId?: string;
  semester?: SemesterCode;
  status?: EnrollmentStatus;
  evaluationGroupId?: string;
}

/**
 * The programme term list, which is now the enrolment screen itself
 * (decided 2026-09-16). Same endpoint as the curriculum screen, narrower
 * question: which terms are taking students, and how many have they got.
 */
export interface EnrolmentTermQueryParams extends ListQuery {
  status?: ProgramTermStatus;
  semester?: SemesterCode;
}
