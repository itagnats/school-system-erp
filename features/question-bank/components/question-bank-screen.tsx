"use client";

import { useState } from "react";
import { Archive, MessageSquareText, Pencil, Plus, RotateCcw, Star, Trash2 } from "lucide-react";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/feedback";
import {
  ConfirmDialog,
  FilterBar,
  FilterSelect,
  SearchInput,
  Section,
  StatusBadge,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { EVALUATION_ROLES } from "@/types";
import type { Option, Question, QuestionGroup } from "@/types";
import {
  ASSESSEE_ROLE_LABEL,
  COPY_NOTE,
  CRITERION_LABEL,
  QUESTION_STATUS_LABEL,
  QUESTION_STATUS_OPTIONS,
  QUESTION_STATUS_TONE,
  QUESTION_TYPE_OPTIONS,
} from "../constants";
import { useQuestionBank, useQuestionMutations } from "../hooks/use-question-bank";
import { QuestionDialog } from "./question-dialog";

const ROLE_OPTIONS: Option[] = EVALUATION_ROLES.map((role) => ({
  value: role,
  label: ASSESSEE_ROLE_LABEL[role],
}));

/**
 * The question bank (direction.md §18a).
 *
 * A list of groups rather than one flat table, because the group is how the
 * bank is maintained and how a setup draws on it — the same shape the cost
 * catalog settled on, for the same reason.
 *
 * The screen leads with the copy rule. It is the one thing a reader is likely
 * to assume the opposite of: editing master data usually *does* reach
 * everything that uses it, and here it deliberately does not.
 */
export function QuestionBankScreen() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [role, setRole] = useState("all");

  const query = useQuestionBank({
    search: search || undefined,
    status: status === "all" ? undefined : status,
    type: type === "all" ? undefined : type,
    role: role === "all" ? undefined : role,
  });

  const activeFilters = [
    search !== "",
    status !== "all",
    type !== "all",
    role !== "all",
  ].filter(Boolean).length;

  return (
    <>
      <Section title="How a question reaches a form" description={COPY_NOTE} decor>
        <FilterBar
          activeCount={activeFilters}
          onClear={() => {
            setSearch("");
            setStatus("all");
            setType("all");
            setRole("all");
          }}
        >
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search prompts"
            aria-label="Search the question bank"
            className="w-full max-w-xs"
          />
          <FilterSelect
            label="Status"
            value={status}
            options={QUESTION_STATUS_OPTIONS}
            onValueChange={setStatus}
          />
          <FilterSelect
            label="Answered"
            value={type}
            options={QUESTION_TYPE_OPTIONS}
            onValueChange={setType}
          />
          <FilterSelect
            label="Asked about"
            value={role}
            options={ROLE_OPTIONS}
            onValueChange={setRole}
          />
        </FilterBar>
      </Section>

      {query.isPending ? <TableSkeleton rows={6} columns={4} /> : null}

      {query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : null}

      {query.data?.length === 0 ? (
        <Section title="Nothing here yet">
          <EmptyState
            variant={activeFilters > 0 ? "no-results" : "empty"}
            title={
              activeFilters > 0
                ? "No question matches these filters"
                : "The question bank is empty"
            }
            description={
              activeFilters > 0
                ? "Clear the filters to see everything."
                : "Write the questions evaluators will be asked, grouped by who they are about."
            }
          />
        </Section>
      ) : null}

      {query.data?.map((group) => (
        <QuestionGroupPanel key={group.id} group={group} filtered={activeFilters > 0} />
      ))}
    </>
  );
}

function QuestionGroupPanel({
  group,
  filtered,
}: Readonly<{ group: QuestionGroup; filtered: boolean }>) {
  const [dialog, setDialog] = useState<{ question?: Question } | null>(null);
  const [deleting, setDeleting] = useState<Question | null>(null);
  const mutation = useQuestionMutations();

  return (
    <Section
      title={group.name}
      description={group.description}
      actions={
        <Button size="sm" variant="outline" onClick={() => setDialog({})}>
          <Plus aria-hidden className="size-4" />
          New question
        </Button>
      }
    >
      {group.questions.length === 0 ? (
        <p className="rounded-lg border border-hairline bg-surface-sunken px-3.5 py-3 text-sm text-muted-foreground">
          {/* A group is listed even when a filter empties it, so the two cases
              have to read differently - "nothing here yet" over a group with
              nine questions in it would simply be false. */}
          {filtered
            ? "No question in this group matches the filters."
            : "No questions in this group yet."}
        </p>
      ) : (
        <ul className="grid gap-2">
          {group.questions.map((question) => (
            <QuestionRow
              key={question.id}
              question={question}
              onEdit={() => setDialog({ question })}
              onDelete={() => setDeleting(question)}
              onToggleArchive={() =>
                mutation.mutate({
                  kind: "update-question",
                  questionId: question.id,
                  input: {
                    type: question.type,
                    criterion: question.criterion,
                    prompt: question.prompt,
                    helpText: question.helpText,
                    appliesTo: question.appliesTo,
                    status: question.status === "active" ? "archived" : "active",
                  },
                })
              }
            />
          ))}
        </ul>
      )}

      <QuestionDialog
        groupId={group.id}
        groupName={group.name}
        question={dialog?.question}
        open={dialog !== null}
        onOpenChange={(open) => setDialog(open ? dialog : null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete this question?"
        description="A question any evaluation has already copied cannot be deleted — the server refuses it, and archiving is what to do instead. Deleting only works on one nothing has asked yet."
        confirmLabel="Delete question"
        tone="destructive"
        isPending={mutation.isPending}
        onConfirm={() => {
          if (!deleting) return;
          mutation.mutate(
            { kind: "delete-question", questionId: deleting.id },
            { onSettled: () => setDeleting(null) },
          );
        }}
      />
    </Section>
  );
}

function QuestionRow({
  question,
  onEdit,
  onDelete,
  onToggleArchive,
}: Readonly<{
  question: Question;
  onEdit: () => void;
  onDelete: () => void;
  onToggleArchive: () => void;
}>) {
  const archived = question.status === "archived";
  const Icon = question.type === "rating" ? Star : MessageSquareText;

  return (
    <li
      className={
        archived
          ? "rounded-lg border border-hairline bg-surface-sunken px-3.5 py-3 opacity-70"
          : "rounded-lg border border-hairline bg-card px-3.5 py-3"
      }
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

        <div className="min-w-0 flex-1">
          <p className="text-sm text-foreground">{question.prompt}</p>
          {question.helpText ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{question.helpText}</p>
          ) : null}
          <p className="mt-1.5 text-xs text-muted-foreground">
            {/* The criterion is the scoring dimension, said in words rather than
                left to the icon: a written question feeds none, and that is a
                fact about the score rather than a missing value. */}
            {question.criterion
              ? `Feeds ${CRITERION_LABEL[question.criterion]}`
              : "Not scored"}
            {" · asked about "}
            {question.appliesTo.map((role) => ASSESSEE_ROLE_LABEL[role]).join(", ")}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {archived ? (
            <StatusBadge
              tone={QUESTION_STATUS_TONE.archived}
              label={QUESTION_STATUS_LABEL.archived}
            />
          ) : null}
          <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Edit question">
            <Pencil aria-hidden className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onToggleArchive}
            aria-label={archived ? "Restore question" : "Archive question"}
          >
            {archived ? (
              <RotateCcw aria-hidden className="size-4" />
            ) : (
              <Archive aria-hidden className="size-4" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            aria-label="Delete question"
          >
            <Trash2 aria-hidden className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}
