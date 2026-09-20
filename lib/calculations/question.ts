import type {
  EvaluationCriterion,
  EvaluationRole,
  Question,
  QuestionGroup,
  SetupQuestion,
} from "@/types";

/**
 * Taking a setup's copy of a bank question (direction.md §18a).
 *
 * In `lib/calculations` rather than in the service because **both** the seed
 * and the server need it, and a second implementation is exactly what the rule
 * is trying to prevent: two places deciding what a setup takes would let a
 * seeded evaluation and a written one disagree about what was asked.
 */

/**
 * The snapshot. Everything a form renders becomes the setup's own; the id
 * survives only as provenance.
 */
export function copyQuestion(source: Question): SetupQuestion {
  return {
    sourceQuestionId: source.id,
    type: source.type,
    criterion: source.criterion,
    prompt: source.prompt,
    helpText: source.helpText,
  };
}

/**
 * The questions one relation asks.
 *
 * `criteria` is still what the score is made of (§18), so the rated questions
 * follow it one for one - the bank supplies the wording for a dimension that
 * was already chosen, and cannot add a dimension of its own. Written questions
 * are not tied to a criterion, so every relation that can be asked them gets
 * them: they are the "why" behind a rating, and withholding them per relation
 * would be a second configuration nobody asked for.
 *
 * Archived questions are skipped. A setup that already copied one keeps it -
 * that is the point of a copy - but nothing new picks it up.
 */
export function questionsForRelation(
  bank: readonly QuestionGroup[],
  assesseeRole: EvaluationRole,
  criteria: readonly EvaluationCriterion[],
): SetupQuestion[] {
  const askable = bank
    .filter((group) => group.status === "active")
    .flatMap((group) => group.questions)
    .filter(
      (question) =>
        question.status === "active" && question.appliesTo.includes(assesseeRole),
    );

  const rated = criteria
    .map((criterion) =>
      askable.find(
        (question) => question.type === "rating" && question.criterion === criterion,
      ),
    )
    .filter((question): question is Question => question !== undefined);

  const written = askable.filter((question) => question.type === "text");

  return [...rated, ...written].map(copyQuestion);
}

/**
 * Whether a setup's copy still says what the bank says.
 *
 * Computed on read and never stored, for the reason catalog drift is: a
 * stored comparison is a stored value that goes stale, which is the failure the
 * snapshot rule exists to avoid.
 *
 * Only the wording is compared. A question archived in the bank is not drift -
 * this setup is still entitled to have asked it.
 */
export function questionDrift(
  copy: SetupQuestion,
  source: Question | undefined,
): "none" | "reworded" | "removed" {
  if (!source) return "removed";
  return source.prompt === copy.prompt && source.helpText === copy.helpText
    ? "none"
    : "reworded";
}
