"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Section } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { EvaluationAssignment, EvaluationCriterion, RatingValue } from "@/types";
import { EVALUATION_CRITERION_LABEL, RATING_LABEL, RATING_VALUES } from "../constants";

/** One subject's answers: a rating per criterion, plus an optional comment. */
type SubjectAnswers = {
  ratings: Partial<Record<EvaluationCriterion, RatingValue>>;
  comment: string;
};

/**
 * The 360 form (direction.md §19).
 *
 * **One subject at a time**, stepped through rather than listed. Seven criteria
 * for each of ten people is seventy inputs, and a single scrolling page invites
 * straight-lining - the evaluator picks a column and rules down it. Asking for
 * one person's answers at a time makes each judgement its own act.
 *
 * The subject strip along the top is the position indicator and the navigation
 * both: an evaluator can see how many are left and jump to one they want to
 * revisit, which a plain Next button cannot do.
 *
 * Nothing is persisted (docs/decisions/why-bff.md). Answers live in component
 * state, so the form demonstrates its own behaviour and resets on reload.
 */
export function ThreeSixtyForm({
  assignment,
  readOnly,
}: Readonly<{ assignment: EvaluationAssignment; readOnly: boolean }>) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, SubjectAnswers>>({});

  const subjects = assignment.subjects;
  const subject = subjects[index];
  const current = answers[subject?.id ?? ""] ?? { ratings: {}, comment: "" };

  /** A subject is done when every criterion it was asked has a rating. */
  const isComplete = (subjectId: string) => {
    const entry = answers[subjectId];
    if (!entry) return false;
    return assignment.criteria.every((criterion) => entry.ratings[criterion] !== undefined);
  };

  const doneCount = subjects.filter((s) => isComplete(s.id)).length;

  function rate(criterion: EvaluationCriterion, rating: RatingValue) {
    if (!subject) return;
    setAnswers((prev) => ({
      ...prev,
      [subject.id]: {
        ratings: { ...(prev[subject.id]?.ratings ?? {}), [criterion]: rating },
        comment: prev[subject.id]?.comment ?? "",
      },
    }));
  }

  function setComment(comment: string) {
    if (!subject) return;
    setAnswers((prev) => ({
      ...prev,
      [subject.id]: { ratings: prev[subject.id]?.ratings ?? {}, comment },
    }));
  }

  if (!subject) {
    return (
      <Section title="Nothing to assess">
        <p className="text-sm text-muted-foreground">
          This form has no subjects. Nobody in scope is assessable by you.
        </p>
      </Section>
    );
  }

  return (
    <Section
      title={`Assessing ${subject.displayName}`}
      description={
        subject.groupName
          ? `${subject.groupName} · subject ${index + 1} of ${subjects.length}`
          : `Subject ${index + 1} of ${subjects.length}`
      }
      actions={
        <span className="text-xs text-muted-foreground" data-numeric>
          {doneCount} of {subjects.length} complete
        </span>
      }
    >
      {/* The subject strip: position, progress and navigation in one control. */}
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="outline"
          disabled={index === 0}
          onClick={() => setIndex((n) => Math.max(0, n - 1))}
          aria-label="Previous subject"
        >
          <ChevronLeft aria-hidden className="size-4" />
        </Button>

        <ul className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1">
          {subjects.map((entry, position) => {
            const complete = isComplete(entry.id);
            const active = position === index;
            return (
              <li key={entry.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setIndex(position)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors duration-fast",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-hairline bg-card text-muted-foreground hover:bg-muted",
                  )}
                >
                  {complete ? <Check aria-hidden className="size-3" /> : null}
                  <span className="max-w-32 truncate">{entry.displayName}</span>
                  <span className="sr-only">
                    {complete ? "complete" : "not complete"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <Button
          size="icon"
          variant="outline"
          disabled={index === subjects.length - 1}
          onClick={() => setIndex((n) => Math.min(subjects.length - 1, n + 1))}
          aria-label="Next subject"
        >
          <ChevronRight aria-hidden className="size-4" />
        </Button>
      </div>

      {/* The question set for this relation - not all seven, only what this
          assessor role is asked about this assessee (§18). */}
      <ul className="mt-4 grid gap-2.5">
        {assignment.criteria.map((criterion) => (
          <li
            key={criterion}
            className="rounded-lg border border-hairline bg-card px-3.5 py-3"
          >
            <fieldset disabled={readOnly}>
              <legend className="text-sm font-medium text-foreground">
                {EVALUATION_CRITERION_LABEL[criterion]}
              </legend>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {RATING_VALUES.map((value) => {
                  const selected = current.ratings[criterion] === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={readOnly}
                      onClick={() => rate(criterion, value)}
                      aria-pressed={selected}
                      className={cn(
                        "rounded-md border px-2.5 py-1.5 text-xs transition-colors duration-fast disabled:opacity-55",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-hairline bg-background text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {/* The number and the words together: a 4 means nothing
                          on its own, and the scale is the whole judgement. */}
                      <span data-numeric>{value}</span>{" "}
                      <span className="hidden sm:inline">{RATING_LABEL[value]}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ul>

      <div className="mt-3">
        <Label htmlFor="subject-comment" className="text-xs text-muted-foreground">
          Comment on {subject.displayName} (optional)
        </Label>
        <Textarea
          id="subject-comment"
          value={current.comment}
          disabled={readOnly}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Anything the ratings do not capture."
          className="mt-1"
          rows={3}
        />
      </div>
    </Section>
  );
}
