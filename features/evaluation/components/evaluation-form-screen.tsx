"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Section, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { DemoPersona, EvaluationAssignment } from "@/types";
import {
  ASSESSEE_ROLE_LABEL,
  EVALUATION_KIND_DESCRIPTION,
  EVALUATION_KIND_LABEL,
  EVALUATION_ROLE_LABEL,
  EVALUATION_STATUS_LABEL,
  EVALUATION_STATUS_TONE,
} from "../constants";
import { GuidancePanel } from "./guidance-panel";
import { RankingForm } from "./ranking-form";
import { ThreeSixtyForm } from "./three-sixty-form";

/**
 * One assignment, of either kind (direction.md §19).
 *
 * The two kinds share this route because they are two shapes of the same
 * obligation, not two features. What differs is what the evaluator is asked to
 * produce, so the branch is on `kind` and each form owns its own interaction.
 *
 * Submitting is shaped but stores nothing (docs/decisions/why-bff.md). The
 * button therefore acknowledges rather than persists, and says so, because a
 * Submit that silently forgets is worse than one that admits it.
 *
 * Scaffold-grade layout. Structure and states are real; the visual design is
 * being taken separately.
 */
export function EvaluationFormScreen({
  persona,
  assignment,
}: Readonly<{ persona: DemoPersona; assignment: EvaluationAssignment }>) {
  const readOnly = !assignment.windowOpen;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={routes.evaluation(persona.id)}>
            <ArrowLeft aria-hidden className="size-4" />
            Back to your queue
          </Link>
        </Button>
        <span className="text-xs text-muted-foreground">{assignment.evaluationName}</span>
      </div>

      <Section
        title={EVALUATION_KIND_LABEL[assignment.kind]}
        description={EVALUATION_KIND_DESCRIPTION[assignment.kind]}
        actions={
          <StatusBadge
            tone={EVALUATION_STATUS_TONE[assignment.status]}
            label={EVALUATION_STATUS_LABEL[assignment.status]}
          />
        }
      >
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Readout
            label="You are"
            value={`${EVALUATION_ROLE_LABEL[assignment.assessorRole]} · ${persona.displayName}`}
          />
          <Readout
            label="Assessing"
            value={`${ASSESSEE_ROLE_LABEL[assignment.assesseeRole]} · ${assignment.subjects.length} ${
              assignment.subjects.length === 1 ? "subject" : "subjects"
            }`}
          />
          <Readout
            label="Course"
            value={`${assignment.courseCode} · ${assignment.semesterCode}`}
          />
          <Readout
            label="Window"
            value={`${formatDate(assignment.opensOn)} – ${formatDate(assignment.closesOn)}`}
          />
        </dl>

        {readOnly ? (
          <p className="mt-3 text-xs text-warning-soft-foreground">
            This window has closed, so the form is read-only. Your submission
            still counts towards the score.
          </p>
        ) : null}
      </Section>

      <GuidancePanel guidance={assignment.guidance} />

      {assignment.kind === "360" ? (
        <ThreeSixtyForm assignment={assignment} readOnly={readOnly} />
      ) : (
        <RankingForm assignment={assignment} readOnly={readOnly} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-hairline bg-card px-3.5 py-3 shadow-xs">
        <p className="text-xs text-muted-foreground">
          Nothing is stored in this demo — a submission is validated and shaped,
          then discarded. Reloading starts over.
        </p>
        <Button disabled={readOnly}>Submit</Button>
      </div>
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
