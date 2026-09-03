import type { SemesterCode } from "./common";
import type { StudentSummary } from "./student";

/**
 * 360 degree evaluation (direction.md §14-22).
 *
 *   Evaluation Group -> Evaluator -> Evaluation -> Criteria Scores
 *     -> Weighted Result -> Ranking -> Grade -> Report
 *
 * Two rules are structural, not cosmetic, and belong in the evaluation feature
 * rather than in any component:
 *   - a student never evaluates themselves;
 *   - an inspector is a student drawn from a different evaluation group.
 */
export const EVALUATOR_ROLES = ["student", "inspector", "teacher", "ta"] as const;

export type EvaluatorRole = (typeof EVALUATOR_ROLES)[number];

export const EVALUATION_CRITERIA = [
  "participation",
  "teamwork",
  "communication",
  "problemSolving",
  "responsibility",
  "leadership",
  "technicalContribution",
] as const;

export type EvaluationCriterion = (typeof EVALUATION_CRITERIA)[number];

/** The 1-5 scale from direction.md §18. */
export type RatingValue = 1 | 2 | 3 | 4 | 5;

export type EvaluationStatus = "not-started" | "draft" | "submitted";

export interface EvaluationGroup {
  id: string;
  /** e.g. `Group A`. */
  name: string;
  courseId: string;
  semesterCode: SemesterCode;
  /** Enrollment ids, not student ids: membership is per course-semester. */
  memberEnrollmentIds: string[];
}

export interface Evaluator {
  role: EvaluatorRole;
  /** Enrollment id for student and inspector roles, staff id otherwise. */
  id: string;
  displayName: string;
  /** Present for inspectors, so the cross-group origin stays visible. */
  sourceGroupId?: string;
}

export interface CriterionScore {
  criterion: EvaluationCriterion;
  rating: RatingValue;
  comment?: string;
}

export interface Evaluation {
  id: string;
  courseId: string;
  semesterCode: SemesterCode;
  groupId: string;
  evaluator: Evaluator;
  /** Enrollment id of the student under evaluation. */
  subjectEnrollmentId: string;
  scores: CriterionScore[];
  overallComment?: string;
  status: EvaluationStatus;
  submittedAt?: string;
  updatedAt: string;
}

/** Configurable weighting (direction.md §20). Values are percentages. */
export type EvaluationWeights = Record<EvaluatorRole, number>;

export interface RoleScore {
  role: EvaluatorRole;
  /** Mean of the evaluations for that role, normalised to 0-100. */
  score: number;
  weightPercent: number;
  /** score * weightPercent / 100. */
  weighted: number;
  /** How many submitted evaluations fed this figure. */
  evaluationCount: number;
}

export interface ScoreResult {
  subjectEnrollmentId: string;
  roles: RoleScore[];
  /** Sum of the weighted contributions, 0-100. */
  finalScore: number;
  /** Weight actually covered by submitted evaluations, 0-100. Below 100 means
   *  the score is provisional because a role has not reported yet. */
  coveragePercent: number;
}

export type Grade = "A" | "B" | "C" | "D" | "F";

export type RankingScope = "group" | "course-semester";

export interface RankingEntry {
  rank: number;
  subjectEnrollmentId: string;
  student: StudentSummary;
  finalScore: number;
  grade: Grade;
  /** True when this entry shares its rank with another (equal scores). */
  tied: boolean;
}

export interface Ranking {
  scope: RankingScope;
  courseId: string;
  semesterCode: SemesterCode;
  /** Set when scope is `group`. */
  groupId?: string;
  entries: RankingEntry[];
}
