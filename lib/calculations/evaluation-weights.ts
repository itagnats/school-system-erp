import { clamp, round } from "./number";
import type { EvaluatorRole, RoleWeight, WeightSummary } from "@/types";

/**
 * The weight blend behind the final score (direction.md §20).
 *
 * Two structures were defensible when the spec was written. The one taken here,
 * decided 2026-09-06, is that a submitted ordering is **not** a fifth evaluator:
 * each role holds one weight, and that weight divides internally between what
 * the role rated against the criteria and how the role ordered the subjects.
 *
 *   final = SUM over enabled roles of
 *             weight% x ( criteriaShare% x criteriaScore
 *                       + rankingShare% x rankingScore )
 *
 * A teacher who both rates and ranks therefore counts once, not twice, which is
 * the property the alternative structure gave up.
 *
 * Everything here is pure arithmetic over the configuration. No score, no
 * submission, no clock - so it can be tested without any of them.
 */

/** The share of a role's weight carried by its orderings rather than its ratings. */
export function rankingSharePercent(weight: RoleWeight): number {
  return 100 - weight.criteriaSharePercent;
}

export function enabledWeights(weights: readonly RoleWeight[]): RoleWeight[] {
  return weights.filter((weight) => weight.enabled);
}

/**
 * What the configuration adds up to, and how it splits across the two kinds.
 *
 * The effective split is derived rather than configured. An earlier sketch let
 * an administrator type "criteria 60 / ranking 40" at the top and per-role
 * weights underneath, which gives two sources of truth for the same number and
 * no rule for which one wins. Here the per-role figures are the truth and the
 * headline is computed from them.
 */
export function summariseWeights(weights: readonly RoleWeight[]): WeightSummary {
  const active = enabledWeights(weights);

  const totalPercent = round(
    active.reduce((sum, weight) => sum + weight.weightPercent, 0),
    2,
  );

  const criteria = active.reduce(
    (sum, weight) => sum + (weight.weightPercent * weight.criteriaSharePercent) / 100,
    0,
  );
  const ranking = active.reduce(
    (sum, weight) => sum + (weight.weightPercent * rankingSharePercent(weight)) / 100,
    0,
  );

  return {
    totalPercent,
    remainingPercent: round(100 - totalPercent, 2),
    // Tolerance rather than equality: the weights are user-entered percentages
    // and a renormalised set can land on 99.999999999999.
    balanced: Math.abs(100 - totalPercent) < 0.005,
    effectiveCriteriaPercent: round(criteria, 2),
    effectiveRankingPercent: round(ranking, 2),
    enabledRoleCount: active.length,
  };
}

/**
 * Redistribute weight so the enabled roles total 100.
 *
 * Called when a role is switched off. The remaining weights keep their
 * proportions to each other, so turning off a 15% TA raises a 35% teacher to
 * about 41% rather than leaving 15% of the score unallocated and every computed
 * score quietly 15% short.
 *
 * A disabled role keeps its stored weight rather than being zeroed, so that
 * switching it back on restores the blend it had. Its weight is simply not
 * counted while it is off.
 */
export function normaliseWeights(weights: readonly RoleWeight[]): RoleWeight[] {
  const active = enabledWeights(weights);
  const total = active.reduce((sum, weight) => sum + weight.weightPercent, 0);

  // Nothing to scale from: an all-off configuration, or every enabled role at
  // zero. Spreading 100 evenly is the only non-arbitrary answer, and it is
  // better than dividing by zero and writing NaN into the blend.
  if (active.length === 0) return weights.map((weight) => ({ ...weight }));
  if (total <= 0) {
    const even = round(100 / active.length, 2);
    return weights.map((weight) => ({
      ...weight,
      weightPercent: weight.enabled ? even : weight.weightPercent,
    }));
  }

  const scaled = weights.map((weight) => ({
    ...weight,
    weightPercent: weight.enabled ? round((weight.weightPercent / total) * 100, 2) : weight.weightPercent,
  }));

  return settleRounding(scaled);
}

/**
 * Push the rounding residue onto the largest enabled weight.
 *
 * Four weights rounded to two places can total 99.99 or 100.01, and a screen
 * that renders "Weight remaining 0.01%" beside a blend the administrator just
 * balanced reads as a bug. The largest weight absorbs the residue because it is
 * where a hundredth of a percent is least visible.
 */
function settleRounding(weights: RoleWeight[]): RoleWeight[] {
  const active = weights.filter((weight) => weight.enabled);
  if (active.length === 0) return weights;

  const total = active.reduce((sum, weight) => sum + weight.weightPercent, 0);
  const residue = round(100 - total, 2);
  if (residue === 0) return weights;

  const largest = active.reduce((best, weight) =>
    weight.weightPercent > best.weightPercent ? weight : best,
  );

  return weights.map((weight) =>
    weight.role === largest.role
      ? { ...weight, weightPercent: round(weight.weightPercent + residue, 2) }
      : weight,
  );
}

/** Set one role's weight, leaving the others alone so the shortfall stays visible. */
export function setRoleWeight(
  weights: readonly RoleWeight[],
  role: EvaluatorRole,
  weightPercent: number,
): RoleWeight[] {
  return weights.map((weight) =>
    weight.role === role ? { ...weight, weightPercent: clampPercent(weightPercent) } : weight,
  );
}

/** Set one role's internal criteria-to-ranking split. */
export function setCriteriaShare(
  weights: readonly RoleWeight[],
  role: EvaluatorRole,
  criteriaSharePercent: number,
): RoleWeight[] {
  return weights.map((weight) =>
    weight.role === role
      ? { ...weight, criteriaSharePercent: clampPercent(criteriaSharePercent) }
      : weight,
  );
}

/**
 * Toggle a role, then renormalise.
 *
 * Renormalising here rather than leaving it to the caller is deliberate: a
 * toggle that silently unbalances the blend is the failure this whole module
 * exists to prevent.
 */
export function setRoleEnabled(
  weights: readonly RoleWeight[],
  role: EvaluatorRole,
  enabled: boolean,
): RoleWeight[] {
  const toggled = weights.map((weight) =>
    weight.role === role ? { ...weight, enabled } : weight,
  );
  return normaliseWeights(toggled);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return round(clamp(value, 0, 100), 2);
}
