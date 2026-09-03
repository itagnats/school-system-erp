import type { SemesterCode } from "./common";
import type {
  EvaluationCriterion,
  Grade,
  RoleScore,
  EvaluationStatus,
} from "./evaluation";
import type { StudentSummary } from "./student";

/**
 * Individual student report (direction.md §23). The report is a projection: the
 * grade and rank are derived from the score, never stored as separate truth.
 */
export interface CriterionBreakdown {
  criterion: EvaluationCriterion;
  /** Mean rating across evaluators, normalised to 0-100. */
  score: number;
}

export interface EvaluatorFeedback {
  /** Role only. Peer comments stay unattributed by design. */
  role: RoleScore["role"];
  comment: string;
}

export interface StudentReport {
  student: StudentSummary;
  courseId: string;
  courseCode: string;
  courseName: string;
  semesterCode: SemesterCode;
  evaluationGroupName: string;

  finalScore: number;
  grade: Grade;
  /** Rank within the scope named by rankScope. */
  rank: number;
  rankOutOf: number;
  rankScope: "group" | "course-semester";

  /** Below 100 means at least one evaluator role has not submitted. */
  coveragePercent: number;
  completionStatus: EvaluationStatus;

  roleBreakdown: RoleScore[];
  criteriaBreakdown: CriterionBreakdown[];
  feedback: EvaluatorFeedback[];

  generatedAt: string;
}
