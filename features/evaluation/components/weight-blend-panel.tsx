"use client";

import { Section } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { rankingSharePercent, summariseWeights } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import type { EvaluatorRole, RoleWeight } from "@/types";
import { EVALUATOR_ROLE_DESCRIPTION, EVALUATOR_ROLE_LABEL } from "../constants";
import { WeightMeter } from "./weight-meter";

/**
 * The weight blend, editable, with its arithmetic on screen (direction.md §20).
 *
 * Two things are deliberately derived rather than typed:
 *
 *   - the effective criteria-to-ranking split at the top. A reference design
 *     for this screen let an administrator enter that split directly and the
 *     per-role weights underneath, which gives the same number two sources of
 *     truth and no rule for which wins.
 *   - each role's own contribution to each kind, shown per row, so the headline
 *     can be checked against its parts rather than believed.
 */
export function WeightBlendPanel({
  weights,
  disabled,
  onWeightChange,
  onShareChange,
  onEnabledChange,
}: Readonly<{
  weights: RoleWeight[];
  disabled: boolean;
  onWeightChange: (role: EvaluatorRole, percent: number) => void;
  onShareChange: (role: EvaluatorRole, percent: number) => void;
  onEnabledChange: (role: EvaluatorRole, enabled: boolean) => void;
}>) {
  const summary = summariseWeights(weights);

  return (
    <Section
      title="Score blend"
      description="Each role holds one weight, and that weight divides between the ratings it gives and the ordering it submits. A role that does both counts once."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <WeightMeter
          totalPercent={summary.totalPercent}
          remainingPercent={summary.remainingPercent}
          balanced={summary.balanced}
        />
        <dl className="grid grid-cols-2 gap-3 rounded-lg border border-hairline bg-surface-sunken px-3.5 py-2.5">
          <Derived label="Reaches the score as ratings" value={summary.effectiveCriteriaPercent} />
          <Derived label="Reaches it as an ordering" value={summary.effectiveRankingPercent} />
        </dl>
      </div>

      <ul className="mt-4 grid gap-2.5">
        {weights.map((weight) => (
          <RoleRow
            key={weight.role}
            weight={weight}
            disabled={disabled}
            onWeightChange={onWeightChange}
            onShareChange={onShareChange}
            onEnabledChange={onEnabledChange}
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
  weight,
  disabled,
  onWeightChange,
  onShareChange,
  onEnabledChange,
}: Readonly<{
  weight: RoleWeight;
  disabled: boolean;
  onWeightChange: (role: EvaluatorRole, percent: number) => void;
  onShareChange: (role: EvaluatorRole, percent: number) => void;
  onEnabledChange: (role: EvaluatorRole, enabled: boolean) => void;
}>) {
  const ranking = rankingSharePercent(weight);
  const label = EVALUATOR_ROLE_LABEL[weight.role];
  const off = !weight.enabled;

  return (
    <li
      className={cn(
        "grid gap-3 rounded-lg border border-hairline bg-card px-3.5 py-3 sm:grid-cols-[minmax(0,1fr)_auto]",
        off && "opacity-60",
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Switch
            id={`role-${weight.role}-enabled`}
            checked={weight.enabled}
            disabled={disabled}
            onCheckedChange={(checked) => onEnabledChange(weight.role, checked)}
          />
          <Label htmlFor={`role-${weight.role}-enabled`} className="text-sm font-medium">
            {label}
          </Label>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {EVALUATOR_ROLE_DESCRIPTION[weight.role]}
        </p>
        {weight.enabled ? (
          // The row's own arithmetic, so the headline above can be checked
          // against its parts instead of taken on trust.
          <p className="mt-1.5 text-xs text-muted-foreground" data-numeric>
            {share(weight.weightPercent)} of the score:{" "}
            {share((weight.weightPercent * weight.criteriaSharePercent) / 100)} from ratings,{" "}
            {share((weight.weightPercent * ranking) / 100)} from the ordering
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Not evaluating. Its weight is held so switching it back on restores the blend.
          </p>
        )}
      </div>

      <div className="flex items-end gap-3">
        <PercentField
          id={`role-${weight.role}-weight`}
          label="Weight"
          value={weight.weightPercent}
          disabled={disabled || off}
          onValueChange={(value) => onWeightChange(weight.role, value)}
        />
        <PercentField
          id={`role-${weight.role}-share`}
          label="From ratings"
          value={weight.criteriaSharePercent}
          disabled={disabled || off}
          onValueChange={(value) => onShareChange(weight.role, value)}
          hint={`${share(ranking)} from the ordering`}
        />
      </div>
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
