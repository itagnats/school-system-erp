import type { EvaluationSetup, RoleWeight } from "@/types";

/**
 * Fictional evaluation fixtures (scaffold.md §12).
 *
 * The hand-written rows here are the top of the generated dataset and keep
 * their ids, so a reader who has read this file recognises the first rows of
 * Manage Evaluation.
 */

/**
 * The demo default blend (direction.md §20), carrying the split decided on
 * 2026-09-06: each role's weight divides between its criteria ratings and its
 * submitted ordering rather than the ordering being a fifth evaluator.
 *
 * The per-role splits are not uniform, and that is the point of the default:
 *
 *   peers      rate and rank - they see each other work every week
 *   inspector  mostly rates; an outsider can compare but knows less context
 *   teacher    rates and ranks, with the heaviest single weight
 *   TA         rates only - a TA sees the work, not the whole cohort
 *
 * Effective split works out at roughly 71.5% criteria to 28.5% ordering. That
 * figure is derived by `summariseWeights`, never typed in.
 */
export const DEFAULT_ROLE_WEIGHTS: readonly RoleWeight[] = [
  { role: "student", enabled: true, weightPercent: 30, criteriaSharePercent: 60 },
  { role: "inspector", enabled: true, weightPercent: 20, criteriaSharePercent: 70 },
  { role: "teacher", enabled: true, weightPercent: 35, criteriaSharePercent: 70 },
  { role: "ta", enabled: true, weightPercent: 15, criteriaSharePercent: 100 },
];

/**
 * A blend that uses criteria ratings only.
 *
 * Kept as a named fixture rather than assembled inline because it is the
 * configuration that produces the "not applicable" state on the ranking column:
 * a course whose evaluation asks for no ordering at all.
 */
export const CRITERIA_ONLY_WEIGHTS: readonly RoleWeight[] = DEFAULT_ROLE_WEIGHTS.map(
  (weight) => ({ ...weight, criteriaSharePercent: 100 }),
);

/** A blend with no teaching assistant, renormalised across the other three. */
export const NO_TA_WEIGHTS: readonly RoleWeight[] = [
  { role: "student", enabled: true, weightPercent: 35.29, criteriaSharePercent: 60 },
  { role: "inspector", enabled: true, weightPercent: 23.53, criteriaSharePercent: 70 },
  { role: "teacher", enabled: true, weightPercent: 41.18, criteriaSharePercent: 70 },
  { role: "ta", enabled: false, weightPercent: 15, criteriaSharePercent: 100 },
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
    weights: DEFAULT_ROLE_WEIGHTS.map((weight) => ({ ...weight })),
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
    weights: CRITERIA_ONLY_WEIGHTS.map((weight) => ({ ...weight })),
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
    weights: NO_TA_WEIGHTS.map((weight) => ({ ...weight })),
  },
];
