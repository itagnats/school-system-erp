import "server-only";

import { copyQuestion as takeCopy, questionDrift } from "@/lib/calculations";
import { evaluationSetupTable, questionGroupTable } from "@/server/repositories";
import { matchesSearch, type ListQueryInput } from "@/server/query";
import type {
  QuestionCreateInput,
  QuestionGroupCreateInput,
  QuestionGroupUpdateInput,
  QuestionUpdateInput,
} from "@/lib/api/contracts";
import type { Question, QuestionGroup, SetupQuestion } from "@/types";

/**
 * The question bank (direction.md §18a).
 *
 * A setup takes a **copy** of a question, never a reference - the same rule the
 * cost catalog follows and for the same reason. An answered question is
 * evidence of what somebody was asked, so rewording here must change what the
 * *next* setup copies and nothing else. A reference would let a report quote an
 * answer to a question that was never put.
 *
 * Writes are shaped and validated but not persisted; see docs/decisions/why-bff.md.
 */

/** Deterministic, because the seed must be identical on every process. */
const WRITE_STAMP = "2026-01-05T09:00:00.000Z";

export interface QuestionBankQuery extends ListQueryInput {
  status?: string;
  type?: string;
  /** Questions askable about this assessee role. */
  role?: string;
}

/**
 * The bank as a tree.
 *
 * Whole rather than paginated: it is a maintenance screen over a few dozen rows
 * read by group, and a page boundary that falls inside a group would split the
 * thing being edited.
 */
export function listQuestionGroups(query?: Partial<QuestionBankQuery>): QuestionGroup[] {
  const search = query?.search ?? "";

  return questionGroupTable
    .filter((group) => !query?.status || group.status === query.status)
    .map((group) => ({
      ...group,
      questions: group.questions.filter((question) => {
        if (query?.status && question.status !== query.status) return false;
        if (query?.type && question.type !== query.type) return false;
        if (query?.role && !question.appliesTo.includes(query.role as never)) return false;
        // A group matching by name keeps its questions, so searching for the
        // group heading does not return an empty group.
        if (matchesSearch(search, group.name)) return true;
        return matchesSearch(search, question.prompt, question.helpText);
      }),
    }))
    .filter(
      (group) =>
        group.questions.length > 0 ||
        matchesSearch(search, group.name, group.description),
    );
}

export function getQuestionGroup(groupId: string): QuestionGroup | undefined {
  return questionGroupTable.find((group) => group.id === groupId);
}

export function findQuestion(questionId: string): Question | undefined {
  for (const group of questionGroupTable) {
    const found = group.questions.find((question) => question.id === questionId);
    if (found) return found;
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                     */
/* -------------------------------------------------------------------------- */

export function createQuestionGroup(input: QuestionGroupCreateInput): QuestionGroup {
  return {
    id: `qg-${slug(input.name)}`,
    name: input.name,
    description: input.description,
    status: "active",
    questions: [],
    createdAt: WRITE_STAMP,
    updatedAt: WRITE_STAMP,
  };
}

export function updateQuestionGroup(
  groupId: string,
  input: QuestionGroupUpdateInput,
): QuestionGroup | undefined {
  const current = getQuestionGroup(groupId);
  if (!current) return undefined;

  return {
    ...current,
    name: input.name,
    description: input.description,
    status: input.status ?? current.status,
    updatedAt: WRITE_STAMP,
  };
}

export function createQuestion(input: QuestionCreateInput): QuestionGroup | undefined {
  const group = getQuestionGroup(input.groupId);
  if (!group) return undefined;

  const question: Question = {
    // The timestamp is frozen, so it cannot discriminate two questions written
    // in the same request - that is AUD-013, where a constant standing in for a
    // clock produced colliding ids. The position in the group does.
    id: `qn-${slug(group.name)}-${group.questions.length + 1}`,
    groupId: group.id,
    type: input.type,
    criterion: input.type === "rating" ? input.criterion : undefined,
    prompt: input.prompt,
    helpText: input.helpText,
    appliesTo: [...input.appliesTo],
    status: "active",
    createdAt: WRITE_STAMP,
    updatedAt: WRITE_STAMP,
  };

  return {
    ...group,
    questions: [...group.questions, question],
    updatedAt: WRITE_STAMP,
  };
}

export function updateQuestion(
  questionId: string,
  input: QuestionUpdateInput,
): QuestionGroup | undefined {
  const group = questionGroupTable.find((entry) =>
    entry.questions.some((question) => question.id === questionId),
  );
  if (!group) return undefined;

  return {
    ...group,
    questions: group.questions.map((question) =>
      question.id === questionId
        ? {
            ...question,
            type: input.type,
            // Cleared rather than carried when a rating question becomes a text
            // one: a criterion left behind would score an answer nobody rated.
            criterion: input.type === "rating" ? input.criterion : undefined,
            prompt: input.prompt,
            helpText: input.helpText,
            appliesTo: [...input.appliesTo],
            status: input.status ?? question.status,
            updatedAt: WRITE_STAMP,
          }
        : question,
    ),
    updatedAt: WRITE_STAMP,
  };
}

/**
 * How many setups have copied this question.
 *
 * The number behind archive-rather-than-delete (§18a). A question nothing has
 * used can go cleanly; one that has been asked cannot, because the copies on
 * those setups would point at nothing and the report could no longer say what
 * was asked.
 */
export function setupsUsingQuestion(questionId: string): number {
  const asks = (assessor: { questions?: SetupQuestion[] }) =>
    assessor.questions?.some((copy) => copy.sourceQuestionId === questionId) ?? false;

  return evaluationSetupTable.filter((setup) =>
    setup.assessees.some((assessee) => assessee.assessors.some(asks)),
  ).length;
}

export function deleteQuestion(
  questionId: string,
): QuestionGroup | { blockedBy: number } | undefined {
  const group = questionGroupTable.find((entry) =>
    entry.questions.some((question) => question.id === questionId),
  );
  if (!group) return undefined;

  const used = setupsUsingQuestion(questionId);
  if (used > 0) return { blockedBy: used };

  return {
    ...group,
    questions: group.questions.filter((question) => question.id !== questionId),
    updatedAt: WRITE_STAMP,
  };
}

export function isQuestionInUse(
  result: QuestionGroup | { blockedBy: number },
): result is { blockedBy: number } {
  return "blockedBy" in result;
}

/* -------------------------------------------------------------------------- */
/* The copy (direction.md §18a)                                               */
/* -------------------------------------------------------------------------- */

/**
 * Take a setup's copy of a question.
 *
 * Delegates to `lib/calculations`, which is where the snapshot is implemented
 * so the seed and the server cannot disagree about what a setup takes. Kept as
 * a re-export rather than a second call site, so `copyQuestion` still reads as
 * this domain's vocabulary at the point of use.
 */
export const copyQuestion = takeCopy;

/**
 * Whether a setup's copy still says what the bank says.
 *
 * The lookup half: the comparison itself is pure and lives beside the copy.
 */
export function questionDriftFor(copy: SetupQuestion): "none" | "reworded" | "removed" {
  return questionDrift(copy, findQuestion(copy.sourceQuestionId));
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
