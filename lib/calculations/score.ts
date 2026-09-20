import { calculateGrade } from "./grade";
import { clamp, round } from "./number";
import { summarizeWeights, threeSixtySharePercent } from "./evaluation-weights";
import type {
  AssesseeConfig,
  AssessorConfig,
  EvaluationRole,
  RoleScore,
  ScoreResult,
} from "@/types";

/**
 * The final score (direction.md §20, §22).
 *
 * Three figures and the relationship between them:
 *
 *   behavioral  the weighted mean of what each role rated on the 360 form
 *   ranking      the weighted mean of what each role submitted as an ordering
 *   total        those two, blended by the shares they derive
 *
 * All three stay on the **rating scale** rather than being converted to
 * percentages first. The ratings were given on a 1-to-5 scale, the report shows
 * them on that scale, and converting early would hide the arithmetic §20 asks
 * to be visible. The percentage and the grade are conversions applied at the
 * end, to one number.
 *
 * The identity that makes the report readable:
 *
 *   total = (behavioralShare x behavioral + rankingShare x ranking) / 100
 *
 * where the two shares are `summarizeWeights`' derived effective split. So the
 * report's headline - "Total (Behavioral 60% + Ranking 40%)" - is the same
 * arithmetic the score actually used, not a restatement of it.
 */

/** What one assessor role submitted about one subject. */
export interface RoleSubmission {
  role: EvaluationRole;
  /**
   * Mean of the ratings this role gave, over the criteria it was asked.
   *
   * Null when the role has not submitted. Null is not zero: a role that has not
   * reported must not drag the score down, it must reduce coverage.
   */
  threeSixtyScore: number | null;
  /** The role's ordering, already converted to the rating scale. */
  rankingScore: number | null;
  /** Submissions behind these figures, for the report to show its evidence. */
  evaluationCount: number;
}

/**
 * Convert a position in an ordering to a score on the rating scale.
 *
 * First place takes the top of the scale, last place the bottom, and the rest
 * spread evenly between. With one subject the position carries no information,
 * so it sits at the midpoint rather than claiming the top.
 *
 * This is what lets an ordering join the blend at all: §20 requires it to be
 * commensurable with the ratings, and a rank number is not.
 */
export function rankingScoreFor(
  position: number,
  outOf: number,
  scaleMax: number,
): number {
  if (outOf <= 1) return round((1 + scaleMax) / 2, 2);
  const clamped = clamp(position, 1, outOf);
  // position 1 -> scaleMax, position outOf -> 1
  const fraction = (outOf - clamped) / (outOf - 1);
  return round(1 + fraction * (scaleMax - 1), 2);
}

/**
 * Score one subject against one assessee configuration.
 *
 * The weights come from the configuration and the figures from the
 * submissions, so a role switched off in Manage Evaluation contributes nothing
 * here without this function knowing anything about that screen.
 */
export function calculateEvaluationScore({
  subjectId,
  assessee,
  submissions,
  scaleMax,
  passThreshold,
}: {
  subjectId: string;
  assessee: AssesseeConfig;
  submissions: readonly RoleSubmission[];
  scaleMax: number;
  passThreshold: number;
}): ScoreResult {
  const summary = summarizeWeights(assessee.assessors);
  const byRole = new Map(submissions.map((entry) => [entry.role, entry]));

  const roles: RoleScore[] = assessee.assessors
    .filter((assessor) => assessor.enabled)
    .map((assessor) => buildRoleScore(assessor, byRole.get(assessor.role)));

  // Weighted means, skipping roles that have not reported. A missing role
  // lowers coverage; it never counts as a zero.
  const behavioral = weightedMean(
    assessee.assessors,
    byRole,
    (assessor) => (assessor.weightPercent * threeSixtySharePercent(assessor)) / 100,
    (submission) => submission.threeSixtyScore,
  );
  const ranking = weightedMean(
    assessee.assessors,
    byRole,
    (assessor) => (assessor.weightPercent * assessor.rankingSharePercent) / 100,
    (submission) => submission.rankingScore,
  );

  const totalScore = blend(
    behavioral.value,
    summary.effective360Percent,
    ranking.value,
    summary.effectiveRankingPercent,
  );

  // Percent of the scale, so 4 out of 5 is 80 - which lands on §22's B and
  // agrees with a pass threshold of 4. The two scales were not designed
  // together, and it is worth knowing that they happen to line up.
  const percent = totalScore === null ? null : round((totalScore / scaleMax) * 100, 2);

  const covered = behavioral.weight + ranking.weight;
  const available = summary.effective360Percent + summary.effectiveRankingPercent;

  return {
    subjectId,
    assesseeRole: assessee.role,
    roles,
    behavioralScore: behavioral.value,
    rankingScore: ranking.value,
    totalScore,
    behavioralSharePercent: summary.effective360Percent,
    rankingSharePercent: summary.effectiveRankingPercent,
    percent,
    grade: percent === null ? null : calculateGrade(percent),
    passed: totalScore === null ? null : totalScore >= passThreshold,
    passThreshold,
    coveragePercent: available <= 0 ? 0 : round((covered / available) * 100, 2),
  };
}

function buildRoleScore(
  assessor: AssessorConfig,
  submission: RoleSubmission | undefined,
): RoleScore {
  const formShare = threeSixtySharePercent(assessor) / 100;
  const rankShare = assessor.rankingSharePercent / 100;

  const threeSixty = submission?.threeSixtyScore ?? null;
  const ranking = submission?.rankingScore ?? null;

  return {
    role: assessor.role,
    threeSixtyScore: threeSixty,
    rankingScore: ranking,
    // The role's own blend, over whichever halves it actually reported.
    score: blend(threeSixty, formShare * 100, ranking, rankShare * 100),
    weightPercent: assessor.weightPercent,
    evaluationCount: submission?.evaluationCount ?? 0,
  };
}

/**
 * Blend two figures by their shares, ignoring whichever is missing.
 *
 * Renormalizing over what is present is the whole reason this is a function:
 * treating an unreported half as zero would halve a score for an
 * administrative gap rather than for anything the subject did.
 */
function blend(
  first: number | null,
  firstShare: number,
  second: number | null,
  secondShare: number,
): number | null {
  const parts: Array<[number, number]> = [];
  if (first !== null && firstShare > 0) parts.push([first, firstShare]);
  if (second !== null && secondShare > 0) parts.push([second, secondShare]);
  if (parts.length === 0) return null;

  const weight = parts.reduce((sum, [, share]) => sum + share, 0);
  if (weight <= 0) return null;
  return round(parts.reduce((sum, [value, share]) => sum + value * share, 0) / weight, 2);
}

/**
 * Weighted mean over the roles that reported, plus the weight they covered.
 *
 * The covered weight is returned alongside the value because coverage is a
 * finding in its own right - a score built on one of four roles is not the same
 * claim as one built on all four, and the report says which.
 */
function weightedMean(
  assessors: readonly AssessorConfig[],
  byRole: Map<EvaluationRole, RoleSubmission>,
  shareOf: (assessor: AssessorConfig) => number,
  valueOf: (submission: RoleSubmission) => number | null,
): { value: number | null; weight: number } {
  let total = 0;
  let weight = 0;

  for (const assessor of assessors) {
    if (!assessor.enabled) continue;
    const share = shareOf(assessor);
    if (share <= 0) continue;

    const submission = byRole.get(assessor.role);
    const value = submission ? valueOf(submission) : null;
    if (value === null) continue;

    total += value * share;
    weight += share;
  }

  return {
    value: weight > 0 ? round(total / weight, 2) : null,
    weight: round(weight, 2),
  };
}
