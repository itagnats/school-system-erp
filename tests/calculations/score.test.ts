import { describe, expect, it } from "vitest";
import {
  calculateEvaluationScore,
  rankingScoreFor,
  summariseWeights,
  type RoleSubmission,
} from "@/lib/calculations";
import type { AssesseeConfig } from "@/types";

/**
 * The final score (direction.md §20, §22).
 *
 * The tests that matter here are the ones about **missing** evidence. A demo
 * dataset always has every role reporting; a real one does not, and the
 * difference between "scored 2.0" and "nobody has said anything yet" is the
 * whole reliability of the report.
 */

const SCALE = 5;
const PASS = 4;

/** A student assessed by four roles, blend from the demo default. */
function studentAssessee(): AssesseeConfig {
  return {
    role: "student",
    selfEvaluation: false,
    assessors: [
      { role: "student", enabled: true, weightPercent: 30, rankingSharePercent: 40, criteria: ["teamwork"] },
      { role: "inspector", enabled: true, weightPercent: 20, rankingSharePercent: 30, criteria: ["teamwork"] },
      { role: "teacher", enabled: true, weightPercent: 35, rankingSharePercent: 30, criteria: ["teamwork"] },
      { role: "ta", enabled: true, weightPercent: 15, rankingSharePercent: 0, criteria: ["teamwork"] },
    ],
  };
}

function score(submissions: RoleSubmission[], assessee = studentAssessee()) {
  return calculateEvaluationScore({
    subjectId: "enr-0001",
    assessee,
    submissions,
    scaleMax: SCALE,
    passThreshold: PASS,
  });
}

/** Everyone reports the same figures, so the means are trivially checkable. */
function flat(threeSixty: number | null, ranking: number | null): RoleSubmission[] {
  return (["student", "inspector", "teacher", "ta"] as const).map((role) => ({
    role,
    threeSixtyScore: threeSixty,
    rankingScore: ranking,
    evaluationCount: 1,
  }));
}

describe("rankingScoreFor", () => {
  it("puts first place at the top of the scale and last at the bottom", () => {
    expect(rankingScoreFor(1, 5, SCALE)).toBe(5);
    expect(rankingScoreFor(5, 5, SCALE)).toBe(1);
  });

  it("spreads the middle evenly", () => {
    expect(rankingScoreFor(2, 5, SCALE)).toBe(4);
    expect(rankingScoreFor(3, 5, SCALE)).toBe(3);
    expect(rankingScoreFor(4, 5, SCALE)).toBe(2);
  });

  it("sits at the midpoint when there is only one subject", () => {
    // A position out of one carries no information. Awarding it the top of the
    // scale would hand a free 5 to anyone in a group of one.
    expect(rankingScoreFor(1, 1, SCALE)).toBe(3);
  });

  it("clamps a position outside the range rather than extrapolating", () => {
    expect(rankingScoreFor(0, 5, SCALE)).toBe(5);
    expect(rankingScoreFor(99, 5, SCALE)).toBe(1);
  });
});

describe("calculateEvaluationScore", () => {
  it("reproduces the identity the report shows", () => {
    const result = score(flat(2.83, 3.0));
    const summary = summariseWeights(studentAssessee().assessors);

    expect(result.behaviouralScore).toBe(2.83);
    expect(result.rankingScore).toBe(3);
    expect(result.behaviouralSharePercent).toBe(summary.effective360Percent);
    expect(result.rankingSharePercent).toBe(summary.effectiveRankingPercent);

    // total = (share360 x behavioural + shareRank x ranking) / 100, which is
    // exactly the line the report prints above the figure.
    const expected =
      (result.behaviouralSharePercent * 2.83 + result.rankingSharePercent * 3.0) / 100;
    expect(result.totalScore).toBeCloseTo(expected, 2);
  });

  it("converts the total to a percentage of the scale", () => {
    const result = score(flat(4, 4));

    expect(result.totalScore).toBe(4);
    // 4 out of 5 is 80%, which is a B - and agrees with a pass threshold of 4.
    expect(result.percent).toBe(80);
    expect(result.grade).toBe("B");
    expect(result.passed).toBe(true);
  });

  it("fails a total below the threshold", () => {
    const result = score(flat(3.9, 3.9));

    expect(result.passed).toBe(false);
    expect(result.percent).toBe(78);
    expect(result.grade).toBe("C");
  });

  it("passes exactly at the threshold", () => {
    // A boundary that decides an outcome should be inclusive on purpose, not by
    // accident of a comparison operator.
    expect(score(flat(4, 4)).passed).toBe(true);
  });

  it("reports full coverage when every role has reported", () => {
    expect(score(flat(3, 3)).coveragePercent).toBe(100);
  });
});

describe("missing evidence", () => {
  it("returns null rather than zero when nothing has been submitted", () => {
    const result = score(flat(null, null));

    expect(result.behaviouralScore).toBeNull();
    expect(result.rankingScore).toBeNull();
    expect(result.totalScore).toBeNull();
    expect(result.percent).toBeNull();
    expect(result.grade).toBeNull();
    // Not `false`. "Has not passed" and "has not been assessed" are different
    // claims, and a report that says Not pass for an unassessed student is
    // making an accusation the data does not support.
    expect(result.passed).toBeNull();
    expect(result.coveragePercent).toBe(0);
  });

  it("does not let an unreported role drag the score down", () => {
    const partial: RoleSubmission[] = [
      { role: "teacher", threeSixtyScore: 5, rankingScore: 5, evaluationCount: 7 },
    ];

    const result = score(partial);

    // The teacher said 5, so the score is 5 - renormalised over what exists,
    // not averaged against three zeros.
    expect(result.behaviouralScore).toBe(5);
    expect(result.totalScore).toBe(5);
    expect(result.passed).toBe(true);
  });

  it("reports the shortfall as coverage instead", () => {
    const result = score([
      { role: "teacher", threeSixtyScore: 4, rankingScore: 4, evaluationCount: 7 },
    ]);

    // The teacher holds 35 of 100, so a score built on it alone covers 35%.
    expect(result.coveragePercent).toBe(35);
  });

  it("blends over whichever halves exist for a role", () => {
    // A role that rated but did not rank scores on its ratings alone, rather
    // than losing the ordering share to a null.
    const result = score([
      { role: "teacher", threeSixtyScore: 4.5, rankingScore: null, evaluationCount: 7 },
    ]);

    expect(result.behaviouralScore).toBe(4.5);
    expect(result.rankingScore).toBeNull();
    expect(result.totalScore).toBe(4.5);
  });

  it("scores from orderings alone when nobody filled a 360 form", () => {
    const result = score([
      { role: "student", threeSixtyScore: null, rankingScore: 2, evaluationCount: 4 },
    ]);

    expect(result.behaviouralScore).toBeNull();
    expect(result.rankingScore).toBe(2);
    expect(result.totalScore).toBe(2);
  });
});

describe("configuration drives the score", () => {
  it("ignores a disabled role even when it has submitted", () => {
    const assessee = studentAssessee();
    assessee.assessors = assessee.assessors.map((a) =>
      a.role === "teacher" ? { ...a, enabled: false } : a,
    );

    const result = score(
      [{ role: "teacher", threeSixtyScore: 1, rankingScore: 1, evaluationCount: 7 }],
      assessee,
    );

    // The teacher is switched off in Manage Evaluation, so its submission
    // cannot reach the score - the two screens agree by construction.
    expect(result.totalScore).toBeNull();
    expect(result.roles.some((role) => role.role === "teacher")).toBe(false);
  });

  it("gives a ranking-only role no behavioural weight", () => {
    const assessee: AssesseeConfig = {
      role: "student",
      selfEvaluation: false,
      assessors: [
        { role: "teacher", enabled: true, weightPercent: 100, rankingSharePercent: 100, criteria: [] },
      ],
    };

    const result = score(
      [{ role: "teacher", threeSixtyScore: 5, rankingScore: 2, evaluationCount: 1 }],
      assessee,
    );

    expect(result.behaviouralSharePercent).toBe(0);
    expect(result.rankingSharePercent).toBe(100);
    // The 5 it somehow rated is not counted: its configuration asks only for an
    // ordering.
    expect(result.behaviouralScore).toBeNull();
    expect(result.totalScore).toBe(2);
  });

  it("carries each role's own blend on the breakdown", () => {
    const result = score([
      { role: "student", threeSixtyScore: 4, rankingScore: 2, evaluationCount: 5 },
    ]);

    const peer = result.roles.find((role) => role.role === "student");
    // 60% of the peer's weight is the form, 40% the ordering: 4*.6 + 2*.4 = 3.2
    expect(peer?.score).toBeCloseTo(3.2, 2);
    expect(peer?.weightPercent).toBe(30);
    expect(peer?.evaluationCount).toBe(5);
  });
});
