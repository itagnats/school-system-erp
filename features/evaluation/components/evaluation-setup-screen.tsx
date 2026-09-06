"use client";

import { useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import { Section, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { HttpError } from "@/lib/api";
import { setCriteriaShare, setRoleEnabled, setRoleWeight, summariseWeights } from "@/lib/calculations";
import { formatDate } from "@/lib/utils";
import type {
  EvaluationSetupDetail,
  EvaluationWindowStatus,
  EvaluatorRole,
  RoleWeight,
} from "@/types";
import { WINDOW_STATUS_LABEL, WINDOW_STATUS_TONE } from "../constants";
import { useUpdateEvaluationSetup } from "../hooks/use-evaluation-setups";
import { RelationsPanel } from "./relations-panel";
import { WeightBlendPanel } from "./weight-blend-panel";

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

  const summary = summariseWeights(draft.weights);
  const locked = setup.editingLocked;

  const fieldErrors =
    mutation.error instanceof HttpError ? mutation.error.fieldErrors : undefined;

  function editWeights(next: RoleWeight[]) {
    setDraft((current) => ({ ...current, weights: next }));
  }

  function save() {
    mutation.mutate(
      {
        name: draft.name,
        shortName: draft.shortName,
        status: draft.status,
        editingLocked: draft.editingLocked,
        guidance: draft.guidance,
        weights: draft.weights,
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
              disabled={!dirty || !summary.balanced}
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

        {fieldErrors?.weights ? (
          <p className="mt-3 text-xs text-error" role="alert">
            {fieldErrors.weights}
          </p>
        ) : null}
      </Section>

      <WeightBlendPanel
        weights={draft.weights}
        disabled={locked}
        onWeightChange={(role: EvaluatorRole, percent: number) =>
          editWeights(setRoleWeight(draft.weights, role, percent))
        }
        onShareChange={(role: EvaluatorRole, percent: number) =>
          editWeights(setCriteriaShare(draft.weights, role, percent))
        }
        onEnabledChange={(role: EvaluatorRole, enabled: boolean) =>
          editWeights(setRoleEnabled(draft.weights, role, enabled))
        }
      />

      {!summary.balanced ? (
        <p className="text-xs text-error" role="alert">
          The blend totals {Number(summary.totalPercent.toFixed(2))}%. It has to
          total 100% before it can be saved, or every score in this course is
          scaled by the same mistake.
        </p>
      ) : null}

      {/* Relations read the saved configuration, not the draft: the assessor
          counts come from the server and would be stale against unsaved edits. */}
      <RelationsPanel
        relations={detail.relations}
        weights={detail.setup.weights}
        groups={detail.groups}
        ungroupedCount={detail.ungroupedCount}
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
  weights: RoleWeight[];
}

function toDraft(detail: EvaluationSetupDetail): Draft {
  const { setup } = detail;
  return {
    name: setup.name,
    shortName: setup.shortName,
    status: setup.status,
    editingLocked: setup.editingLocked,
    guidance: setup.guidance,
    weights: setup.weights.map((weight) => ({ ...weight })),
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
