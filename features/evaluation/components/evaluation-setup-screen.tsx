"use client";

import { useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import { Section, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { HttpError } from "@/lib/api";
import {
  addAssessee,
  removeAssessee,
  setAssessorCriteria,
  setAssessorEnabled,
  setAssessorRankingShare,
  setAssessorWeight,
  unbalancedAssessees,
} from "@/lib/calculations";
import { formatDate } from "@/lib/utils";
import { DEFAULT_ASSESSEE_CONFIG } from "@/config/app";
import { EVALUATION_CRITERIA, EVALUATION_ROLES } from "@/types";
import type {
  AssesseeConfig,
  EvaluationRole,
  EvaluationSetupDetail,
  EvaluationWindowStatus,
} from "@/types";
import { ASSESSEE_ROLE_LABEL, WINDOW_STATUS_LABEL, WINDOW_STATUS_TONE } from "../constants";
import { useUpdateEvaluationSetup } from "../hooks/use-evaluation-setups";
import { AssesseesPanel } from "./assessees-panel";

/**
 * One evaluation, configured (direction.md §14-20).
 *
 * Server-rendered data arrives as `initial`, and the screen becomes interactive
 * only for the settings that change what the score means. Everything derived -
 * the effective form split, the relation counts, whether each kind of form is
 * ready - comes back recomputed from the server rather than being recalculated
 * in the browser.
 *
 * The draft lives here rather than in each panel so that Save is one action
 * over one payload. A per-field save would let someone leave the blend
 * unbalanced between two requests, and an unbalanced blend is the one mistake
 * on this screen that nothing downstream would catch.
 */
export function EvaluationSetupScreen({
  initial,
}: Readonly<{ initial: EvaluationSetupDetail }>) {
  const mutation = useUpdateEvaluationSetup(initial.setup.id);
  const detail = mutation.data ?? initial;
  const { setup } = detail;

  const [draft, setDraft] = useState<Draft>(() => toDraft(detail));

  // A saved response replaces the draft's baseline. Comparing against the live
  // detail rather than the first render is what makes the dirty check settle
  // back to clean after a save instead of staying permanently dirty.
  const [baseline, setBaseline] = useState(() => JSON.stringify(toDraft(detail)));
  const dirty = JSON.stringify(draft) !== baseline;

  // Every assessee's blend has to balance, not just one: a setup with a sound
  // student card and a broken teacher card is still unsavable.
  const unbalanced = unbalancedAssessees(draft.assessees);
  const locked = setup.editingLocked;

  const fieldErrors =
    mutation.error instanceof HttpError ? mutation.error.fieldErrors : undefined;

  function editAssessees(next: AssesseeConfig[]) {
    setDraft((current) => ({ ...current, assessees: next }));
  }

  function save() {
    mutation.mutate(
      {
        name: draft.name,
        shortName: draft.shortName,
        status: draft.status,
        editingLocked: draft.editingLocked,
        guidance: draft.guidance,
        assessees: draft.assessees,
      },
      {
        onSuccess: (saved) => {
          const next = toDraft(saved);
          setDraft(next);
          setBaseline(JSON.stringify(next));
        },
      },
    );
  }

  return (
    <div className="grid gap-4">
      <Section
        title="Evaluation info"
        description="What this evaluation is called, when it runs, and whether its settings can still change."
        decor
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge
              tone={WINDOW_STATUS_TONE[setup.status]}
              label={WINDOW_STATUS_LABEL[setup.status]}
            />
            <Button
              size="sm"
              onClick={save}
              // An unbalanced blend is refused here as well as on the server.
              // Locking does not block Save, because unlocking is itself a save.
              disabled={!dirty || unbalanced.length > 0}
              loading={mutation.isPending}
            >
              Save changes
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            id="evaluation-name"
            label="Evaluation name"
            value={draft.name}
            error={fieldErrors?.name}
            disabled={locked}
            onValueChange={(value) => setDraft((current) => ({ ...current, name: value }))}
          />
          <Field
            id="evaluation-short-name"
            label="Short name"
            hint="Used in tables and on a report header"
            value={draft.shortName}
            error={fieldErrors?.shortName}
            disabled={locked}
            onValueChange={(value) =>
              setDraft((current) => ({ ...current, shortName: value }))
            }
          />
        </div>

        <dl className="mt-4 grid gap-3 rounded-lg border border-hairline bg-surface-sunken px-3.5 py-2.5 sm:grid-cols-4">
          <Readout label="Course" value={`${detail.courseCode} · ${setup.semesterCode}`} />
          <Readout label="Opens" value={formatDate(setup.opensOn)} />
          <Readout label="Closes" value={formatDate(setup.closesOn)} />
          <Readout label="Reports available" value={formatDate(setup.reportDate)} />
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Readout label="Rating scale" value={`1 to ${setup.scaleMax}`} />
          <Readout label="Students" value={`${detail.memberCount} in ${detail.groups.length} groups`} />
          <div className="flex items-center gap-2">
            <Switch
              id="editing-locked"
              checked={draft.editingLocked}
              onCheckedChange={(checked) =>
                setDraft((current) => ({ ...current, editingLocked: checked }))
              }
            />
            <Label htmlFor="editing-locked" className="flex items-center gap-1.5 text-sm">
              {draft.editingLocked ? (
                <Lock aria-hidden className="size-3.5" />
              ) : (
                <LockOpen aria-hidden className="size-3.5" />
              )}
              Editing locked
            </Label>
          </div>
        </div>

        {locked ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Settings are frozen while evaluators are submitting, so a score
            cannot change meaning halfway through. Unlock above to edit, and
            expect to explain why.
          </p>
        ) : null}

        {fieldErrors?.assessees ? (
          <p className="mt-3 text-xs text-error" role="alert">
            {fieldErrors.assessees}
          </p>
        ) : null}
      </Section>

      {unbalanced.length > 0 ? (
        <p className="text-xs text-error" role="alert">
          {unbalanced.map((role) => ASSESSEE_ROLE_LABEL[role]).join(", ")}
          {unbalanced.length === 1 ? " has" : " have"} assessor weights that do not
          total 100%. Each assessee is blended on its own, so a card has to
          balance before it can be saved.
        </p>
      ) : null}

      {/* The cards edit the draft; their counts come from the saved detail,
          which is why an unsaved new card shows no assessor counts yet. */}
      <AssesseesPanel
        assessees={draft.assessees}
        summaries={detail.assessees}
        groups={detail.groups}
        ungroupedCount={detail.ungroupedCount}
        disabled={locked}
        onWeightChange={(assessee, assessor, percent) =>
          editAssessees(setAssessorWeight(draft.assessees, assessee, assessor, percent))
        }
        onRankingShareChange={(assessee, assessor, percent) =>
          editAssessees(
            setAssessorRankingShare(draft.assessees, assessee, assessor, percent),
          )
        }
        onEnabledChange={(assessee, assessor, enabled) =>
          editAssessees(setAssessorEnabled(draft.assessees, assessee, assessor, enabled))
        }
        onCriteriaChange={(assessee, assessor, criteria) =>
          editAssessees(
            setAssessorCriteria(
              draft.assessees,
              assessee,
              assessor,
              criteria,
              EVALUATION_CRITERIA,
            ),
          )
        }
        onAdd={(role: EvaluationRole) =>
          editAssessees(addAssessee(draft.assessees, role, EVALUATION_ROLES))
        }
        onRemove={(role: EvaluationRole) =>
          editAssessees(removeAssessee(draft.assessees, role))
        }
        // A sound blend without opening a single control. The reference design
        // had this and the first build dropped it, which is a large part of why
        // that screen felt like work.
        onUseDefaults={() =>
          editAssessees(
            DEFAULT_ASSESSEE_CONFIG.map((assessee) => ({
              role: assessee.role,
              selfEvaluation: false as const,
              assessors: assessee.assessors.map((assessor) => ({
                ...assessor,
                criteria: [...assessor.criteria],
              })),
            })),
          )
        }
      />

    </div>
  );
}

interface Draft {
  name: string;
  shortName: string;
  status: EvaluationWindowStatus;
  editingLocked: boolean;
  guidance: string;
  assessees: AssesseeConfig[];
}

function toDraft(detail: EvaluationSetupDetail): Draft {
  const { setup } = detail;
  return {
    name: setup.name,
    shortName: setup.shortName,
    status: setup.status,
    editingLocked: setup.editingLocked,
    guidance: setup.guidance,
    // Two levels of array, so a shallow spread would have the draft and the
    // server response sharing one assessor list and one question set.
    assessees: setup.assessees.map((assessee) => ({
      ...assessee,
      assessors: assessee.assessors.map((a) => ({ ...a, criteria: [...a.criteria] })),
    })),
  };
}

function Field({
  id,
  label,
  hint,
  value,
  error,
  disabled,
  onValueChange,
}: Readonly<{
  id: string;
  label: string;
  hint?: string;
  value: string;
  error?: string;
  disabled: boolean;
  onValueChange: (value: string) => void;
}>) {
  const describedBy = describedById(id, error, hint);

  return (
    <div className="min-w-0">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onValueChange(event.target.value)}
        className="mt-1"
      />
      <FieldNote id={id} error={error} hint={hint} />
    </div>
  );
}

/** An error replaces the hint, so only one of the two is ever described. */
function describedById(id: string, error?: string, hint?: string): string | undefined {
  if (error) return `${id}-error`;
  return hint ? `${id}-hint` : undefined;
}

function FieldNote({
  id,
  error,
  hint,
}: Readonly<{ id: string; error?: string; hint?: string }>) {
  if (error) {
    return (
      <p id={`${id}-error`} className="mt-1 text-xs text-error" role="alert">
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">
        {hint}
      </p>
    );
  }
  return null;
}

function Readout({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
