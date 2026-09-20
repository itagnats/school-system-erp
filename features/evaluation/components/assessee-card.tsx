"use client";

import { useState } from "react";
import { ChevronDown, Lock, Trash2, TriangleAlert } from "lucide-react";
import { ConfirmDialog, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { summarizeWeights, threeSixtySharePercent } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import type {
  AssesseeConfig,
  AssesseeSummary,
  AssessorConfig,
  EvaluationCriterion,
  EvaluationRole,
} from "@/types";
import {
  ASSESSEE_ROLE_LABEL,
  EVALUATION_ROLE_DESCRIPTION,
  EVALUATION_ROLE_LABEL,
} from "../constants";
import { CriteriaPicker } from "./criteria-picker";
import { WeightMeter } from "./weight-meter";

/**
 * One assessee, and everyone who assesses it (direction.md §16, §20).
 *
 * **The card picks the assessee; the toggles pick the assessors.** That is the
 * shape the reference design uses and the shape the domain needs - an assessee
 * is a role, so a student, a teacher and a TA each get a card with its own
 * blend totalling 100.
 *
 * Collapsed by default. The first version rendered every control at once and
 * put 88 of them on the setup page, 56 being criteria checkboxes nobody had
 * asked to see. Collapsed, a card is one scannable line: who is assessed, by
 * whom, whether the blend balances. Expanded, the arithmetic is all still there
 * - direction.md §20 requires the calculation to be visible, so the detail is
 * tucked, never removed.
 */
export function AssesseeCard({
  config,
  summary,
  expanded,
  balanced,
  disabled,
  onToggleExpanded,
  onWeightChange,
  onRankingShareChange,
  onEnabledChange,
  onCriteriaChange,
  onRemove,
}: Readonly<{
  config: AssesseeConfig;
  /** Server-computed counts. Absent for a card added but not yet saved. */
  summary?: AssesseeSummary;
  expanded: boolean;
  /** Whether this card's own blend totals 100. Shown on the card, not only above it. */
  balanced: boolean;
  disabled: boolean;
  onToggleExpanded: () => void;
  onWeightChange: (assessor: EvaluationRole, percent: number) => void;
  onRankingShareChange: (assessor: EvaluationRole, percent: number) => void;
  onEnabledChange: (assessor: EvaluationRole, enabled: boolean) => void;
  onCriteriaChange: (assessor: EvaluationRole, criteria: EvaluationCriterion[]) => void;
  onRemove: () => void;
}>) {
  const weights = summarizeWeights(config.assessors);
  const label = ASSESSEE_ROLE_LABEL[config.role];
  const active = config.assessors.filter((assessor) => assessor.enabled);
  const bodyId = `assessee-${config.role}-detail`;

  // Removing a card discards its weights and every question set on it, and the
  // only way back is Use defaults, which discards the other cards too. That is
  // enough loss to ask first.
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  return (
    <li
      className={cn(
        "overflow-hidden rounded-lg border bg-card shadow-xs",
        // The card carries its own error, so a collapsed list shows which one
        // to open rather than only that something is wrong somewhere.
        balanced ? "border-hairline" : "border-error/40",
      )}
    >
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-controls={bodyId}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1.5 py-1 text-left transition-colors duration-fast hover:bg-muted"
        >
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-fast ease-standard",
              expanded ? "rotate-0" : "-rotate-90",
            )}
          />

          <span className="shrink-0 text-sm font-medium text-foreground">{label}</span>

          {/* Who assesses this role, at a glance. The word, not an arrow: a
              glyph pointing backwards asked the reader to learn a convention
              to read a sentence two characters could state. */}
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            assessed by{" "}
            {active.length === 0
              ? "nobody yet"
              : active.map((a) => EVALUATION_ROLE_LABEL[a.role]).join(" · ")}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {weights.balanced ? (
            <span className="text-xs text-muted-foreground" data-numeric>
              100%
            </span>
          ) : (
            <span className="text-xs font-medium text-error" data-numeric>
              {formatShortfall(weights.remainingPercent)}
            </span>
          )}
          <StatusBadge
            tone={summary?.graded ? "info" : "neutral"}
            label={summary?.graded ? "Graded" : "Feedback"}
          />
          <Button
            size="icon"
            variant="ghost"
            disabled={disabled}
            onClick={() => setConfirmingRemove(true)}
            aria-label={`Stop assessing the ${label}`}
          >
            <Trash2 aria-hidden className="size-4" />
          </Button>
        </div>
      </div>

      {expanded ? (
        <div id={bodyId} className="border-t border-hairline px-3.5 py-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {EVALUATION_ROLE_DESCRIPTION[config.role]}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {summary ? (
                  <>
                    <span data-numeric>{summary.subjectCount}</span>{" "}
                    {summary.subjectCount === 1 ? "subject" : "subjects"} ·{" "}
                  </>
                ) : null}
                <span data-numeric>{weights.effective360Percent}%</span> via the 360 form,{" "}
                <span data-numeric>{weights.effectiveRankingPercent}%</span> via an
                ordering
              </p>
            </div>
            <WeightMeter
              totalPercent={weights.totalPercent}
              remainingPercent={weights.remainingPercent}
              balanced={weights.balanced}
              label="Assessor weight"
              className="sm:w-56"
            />
          </div>

          <ul className="mt-3 grid gap-1.5">
            {config.assessors.map((assessor) => (
              <AssessorRow
                key={assessor.role}
                assesseeRole={config.role}
                assessor={assessor}
                relation={summary?.relations.find((r) => r.assessorRole === assessor.role)}
                disabled={disabled}
                onWeightChange={onWeightChange}
                onRankingShareChange={onRankingShareChange}
                onEnabledChange={onEnabledChange}
                onCriteriaChange={onCriteriaChange}
              />
            ))}
          </ul>

          {/* Stated once per card rather than once per assessor row, which is
              where it was noise. §16, and never configurable. */}
          <p className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock aria-hidden className="size-3 shrink-0" />
            <span>
              No self-assessment — the {label} is never among its own assessors
            </span>
          </p>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmingRemove}
        onOpenChange={setConfirmingRemove}
        title={`Stop assessing the ${label}?`}
        description={`This card's assessor weights and question sets go with it. Nothing is saved until you save the setup, so the ${label} can be added back — but it comes back with the defaults, not with what was here.`}
        confirmLabel={`Remove ${label}`}
        tone="destructive"
        onConfirm={() => {
          setConfirmingRemove(false);
          onRemove();
        }}
      />
    </li>
  );
}

function AssessorRow({
  assesseeRole,
  assessor,
  relation,
  disabled,
  onWeightChange,
  onRankingShareChange,
  onEnabledChange,
  onCriteriaChange,
}: Readonly<{
  assesseeRole: EvaluationRole;
  assessor: AssessorConfig;
  relation?: AssesseeSummary["relations"][number];
  disabled: boolean;
  onWeightChange: (assessor: EvaluationRole, percent: number) => void;
  onRankingShareChange: (assessor: EvaluationRole, percent: number) => void;
  onEnabledChange: (assessor: EvaluationRole, enabled: boolean) => void;
  onCriteriaChange: (assessor: EvaluationRole, criteria: EvaluationCriterion[]) => void;
}>) {
  const formShare = threeSixtySharePercent(assessor);
  const label = EVALUATION_ROLE_LABEL[assessor.role];
  const assesseeLabel = ASSESSEE_ROLE_LABEL[assesseeRole];
  const off = !assessor.enabled;
  const unsatisfiable = assessor.enabled && relation?.assessorCount === 0;
  const rowId = `${assesseeRole}-by-${assessor.role}`;

  return (
    <li
      className={cn(
        "rounded-md border border-hairline bg-background px-2.5 py-2",
        off && "opacity-55",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Switch
            id={`${rowId}-enabled`}
            checked={assessor.enabled}
            disabled={disabled}
            onCheckedChange={(checked) => onEnabledChange(assessor.role, checked)}
          />
          <Label htmlFor={`${rowId}-enabled`} className="truncate text-sm">
            {label}
          </Label>
        </div>

        {off ? (
          <span className="text-xs text-muted-foreground">Not assessing</span>
        ) : (
          <>
            <PercentField
              id={`${rowId}-weight`}
              suffix="of score"
              label={`Weight: what the ${label} contributes to the ${assesseeLabel} score`}
              value={assessor.weightPercent}
              disabled={disabled}
              onValueChange={(value) => onWeightChange(assessor.role, value)}
            />
            {/* Named "of that" rather than "ranked" because it is a share of the
                row's own weight, not a second share of the score - which is the
                single most misread number on this screen (§20). */}
            <PercentField
              id={`${rowId}-ranking`}
              suffix="of that, ranked"
              label={`Of the ${label} weight, how much comes from the ordering rather than the 360 form`}
              value={assessor.rankingSharePercent}
              disabled={disabled}
              onValueChange={(value) => onRankingShareChange(assessor.role, value)}
            />
            <CriteriaPicker
              criteria={assessor.criteria}
              assesseeLabel={assesseeLabel}
              assessorLabel={label}
              disabled={disabled || formShare === 0}
              onChange={(criteria) => onCriteriaChange(assessor.role, criteria)}
            />
          </>
        )}
      </div>

      {/* The arithmetic §20 asks to be shown, on the row it belongs to. */}
      {!off ? (
        <p className="mt-1.5 pl-9 text-xs text-muted-foreground" data-numeric>
          {share(assessor.weightPercent)} of this score —{" "}
          {share((assessor.weightPercent * formShare) / 100)} from the 360 form,{" "}
          {share((assessor.weightPercent * assessor.rankingSharePercent) / 100)} from the
          ordering
          {relation ? (
            <>
              {" · "}
              {relation.assessorCount} in scope, each asked about{" "}
              {relation.subjectsPerAssessor}
            </>
          ) : null}
        </p>
      ) : null}

      {unsatisfiable ? (
        <p className="mt-1.5 flex items-start gap-1.5 pl-9 text-xs text-error">
          <TriangleAlert aria-hidden className="mt-px size-3 shrink-0" />
          <span>Carries weight but has nobody in scope to do the assessing.</span>
        </p>
      ) : null}
    </li>
  );
}

/**
 * A compact percentage input.
 *
 * The label sits inside as a suffix rather than above, because two stacked
 * label-and-field pairs per row is what made the first version of this screen
 * feel like a tax return.
 */
function PercentField({
  id,
  label,
  suffix,
  value,
  disabled,
  onValueChange,
}: Readonly<{
  id: string;
  /** The full sentence, for the accessible name. */
  label: string;
  /** The two or three words shown beside the field. */
  suffix: string;
  value: number;
  disabled: boolean;
  onValueChange: (value: number) => void;
}>) {
  return (
    <div className="flex items-center gap-1">
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        max={100}
        step={5}
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange(event.target.valueAsNumber)}
        className="h-(--control-h-sm) w-16 text-right"
        data-numeric
      />
      <span aria-hidden className="w-14 text-[10px] leading-tight text-muted-foreground">
        % {suffix}
      </span>
    </div>
  );
}

function share(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}

function formatShortfall(remaining: number): string {
  return remaining > 0 ? `${Number(remaining.toFixed(2))}% short` : `${Number((-remaining).toFixed(2))}% over`;
}
