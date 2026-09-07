import type { SemesterCode } from "./common";
import type { StudentSummary } from "./student";

/**
 * 360 degree evaluation (direction.md §14-22).
 *
 *   Evaluation Group -> Assessee <- Assessor -> Evaluation -> Criteria Scores
 *     -> Weighted Result -> [Ranking -> Grade] -> Report
 *
 * The four roles sit on **both** sides of that arrow, which is the correction
 * made on 2026-09-06: an assessee is not always a student. A teacher can be
 * assessed by their students, and a TA by both. So these are evaluation roles,
 * not evaluator roles - a role is a position in the evaluation, and the same
 * value names an assessee in one relation and an assessor in another.
 *
 * Three rules are structural, not cosmetic:
 *   - no *person* ever assesses themselves, whatever their role. A matching
 *     pair of roles is not the same thing: student assessing student is peer
 *     assessment, and it is the centre of the feature;
 *   - an inspector is a student drawn from a different evaluation group;
 *   - ranking and grade apply to student assessees only. A teacher gets a
 *     feedback report, not a position in a leaderboard and not a letter.
 */
export const EVALUATION_ROLES = ["student", "inspector", "teacher", "ta"] as const;

export type EvaluationRole = (typeof EVALUATION_ROLES)[number];

/**
 * Whether a role's result carries through to a rank and a grade.
 *
 * Student only (direction.md §21-22). Grading a teacher against a cohort of
 * students would be arithmetic without a meaning, so a non-student assessee
 * stops at the score and its report.
 */
export function isGradedRole(role: EvaluationRole): boolean {
  return role === "student";
}

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
  role: EvaluationRole;
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
 *   360      rate ONE subject against the criteria your role is asked
 *   ranking  put EVERY subject in scope into an order
 *
 * The first is called the **360 form**, not the "criteria form". All four roles
 * take it - a teacher assesses a student, and students assess each other - and
 * what differs between them is which questions they are asked, not the kind of
 * form. Naming it after the criteria described the mechanism and hid the point.
 *
 * A single interface with an optional ordering could express both, and would
 * quietly permit a 360 evaluation with an ordering attached, or a ranking with
 * a single subject. The union makes those unrepresentable.
 */
export type EvaluationKind = "360" | "ranking";

/**
 * One position in a submitted ordering.
 *
 * Decided 2026-09-06 (direction.md 19): an ordering is a strict permutation.
 * Every position is used exactly once, so this is a reorderable list rather
 * than a score per subject.
 *
 * A reference design offered a 1-5 score per subject with duplicates allowed.
 * That was rejected and should not be reintroduced: a rating that permits ties
 * is a 360 rating with one dimension instead of several, and the ordering
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

/**
 * A 360 assessment of one subject, against the criteria this evaluator's role
 * is asked about.
 *
 * `scores` covers that role's own question set (see `RoleConfig.criteria`), not
 * all seven, so the length varies by evaluator.
 */
export interface ThreeSixtyEvaluation extends EvaluationBase {
  kind: "360";
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

export type Evaluation = ThreeSixtyEvaluation | RankingEvaluation;

/* -------------------------------------------------------------------------- */
/* Weighting (direction.md §20)                                               */
/* -------------------------------------------------------------------------- */

/**
 * One assessor role inside one assessee's relation set: what it is worth, how
 * that worth divides between the two kinds of form, and which questions it is
 * asked.
 *
 * Nested under an assessee rather than held once per setup, because the blend
 * is per assessee. Students are assessed by peers, an inspector, the teacher
 * and the TA; a teacher is assessed by students and the TA, at completely
 * different weights. One flat list could not express both.
 *
 * Resolved 2026-09-06: an ordering is not a fifth assessor. Each assessor role
 * holds a single weight, and that weight splits internally between the 360 form
 * it filled in and the ordering it submitted, so an assessor that does both
 * counts once.
 */
export interface AssessorConfig {
  role: EvaluationRole;
  /**
   * Whether this role assesses this assessee at all. A course with no teaching
   * assistant switches `ta` off, and the remaining weights are renormalised
   * rather than leaving 15% of the score unaccounted for.
   */
  enabled: boolean;
  /**
   * Share of this assessee's score. The enabled assessors of one assessee are
   * expected to total 100 - which is why the weight meter in the reference
   * design sits inside each card rather than once at the top of the screen.
   */
  weightPercent: number;
  /**
   * Of this assessor's own weight, the part carried by its submitted ordering.
   * 0-100. The 360 share is the complement and is never stored, because two
   * stored numbers that must total 100 will eventually disagree.
   */
  rankingSharePercent: number;
  /**
   * The criteria this assessor is asked about this assessee - its question set.
   *
   * Per relation, not per role: what a student is asked about another student
   * is not what a student is asked about their teacher, even though both are
   * drawn from the one canonical list (§18).
   */
  criteria: EvaluationCriterion[];
}

/**
 * One assessee role, and everyone who assesses it.
 *
 * This is the card in Manage Evaluation: pick the assessee, then toggle the
 * assessors. Added and removed per setup, so a course can run a student-only
 * evaluation or add upward feedback on its teacher without either affecting
 * the other.
 */
export interface AssesseeConfig {
  role: EvaluationRole;
  /**
   * Whether a person may assess themselves. Always false, for every role.
   *
   * Decided 2026-09-06, and a deliberate divergence from the reference design,
   * which allowed it per assessee: a self-score folded into a graded result is
   * a fairness problem, and keeping the rule absolute keeps every score
   * comparable.
   *
   * This is about the person, not the role - peers share a role and assess each
   * other freely. Typed as the literal so the field can be rendered as a locked
   * control with its reason rather than left unstated.
   */
  selfEvaluation: false;
  assessors: AssessorConfig[];
}

/**
 * What the weight configuration adds up to.
 *
 * Computed per assessee, from its own `AssessorConfig[]`. Every field is derived
 * and none is stored: the card shows the sum, the shortfall and the effective
 * form split so that a misconfigured blend is visible before anyone submits
 * against it.
 */
export interface WeightSummary {
  /** Sum of this assessee's enabled assessor weights. */
  totalPercent: number;
  /** `100 - totalPercent`. Negative when the blend is over-allocated. */
  remainingPercent: number;
  balanced: boolean;
  /** Share of the final score reaching it through 360 forms. */
  effective360Percent: number;
  /** Share reaching it through submitted orderings. The two total `totalPercent`. */
  effectiveRankingPercent: number;
  enabledAssessorCount: number;
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
  /**
   * Who is assessed, and by whom. One entry per assessee role.
   *
   * An empty list is a setup that assesses nobody - valid as a draft, and
   * reported as not configured rather than treated as an error.
   */
  assessees: AssesseeConfig[];
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
  /** How many assessee roles this evaluation covers. Zero is not set up. */
  assesseeCount: number;
  /** Which roles are assessed, for the row to name them rather than count them. */
  assesseeRoles: EvaluationRole[];
  threeSixtyForm: FormReadiness;
  rankingForm: FormReadiness;
  /**
   * Assessees whose assessor weights do not total 100.
   *
   * A count rather than a percentage, because the blend is per assessee and a
   * single figure could not say which card is wrong. Non-zero means at least
   * one assessee's score is scaled by a mistake nothing downstream would catch.
   */
  unbalancedAssesseeCount: number;
}

/**
 * One assessee-to-assessor relation, as Manage Evaluation renders it.
 *
 * Keyed by the pair. The four roles are fixed by direction.md §16, so which
 * roles *exist* is not configurable - but which pairs are in play is, and that
 * is the card: pick the assessee, toggle the assessors.
 *
 * The counts are what turn this from a restatement of the rules into something
 * worth looking at: an enabled assessor with nobody to do the assessing cannot
 * contribute, and the subject count is what reveals that every peer has been
 * asked for thirty ratings.
 */
export interface EvaluationRelation {
  assesseeRole: EvaluationRole;
  assessorRole: EvaluationRole;
  enabled: boolean;
  weightPercent: number;
  rankingSharePercent: number;
  /** The criteria this assessor is asked about this assessee. */
  criteria: EvaluationCriterion[];
  /**
   * Assessors of this role reachable in scope. Zero on an enabled relation is a
   * configuration that cannot produce a score, which is worth saying out loud.
   */
  assessorCount: number;
  /** Subjects one assessor of this role is asked about. */
  subjectsPerAssessor: number;
}

/** One assessee card: the role, its blend, and its assessor relations. */
export interface AssesseeSummary {
  role: EvaluationRole;
  /** Always false. Rendered as a locked control, not omitted. */
  selfEvaluation: false;
  /** Whether this assessee's result carries through to a rank and a grade. */
  graded: boolean;
  /** How many of this role are actually being assessed in this course-semester. */
  subjectCount: number;
  weights: WeightSummary;
  relations: EvaluationRelation[];
  /**
   * Assessor roles weighted for the 360 form with an empty question set.
   *
   * The blend can total 100 and this assessee still be unscoreable, because an
   * empty question set contributes nothing to the half it is paid for.
   */
  assessorsMissingQuestions: EvaluationRole[];
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
  /** One entry per assessee card, each carrying its own blend and relations. */
  assessees: AssesseeSummary[];
  memberCount: number;
  ungroupedCount: number;
}

export interface RoleScore {
  role: EvaluationRole;
  /**
   * Mean of that role's 360 assessments, normalised to 0-100.
   *
   * Normalised over the criteria the role was actually asked, not all seven, so
   * a role with a shorter question set is not penalised for the questions it
   * never saw.
   */
  threeSixtyScore: number;
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

/* -------------------------------------------------------------------------- */
/* Your Evaluation: who you are, and what you owe                             */
/* -------------------------------------------------------------------------- */

/**
 * A demo identity (direction.md 14).
 *
 * There is no sign-in, so "you" comes from a persona switcher. That is what
 * makes the four roles and the no-self-assessment rule visible rather than
 * merely described: a reader can act as a student, look at their queue, and see
 * that they are not in it.
 *
 * A persona is a role **in a course-semester**, not a bare role, because what
 * you owe depends on which cohort you belong to.
 */
export interface DemoPersona {
  id: string;
  role: EvaluationRole;
  displayName: string;
  /**
   * Enrollment id for a student or inspector; a synthetic staff id for a
   * teacher or TA, since this demo has no staff table.
   */
  subjectId: string;
  courseId: string;
  courseCode: string;
  semesterCode: SemesterCode;
  /** The group they belong to, or for an inspector the group they inspect. */
  groupId?: string;
  groupName?: string;
}

/** One person an assignment asks about. */
export interface EvaluationSubject {
  id: string;
  displayName: string;
  /** Present for students, so a peer list reads as a group. */
  groupName?: string;
}

/**
 * What one persona owes on one form.
 *
 * An assignment is per (setup, assessee role, form kind), not per subject: the
 * 360 form steps through its subjects one at a time and a ranking orders all of
 * them at once, so both are one piece of work with one submit.
 *
 * The evaluator never appears in `subjects`. That is the no-self-assessment
 * rule enforced where people are rather than where roles are (direction.md 16).
 */
export interface EvaluationAssignment {
  id: string;
  setupId: string;
  evaluationName: string;
  shortName: string;
  courseId: string;
  courseCode: string;
  semesterCode: SemesterCode;
  kind: EvaluationKind;
  /** The role being assessed. */
  assesseeRole: EvaluationRole;
  /** The persona's own role in this relation. */
  assessorRole: EvaluationRole;
  subjects: EvaluationSubject[];
  /** Criteria asked on a 360 form. Empty for a ranking. */
  criteria: EvaluationCriterion[];
  scaleMax: RatingValue;
  guidance: string;
  opensOn: string;
  closesOn: string;
  /** False once the window has closed; the form is then read-only. */
  windowOpen: boolean;
  /**
   * Subjects finished so far.
   *
   * Seeded deterministically rather than stored, because writes are not
   * persisted (docs/decisions/why-bff.md). A queue of uniform zeros would show
   * none of the states the screen has to handle, so progress is derived from
   * the assignment id - stable across reloads, varied across rows.
   */
  completedCount: number;
  status: EvaluationStatus;
}

/** The queue: who you are, and everything you owe. */
export interface EvaluationQueue {
  persona: DemoPersona;
  assignments: EvaluationAssignment[];
}
