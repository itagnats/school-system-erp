"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HttpError } from "@/lib/api";
import { EVALUATION_CRITERIA, EVALUATION_ROLES } from "@/types";
import type {
  EvaluationCriterion,
  EvaluationRole,
  Question,
  QuestionType,
} from "@/types";
import {
  ASSESSEE_ROLE_LABEL,
  CRITERION_LABEL,
  CRITERION_NOTE,
  QUESTION_TYPE_DESCRIPTION,
} from "../constants";
import { useQuestionMutations } from "../hooks/use-question-bank";

/**
 * Write or reword one question (direction.md §18a).
 *
 * One dialog for both, because the fields are identical and only their starting
 * values differ; a separate edit dialog is the same form with one more chance
 * to drift.
 *
 * The criterion field appears for a rated question and disappears for a written
 * one, rather than being disabled: a written question does not have a criterion
 * that happens to be uneditable, it has none at all. The server refuses both
 * mistakes, so what is shown here follows the rule rather than replacing it.
 */
export function QuestionDialog({
  groupId,
  groupName,
  question,
  open,
  onOpenChange,
}: Readonly<{
  groupId: string;
  groupName: string;
  /** Absent when writing a new one. */
  question?: Question;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {/* Keyed, so opening on a different question mounts a fresh form rather
            than copying new values over old ones in an effect. */}
        <QuestionForm
          key={`${question?.id ?? "new"}-${String(open)}`}
          groupId={groupId}
          groupName={groupName}
          question={question}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function QuestionForm({
  groupId,
  groupName,
  question,
  onDone,
}: Readonly<{
  groupId: string;
  groupName: string;
  question?: Question;
  onDone: () => void;
}>) {
  const mutation = useQuestionMutations();

  const [type, setType] = useState<QuestionType>(question?.type ?? "rating");
  const [criterion, setCriterion] = useState<EvaluationCriterion>(
    question?.criterion ?? "teamwork",
  );
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [helpText, setHelpText] = useState(question?.helpText ?? "");
  const [appliesTo, setAppliesTo] = useState<EvaluationRole[]>(
    question?.appliesTo ?? ["student"],
  );

  const fieldErrors =
    mutation.error instanceof HttpError ? mutation.error.fieldErrors : undefined;

  function toggleRole(role: EvaluationRole, checked: boolean) {
    setAppliesTo((current) =>
      checked ? [...current, role] : current.filter((entry) => entry !== role),
    );
  }

  function submit() {
    const shared = {
      type,
      // Sent as undefined rather than omitted for a written question, so the
      // server clears any criterion an earlier rated version carried.
      criterion: type === "rating" ? criterion : undefined,
      prompt: prompt.trim(),
      helpText: helpText.trim() === "" ? undefined : helpText.trim(),
      appliesTo,
    };

    mutation.mutate(
      question
        ? { kind: "update-question", questionId: question.id, input: { ...shared, status: question.status } }
        : { kind: "create-question", input: { ...shared, groupId } },
      { onSuccess: onDone },
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{question ? "Edit question" : "New question"}</DialogTitle>
        <DialogDescription>
          In {groupName}. This is the sentence an evaluator reads.
        </DialogDescription>
      </DialogHeader>

      <form
        id="question-form"
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field id="question-prompt" label="Prompt" error={fieldErrors?.prompt}>
          <Textarea
            id="question-prompt"
            rows={2}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="How reliably did they carry their share of the work?"
            aria-invalid={fieldErrors?.prompt ? true : undefined}
          />
        </Field>

        <Field
          id="question-help"
          label="Help text"
          hint="Optional. What separates a low answer from a high one."
          error={fieldErrors?.helpText}
        >
          <Input
            id="question-help"
            value={helpText}
            onChange={(event) => setHelpText(event.target.value)}
            aria-invalid={fieldErrors?.helpText ? true : undefined}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="question-type">Answered</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as QuestionType)}
            >
              <SelectTrigger id="question-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Rated — counts towards the score</SelectItem>
                <SelectItem value="text">Written — never scored</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {QUESTION_TYPE_DESCRIPTION[type]}
            </p>
          </div>

          {type === "rating" ? (
            <div className="grid gap-1.5">
              <Label htmlFor="question-criterion">Feeds the criterion</Label>
              <Select
                value={criterion}
                onValueChange={(value) => setCriterion(value as EvaluationCriterion)}
              >
                <SelectTrigger id="question-criterion">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVALUATION_CRITERIA.map((entry) => (
                    <SelectItem key={entry} value={entry}>
                      {CRITERION_LABEL[entry]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors?.criterion ? (
                <p className="text-xs text-error" role="alert">
                  {fieldErrors.criterion}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">{CRITERION_NOTE}</p>
              )}
            </div>
          ) : null}
        </div>

        <fieldset className="grid gap-1.5">
          <legend className="text-sm font-medium text-foreground">
            Can be asked about
          </legend>
          <p className="text-xs text-muted-foreground">
            Which role this question makes sense about. What a student is asked
            about a peer is not what they are asked about their teacher.
          </p>
          <div className="mt-1 flex flex-wrap gap-4">
            {EVALUATION_ROLES.map((role) => (
              <div key={role} className="flex items-center gap-2">
                <Checkbox
                  id={`applies-${role}`}
                  checked={appliesTo.includes(role)}
                  onCheckedChange={(checked) => toggleRole(role, checked === true)}
                />
                <Label htmlFor={`applies-${role}`} className="text-sm font-normal">
                  {ASSESSEE_ROLE_LABEL[role]}
                </Label>
              </div>
            ))}
          </div>
          {fieldErrors?.appliesTo ? (
            <p className="text-xs text-error" role="alert">
              {fieldErrors.appliesTo}
            </p>
          ) : null}
        </fieldset>
      </form>

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" form="question-form" loading={mutation.isPending}>
          {question ? "Save question" : "Add question"}
        </Button>
      </DialogFooter>
    </>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: Readonly<{
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}>) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <FieldNote error={error} hint={hint} />
    </div>
  );
}

/** An error replaces the hint, so only one of the two is ever shown. */
function FieldNote({ error, hint }: Readonly<{ error?: string; hint?: string }>) {
  if (error) {
    return (
      <p className="text-xs text-error" role="alert">
        {error}
      </p>
    );
  }
  if (hint) return <p className="text-xs text-muted-foreground">{hint}</p>;
  return null;
}
