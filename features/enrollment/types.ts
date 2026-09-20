import type {
  EnrollmentStatus,
  ListQuery,
  ProgramTermStatus,
  SemesterCode,
} from "@/types";

export interface EnrollmentQueryParams extends ListQuery {
  /** Enrollment is entered at the program level (direction.md §7a). */
  programId?: string;
  courseId?: string;
  semester?: SemesterCode;
  status?: EnrollmentStatus;
  evaluationGroupId?: string;
}

/**
 * The program term list, which is now the enrollment screen itself
 * (decided 2026-09-16). Same endpoint as the curriculum screen, narrower
 * question: which terms are taking students, and how many have they got.
 */
export interface EnrollmentTermQueryParams extends ListQuery {
  status?: ProgramTermStatus;
  semester?: SemesterCode;
}
