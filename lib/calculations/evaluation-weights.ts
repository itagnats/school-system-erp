import { clamp, round } from "./number";
import type {
  AssesseeConfig,
  AssessorConfig,
  EvaluationCriterion,
  EvaluationRole,
  WeightSummary,
} from "@/types";

/**
 * The weight blend behind a score (direction.md §20).
 *
 * **The blend is per assessee.** Corrected 2026-09-06: an assessee is not always
 * a student, so a setup holds one blend per assessee role rather than one
 * overall. Students are assessed by peers, an inspector, the teacher and the TA;
 * a teacher is assessed by students and the TA, at different weights entirely.
 *
 * Within one assessee:
 *
 *   score = SUM over its enabled assessors of
 *             weight% x ( threeSixtyShare% x threeSixtyScore
 *                       + rankingShare% x rankingScore )
 *
 * An ordering is a share of each assessor's own weight rather than a fifth
 * assessor, so an assessor that both rates and ranks counts once.
 *
 * Everything here is pure arithmetic over the configuration. No score, no
 * submission, no clock - so it can be tested without any of them.
 */

/**
 * The share of an assessor's weight carried by the 360 form, not the ordering.
 *
 * Only the ranking share is stored; this is its complement. Which of the two is
 * stored is arbitrary, but storing exactly one of them is not - two stored
 * numbers that must total 100 will eventually disagree.
 */
export function threeSixtySharePercent(assessor: AssessorConfig): number {
  return 100 - assessor.rankingSharePercent;
}

export function enabledAssessors(assessors: readonly AssessorConfig[]): AssessorConfig[] {
  return assessors.filter((assessor) => assessor.enabled);
}

/**
 * What one assessee's blend adds up to, and how it splits across the two kinds.
 *
 * The effective split is derived rather than configured. A reference design let
 * an administrator type "360 form 60 / ordering 40" at the top *and* the
 * per-assessor weights underneath, which gives two sources of truth for one
 * number and no rule for which wins. Here the per-assessor figures are the
 * truth and the headline is computed from them.
 */
export function summariseWeights(assessors: readonly AssessorConfig[]): WeightSummary {
  const active = enabledAssessors(assessors);

  const totalPercent = round(
    active.reduce((sum, assessor) => sum + assessor.weightPercent, 0),
    2,
  );

  const threeSixty = active.reduce(
    (sum, a) => sum + (a.weightPercent * threeSixtySharePercent(a)) / 100,
    0,
  );
  const ranking = active.reduce(
    (sum, a) => sum + (a.weightPercent * a.rankingSharePercent) / 100,
    0,
  );

  return {
    totalPercent,
    remainingPercent: round(100 - totalPercent, 2),
    // Tolerance rather than equality: these are user-entered percentages and a
    // renormalised set can land on 99.999999999999.
    balanced: Math.abs(100 - totalPercent) < 0.005,
    effective360Percent: round(threeSixty, 2),
    effectiveRankingPercent: round(ranking, 2),
    enabledAssessorCount: active.length,
  };
}

/**
 * Redistribute one assessee's weights so its enabled assessors total 100.
 *
 * Called when an assessor is switched off. The survivors keep their proportions
 * to each other, so turning off a 15% TA raises a 35% teacher to about 41%
 * rather than leaving 15% of that assessee's score unallocated and every
 * computed score quietly 15% short.
 *
 * A disabled assessor keeps its stored weight rather than being zeroed, so
 * switching it back on restores the blend it had.
 */
export function normaliseWeights(assessors: readonly AssessorConfig[]): AssessorConfig[] {
  const active = enabledAssessors(assessors);
  const total = active.reduce((sum, assessor) => sum + assessor.weightPercent, 0);

  // Nothing to scale from: an all-off card, or every enabled assessor at zero.
  // Spreading 100 evenly is the only non-arbitrary answer, and it beats
  // dividing by zero and writing NaN into the blend.
  if (active.length === 0) return assessors.map((a) => ({ ...a }));
  if (total <= 0) {
    const even = round(100 / active.length, 2);
    return assessors.map((a) => ({
      ...a,
      weightPercent: a.enabled ? even : a.weightPercent,
    }));
  }

  const scaled = assessors.map((a) => ({
    ...a,
    weightPercent: a.enabled ? round((a.weightPercent / total) * 100, 2) : a.weightPercent,
  }));

  return settleRounding(scaled);
}

/**
 * Push the rounding residue onto the largest enabled weight.
 *
 * Four weights rounded to two places can total 99.99 or 100.01, and a card that
 * says "0.01% remaining" beside a blend the administrator just balanced reads
 * as a bug. The largest weight absorbs it because that is where a hundredth of
 * a percent is least visible.
 */
function settleRounding(assessors: AssessorConfig[]): AssessorConfig[] {
  const active = assessors.filter((a) => a.enabled);
  if (active.length === 0) return assessors;

  const total = active.reduce((sum, a) => sum + a.weightPercent, 0);
  const residue = round(100 - total, 2);
  if (residue === 0) return assessors;

  const largest = active.reduce((best, a) =>
    a.weightPercent > best.weightPercent ? a : best,
  );

  return assessors.map((a) =>
    a.role === largest.role
      ? { ...a, weightPercent: round(a.weightPercent + residue, 2) }
      : a,
  );
}

/* -------------------------------------------------------------------------- */
/* Editing one assessee's assessors                                           */
/* -------------------------------------------------------------------------- */

/**
 * Apply a change to one assessor inside one assessee.
 *
 * Every mutator below goes through this, so an edit is always addressed by the
 * **pair** of roles. Addressing an assessor by role alone was the shape before
 * assessees existed, and it would now silently edit the wrong card.
 */
function updateAssessor(
  assessees: readonly AssesseeConfig[],
  assesseeRole: EvaluationRole,
  assessorRole: EvaluationRole,
  change: (assessor: AssessorConfig) => AssessorConfig,
): AssesseeConfig[] {
  return assessees.map((assessee) =>
    assessee.role === assesseeRole
      ? {
          ...assessee,
          assessors: assessee.assessors.map((assessor) =>
            assessor.role === assessorRole ? change(assessor) : assessor,
          ),
        }
      : assessee,
  );
}

/** Set one assessor's weight, leaving the others so the shortfall stays visible. */
export function setAssessorWeight(
  assessees: readonly AssesseeConfig[],
  assesseeRole: EvaluationRole,
  assessorRole: EvaluationRole,
  weightPercent: number,
): AssesseeConfig[] {
  return updateAssessor(assessees, assesseeRole, assessorRole, (a) => ({
    ...a,
    weightPercent: clampPercent(weightPercent),
  }));
}

/** Set one assessor's internal 360-to-ranking split, by its ranking half. */
export function setAssessorRankingShare(
  assessees: readonly AssesseeConfig[],
  assesseeRole: EvaluationRole,
  assessorRole: EvaluationRole,
  rankingSharePercent: number,
): AssesseeConfig[] {
  return updateAssessor(assessees, assesseeRole, assessorRole, (a) => ({
    ...a,
    rankingSharePercent: clampPercent(rankingSharePercent),
  }));
}

/**
 * Replace one relation's question set.
 *
 * Order follows the canonical criteria list rather than the order they were
 * clicked, so two setups asking the same questions serialise identically and a
 * diff between them is readable.
 */
export function setAssessorCriteria(
  assessees: readonly AssesseeConfig[],
  assesseeRole: EvaluationRole,
  assessorRole: EvaluationRole,
  criteria: readonly EvaluationCriterion[],
  canonicalOrder: readonly EvaluationCriterion[],
): AssesseeConfig[] {
  const chosen = new Set(criteria);
  const ordered = canonicalOrder.filter((criterion) => chosen.has(criterion));
  return updateAssessor(assessees, assesseeRole, assessorRole, (a) => ({
    ...a,
    criteria: [...ordered],
  }));
}

/**
 * Toggle one assessor, then renormalise that assessee's blend.
 *
 * Renormalising here rather than leaving it to the caller is deliberate: a
 * toggle that silently unbalances a card is the failure this module exists to
 * prevent.
 */
export function setAssessorEnabled(
  assessees: readonly AssesseeConfig[],
  assesseeRole: EvaluationRole,
  assessorRole: EvaluationRole,
  enabled: boolean,
): AssesseeConfig[] {
  return assessees.map((assessee) => {
    if (assessee.role !== assesseeRole) return assessee;
    const toggled = assessee.assessors.map((assessor) =>
      assessor.role === assessorRole ? { ...assessor, enabled } : assessor,
    );
    return { ...assessee, assessors: normaliseWeights(toggled) };
  });
}

/* -------------------------------------------------------------------------- */
/* Adding and removing assessees                                              */
/* -------------------------------------------------------------------------- */

/**
 * Add an assessee card, with every possible assessor present but switched off.
 *
 * Every candidate role appears rather than only the enabled ones, so the card
 * is filled in by toggling rather than by choosing from a menu - which is what
 * the reference design does. Self-assessment is refused structurally: the
 * assessee's own role is never among its assessors.
 */
export function addAssessee(
  assessees: readonly AssesseeConfig[],
  role: EvaluationRole,
  allRoles: readonly EvaluationRole[],
): AssesseeConfig[] {
  if (assessees.some((assessee) => assessee.role === role)) return [...assessees];

  const assessors: AssessorConfig[] = allRoles
    .filter((candidate) => relationIsPossible(role, candidate))
    .map((candidate) => ({
      role: candidate,
      enabled: false,
      weightPercent: 0,
      rankingSharePercent: 0,
      criteria: [],
    }));

  return [...assessees, { role, selfEvaluation: false, assessors }];
}

export function removeAssessee(
  assessees: readonly AssesseeConfig[],
  role: EvaluationRole,
): AssesseeConfig[] {
  return assessees.filter((assessee) => assessee.role !== role);
}

/* -------------------------------------------------------------------------- */
/* Setup-level checks                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Assessors weighted for the 360 form that have no questions to ask.
 *
 * Per assessee, because the same assessor role can be correctly configured for
 * one assessee and empty for another. Reported rather than auto-corrected -
 * which questions to ask is a judgement, not something to guess mid-keystroke.
 */
export function relationsWithoutQuestions(assessee: AssesseeConfig): EvaluationRole[] {
  return assessee.assessors
    .filter((a) => a.enabled && threeSixtySharePercent(a) > 0 && a.criteria.length === 0)
    .map((a) => a.role);
}

/** Assessees whose enabled assessor weights do not total 100. */
export function unbalancedAssessees(
  assessees: readonly AssesseeConfig[],
): EvaluationRole[] {
  return assessees
    .filter((assessee) => !summariseWeights(assessee.assessors).balanced)
    .map((assessee) => assessee.role);
}

/**
 * Whether an assessor role could ever assess an assessee role.
 *
 * **A matching pair of roles is not self-assessment.** Student assessing
 * student is peer assessment - the centre of the whole feature (direction.md
 * §16). "Nobody assesses themselves" is a rule about *people*, and it is
 * enforced where people are: an evaluator never appears among their own
 * subjects. Confusing the two rules once cost this module the peer relation
 * entirely, and the server rejected its own seed data.
 *
 * A same-role pair is impossible only where the role holds one person. There is
 * exactly one teacher and one TA per course-semester, so teacher-assesses-
 * teacher could only ever mean the same human.
 *
 * An inspector is a student borrowed from another evaluation group, so the role
 * only makes sense pointed at a student. There is no second staffroom to borrow
 * a teacher from.
 */
export function relationIsPossible(
  assesseeRole: EvaluationRole,
  assessorRole: EvaluationRole,
): boolean {
  if (assessorRole === "inspector") return assesseeRole === "student";
  // Many students, one teacher, one TA.
  if (assesseeRole === assessorRole) return assesseeRole === "student";
  return true;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return round(clamp(value, 0, 100), 2);
}
