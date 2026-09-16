"use client";

import { useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import { Section } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { HttpError } from "@/lib/api";
import {
  addAssessee,
  formReadiness,
  maxAssesseeShare,
  removeAssessee,
  setAssessorCriteria,
  setAssessorEnabled,
  setAssessorRankingShare,
  setAssessorWeight,
  unbalancedAssessees,
} from "@/lib/calculations";
import { DEFAULT_ASSESSEE_CONFIG } from "@/config/app";
import { EVALUATION_CRITERIA, EVALUATION_ROLES } from "@/types";
import type {
  AssesseeConfig,
  EvaluationRole,
  EvaluationSetupDetail,
  EvaluationWindowStatus,
} from "@/types";
import { useUpdateEvaluationSetup } from "../hooks/use-evaluation-setups";
import { AssesseesPanel } from "./assessees-panel";
import { GroupList } from "./group-list";
import { SetupSummaryBar } from "./setup-summary-bar";

/**
 * One evaluation, configured (direction.md §14-20, §15a).
 *
 * Server-rendered data arrives as `initial`, and the screen becomes interactive
 * only for the settings that change what the score means. Everything derived -
 * the effective form split, the relation counts, whether each kind of form is
 * ready - comes back recomputed from the server rather than being recalculated
 * in the browser.
 *
 * ## Three zones, one Save
 *
 * The page used to be one stack of unrelated decisions: a name beside four
 * dates that could not be edited, a lock, a blend, and a group list. It now
 * reads in the order the work happens - **what and when** (this evaluation, its
 * window, what evaluators are told), **who is assessed** (the cards), **who is
 * in it** (the groups) - with a summary bar above them answering the question
 * the list screen asks: is this ready.
 *
 * The draft lives here rather than in each panel so that Save is one action
 * over one payload. A per-field save would let someone leave the blend
 * unbalanced between two requests, and an unbalanced blend is the one mistake
 * on this screen that nothing downstream would catch.
 *
 * **The window status is not in that draft.** Opening or closing an evaluation
 * is an act with consequences for other people, not a field that waits for
 * Save, so it goes over its own request and the server checks the move against
 * `EVALUATION_WINDOW_TRANSITIONS`.
 */
export function EvaluationSetupScreen({
  initial,
}: Readonly<{ initial: EvaluationSetupDetail }>) {
  const mutation = useUpdateEvaluationSetup(initial.setup.id);
  const statusMutation = useUpdateEvaluationSetup(initial.setup.id);
  // Whichever wrote last is the live setup; both write the same cache entry.
  const detail = statusMutation.data ?? mutation.data ?? initial;
  const { setup } = detail;

  const [draft, setDraft] = useState<Draft>(() => toDraft(detail));

  // A saved response replaces the draft's baseline. Comparing against the live
  // detail rather than the first render is what makes the dirty check settle
  // back to clean after a save instead of staying permanently dirty.
  const [baseline, setBaseline] = useState(() => JSON.stringify(toDraft(detail)));
  const dirty = JSON.stringify(draft) !== baseline;

  /** Which assessee card is open. Held here so an error can open one. */
  const [openRole, setOpenRole] = useState<EvaluationRole | null>(null);

  // Every assessee's blend has to balance, not just one: a setup with a sound
  // student card and a broken teacher card is still unsavable.
  const unbalanced = unbalancedAssessees(draft.assessees);
  const locked = setup.editingLocked;

  // Readiness is read from the saved setup rather than the draft. "Ready" is a
  // claim about what evaluators would meet, and an unsaved edit has not reached
  // them - the same derivation the list screen renders, so the two agree.
  const readinessInput = {
    assesseeCount: setup.assessees.length,
    groupCount: detail.groups.length,
    isDraft: setup.status === "draft",
  };

  const fieldErrors = readFieldErrors(mutation.error) ?? readFieldErrors(statusMutation.error);

  function editAssessees(next: AssesseeConfig[]) {
    setDraft((current) => ({ ...current, assessees: next }));
  }

  function save() {
    mutation.mutate(
      {
        name: draft.name,
        shortName: draft.shortName,
        editingLocked: draft.editingLocked,
        opensOn: draft.opensOn,
        closesOn: draft.closesOn,
        reportDate: draft.reportDate,
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

  function changeStatus(status: EvaluationWindowStatus) {
    statusMutation.mutate(
      { status },
      {
        onSuccess: (saved) => {
          // The window can move the lock and the dates nowhere, but rebasing
          // keeps the draft and the live setup from drifting apart.
          const next = toDraft(saved);
          setDraft(next);
          setBaseline(JSON.stringify(next));
        },
      },
    );
  }

  return (
    <div className="grid gap-4">
      <SetupSummaryBar
        status={setup.status}
        opensOn={setup.opensOn}
        closesOn={setup.closesOn}
        reportDate={setup.reportDate}
        threeSixtyForm={formReadiness({
          ...readinessInput,
          sharePercent: maxAssesseeShare(setup.assessees, (w) => w.effective360Percent),
        })}
        rankingForm={formReadiness({
          ...readinessInput,
          sharePercent: maxAssesseeShare(setup.assessees, (w) => w.effectiveRankingPercent),
        })}
        unbalanced={unbalanced}
        ungroupedCount={detail.ungroupedCount}
        groupCount={detail.groups.length}
        dirty={dirty}
        saving={mutation.isPending}
        statusPending={statusMutation.isPending}
        onSave={save}
        onStatusChange={changeStatus}
        onShowAssessee={setOpenRole}
      />

      <Section
        title="This evaluation"
        description="What it is called, when it runs, and what evaluators are told before they start."
        decor
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

        {/* The window was three readouts sitting beside two editable fields,
            which reads as editable and was not. The server checks the order of
            these three against the stored setup, so a date that would close an
            evaluation before it opens comes back as a field error. */}
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field
            id="evaluation-opens-on"
            type="date"
            label="Opens"
            value={draft.opensOn}
            error={fieldErrors?.opensOn}
            disabled={locked}
            onValueChange={(value) => setDraft((current) => ({ ...current, opensOn: value }))}
          />
          <Field
            id="evaluation-closes-on"
            type="date"
            label="Closes"
            value={draft.closesOn}
            error={fieldErrors?.closesOn}
            disabled={locked}
            onValueChange={(value) => setDraft((current) => ({ ...current, closesOn: value }))}
          />
          <Field
            id="evaluation-report-date"
            type="date"
            label="Reports available"
            hint="On or after the day it closes"
            value={draft.reportDate}
            error={fieldErrors?.reportDate}
            disabled={locked}
            onValueChange={(value) =>
              setDraft((current) => ({ ...current, reportDate: value }))
            }
          />
        </div>

        <div className="mt-3">
          <Label htmlFor="evaluation-guidance">Guidance for evaluators</Label>
          <Textarea
            id="evaluation-guidance"
            value={draft.guidance}
            disabled={locked}
            rows={3}
            aria-invalid={fieldErrors?.guidance ? true : undefined}
            aria-describedby={
              fieldErrors?.guidance ? "evaluation-guidance-error" : "evaluation-guidance-hint"
            }
            placeholder="What to weigh up, and what to leave out."
            onChange={(event) =>
              setDraft((current) => ({ ...current, guidance: event.target.value }))
            }
            className="mt-1"
          />
          <FieldNote
            id="evaluation-guidance"
            error={fieldErrors?.guidance}
            hint="Shown beside every form in this evaluation. It was already stored and sent on save, but there was nowhere to write it."
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Readout label="Rating scale" value={`1 to ${setup.scaleMax}`} />
          <Readout label="Course" value={`${detail.courseCode} · ${setup.semesterCode}`} />
          <Readout
            label="Students"
            value={`${detail.memberCount} in ${detail.groups.length} groups`}
          />
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

      {/* The cards edit the draft; their counts come from the saved detail,
          which is why an unsaved new card shows no assessor counts yet. */}
      <AssesseesPanel
        assessees={draft.assessees}
        summaries={detail.assessees}
        disabled={locked}
        openRole={openRole}
        onOpenRoleChange={setOpenRole}
        unbalanced={unbalanced}
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

      <Section
        title="Evaluation groups"
        description="Peer assessment happens inside a group, and an inspector is drawn from the next one along. Membership is set with the cohort, not here."
      >
        <GroupList groups={detail.groups} ungroupedCount={detail.ungroupedCount} />
      </Section>
    </div>
  );
}

interface Draft {
  name: string;
  shortName: string;
  editingLocked: boolean;
  /** Date parts, which is what a date input reads and writes. */
  opensOn: string;
  closesOn: string;
  reportDate: string;
  guidance: string;
  assessees: AssesseeConfig[];
}

function toDraft(detail: EvaluationSetupDetail): Draft {
  const { setup } = detail;
  return {
    name: setup.name,
    shortName: setup.shortName,
    editingLocked: setup.editingLocked,
    opensOn: dayOf(setup.opensOn),
    closesOn: dayOf(setup.closesOn),
    reportDate: dayOf(setup.reportDate),
    guidance: setup.guidance,
    // Two levels of array, so a shallow spread would have the draft and the
    // server response sharing one assessor list and one question set.
    assessees: setup.assessees.map((assessee) => ({
      ...assessee,
      assessors: assessee.assessors.map((a) => ({ ...a, criteria: [...a.criteria] })),
    })),
  };
}

/** The store holds UTC midnight; a date input wants the day on its own. */
function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

function readFieldErrors(error: unknown): Record<string, string> | undefined {
  return error instanceof HttpError ? error.fieldErrors : undefined;
}

function Field({
  id,
  label,
  hint,
  type = "text",
  value,
  error,
  disabled,
  onValueChange,
}: Readonly<{
  id: string;
  label: string;
  hint?: string;
  type?: "text" | "date";
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
        type={type}
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

/** A stated setting that is not editable here. Plain markup: these no longer
 *  sit inside a description list, and a lone dt is not one. */
function Readout({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
