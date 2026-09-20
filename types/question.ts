import type { EvaluationCriterion, EvaluationRole } from "./evaluation";

/**
 * The question bank (direction.md §18a).
 *
 * A criterion is a scoring dimension; a question is how an evaluator is asked
 * about one. The distinction is the whole point of this domain: `teamwork` is
 * what the score is made of, and "How reliably did they carry their share of
 * the group's work?" is what somebody reads.
 */

/**
 * Archived rather than deleted, once a setup has copied it.
 *
 * The same rule the cost catalog follows (§12a). A setup holds copies and
 * would survive the delete; its provenance would not, and "what was this person
 * actually asked" is the question the bank exists to answer.
 */
export type QuestionStatus = "active" | "archived";

/**
 * What kind of answer a question collects.
 *
 * `rating` feeds a criterion on the 1-`scaleMax` scale. `text` is not scored at
 * all - it has no criterion, never enters the blend of §20, and reaches the
 * report's Feedback part attributed to a role rather than a person (§23).
 */
export type QuestionType = "rating" | "text";

export interface Question {
  id: string;
  groupId: string;
  type: QuestionType;
  /**
   * The scoring dimension this question feeds.
   *
   * Required on a `rating` question and absent on a `text` one, which is what
   * makes "a question is wording over a criterion, never a new dimension"
   * (§18a) a property of the data rather than a convention.
   */
  criterion?: EvaluationCriterion;
  /** What the evaluator reads. */
  prompt: string;
  /** What separates a low answer from a high one. Optional; shown beside the prompt. */
  helpText?: string;
  /**
   * Which assessee roles this question can be asked about.
   *
   * Empty is not allowed: a question nobody can be asked is not a draft, it is
   * a mistake. What a student is asked about a peer differs from what they are
   * asked about their teacher (§18), and this is where that lives.
   */
  appliesTo: EvaluationRole[];
  status: QuestionStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * A maintained set of questions, e.g. "Assessing a student".
 *
 * Grouped because that is how the bank is read and edited, the same shape the
 * cost catalog settled on: a flat table sorted by group looks tidier and
 * loses the thing being maintained.
 */
export interface QuestionGroup {
  id: string;
  name: string;
  description?: string;
  status: QuestionStatus;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

/**
 * One question as a setup holds it: a copy, not a reference (§18a).
 *
 * `sourceQuestionId` is provenance and nothing more. Everything a form renders
 * is on this record, so rewording the bank cannot change what a submitted
 * answer was asked.
 */
export interface SetupQuestion {
  sourceQuestionId: string;
  type: QuestionType;
  criterion?: EvaluationCriterion;
  prompt: string;
  helpText?: string;
}
