import { DEFAULT_ASSESSEE_CONFIG } from "@/config/app";
import type { AssesseeConfig, EvaluationSetup } from "@/types";

/**
 * Fictional evaluation fixtures (scaffold.md §12).
 *
 * The hand-written rows here are the top of the generated dataset and keep
 * their ids, so a reader who has read this file recognises the first rows of
 * Manage Evaluation.
 */

/**
 * The demo default: three assessee cards.
 *
 * The configuration itself lives in `config/app.ts`, because the setup screen
 * offers it as "Use defaults" and a client cannot import fixtures. Here it is
 * only cloned into the hand-written setups.
 *
 * A student carries the blend from direction.md 20 - peer 30, inspector 20,
 * teacher 35, TA 15 - with per-relation ranking shares, so roughly 71.5% of a
 * student's score comes from the 360 form and 28.5% from submitted orderings.
 *
 * A teacher and a TA are assessed too, and neither is ranked: ordering staff
 * against each other answers no question anyone asked, so their ranking shares
 * are zero. Their results stop at a feedback report - no rank, no grade.
 */
export const DEFAULT_ASSESSEES: readonly AssesseeConfig[] =
  DEFAULT_ASSESSEE_CONFIG.map((assessee) => ({
    role: assessee.role,
    selfEvaluation: false,
    assessors: assessee.assessors.map((assessor) => ({
      ...assessor,
      criteria: [...assessor.criteria],
    })),
  }));

/**
 * Students only, and no ordering anywhere.
 *
 * The configuration that produces the "not used" mark on the ranking column,
 * and the one that shows a single-assessee setup reading correctly.
 */
export const STUDENT_ONLY_ASSESSEES: readonly AssesseeConfig[] = [
  {
    role: "student",
    selfEvaluation: false,
    assessors: DEFAULT_ASSESSEES[0].assessors.map((a) => ({
      ...a,
      rankingSharePercent: 0,
      criteria: [...a.criteria],
    })),
  },
];

/** A student cohort with no teaching assistant, renormalised across the rest. */
export const NO_TA_ASSESSEES: readonly AssesseeConfig[] = [
  {
    role: "student",
    selfEvaluation: false,
    assessors: DEFAULT_ASSESSEES[0].assessors.map((a) => {
      const weights: Record<string, number> = {
        student: 35.29,
        inspector: 23.53,
        teacher: 41.18,
        ta: 15,
      };
      return {
        ...a,
        enabled: a.role !== "ta",
        weightPercent: weights[a.role] ?? a.weightPercent,
        criteria: [...a.criteria],
      };
    }),
  },
];

/**
 * Default instructions shown beside an evaluator's form.
 *
 * Deliberately about how to judge rather than how to operate the widget: an
 * evaluator who needs to be told what a text field is has a different problem.
 */
export const DEFAULT_GUIDANCE = [
  "Rate what you have seen, not what you assume. If you have not worked closely with someone on a criterion, say so in the comment rather than guessing a middle score.",
  "The scale runs 1 to 5. A 3 is good work that met the brief; reserve 5 for contribution that measurably lifted the whole group.",
  "Judge the contribution, not the person. Confidence, volume and social ease are not the same as participation.",
  "Your ordering is read alongside your ratings, not instead of them. Put the strongest contributor first.",
  "Submissions are visible to the teacher with your name attached. They are never shown to the student you evaluated.",
].join("\n\n");

/**
 * Hand-written setups.
 *
 * Three rows chosen to put three different configurations at the top of the
 * table: a balanced open window, one with the ranking form switched off, and
 * one running without a teaching assistant.
 */
export const mockEvaluationSetups: EvaluationSetup[] = [
  {
    id: "evs-it101-202601",
    courseId: "crs-it101",
    semesterCode: "202601",
    name: "IT101 360 Evaluation 202601",
    shortName: "IT101-EV1",
    status: "published",
    editingLocked: true,
    opensOn: "2026-02-02T00:00:00.000Z",
    closesOn: "2026-02-27T00:00:00.000Z",
    reportDate: "2026-03-06T00:00:00.000Z",
    scaleMax: 5,
    guidance: DEFAULT_GUIDANCE,
    assessees: cloneAssessees(DEFAULT_ASSESSEES),
  },
  {
    id: "evs-it101-202602",
    courseId: "crs-it101",
    semesterCode: "202602",
    name: "IT101 360 Evaluation 202602",
    shortName: "IT101-EV2",
    status: "open",
    editingLocked: false,
    opensOn: "2026-07-06T00:00:00.000Z",
    closesOn: "2026-07-31T00:00:00.000Z",
    reportDate: "2026-08-07T00:00:00.000Z",
    scaleMax: 5,
    guidance: DEFAULT_GUIDANCE,
    assessees: cloneAssessees(STUDENT_ONLY_ASSESSEES),
  },
  {
    id: "evs-it205-202602",
    courseId: "crs-it205",
    semesterCode: "202602",
    name: "IT205 360 Evaluation 202602",
    shortName: "IT205-EV1",
    status: "draft",
    editingLocked: false,
    opensOn: "2026-07-06T00:00:00.000Z",
    closesOn: "2026-07-31T00:00:00.000Z",
    reportDate: "2026-08-07T00:00:00.000Z",
    scaleMax: 5,
    guidance: DEFAULT_GUIDANCE,
    assessees: cloneAssessees(NO_TA_ASSESSEES),
  },
];

/**
 * Deep-copy an assessee configuration.
 *
 * Two levels of array, so a shallow spread would leave every setup sharing one
 * assessor list and one question-set instance - an edit to one would silently
 * change the rest.
 */
export function cloneAssessees(
  assessees: readonly AssesseeConfig[],
): AssesseeConfig[] {
  return assessees.map((assessee) => ({
    ...assessee,
    assessors: assessee.assessors.map((a) => ({ ...a, criteria: [...a.criteria] })),
  }));
}
