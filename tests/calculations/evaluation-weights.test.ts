import { describe, expect, it } from "vitest";
import {
  normaliseWeights,
  rolesWithoutQuestions,
  setRankingShare,
  setRoleCriteria,
  setRoleEnabled,
  setRoleWeight,
  summariseWeights,
  threeSixtySharePercent,
} from "@/lib/calculations";
import { EVALUATION_CRITERIA } from "@/types";
import type { EvaluationCriterion, RoleConfig } from "@/types";

/**
 * The weight blend and the question sets (direction.md §18, §20).
 *
 * These tests pin two decisions from 2026-09-06: an ordering is a share of each
 * role's own weight rather than a fifth evaluator, and each role is asked a
 * subset of one canonical criteria list rather than a set of its own.
 *
 * The tests that matter are the ones about being misconfigured - an unbalanced
 * blend, a disabled role, a role paid for a form it is asked nothing about -
 * because those are the states a real administrator produces and a demo dataset
 * never will.
 */

const ALL: EvaluationCriterion[] = [...EVALUATION_CRITERIA];

/** The demo default from direction.md §20, with its per-role question sets. */
function demoRoles(): RoleConfig[] {
  return [
    { role: "student", enabled: true, weightPercent: 30, rankingSharePercent: 0, criteria: [...ALL] },
    { role: "inspector", enabled: true, weightPercent: 20, rankingSharePercent: 0, criteria: [...ALL] },
    { role: "teacher", enabled: true, weightPercent: 35, rankingSharePercent: 0, criteria: [...ALL] },
    { role: "ta", enabled: true, weightPercent: 15, rankingSharePercent: 0, criteria: [...ALL] },
  ];
}

describe("threeSixtySharePercent", () => {
  it("is the complement of the stored ranking share, never stored itself", () => {
    expect(
      threeSixtySharePercent({
        role: "teacher",
        enabled: true,
        weightPercent: 35,
        rankingSharePercent: 30,
        criteria: [...ALL],
      }),
    ).toBe(70);
  });
});

describe("summariseWeights", () => {
  it("reports the demo default as balanced", () => {
    const summary = summariseWeights(demoRoles());

    expect(summary.totalPercent).toBe(100);
    expect(summary.remainingPercent).toBe(0);
    expect(summary.balanced).toBe(true);
    expect(summary.enabledRoleCount).toBe(4);
  });

  it("derives the effective form split from the per-role shares", () => {
    // Peer 30 ranks 40% of its weight, teacher 35 ranks 30%; the rest is all 360.
    const roles = setRankingShare(setRankingShare(demoRoles(), "student", 40), "teacher", 30);

    const summary = summariseWeights(roles);

    // 360 = 30*.6 + 20*1 + 35*.7 + 15*1 = 18 + 20 + 24.5 + 15 = 77.5
    expect(summary.effective360Percent).toBe(77.5);
    // ranking = 30*.4 + 35*.3 = 12 + 10.5 = 22.5
    expect(summary.effectiveRankingPercent).toBe(22.5);
    // The two halves account for the whole blend and nothing more.
    expect(summary.effective360Percent + summary.effectiveRankingPercent).toBeCloseTo(
      summary.totalPercent,
      10,
    );
  });

  it("reports a shortfall rather than silently rescaling", () => {
    // An administrator part-way through editing. The screen has to be able to
    // say "20% remaining"; quietly normalising here would hide the mistake.
    const roles = setRoleWeight(demoRoles(), "teacher", 15);

    const summary = summariseWeights(roles);

    expect(summary.totalPercent).toBe(80);
    expect(summary.remainingPercent).toBe(20);
    expect(summary.balanced).toBe(false);
  });

  it("reports an over-allocated blend as a negative remainder", () => {
    const summary = summariseWeights(setRoleWeight(demoRoles(), "teacher", 60));

    expect(summary.totalPercent).toBe(125);
    expect(summary.remainingPercent).toBe(-25);
    expect(summary.balanced).toBe(false);
  });

  it("ignores a disabled role entirely", () => {
    const roles = demoRoles().map((role) =>
      role.role === "ta" ? { ...role, enabled: false } : role,
    );

    const summary = summariseWeights(roles);

    expect(summary.totalPercent).toBe(85);
    expect(summary.enabledRoleCount).toBe(3);
  });
});

describe("setRoleEnabled", () => {
  it("renormalises the survivors so the blend still totals 100", () => {
    const roles = setRoleEnabled(demoRoles(), "ta", false);

    expect(summariseWeights(roles).totalPercent).toBe(100);
    expect(summariseWeights(roles).balanced).toBe(true);

    const byRole = new Map(roles.map((role) => [role.role, role]));
    expect(byRole.get("student")?.weightPercent).toBeCloseTo(35.29, 2);
    expect(byRole.get("inspector")?.weightPercent).toBeCloseTo(23.53, 2);
    // The teacher absorbs the rounding residue, so it is the one that moves off
    // its exact share to make the four figures total 100 exactly.
    expect(byRole.get("teacher")?.weightPercent).toBeCloseTo(41.18, 2);
  });

  it("leaves a disabled role its weight and question set, so re-enabling restores it", () => {
    const off = setRoleEnabled(demoRoles(), "ta", false);
    const ta = off.find((role) => role.role === "ta");

    expect(ta?.enabled).toBe(false);
    expect(ta?.weightPercent).toBe(15);
    expect(ta?.criteria).toEqual(ALL);
  });

  it("keeps the total at 100 across a toggle off and back on", () => {
    const off = setRoleEnabled(demoRoles(), "ta", false);

    expect(summariseWeights(setRoleEnabled(off, "ta", true)).balanced).toBe(true);
  });

  it("does not divide by zero when every role is switched off", () => {
    let roles = demoRoles();
    for (const role of ["student", "inspector", "teacher", "ta"] as const) {
      roles = setRoleEnabled(roles, role, false);
    }

    expect(roles.every((role) => Number.isFinite(role.weightPercent))).toBe(true);
    expect(summariseWeights(roles).totalPercent).toBe(0);
    expect(summariseWeights(roles).enabledRoleCount).toBe(0);
  });

  it("spreads evenly when the enabled roles all sit at zero", () => {
    const zeroed = demoRoles().map((role) => ({ ...role, weightPercent: 0 }));

    const normalised = normaliseWeights(zeroed);

    expect(summariseWeights(normalised).totalPercent).toBe(100);
    expect(normalised.every((role) => role.weightPercent === 25)).toBe(true);
  });
});

describe("setRoleWeight and setRankingShare", () => {
  it("clamps a weight into 0-100 rather than accepting nonsense", () => {
    expect(
      setRoleWeight(demoRoles(), "ta", 250).find((r) => r.role === "ta")?.weightPercent,
    ).toBe(100);
    expect(
      setRoleWeight(demoRoles(), "ta", -40).find((r) => r.role === "ta")?.weightPercent,
    ).toBe(0);
  });

  it("treats a non-finite input as zero instead of poisoning the blend", () => {
    const roles = setRoleWeight(demoRoles(), "ta", Number.NaN);

    expect(roles.find((role) => role.role === "ta")?.weightPercent).toBe(0);
    expect(Number.isFinite(summariseWeights(roles).totalPercent)).toBe(true);
  });

  it("does not mutate the input", () => {
    const original = demoRoles();
    setRoleWeight(original, "ta", 99);
    setRoleEnabled(original, "ta", false);
    setRoleCriteria(original, "ta", [], ALL);

    const ta = original.find((role) => role.role === "ta");
    expect(ta?.weightPercent).toBe(15);
    expect(ta?.enabled).toBe(true);
    expect(ta?.criteria).toEqual(ALL);
  });
});

describe("setRoleCriteria", () => {
  it("orders the question set canonically, not by the order given", () => {
    const roles = setRoleCriteria(
      demoRoles(),
      "ta",
      ["leadership", "participation", "teamwork"],
      ALL,
    );

    // Canonical order, so two setups asking the same questions serialise the
    // same way and a diff between them is readable.
    expect(roles.find((role) => role.role === "ta")?.criteria).toEqual([
      "participation",
      "teamwork",
      "leadership",
    ]);
  });

  it("drops anything not in the canonical list", () => {
    const roles = setRoleCriteria(
      demoRoles(),
      "ta",
      ["participation", "notACriterion" as EvaluationCriterion],
      ALL,
    );

    expect(roles.find((role) => role.role === "ta")?.criteria).toEqual(["participation"]);
  });

  it("de-duplicates a repeated criterion", () => {
    const roles = setRoleCriteria(demoRoles(), "ta", ["teamwork", "teamwork"], ALL);

    expect(roles.find((role) => role.role === "ta")?.criteria).toEqual(["teamwork"]);
  });

  it("allows an empty set, and leaves it to be reported rather than corrected", () => {
    // Which questions a role should ask is a judgement. Silently restoring a
    // default here would overwrite a deliberate edit mid-keystroke.
    const roles = setRoleCriteria(demoRoles(), "ta", [], ALL);

    expect(roles.find((role) => role.role === "ta")?.criteria).toEqual([]);
  });
});

describe("rolesWithoutQuestions", () => {
  it("finds a role weighted for the 360 form with nothing to ask", () => {
    const roles = setRoleCriteria(demoRoles(), "ta", [], ALL);

    expect(rolesWithoutQuestions(roles).map((role) => role.role)).toEqual(["ta"]);
    // The blend still totals 100, which is exactly why this needs its own check:
    // a balanced blend can still be unable to produce a score.
    expect(summariseWeights(roles).balanced).toBe(true);
  });

  it("does not flag a role that only submits an ordering", () => {
    // 100% of its weight comes from the ordering, so an empty question set is
    // correct rather than broken.
    const roles = setRoleCriteria(
      setRankingShare(demoRoles(), "ta", 100),
      "ta",
      [],
      ALL,
    );

    expect(rolesWithoutQuestions(roles)).toEqual([]);
  });

  it("does not flag a disabled role", () => {
    const roles = setRoleEnabled(setRoleCriteria(demoRoles(), "ta", [], ALL), "ta", false);

    expect(rolesWithoutQuestions(roles)).toEqual([]);
  });

  it("finds nothing wrong with the demo default", () => {
    expect(rolesWithoutQuestions(demoRoles())).toEqual([]);
  });
});
