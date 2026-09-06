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

/**
 * Group letters, in order. Six is the practical ceiling: peer evaluation across
 * more than about forty students stops being something one cohort can do.
 */
export const EVALUATION_GROUP_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

/** `Evaluation Group A`, matching the naming in direction.md 15. */
export function evaluationGroupName(letter: string): string {
  return `Evaluation Group ${letter}`;
}

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

/**
 * What an evaluator is being asked for.
 *
 * An evaluation form has two kinds, and they are shaped differently rather than
 * being two views of one record:
 *
 *   criteria  rate ONE subject against the seven criteria
 *   ranking   put EVERY subject in scope into an order
 *
 * A single interface with an optional ordering could express both, and would
 * quietly permit a criteria evaluation with an ordering attached, or a ranking
 * with a single subject. The union makes those unrepresentable.
 */
export type EvaluationKind = "criteria" | "ranking";

/**
 * One position in a submitted ordering.
 *
 * Decided 2026-09-06 (direction.md 19): an ordering is a strict permutation.
 * Every position is used exactly once, so this is a reorderable list rather
 * than a score per subject.
 *
 * A reference design offered a 1-5 score per subject with duplicates allowed.
 * That was rejected and should not be reintroduced: a rating that permits ties
 * is a criteria rating with one dimension instead of seven, and the ordering
 * earns its own place in the blend by forcing a discrimination the ratings do
 * not.
 */
export interface RankedPeer {
  subjectEnrollmentId: string;
  /** 1-based, 1 being strongest. Positions within an ordering are distinct. */
  position: number;
}

interface EvaluationBase {
  id: string;
  courseId: string;
  semesterCode: SemesterCode;
  groupId: string;
  evaluator: Evaluator;
  overallComment?: string;
  status: EvaluationStatus;
  submittedAt?: string;
  updatedAt: string;
}

/** Ratings against the criteria, for one subject. */
export interface CriteriaEvaluation extends EvaluationBase {
  kind: "criteria";
  /** Enrollment id of the student under evaluation. */
  subjectEnrollmentId: string;
  scores: CriterionScore[];
}

/**
 * An ordering of the subjects in scope, submitted by one evaluator.
 *
 * The evaluator never appears in their own ordering: a student may not evaluate
 * themselves (direction.md §16), and ranking yourself first is the same
 * violation wearing different clothes.
 */
export interface RankingEvaluation extends EvaluationBase {
  kind: "ranking";
  ordering: RankedPeer[];
}

export type Evaluation = CriteriaEvaluation | RankingEvaluation;

/* -------------------------------------------------------------------------- */
/* Weighting (direction.md §20)                                               */
/* -------------------------------------------------------------------------- */

/**
 * One role's share of the final score, and how that share divides between the
 * two kinds of form.
 *
 * Resolved 2026-09-06: the ordering is not a fifth evaluator. Each role holds a
 * single weight, and that weight splits internally between what the role rated
 * against the criteria and how the role ordered the subjects. A teacher who
 * both rates and ranks therefore does not count twice.
 *
 * `criteriaSharePercent` is stored and the ranking share is derived from it,
 * because two stored numbers that must total 100 are two numbers that will
 * eventually disagree.
 */
export interface RoleWeight {
  role: EvaluatorRole;
  /**
   * Whether this role evaluates at all in this course-semester. A course with
   * no teaching assistant switches `ta` off, and the remaining weights are
   * renormalised rather than leaving 15% of the score unaccounted for.
   */
  enabled: boolean;
  /** Share of the final score. Enabled roles are expected to total 100. */
  weightPercent: number;
  /** Of this role's own weight, the part carried by criteria ratings. 0-100. */
  criteriaSharePercent: number;
}

/**
 * What the weight configuration adds up to.
 *
 * Every field here is derived from `RoleWeight[]` and none of it is stored: the
 * screen shows the sum, the shortfall and the effective form split so that a
 * misconfigured blend is visible before anyone submits against it.
 */
export interface WeightSummary {
  /** Sum of the enabled role weights. */
  totalPercent: number;
  /** `100 - totalPercent`. Negative when the blend is over-allocated. */
  remainingPercent: number;
  balanced: boolean;
  /** Share of the final score reaching it through criteria forms. */
  effectiveCriteriaPercent: number;
  /** Share reaching it through submitted orderings. The two total `totalPercent`. */
  effectiveRankingPercent: number;
  enabledRoleCount: number;
}

/** The window an evaluation runs in, and whether its results are out. */
export type EvaluationWindowStatus = "draft" | "open" | "closed" | "published";

/**
 * The evaluation configuration for one course-semester.
 *
 * This is the unit an administrator sets up: naming, the window, the rating
 * scale and the weight blend. Evaluation groups hang off the same
 * course-semester but are membership rather than configuration, so they are a
 * separate record.
 */
export interface EvaluationSetup {
  id: string;
  courseId: string;
  semesterCode: SemesterCode;
  /** Long form, shown as the page title. */
  name: string;
  /** Short form, used in tables and on a report header. */
  shortName: string;
  status: EvaluationWindowStatus;
  /**
   * Configuration is frozen while evaluators are submitting. Kept separate from
   * `status` because an administrator may need to reopen editing on an open
   * window to fix a weight, and that should be a deliberate, visible act.
   */
  editingLocked: boolean;
  opensOn: string;
  closesOn: string;
  /** When the individual reports become available. */
  reportDate: string;
  /** Top of the rating scale (direction.md §18). */
  scaleMax: RatingValue;
  /**
   * Instructions shown to an evaluator beside the form. Held on the setup
   * rather than hardcoded in the form component, because what an evaluator is
   * being asked to weigh up is a property of the evaluation, not of the widget.
   */
  guidance: string;
  weights: RoleWeight[];
}

/** ✓ configured · ✗ not configured · ⊘ not applicable to this course-semester. */
export type FormReadiness = "ready" | "not-configured" | "not-applicable";

/** Row shape for the Manage Evaluation table. */
export interface EvaluationSetupSummary {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  semesterCode: SemesterCode;
  status: EvaluationWindowStatus;
  shortName: string;
  /** Students enrolled in the course-semester. */
  memberCount: number;
  groupCount: number;
  /** Members not yet assigned to a group; they cannot be evaluated. */
  ungroupedCount: number;
  criteriaForm: FormReadiness;
  rankingForm: FormReadiness;
  /** Non-zero means the blend does not total 100 and the score is unsound. */
  weightRemainingPercent: number;
}

/**
 * One assessee-to-assessor relation, as Manage Evaluation renders it.
 *
 * The four roles are fixed by direction.md §16-17, so a relation is not
 * something an administrator composes. What they can change is whether the role
 * takes part and how much it is worth; the rest of this record exists so the
 * screen can show the rule and whether it is actually satisfiable.
 */
export interface EvaluationRelation {
  role: EvaluatorRole;
  enabled: boolean;
  weightPercent: number;
  criteriaSharePercent: number;
  /**
   * Assessors of this role reachable in scope. Zero on an enabled role is a
   * configuration that cannot produce a score, which is worth saying out loud.
   */
  assessorCount: number;
  /** Subjects one assessor of this role is asked about. */
  subjectsPerAssessor: number;
  /**
   * Always false, for every role. A student never evaluates themselves
   * (direction.md §16), and the field exists so the screen can render the rule
   * as a locked control rather than leave it unstated.
   */
  selfEvaluation: false;
}

/** A group as Manage Evaluation lists it. */
export interface EvaluationGroupSummary {
  id: string;
  name: string;
  memberCount: number;
  /** The group its inspectors are drawn from (direction.md §17). */
  inspectorSourceGroupName?: string;
}

export interface EvaluationSetupDetail {
  setup: EvaluationSetup;
  courseCode: string;
  courseName: string;
  groups: EvaluationGroupSummary[];
  relations: EvaluationRelation[];
  weights: WeightSummary;
  memberCount: number;
  ungroupedCount: number;
}

export interface RoleScore {
  role: EvaluatorRole;
  /** Mean of the criteria evaluations for that role, normalised to 0-100. */
  criteriaScore: number;
  /** The role's orderings converted to a 0-100 contribution. */
  rankingScore: number;
  /** Mean of the two, weighted by the role's own internal split. */
  score: number;
  weightPercent: number;
  /** score * weightPercent / 100. */
  weighted: number;
  /** How many submitted evaluations fed this figure, across both kinds. */
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
