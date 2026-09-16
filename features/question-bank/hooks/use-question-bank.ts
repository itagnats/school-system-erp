"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HttpError } from "@/lib/api";
import { queryKeys } from "@/lib/constants";
import type {
  QuestionCreateInput,
  QuestionGroupCreateInput,
  QuestionGroupUpdateInput,
  QuestionUpdateInput,
} from "@/lib/api/contracts";
import type { QuestionGroup } from "@/types";
import {
  createQuestion,
  createQuestionGroup,
  deleteQuestion,
  fetchQuestionBank,
  updateQuestion,
  updateQuestionGroup,
  type QuestionBankQueryParams,
} from "../services/question-service";

export function useQuestionBank(params: QuestionBankQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.questions.list(params),
    queryFn: () => fetchQuestionBank(params),
  });
}

/**
 * Every question-bank write (direction.md §18a).
 *
 * One hook, because they share a cache update: each returns the affected group,
 * and the screen holds the bank as a list of groups. Only the message differs.
 *
 * The response is written into the cache rather than invalidated. The BFF
 * stores nothing, so a refetch would return the seed and undo the change a
 * second after it was made (docs/decisions/why-bff.md).
 */
export type QuestionAction =
  | { kind: "create-group"; input: QuestionGroupCreateInput }
  | { kind: "update-group"; groupId: string; input: QuestionGroupUpdateInput }
  | { kind: "create-question"; input: QuestionCreateInput }
  | { kind: "update-question"; questionId: string; input: QuestionUpdateInput }
  | { kind: "delete-question"; questionId: string };

const ACTION_MESSAGE: Record<QuestionAction["kind"], string> = {
  "create-group": "Question group created",
  "update-group": "Question group updated",
  "create-question": "Question added",
  "update-question": "Question updated",
  "delete-question": "Question deleted",
};

export function useQuestionMutations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (action: QuestionAction) => runAction(action),
    onSuccess: (group, action) => {
      writeGroupIntoCache(queryClient, group, action.kind === "create-group");
      toast.success(ACTION_MESSAGE[action.kind]);
    },
    onError: (error) => {
      // A refusal carries its reason on a field, and the dialog shows it there;
      // a toast repeating it makes the page noisier rather than clearer. A 409
      // has no field to land on, so that one does get said out loud.
      if (error instanceof HttpError && error.fieldErrors) return;
      if (error instanceof HttpError && error.status === 409) {
        toast.error(
          "An evaluation has already copied that question. Archive it instead of deleting it.",
        );
        return;
      }
      toast.error("That change could not be applied. Please try again.");
    },
  });
}

function runAction(action: QuestionAction): Promise<QuestionGroup> {
  switch (action.kind) {
    case "create-group":
      return createQuestionGroup(action.input);
    case "update-group":
      return updateQuestionGroup(action.groupId, action.input);
    case "create-question":
      return createQuestion(action.input);
    case "update-question":
      return updateQuestion(action.questionId, action.input);
    case "delete-question":
      return deleteQuestion(action.questionId);
  }
}

/** Replace one group in every cached bank query, or append a new one. */
function writeGroupIntoCache(
  queryClient: ReturnType<typeof useQueryClient>,
  group: QuestionGroup,
  isNew: boolean,
) {
  queryClient.setQueriesData<QuestionGroup[]>(
    { queryKey: queryKeys.questions.all },
    (cached) => {
      if (!Array.isArray(cached)) return cached;
      if (isNew) return [...cached, group];
      return cached.map((entry) => (entry.id === group.id ? group : entry));
    },
  );
}
