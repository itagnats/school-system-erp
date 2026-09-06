import "server-only";

import { seed } from "@/data/seed";
import type {
  CostSheet,
  Course,
  Enrollment,
  EvaluationGroup,
  EvaluationSetup,
  Program,
  ProgramEnrollment,
  ProgramTerm,
  Semester,
  Student,
} from "@/types";

/**
 * The in-memory store.
 *
 * Each table is a copy of the seed taken at module load, so nothing downstream
 * can reach back and mutate the generated dataset. Repositories know about rows
 * and nothing else: no HTTP, no formatting, no business rules.
 *
 * Writes are validated and shaped by the services but never land here. That is
 * a recorded decision, not an oversight - the deploy target is serverless, so
 * there is no long-lived process to hold state, and a store shared across
 * visitors would show one visitor the edits of another. See
 * docs/decisions/why-bff.md.
 */

export const courseTable: Course[] = [...seed.courses];
export const semesterTable: Semester[] = [...seed.semesters];
export const studentTable: Student[] = [...seed.students];
export const enrollmentTable: Enrollment[] = [...seed.enrollments];
export const costSheetTable: CostSheet[] = [...seed.costSheets];
export const programTable: Program[] = [...seed.programs];
export const programTermTable: ProgramTerm[] = [...seed.programTerms];
export const programEnrollmentTable: ProgramEnrollment[] = [...seed.programEnrollments];
export const evaluationGroupTable: EvaluationGroup[] = [...seed.evaluationGroups];
export const evaluationSetupTable: EvaluationSetup[] = [...seed.evaluationSetups];
