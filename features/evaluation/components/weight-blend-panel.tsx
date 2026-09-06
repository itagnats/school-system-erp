"use client";

import { Section } from "@/components/shared";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { summariseWeights, threeSixtySharePercent } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { EVALUATION_CRITERIA } from "@/types";
import type { EvaluationCriterion, EvaluatorRole, RoleConfig } from "@/types";
import {
  EVALUATION_CRITERION_LABEL,
  EVALUATOR_ROLE_DESCRIPTION,
  EVALUATOR_ROLE_LABEL,
} from "../constants";
import { WeightMeter } from "./weight-meter";

/**
 * What each role is worth, and what each role is asked (direction.md §18, §20).
 *
 * Three things on this panel are deliberately derived rather than typed:
 *
 *   - the effective 360-to-ranking split at the top. A reference design for this
 *     screen let an administrator enter that split directly *and* the per-role
 *     weights underneath, which gives the same quantity two sources of truth and
 *     no rule for which one wins.
 *   - each role's own contribution to each kind, shown per row, so the headline
 *     can be checked against its parts rather than believed.
 *   - the 360 share, which is always the complement of the stored ranking share.
 */
export function WeightBlendPanel({
  roles,
  disabled,
  onWeightChange,
  onRankingShareChange,
  onEnabledChange,
  onCriteriaChange,
}: Readonly<{
  roles: RoleConfig[];
  disabled: boolean;
  onWeightChange: (role: EvaluatorRole, percent: number) => void;
  onRankingShareChange: (role: EvaluatorRole, percent: number) => void;
  onEnabledChange: (role: EvaluatorRole, enabled: boolean) => void;
  onCriteriaChange: (role: EvaluatorRole, criteria: EvaluationCriterion[]) => void;
}>) {
  const summary = summariseWeights(roles);

  return (
    <Section
      title="Roles, weight and question sets"
      description="All four roles take the 360 form; what differs is which criteria each is asked. A role's weight then divides between that form and the ordering it submits."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <WeightMeter
          totalPercent={summary.totalPercent}
          remainingPercent={summary.remainingPercent}
          balanced={summary.balanced}
        />
        <dl className="grid grid-cols-2 gap-3 rounded-lg border border-hairline bg-surface-sunken px-3.5 py-2.5">
          <Derived label="Reaches the score via the 360 form" value={summary.effective360Percent} />
          <Derived label="Via a submitted ordering" value={summary.effectiveRankingPercent} />
        </dl>
      </div>

      <ul className="mt-4 grid gap-2.5">
        {roles.map((role) => (
          <RoleRow
            key={role.role}
            config={role}
            disabled={disabled}
            onWeightChange={onWeightChange}
            onRankingShareChange={onRankingShareChange}
            onEnabledChange={onEnabledChange}
            onCriteriaChange={onCriteriaChange}
          />
        ))}
      </ul>

      <p className="mt-3 text-xs text-muted-foreground">
        Switching a role off redistributes its weight across the roles that
        remain, so the blend keeps totalling 100%.
      </p>
    </Section>
  );
}

function RoleRow({
  config,
  disabled,
  onWeightChange,
  onRankingShareChange,
  onEnabledChange,
  onCriteriaChange,
}: Readonly<{
  config: RoleConfig;
  disabled: boolean;
  onWeightChange: (role: EvaluatorRole, percent: number) => void;
  onRankingShareChange: (role: EvaluatorRole, percent: number) => void;
  onEnabledChange: (role: EvaluatorRole, enabled: boolean) => void;
  onCriteriaChange: (role: EvaluatorRole, criteria: EvaluationCriterion[]) => void;
}>) {
  const formShare = threeSixtySharePercent(config);
  const label = EVALUATOR_ROLE_LABEL[config.role];
  const off = !config.enabled;
  // A role paid for the 360 form with nothing to ask cannot fill the share it
  // holds. The server refuses to save it; this says so before they try.
  const noQuestions = config.enabled && formShare > 0 && config.criteria.length === 0;

  function toggleCriterion(criterion: EvaluationCriterion, checked: boolean) {
    const next = checked
      ? [...config.criteria, criterion]
      : config.criteria.filter((entry) => entry !== criterion);
    onCriteriaChange(config.role, next);
  }

  return (
    <li
      className={cn(
        "rounded-lg border border-hairline bg-card px-3.5 py-3",
        off && "opacity-60",
      )}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Switch
              id={`role-${config.role}-enabled`}
              checked={config.enabled}
              disabled={disabled}
              onCheckedChange={(checked) => onEnabledChange(config.role, checked)}
            />
            <Label htmlFor={`role-${config.role}-enabled`} className="text-sm font-medium">
              {label}
            </Label>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {EVALUATOR_ROLE_DESCRIPTION[config.role]}
          </p>
          {config.enabled ? (
            // The row's own arithmetic, so the headline above can be checked
            // against its parts instead of taken on trust.
            <p className="mt-1.5 text-xs text-muted-foreground" data-numeric>
              {share(config.weightPercent)} of the score:{" "}
              {share((config.weightPercent * formShare) / 100)} from the 360 form,{" "}
              {share((config.weightPercent * config.rankingSharePercent) / 100)} from the
              ordering
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Not evaluating. Its weight and question set are held, so switching it
              back on restores what it had.
            </p>
          )}
        </div>

        <div className="flex items-end gap-3">
          <PercentField
            id={`role-${config.role}-weight`}
            label="Weight"
            value={config.weightPercent}
            disabled={disabled || off}
            onValueChange={(value) => onWeightChange(config.role, value)}
          />
          <PercentField
            id={`role-${config.role}-ranking-share`}
            label="From ordering"
            value={config.rankingSharePercent}
            disabled={disabled || off}
            onValueChange={(value) => onRankingShareChange(config.role, value)}
            hint={`${share(formShare)} from the 360 form`}
          />
        </div>
      </div>

      {formShare > 0 ? (
        <fieldset
          className="mt-3 border-t border-hairline pt-2.5"
          disabled={disabled || off}
        >
          <legend className="sr-only">Criteria the {label} is asked</legend>
          <p className="text-xs text-muted-foreground">
            Asked on the 360 form —{" "}
            <span data-numeric>
              {config.criteria.length} of {EVALUATION_CRITERIA.length}
            </span>
          </p>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {EVALUATION_CRITERIA.map((criterion) => {
              const id = `role-${config.role}-${criterion}`;
              return (
                <div key={criterion} className="flex items-center gap-1.5">
                  <Checkbox
                    id={id}
                    checked={config.criteria.includes(criterion)}
                    disabled={disabled || off}
                    onCheckedChange={(checked) =>
                      toggleCriterion(criterion, checked === true)
                    }
                  />
                  <Label htmlFor={id} className="text-xs font-normal">
                    {EVALUATION_CRITERION_LABEL[criterion]}
                  </Label>
                </div>
              );
            })}
          </div>
          {noQuestions ? (
            <p className="mt-2 text-xs text-error" role="alert">
              This role is paid for the 360 form but is asked nothing, so its
              share of the score cannot be filled.
            </p>
          ) : null}
        </fieldset>
      ) : (
        <p className="mt-3 border-t border-hairline pt-2.5 text-xs text-muted-foreground">
          This role only submits an ordering, so it is asked no criteria.
        </p>
      )}
    </li>
  );
}

function PercentField({
  id,
  label,
  value,
  disabled,
  onValueChange,
  hint,
}: Readonly<{
  id: string;
  label: string;
  value: number;
  disabled: boolean;
  onValueChange: (value: number) => void;
  hint?: string;
}>) {
  return (
    <div className="w-28">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="mt-1 flex items-center gap-1">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(event) => onValueChange(event.target.valueAsNumber)}
          className="text-right"
          data-numeric
        />
        <span aria-hidden className="text-xs text-muted-foreground">
          %
        </span>
      </div>
      {hint ? <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Derived({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-base font-medium text-foreground" data-numeric>
        {share(value)}
      </dd>
    </div>
  );
}

function share(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}
