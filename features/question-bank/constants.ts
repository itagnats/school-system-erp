import type {
  EvaluationCriterion,
  EvaluationRole,
  Option,
  QuestionStatus,
  QuestionType,
  StatusTone,
} from "@/types";

/**
 * Question bank vocabulary (direction.md §18a).
 *
 * Here rather than inline in JSX for the reason every other feature keeps a
 * constants file: one definition, one place to change it, and two screens
 * cannot quietly disagree. `StatusBadge` knows six visual tones and nothing
 * about questions; the mapping happens here.
 */

export const QUESTION_STATUS_LABEL: Record<QuestionStatus, string> = {
  active: "Active",
  archived: "Archived",
};

export const QUESTION_STATUS_TONE: Record<QuestionStatus, StatusTone> = {
  active: "success",
  archived: "neutral",
};

export const QUESTION_STATUS_OPTIONS: Option[] = (
  ["active", "archived"] as const
).map((value) => ({ value, label: QUESTION_STATUS_LABEL[value] }));

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  rating: "Rated",
  text: "Written",
};

export const QUESTION_TYPE_DESCRIPTION: Record<QuestionType, string> = {
  rating: "Answered on the rating scale and counted towards the score.",
  text: "Answered in the evaluator's own words. Never scored — it reaches the report's feedback section.",
};

export const QUESTION_TYPE_OPTIONS: Option[] = (["rating", "text"] as const).map(
  (value) => ({ value, label: QUESTION_TYPE_LABEL[value] }),
);

/**
 * Said once on the screen, because it is the rule that explains the whole
 * domain and the one a reader is most likely to assume the opposite of.
 */
export const COPY_NOTE =
  "An evaluation takes a copy of the questions it uses. Rewording one here changes what the next evaluation asks and never what an answered one asked — which is why a question that has been used is archived rather than deleted.";

/**
 * The role and criterion words, duplicated from `features/evaluation`.
 *
 * Deliberate, and the same call `features/dashboard/constants.ts` made.
 * `AUD-012` records two feature-to-feature imports as a standing violation and
 * CLAUDE.md says not to add a third: until that is resolved, a copied string is
 * cheaper than an edge between features. These are labels, not rules - if they
 * drift, a heading reads differently on two screens, which is visible. Sharing
 * a *rule* this way would not be.
 */
export const ASSESSEE_ROLE_LABEL: Record<EvaluationRole, string> = {
  student: "Student",
  inspector: "Inspector",
  teacher: "Teacher",
  ta: "TA",
};

export const CRITERION_LABEL: Record<EvaluationCriterion, string> = {
  participation: "Participation",
  teamwork: "Teamwork",
  communication: "Communication",
  problemSolving: "Problem solving",
  responsibility: "Responsibility",
  leadership: "Leadership",
  technicalContribution: "Technical contribution",
};

export const CRITERION_NOTE =
  "A rated question feeds one of the seven criteria the score is made of. Two questions can feed the same criterion: they are two ways of asking about it, and the scale they are scored on does not change.";
