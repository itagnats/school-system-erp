"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Section } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { EvaluationAssignment, EvaluationCriterion, RatingValue } from "@/types";
import { RatingScale } from "./rating-scale";
import { SubjectAvatar } from "./subject-avatar";

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
 * one person's answers at a time makes each judgment its own act.
 *
 * The subject strip along the top is the position indicator and the navigation
 * both: an evaluator can see how many are left and jump to one they want to
 * revisit, which a plain Next button cannot do.
 *
 * Nothing is persisted (docs/decisions/why-bff.md). Answers live in component
 * state, so the form demonstrates its own behavior and resets on reload.
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

  /**
   * Record a rating, or clear it when the slider is dragged back to zero.
   *
   * Clearing matters: the button row this replaced had no way to undo an
   * accidental tap, so a mis-click was permanent for that criterion.
   */
  function rate(criterion: EvaluationCriterion, rating: RatingValue | undefined) {
    if (!subject) return;
    setAnswers((prev) => {
      const ratings = { ...(prev[subject.id]?.ratings ?? {}) };
      if (rating === undefined) delete ratings[criterion];
      else ratings[criterion] = rating;
      return {
        ...prev,
        [subject.id]: { ratings, comment: prev[subject.id]?.comment ?? "" },
      };
    });
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
      title={
        <span className="flex items-center gap-2">
          <SubjectAvatar displayName={subject.displayName} />
          <span>Assessing {subject.displayName}</span>
        </span>
      }
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
                    "flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1 text-xs transition-colors duration-fast",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-hairline bg-card text-muted-foreground hover:bg-muted",
                  )}
                >
                  <SubjectAvatar displayName={entry.displayName} size="sm" />
                  <span className="max-w-28 truncate">{entry.displayName}</span>
                  {complete ? <Check aria-hidden className="size-3" /> : null}
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
            <RatingScale
              criterion={criterion}
              value={current.ratings[criterion]}
              scaleMax={assignment.scaleMax}
              disabled={readOnly}
              onChange={(rating) => rate(criterion, rating)}
            />
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
