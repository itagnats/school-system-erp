import { api, apiPath } from "@/lib/api";
import { questionBankSchema } from "@/lib/api/contracts";
import type {
  QuestionCreateInput,
  QuestionGroupCreateInput,
  QuestionGroupUpdateInput,
  QuestionUpdateInput,
} from "@/lib/api/contracts";
import type { QuestionGroup } from "@/types";

const ROOT = "questions";

export interface QuestionBankQueryParams {
  search?: string;
  status?: string;
  type?: string;
  role?: string;
}

export async function fetchQuestionBank(
  params: QuestionBankQueryParams = {},
): Promise<QuestionGroup[]> {
  const raw = await api.get<unknown>(ROOT, { query: { ...params } });
  return questionBankSchema.parse(raw).groups as QuestionGroup[];
}

export async function createQuestionGroup(
  input: QuestionGroupCreateInput,
): Promise<QuestionGroup> {
  return api.post<QuestionGroup>(apiPath(ROOT, "groups"), { body: input });
}

export async function updateQuestionGroup(
  groupId: string,
  input: QuestionGroupUpdateInput,
): Promise<QuestionGroup> {
  return api.patch<QuestionGroup>(apiPath(ROOT, "groups", groupId), { body: input });
}

/**
 * Every question write returns the whole group.
 *
 * The screen renders the bank by group, so the group is the unit the cache
 * holds. Returning the question alone would leave the caller splicing it back
 * into the tree, which is a second place for the two to disagree.
 */
export async function createQuestion(input: QuestionCreateInput): Promise<QuestionGroup> {
  return api.post<QuestionGroup>(ROOT, { body: input });
}

export async function updateQuestion(
  questionId: string,
  input: QuestionUpdateInput,
): Promise<QuestionGroup> {
  return api.patch<QuestionGroup>(apiPath(ROOT, questionId), { body: input });
}

/** Refused with 409 once a setup has copied it (§18a); archive it instead. */
export async function deleteQuestion(questionId: string): Promise<QuestionGroup> {
  return api.delete<QuestionGroup>(apiPath(ROOT, questionId));
}
