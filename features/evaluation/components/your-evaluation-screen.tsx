"use client";

import Link from "next/link";
import { CalendarClock, ListOrdered, SquareCheckBig } from "lucide-react";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/feedback";
import { Section, StatusBadge } from "@/components/shared";
import { routes } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { EvaluationAssignment } from "@/types";
import {
  ASSESSEE_ROLE_LABEL,
  EVALUATION_KIND_LABEL,
  EVALUATION_STATUS_LABEL,
  EVALUATION_STATUS_TONE,
} from "../constants";
import { useEvaluationQueue, usePersonaParam, usePersonas } from "../hooks/use-persona";
import { PersonaSwitcher } from "./persona-switcher";

/**
 * Your Evaluation: the evaluator's own queue (direction.md §14, §19).
 *
 * The counterpart to Manage Evaluation, split by perspective rather than by
 * feature. Everything here is derived from the setup configuration, so the two
 * screens cannot disagree - switch a role off over there and its queue empties
 * here, with no second place to update.
 *
 * Scaffold-grade layout. The structure and the states are real; the visual
 * design is being taken separately.
 */
export function YourEvaluationScreen({
  signedInPersonaId,
}: Readonly<{ signedInPersonaId?: string }>) {
  const { personaId, setPersona } = usePersonaParam(signedInPersonaId);
  const personas = usePersonas();
  const queue = useEvaluationQueue(personaId);

  const activePersona = queue.data?.persona;

  return (
    <div className="grid gap-4">
      <Section
        title="Acting as"
        description="This opens as the role you signed in with. Switching here changes only what you are asked to assess, not what the rest of the application will let you open."
      >
        <PersonaSwitcher
          personas={personas.data ?? []}
          personaId={personaId ?? activePersona?.id}
          onChange={setPersona}
        />

        {activePersona ? (
          <dl className="mt-3 grid gap-3 rounded-lg border border-hairline bg-surface-sunken px-3.5 py-2.5 sm:grid-cols-4">
            <Readout label="Role" value={ASSESSEE_ROLE_LABEL[activePersona.role]} />
            <Readout label="Name" value={activePersona.displayName} />
            <Readout
              label="Course"
              value={`${activePersona.courseCode} · ${activePersona.semesterCode}`}
            />
            <Readout label="Group" value={activePersona.groupName ?? "Not in a group"} />
          </dl>
        ) : null}
      </Section>

      <Section
        title="Assigned to you"
        description="One card per form. A 360 form steps through its subjects; a ranking orders all of them at once."
      >
        {renderQueue(queue, personaId)}
      </Section>
    </div>
  );
}

function renderQueue(
  queue: ReturnType<typeof useEvaluationQueue>,
  personaId?: string,
) {
  if (queue.isPending) return <TableSkeleton rows={4} />;

  if (queue.error) {
    return <ErrorState error={queue.error} onRetry={() => queue.refetch()} />;
  }

  const assignments = queue.data?.assignments ?? [];
  if (assignments.length === 0) {
    return (
      <EmptyState
        variant="empty"
        title="Nothing is assigned to you"
        description="This role is not switched on as an assessor in any open evaluation for this course and semester. Try another persona, or check the setup under Manage Evaluation."
      />
    );
  }

  return (
    <ul className="grid gap-2.5">
      {assignments.map((assignment) => (
        <AssignmentCard
          key={assignment.id}
          assignment={assignment}
          personaId={personaId ?? queue.data?.persona.id}
        />
      ))}
    </ul>
  );
}

function AssignmentCard({
  assignment,
  personaId,
}: Readonly<{ assignment: EvaluationAssignment; personaId?: string }>) {
  const total = assignment.subjects.length;
  const Icon = assignment.kind === "ranking" ? ListOrdered : SquareCheckBig;

  return (
    <li className="rounded-lg border border-hairline bg-card px-3.5 py-3 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Icon aria-hidden className="size-4 text-muted-foreground" />
            <Link
              href={routes.evaluationAssignment(assignment.id, personaId)}
              className="rounded-sm text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              {EVALUATION_KIND_LABEL[assignment.kind]}
            </Link>
            <span className="text-xs text-muted-foreground">
              on the {ASSESSEE_ROLE_LABEL[assignment.assesseeRole]}
            </span>
            <StatusBadge
              tone={EVALUATION_STATUS_TONE[assignment.status]}
              label={EVALUATION_STATUS_LABEL[assignment.status]}
            />
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            {assignment.courseCode} · {assignment.semesterCode} · {assignment.shortName}
          </p>

          <p className="mt-1.5 text-xs text-muted-foreground">
            <span data-numeric>
              {assignment.completedCount} of {total}
            </span>{" "}
            {total === 1 ? "subject" : "subjects"} done
            {assignment.kind === "360" && assignment.criteria.length > 0 ? (
              <>
                {" · "}
                <span data-numeric>{assignment.criteria.length}</span> criteria each
              </>
            ) : null}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
            <CalendarClock aria-hidden className="size-3.5" />
            {assignment.windowOpen
              ? `Closes ${formatDate(assignment.closesOn)}`
              : `Closed ${formatDate(assignment.closesOn)}`}
          </p>
          {!assignment.windowOpen ? (
            // A closed window is read-only. Saying so on the card saves opening
            // a form only to find every control disabled.
            <p className="mt-1 text-xs text-warning-soft-foreground">Read-only</p>
          ) : null}
        </div>
      </div>

      <Progress done={assignment.completedCount} total={total} />
    </li>
  );
}

/**
 * How far through an assignment you are.
 *
 * A meter rather than a progressbar: this is a measurement against a known
 * range, not a task advancing on its own.
 */
function Progress({ done, total }: Readonly<{ done: number; total: number }>) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div
      role="meter"
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuetext={`${done} of ${total} subjects done`}
      aria-label="Progress"
      className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-normal ease-standard"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function Readout({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
