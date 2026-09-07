"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Section } from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { EvaluationAssignment, EvaluationSubject } from "@/types";

/**
 * The ranking form (direction.md §19).
 *
 * **A strict permutation — no ties.** Every position is used exactly once, so
 * this is a reorderable list rather than a score per row. That deliberately
 * diverges from the reference design, which offered a 1-5 score per subject
 * with duplicates allowed; do not "correct" it back. A rating that permits ties
 * is a 360 rating with one dimension instead of several, and the ordering earns
 * its separate place in the blend (§20) precisely by forcing a discrimination
 * the ratings do not.
 *
 * Reordering is by button, not drag. Two reasons: a drag-and-drop list needs a
 * keyboard path built alongside it or it is unusable for anyone not using a
 * mouse, and move-up/move-down *is* that path - so the buttons are the
 * accessible implementation rather than a fallback to it. Drag can be layered
 * on top later without changing the model.
 *
 * Nothing is persisted (docs/decisions/why-bff.md); the order lives in
 * component state.
 */
export function RankingForm({
  assignment,
  readOnly,
}: Readonly<{ assignment: EvaluationAssignment; readOnly: boolean }>) {
  const [order, setOrder] = useState<EvaluationSubject[]>(assignment.subjects);
  const [touched, setTouched] = useState(false);

  function move(from: number, to: number) {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    const [subject] = next.splice(from, 1);
    next.splice(to, 0, subject);
    setOrder(next);
    setTouched(true);
  }

  function reset() {
    setOrder(assignment.subjects);
    setTouched(false);
  }

  return (
    <Section
      title="Put them in order"
      description="Strongest contributor first. Every position is used exactly once — there are no ties, which is what makes an ordering worth more than another rating."
      actions={
        <Button size="sm" variant="ghost" disabled={readOnly || !touched} onClick={reset}>
          <RotateCcw aria-hidden className="size-4" />
          Reset order
        </Button>
      }
    >
      <ol className="grid gap-1.5">
        {order.map((subject, position) => (
          <li
            key={subject.id}
            className="flex items-center gap-3 rounded-lg border border-hairline bg-card px-3 py-2.5"
          >
            {/* The position is the answer, so it reads as a figure rather than
                as a list bullet. */}
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-medium text-foreground"
              data-numeric
            >
              {position + 1}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{subject.displayName}</p>
              {subject.groupName ? (
                <p className="truncate text-xs text-muted-foreground">{subject.groupName}</p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                disabled={readOnly || position === 0}
                onClick={() => move(position, position - 1)}
                aria-label={`Move ${subject.displayName} up to position ${position}`}
              >
                <ChevronUp aria-hidden className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                disabled={readOnly || position === order.length - 1}
                onClick={() => move(position, position + 1)}
                aria-label={`Move ${subject.displayName} down to position ${position + 2}`}
              >
                <ChevronDown aria-hidden className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-xs text-muted-foreground">
        <span data-numeric>{order.length}</span> subjects, each in its own position.
        You are not in this list — nobody ranks themselves.
      </p>
    </Section>
  );
}
