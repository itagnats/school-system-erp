import { describe, expect, it } from "vitest";
import {
  normaliseWeights,
  rankingSharePercent,
  setCriteriaShare,
  setRoleEnabled,
  setRoleWeight,
  summariseWeights,
} from "@/lib/calculations";
import type { RoleWeight } from "@/types";

/**
 * The weight blend (direction.md §20).
 *
 * These tests pin the decision taken on 2026-09-06: an ordering is not a fifth
 * evaluator, it is a share of each role's own weight. The tests that matter are
 * the ones about what happens when the configuration is wrong - an unbalanced
 * blend and a disabled role - because those are the states a real
 * administrator will produce and a demo dataset never will.
 */

/** The demo default from direction.md §20, all criteria to begin with. */
function demoWeights(): RoleWeight[] {
  return [
    { role: "student", enabled: true, weightPercent: 30, criteriaSharePercent: 100 },
    { role: "inspector", enabled: true, weightPercent: 20, criteriaSharePercent: 100 },
    { role: "teacher", enabled: true, weightPercent: 35, criteriaSharePercent: 100 },
    { role: "ta", enabled: true, weightPercent: 15, criteriaSharePercent: 100 },
  ];
}

describe("rankingSharePercent", () => {
  it("is the remainder of the criteria share, never stored separately", () => {
    expect(
      rankingSharePercent({
        role: "teacher",
        enabled: true,
        weightPercent: 35,
        criteriaSharePercent: 70,
      }),
    ).toBe(30);
  });
});

describe("summariseWeights", () => {
  it("reports the demo default as balanced", () => {
    const summary = summariseWeights(demoWeights());

    expect(summary.totalPercent).toBe(100);
    expect(summary.remainingPercent).toBe(0);
    expect(summary.balanced).toBe(true);
    expect(summary.enabledRoleCount).toBe(4);
  });

  it("derives the effective form split from the per-role shares", () => {
    // Peer 30 at 60/40 and teacher 35 at 70/30; inspector and TA all criteria.
    const weights = setCriteriaShare(
      setCriteriaShare(demoWeights(), "student", 60),
      "teacher",
      70,
    );

    const summary = summariseWeights(weights);

    // criteria = 30*.6 + 20*1 + 35*.7 + 15*1 = 18 + 20 + 24.5 + 15 = 77.5
    expect(summary.effectiveCriteriaPercent).toBe(77.5);
    // ranking = 30*.4 + 35*.3 = 12 + 10.5 = 22.5
    expect(summary.effectiveRankingPercent).toBe(22.5);
    // The two halves account for the whole blend and nothing more.
    expect(
      summary.effectiveCriteriaPercent + summary.effectiveRankingPercent,
    ).toBeCloseTo(summary.totalPercent, 10);
  });

  it("reports a shortfall rather than silently rescaling", () => {
    // An administrator part-way through editing. The screen has to be able to
    // say "20% remaining"; quietly normalising here would hide the mistake.
    const weights = setRoleWeight(demoWeights(), "teacher", 15);

    const summary = summariseWeights(weights);

    expect(summary.totalPercent).toBe(80);
    expect(summary.remainingPercent).toBe(20);
    expect(summary.balanced).toBe(false);
  });

  it("reports an over-allocated blend as a negative remainder", () => {
    const weights = setRoleWeight(demoWeights(), "teacher", 60);

    const summary = summariseWeights(weights);

    expect(summary.totalPercent).toBe(125);
    expect(summary.remainingPercent).toBe(-25);
    expect(summary.balanced).toBe(false);
  });

  it("ignores a disabled role entirely", () => {
    const weights = demoWeights().map((weight) =>
      weight.role === "ta" ? { ...weight, enabled: false } : weight,
    );

    const summary = summariseWeights(weights);

    expect(summary.totalPercent).toBe(85);
    expect(summary.enabledRoleCount).toBe(3);
  });
});

describe("setRoleEnabled", () => {
  it("renormalises the survivors so the blend still totals 100", () => {
    const weights = setRoleEnabled(demoWeights(), "ta", false);

    // 30/20/35 of 85, rescaled: the proportions between them are preserved.
    expect(summariseWeights(weights).totalPercent).toBe(100);
    expect(summariseWeights(weights).balanced).toBe(true);

    const byRole = new Map(weights.map((weight) => [weight.role, weight]));
    expect(byRole.get("student")?.weightPercent).toBeCloseTo(35.29, 2);
    expect(byRole.get("inspector")?.weightPercent).toBeCloseTo(23.53, 2);
    // The teacher absorbs the rounding residue, so it is the one that moves off
    // its exact share to make the four figures total 100 exactly.
    expect(byRole.get("teacher")?.weightPercent).toBeCloseTo(41.18, 2);
  });

  it("leaves a disabled role its old weight so re-enabling restores the blend", () => {
    const off = setRoleEnabled(demoWeights(), "ta", false);
    const ta = off.find((weight) => weight.role === "ta");

    expect(ta?.enabled).toBe(false);
    expect(ta?.weightPercent).toBe(15);
  });

  it("keeps the total at 100 across a toggle off and back on", () => {
    const off = setRoleEnabled(demoWeights(), "ta", false);
    const backOn = setRoleEnabled(off, "ta", true);

    expect(summariseWeights(backOn).balanced).toBe(true);
  });

  it("does not divide by zero when every role is switched off", () => {
    let weights = demoWeights();
    for (const role of ["student", "inspector", "teacher", "ta"] as const) {
      weights = setRoleEnabled(weights, role, false);
    }

    expect(weights.every((weight) => Number.isFinite(weight.weightPercent))).toBe(true);
    expect(summariseWeights(weights).totalPercent).toBe(0);
    expect(summariseWeights(weights).enabledRoleCount).toBe(0);
  });

  it("spreads evenly when the enabled roles all sit at zero", () => {
    const zeroed: RoleWeight[] = demoWeights().map((weight) => ({
      ...weight,
      weightPercent: 0,
    }));

    const normalised = normaliseWeights(zeroed);

    expect(summariseWeights(normalised).totalPercent).toBe(100);
    expect(normalised.every((weight) => weight.weightPercent === 25)).toBe(true);
  });
});

describe("setRoleWeight and setCriteriaShare", () => {
  it("clamps a weight into 0-100 rather than accepting nonsense", () => {
    expect(setRoleWeight(demoWeights(), "ta", 250).find((w) => w.role === "ta")?.weightPercent).toBe(
      100,
    );
    expect(setRoleWeight(demoWeights(), "ta", -40).find((w) => w.role === "ta")?.weightPercent).toBe(
      0,
    );
  });

  it("treats a non-finite input as zero instead of poisoning the blend", () => {
    const weights = setRoleWeight(demoWeights(), "ta", Number.NaN);

    expect(weights.find((weight) => weight.role === "ta")?.weightPercent).toBe(0);
    expect(Number.isFinite(summariseWeights(weights).totalPercent)).toBe(true);
  });

  it("does not mutate the input", () => {
    const original = demoWeights();
    setRoleWeight(original, "ta", 99);
    setRoleEnabled(original, "ta", false);

    expect(original.find((weight) => weight.role === "ta")?.weightPercent).toBe(15);
    expect(original.find((weight) => weight.role === "ta")?.enabled).toBe(true);
  });
});
