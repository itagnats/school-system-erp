import type {
  EvaluationCriterion,
  EvaluationSetup,
  EvaluatorRole,
  RoleConfig,
} from "@/types";

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
 *   peers      answer and rank - they see each other work every week
 *   inspector  mostly answers; an outsider can compare but knows less context
 *   teacher    answers and ranks, with the heaviest single weight
 *   TA         answers only - a TA sees the work, not the whole cohort
 *
 * Effective split works out at roughly 71.5% on the 360 form to 28.5% on the
 * ordering. That figure is derived by `summariseWeights`, never typed in.
 */
/**
 * Which criteria each role is asked on the 360 form - the default question sets.
 *
 * Decided 2026-09-06: one canonical list of seven (direction.md 18), and each
 * role is asked the subset it can actually judge. The alternative, a separately
 * worded set per role, was rejected because a criterion would then mean
 * something slightly different depending on who answered it and the scores
 * would stop being comparable.
 *
 *                     Peer  Insp  Teach  TA
 *   Participation       x     x      x    x
 *   Teamwork            x     x      x    x
 *   Communication       x     x      x    x
 *   Problem solving     x     -      x    x
 *   Responsibility      x     x      x    -
 *   Leadership          x     x      x    -
 *   Technical contrib.  -     -      x    x
 *
 * The gaps are the interesting part. An inspector meets the group once, so it is
 * not asked to judge problem solving. A TA sees the work rather than the whole
 * cohort, so it is not asked about responsibility or leadership. Peers are not
 * asked to grade technical contribution, which is the teacher's and the TA's
 * judgement to make. Only the teacher answers all seven.
 */
export const DEFAULT_ROLE_CRITERIA: Record<EvaluatorRole, EvaluationCriterion[]> = {
  student: [
    "participation",
    "teamwork",
    "communication",
    "problemSolving",
    "responsibility",
    "leadership",
  ],
  inspector: [
    "participation",
    "teamwork",
    "communication",
    "responsibility",
    "leadership",
  ],
  teacher: [
    "participation",
    "teamwork",
    "communication",
    "problemSolving",
    "responsibility",
    "leadership",
    "technicalContribution",
  ],
  ta: [
    "participation",
    "teamwork",
    "communication",
    "problemSolving",
    "technicalContribution",
  ],
};

export const DEFAULT_ROLE_CONFIG: readonly RoleConfig[] = [
  { role: "student", enabled: true, weightPercent: 30, rankingSharePercent: 40, criteria: DEFAULT_ROLE_CRITERIA.student },
  { role: "inspector", enabled: true, weightPercent: 20, rankingSharePercent: 30, criteria: DEFAULT_ROLE_CRITERIA.inspector },
  { role: "teacher", enabled: true, weightPercent: 35, rankingSharePercent: 30, criteria: DEFAULT_ROLE_CRITERIA.teacher },
  { role: "ta", enabled: true, weightPercent: 15, rankingSharePercent: 0, criteria: DEFAULT_ROLE_CRITERIA.ta },
];

/**
 * A blend that uses the 360 form only.
 *
 * Kept as a named fixture rather than assembled inline because it is the
 * configuration that produces the "not used" mark on the ranking column: a
 * course whose evaluation asks for no ordering at all.
 */
export const THREE_SIXTY_ONLY_CONFIG: readonly RoleConfig[] = DEFAULT_ROLE_CONFIG.map(
  (role) => ({ ...role, rankingSharePercent: 0 }),
);

/** A blend with no teaching assistant, renormalised across the other three. */
export const NO_TA_CONFIG: readonly RoleConfig[] = [
  { role: "student", enabled: true, weightPercent: 35.29, rankingSharePercent: 40, criteria: DEFAULT_ROLE_CRITERIA.student },
  { role: "inspector", enabled: true, weightPercent: 23.53, rankingSharePercent: 30, criteria: DEFAULT_ROLE_CRITERIA.inspector },
  { role: "teacher", enabled: true, weightPercent: 41.18, rankingSharePercent: 30, criteria: DEFAULT_ROLE_CRITERIA.teacher },
  { role: "ta", enabled: false, weightPercent: 15, rankingSharePercent: 0, criteria: DEFAULT_ROLE_CRITERIA.ta },
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
    roles: cloneRoles(DEFAULT_ROLE_CONFIG),
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
    roles: cloneRoles(THREE_SIXTY_ONLY_CONFIG),
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
    roles: cloneRoles(NO_TA_CONFIG),
  },
];

/**
 * Deep-copy a role configuration.
 *
 * `criteria` is an array, so a shallow spread would leave every setup sharing
 * one question-set instance and an edit to one would silently change the rest.
 */
function cloneRoles(roles: readonly RoleConfig[]): RoleConfig[] {
  return roles.map((role) => ({ ...role, criteria: [...role.criteria] }));
}
