import type { SemesterCode } from "./common";
import type {
  EvaluationCriterion,
  EvaluationRole,
  Grade,
  ScoreResult,
} from "./evaluation";
import type { StudentSummary } from "./student";

/**
 * The individual report (direction.md §23).
 *
 * A projection, start to finish: the score, the grade, the rank and the pass
 * outcome are all derived from the submitted ratings, and none of them is
 * stored. Regenerating the report from the same submissions must produce the
 * same document.
 */

/** One criterion's figures, as the report's Part 1 table renders them. */
export interface CriterionBreakdown {
  criterion: EvaluationCriterion;
  /**
   * Always null, and rendered as a dash.
   *
   * The reference report has a Self column and every cell in it is empty,
   * because nobody assesses themselves (§16). Keeping the column and leaving it
   * dashed states the rule; dropping it would leave a reader wondering whether
   * self-assessment happened and simply was not shown.
   */
  selfScore: null;
  /** Mean across every assessor that rated this criterion, on the rating scale. */
  score: number | null;
  /** How many ratings that mean is built from. */
  ratingCount: number;
}

/**
 * One comment, attributed to a role and not to a person.
 *
 * Peer comments stay unattributed by design: a student who can identify who
 * said what is a student who will trade favourable ratings with their friends,
 * and the whole peer component stops measuring anything.
 */
export interface EvaluatorFeedback {
  role: EvaluationRole;
  comment: string;
}

/** A row of the results table, before anyone opens a report. */
export interface EvaluationResultRow {
  subjectId: string;
  displayName: string;
  assesseeRole: EvaluationRole;
  /** Present for students; staff assessees are not in a group. */
  groupName?: string;
  /**
   * The plain mean of every rating received, unweighted.
   *
   * Shown beside the calculated score so the weighting is visible as a
   * difference rather than asserted. When the two diverge, the blend is doing
   * something, and a reader can see what.
   */
  rawScore: number | null;
  /** The §20 weighted blend - the score that counts. */
  calculatedScore: number | null;
  percent: number | null;
  /** Student assessees only (§22). */
  grade: Grade | null;
  passed: boolean | null;
  /** Below 100 means a role has not reported and the score is provisional. */
  coveragePercent: number;
}

export interface EvaluationResults {
  setupId: string;
  evaluationName: string;
  shortName: string;
  courseCode: string;
  courseName: string;
  semesterCode: SemesterCode;
  scaleMax: number;
  passThreshold: number;
  rows: EvaluationResultRow[];
}

export interface StudentReport {
  /** Present for a student assessee; absent for a teacher or TA. */
  student?: StudentSummary;
  /**
   * The evaluation setup this report belongs to.
   *
   * A report is only identified by the pair - one subject has one per cohort -
   * so carrying the setup id means a list of somebody's reports can be keyed
   * and opened without threading a second value alongside each document.
   */
  setupId: string;
  subjectId: string;
  displayName: string;
  assesseeRole: EvaluationRole;

  courseId: string;
  courseCode: string;
  courseName: string;
  semesterCode: SemesterCode;
  evaluationName: string;
  shortName: string;
  evaluationGroupName?: string;

  /**
   * The rating scale the figures below sit on.
   *
   * Carried on the report rather than looked up beside it, because every reader
   * of a score needs it: "4.08" is not a result until something says out of
   * what. Added 2026-09-19 when a student's own list of reports needed to print
   * the denominator, and it also fixed the radar, whose radius was a literal 5
   * and would have flattered any setup scored on a different scale.
   */
  scaleMax: number;

  score: ScoreResult;
  rawScore: number | null;

  /** Rank within the scope named below. Student assessees only (§21). */
  rank?: number;
  rankOutOf?: number;
  rankScope?: "group" | "course-semester";

  criteriaBreakdown: CriterionBreakdown[];
  feedback: EvaluatorFeedback[];

  /** Fixed, not the clock: a report regenerated tomorrow must not differ. */
  generatedAt: string;
}
