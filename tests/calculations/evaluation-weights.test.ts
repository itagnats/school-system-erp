import { describe, expect, it } from "vitest";
import {
  addAssessee,
  normalizeWeights,
  relationIsPossible,
  relationsWithoutQuestions,
  removeAssessee,
  setAssessorCriteria,
  setAssessorEnabled,
  setAssessorRankingShare,
  setAssessorWeight,
  summarizeWeights,
  threeSixtySharePercent,
  unbalancedAssessees,
} from "@/lib/calculations";
import { EVALUATION_CRITERIA, EVALUATION_ROLES, isGradedRole } from "@/types";
import type { AssesseeConfig, EvaluationCriterion } from "@/types";

/**
 * The blend and the question sets (direction.md §16, §18, §20).
 *
 * These tests pin three decisions from 2026-09-06: an ordering is a share of
 * each assessor's own weight rather than a fifth assessor; each relation is
 * asked a subset of one canonical criteria list; and **an assessee is a role**,
 * so a setup carries one blend per assessee rather than one overall.
 *
 * The tests that matter are the ones about being misconfigured - an unbalanced
 * card, a disabled assessor, an assessor paid for a form it is asked nothing
 * about - because those are the states a real administrator produces and a demo
 * dataset never will.
 */

const ALL: EvaluationCriterion[] = [...EVALUATION_CRITERIA];

/** A student assessee carrying the demo default blend. */
function studentAssessee(): AssesseeConfig {
  return {
    role: "student",
    selfEvaluation: false,
    assessors: [
      { role: "inspector", enabled: true, weightPercent: 20, rankingSharePercent: 0, criteria: [...ALL] },
      { role: "teacher", enabled: true, weightPercent: 35, rankingSharePercent: 0, criteria: [...ALL] },
      { role: "ta", enabled: true, weightPercent: 15, rankingSharePercent: 0, criteria: [...ALL] },
      { role: "student", enabled: true, weightPercent: 30, rankingSharePercent: 0, criteria: [...ALL] },
    ],
  };
}

/** A teacher assessee: upward feedback, no ordering. */
function teacherAssessee(): AssesseeConfig {
  return {
    role: "teacher",
    selfEvaluation: false,
    assessors: [
      { role: "student", enabled: true, weightPercent: 70, rankingSharePercent: 0, criteria: ["communication"] },
      { role: "ta", enabled: true, weightPercent: 30, rankingSharePercent: 0, criteria: ["teamwork"] },
    ],
  };
}

function setup(): AssesseeConfig[] {
  return [studentAssessee(), teacherAssessee()];
}

describe("isGradedRole", () => {
  it("grades students and nobody else", () => {
    // §21-22 stay student-only: ordering a teacher against a cohort of students
    // and handing them a letter answers no question anyone asked.
    expect(isGradedRole("student")).toBe(true);
    expect(isGradedRole("teacher")).toBe(false);
    expect(isGradedRole("ta")).toBe(false);
    expect(isGradedRole("inspector")).toBe(false);
  });
});

describe("relationIsPossible", () => {
  it("allows peer assessment - a matching pair is not self-assessment", () => {
    // The center of the whole feature (direction.md 16). An earlier version of
    // this rule refused every matching pair, which killed peer assessment and
    // made the server reject its own seed data. "Nobody assesses themselves" is
    // about people; peers share a role.
    expect(relationIsPossible("student", "student")).toBe(true);
  });

  it("refuses a matching pair where the role holds one person", () => {
    // One teacher and one TA per course-semester, so a same-role staff pair
    // could only ever mean the same human.
    expect(relationIsPossible("teacher", "teacher")).toBe(false);
    expect(relationIsPossible("ta", "ta")).toBe(false);
    expect(relationIsPossible("inspector", "inspector")).toBe(false);
  });

  it("lets an inspector assess only a student", () => {
    // An inspector is a student borrowed from another group. There is no second
    // staffroom to borrow a teacher from.
    expect(relationIsPossible("student", "inspector")).toBe(true);
    expect(relationIsPossible("teacher", "inspector")).toBe(false);
    expect(relationIsPossible("ta", "inspector")).toBe(false);
  });

  it("allows staff to assess students and each other", () => {
    expect(relationIsPossible("student", "teacher")).toBe(true);
    expect(relationIsPossible("teacher", "student")).toBe(true);
    expect(relationIsPossible("teacher", "ta")).toBe(true);
    expect(relationIsPossible("ta", "teacher")).toBe(true);
  });
});

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

describe("summarizeWeights", () => {
  it("reports each assessee's own blend as balanced", () => {
    const [student, teacher] = setup();

    expect(summarizeWeights(student.assessors).totalPercent).toBe(100);
    expect(summarizeWeights(student.assessors).enabledAssessorCount).toBe(4);
    // The teacher card totals 100 across two assessors, entirely separately.
    expect(summarizeWeights(teacher.assessors).totalPercent).toBe(100);
    expect(summarizeWeights(teacher.assessors).enabledAssessorCount).toBe(2);
  });

  it("derives the effective form split from the per-assessor shares", () => {
    let assessees = setAssessorRankingShare(setup(), "student", "student", 40);
    assessees = setAssessorRankingShare(assessees, "student", "teacher", 30);
    assessees = setAssessorRankingShare(assessees, "student", "inspector", 30);

    const summary = summarizeWeights(assessees[0].assessors);

    // 360 = 30*.6 + 20*.7 + 35*.7 + 15*1 = 18 + 14 + 24.5 + 15 = 71.5
    expect(summary.effective360Percent).toBe(71.5);
    expect(summary.effectiveRankingPercent).toBe(28.5);
    expect(summary.effective360Percent + summary.effectiveRankingPercent).toBeCloseTo(
      summary.totalPercent,
      10,
    );
  });

  it("reports a shortfall rather than silently rescaling", () => {
    const assessees = setAssessorWeight(setup(), "student", "teacher", 15);

    const summary = summarizeWeights(assessees[0].assessors);
    expect(summary.totalPercent).toBe(80);
    expect(summary.remainingPercent).toBe(20);
    expect(summary.balanced).toBe(false);
  });

  it("reports an over-allocated card as a negative remainder", () => {
    const assessees = setAssessorWeight(setup(), "student", "teacher", 60);

    expect(summarizeWeights(assessees[0].assessors).remainingPercent).toBe(-25);
  });
});

describe("editing addresses the assessee-assessor pair", () => {
  it("changes only the named card", () => {
    // Both cards have a "student" assessor. Addressing by assessor alone was
    // the shape before assessees existed and would edit both.
    const assessees = setAssessorWeight(setup(), "teacher", "student", 55);

    const studentCard = assessees.find((a) => a.role === "student");
    const teacherCard = assessees.find((a) => a.role === "teacher");

    expect(
      teacherCard?.assessors.find((a) => a.role === "student")?.weightPercent,
    ).toBe(55);
    // Untouched, at its original 30.
    expect(
      studentCard?.assessors.find((a) => a.role === "student")?.weightPercent,
    ).toBe(30);
  });

  it("sets a question set on one relation only", () => {
    const assessees = setAssessorCriteria(
      setup(),
      "teacher",
      "student",
      ["leadership", "communication"],
      ALL,
    );

    const teacherCard = assessees.find((a) => a.role === "teacher");
    const studentCard = assessees.find((a) => a.role === "student");

    // Canonical order, not the order clicked.
    expect(teacherCard?.assessors.find((a) => a.role === "student")?.criteria).toEqual([
      "communication",
      "leadership",
    ]);
    expect(studentCard?.assessors.find((a) => a.role === "student")?.criteria).toEqual(ALL);
  });

  it("does not mutate the input", () => {
    const original = setup();
    setAssessorWeight(original, "student", "teacher", 99);
    setAssessorEnabled(original, "student", "ta", false);
    setAssessorCriteria(original, "student", "ta", [], ALL);

    const ta = original[0].assessors.find((a) => a.role === "ta");
    expect(ta?.weightPercent).toBe(15);
    expect(ta?.enabled).toBe(true);
    expect(ta?.criteria).toEqual(ALL);
  });
});

describe("setAssessorEnabled", () => {
  it("renormalizes the survivors within that card only", () => {
    const assessees = setAssessorEnabled(setup(), "student", "ta", false);
    const student = assessees[0].assessors;

    expect(summarizeWeights(student).totalPercent).toBe(100);

    const byRole = new Map(student.map((a) => [a.role, a]));
    expect(byRole.get("student")?.weightPercent).toBeCloseTo(35.29, 2);
    expect(byRole.get("inspector")?.weightPercent).toBeCloseTo(23.53, 2);
    // The teacher absorbs the rounding residue so the figures total 100 exactly.
    expect(byRole.get("teacher")?.weightPercent).toBeCloseTo(41.18, 2);
    // The teacher card is untouched.
    expect(summarizeWeights(assessees[1].assessors).totalPercent).toBe(100);
  });

  it("leaves a disabled assessor its weight and question set", () => {
    const off = setAssessorEnabled(setup(), "student", "ta", false);
    const ta = off[0].assessors.find((a) => a.role === "ta");

    expect(ta?.enabled).toBe(false);
    expect(ta?.weightPercent).toBe(15);
    expect(ta?.criteria).toEqual(ALL);
  });

  it("keeps the card balanced across a toggle off and back on", () => {
    const off = setAssessorEnabled(setup(), "student", "ta", false);
    const backOn = setAssessorEnabled(off, "student", "ta", true);

    expect(summarizeWeights(backOn[0].assessors).balanced).toBe(true);
  });

  it("does not divide by zero when every assessor is switched off", () => {
    let assessees = setup();
    for (const role of ["student", "inspector", "teacher", "ta"] as const) {
      assessees = setAssessorEnabled(assessees, "student", role, false);
    }

    const student = assessees[0].assessors;
    expect(student.every((a) => Number.isFinite(a.weightPercent))).toBe(true);
    expect(summarizeWeights(student).totalPercent).toBe(0);
  });

  it("spreads evenly when the enabled assessors all sit at zero", () => {
    const zeroed = studentAssessee().assessors.map((a) => ({ ...a, weightPercent: 0 }));

    const normalized = normalizeWeights(zeroed);

    expect(summarizeWeights(normalized).totalPercent).toBe(100);
    expect(normalized.every((a) => a.weightPercent === 25)).toBe(true);
  });
});

describe("setAssessorWeight clamping", () => {
  it("clamps into 0-100 rather than accepting nonsense", () => {
    const high = setAssessorWeight(setup(), "student", "ta", 250);
    const low = setAssessorWeight(setup(), "student", "ta", -40);

    expect(high[0].assessors.find((a) => a.role === "ta")?.weightPercent).toBe(100);
    expect(low[0].assessors.find((a) => a.role === "ta")?.weightPercent).toBe(0);
  });

  it("treats a non-finite input as zero instead of poisoning the blend", () => {
    const assessees = setAssessorWeight(setup(), "student", "ta", Number.NaN);

    expect(assessees[0].assessors.find((a) => a.role === "ta")?.weightPercent).toBe(0);
    expect(Number.isFinite(summarizeWeights(assessees[0].assessors).totalPercent)).toBe(
      true,
    );
  });
});

describe("addAssessee and removeAssessee", () => {
  it("adds a card with every possible assessor present but switched off", () => {
    const card = addAssessee([], "ta", EVALUATION_ROLES)[0];

    expect(card.role).toBe("ta");
    expect(card.selfEvaluation).toBe(false);
    // Its own role is absent (one TA), and so is inspector - a borrowed student
    // only assesses students.
    expect(card.assessors.map((a) => a.role).sort()).toEqual(["student", "teacher"]);
    expect(card.assessors.every((a) => !a.enabled)).toBe(true);
    expect(card.assessors.every((a) => a.criteria.length === 0)).toBe(true);
  });

  it("offers a student all four roles, its own included, so peers can assess", () => {
    const card = addAssessee([], "student", EVALUATION_ROLES)[0];

    expect(card.assessors.map((a) => a.role).sort()).toEqual([
      "inspector",
      "student",
      "ta",
      "teacher",
    ]);
  });

  it("refuses to add the same role twice", () => {
    const once = addAssessee([], "student", EVALUATION_ROLES);

    expect(addAssessee(once, "student", EVALUATION_ROLES)).toHaveLength(1);
  });

  it("removes a card by role and leaves the rest", () => {
    const remaining = removeAssessee(setup(), "teacher");

    expect(remaining.map((a) => a.role)).toEqual(["student"]);
  });
});

describe("relationsWithoutQuestions", () => {
  it("finds an assessor weighted for the 360 form with nothing to ask", () => {
    const assessees = setAssessorCriteria(setup(), "student", "ta", [], ALL);

    expect(relationsWithoutQuestions(assessees[0])).toEqual(["ta"]);
    // The card still totals 100, which is why this needs its own check: a
    // balanced blend can still be unable to produce a score.
    expect(summarizeWeights(assessees[0].assessors).balanced).toBe(true);
  });

  it("does not flag an assessor that only submits an ordering", () => {
    let assessees = setAssessorRankingShare(setup(), "student", "ta", 100);
    assessees = setAssessorCriteria(assessees, "student", "ta", [], ALL);

    expect(relationsWithoutQuestions(assessees[0])).toEqual([]);
  });

  it("does not flag a disabled assessor", () => {
    let assessees = setAssessorCriteria(setup(), "student", "ta", [], ALL);
    assessees = setAssessorEnabled(assessees, "student", "ta", false);

    expect(relationsWithoutQuestions(assessees[0])).toEqual([]);
  });

  it("finds nothing wrong with the demo default", () => {
    expect(relationsWithoutQuestions(studentAssessee())).toEqual([]);
    expect(relationsWithoutQuestions(teacherAssessee())).toEqual([]);
  });
});

describe("unbalancedAssessees", () => {
  it("names only the cards that do not total 100", () => {
    const assessees = setAssessorWeight(setup(), "teacher", "ta", 10);

    // The student card is untouched and still balanced.
    expect(unbalancedAssessees(assessees)).toEqual(["teacher"]);
  });

  it("is empty for the demo default", () => {
    expect(unbalancedAssessees(setup())).toEqual([]);
  });

  it("treats a setup with no assessees as balanced, not broken", () => {
    // Nothing is misconfigured; nobody is assessed yet. Readiness reports that
    // separately, as "not configured".
    expect(unbalancedAssessees([])).toEqual([]);
  });
});
