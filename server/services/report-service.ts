import "server-only";

import {
  calculateEvaluationScore,
  clamp,
  rankingScoreFor,
  round,
  type RoleSubmission,
} from "@/lib/calculations";
import { EVALUATION_ROLES, isGradedRole } from "@/types";
import {
  courseTable,
  enrollmentTable,
  evaluationGroupTable,
  evaluationSetupTable,
  studentTable,
} from "@/server/repositories";
import { toSummary } from "./student-service";
import type {
  AssesseeConfig,
  CriterionBreakdown,
  EvaluationCriterion,
  EvaluationGroup,
  EvaluationResultRow,
  EvaluationResults,
  EvaluationRole,
  EvaluationSetup,
  EvaluatorFeedback,
  StudentReport,
} from "@/types";

/**
 * Scores and reports (direction.md §20-23).
 *
 * ## Where the ratings come from
 *
 * Writes are not persisted (docs/decisions/why-bff.md), so there are no
 * submitted evaluations to average. Every rating here is **derived from a hash
 * of the ids it belongs to** - subject, assessor role and criterion - which
 * gives a dataset with three properties the report needs:
 *
 *   - it is stable, so a report reloaded is the same report, and the server and
 *     client renders cannot disagree;
 *   - it varies per criterion and per role, so the radar has a shape and the
 *     role breakdown has something to break down;
 *   - some roles have not reported at all, so coverage is genuinely below 100
 *     somewhere and the provisional-score path is exercised.
 *
 * `Math.random()` would satisfy none of those. This is the same technique the
 * queue uses for `completedCount`, for the same reason.
 *
 * **It is demo data and nothing else.** No real assessment produced these
 * numbers, and the report says so on its face.
 */

/** The pass mark, on the rating scale (from the reference report). */
export const PASS_THRESHOLD = 4;

/** Deterministic 0-1 from a string. Mulberry-ish, small enough to read. */
function hashUnit(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100_003) / 100_003;
}

/**
 * Whether a role has submitted anything about a subject.
 *
 * Roughly one relation in six is left unreported, which is what puts a real
 * provisional score in the dataset. A report where coverage is always 100%
 * never exercises the wording that matters most.
 */
function hasSubmitted(subjectId: string, role: EvaluationRole): boolean {
  return hashUnit(`submitted:${subjectId}:${role}`) > 0.16;
}

/**
 * A subject's baseline, before any single rating.
 *
 * This exists because the first version of the generator varied every *rating*
 * but gave every *subject* the same distribution to draw from. Averaging seven
 * criteria across four roles then pulled every subject to within a whisker of
 * the same mean, and the result was a results table where **all 28 subjects
 * failed** - arithmetically correct and completely uninformative, since it
 * demonstrated neither outcome.
 *
 * Varying the subject is what spreads the means across the scale. Same failure
 * shape as the programme margins that all came out at 98%: the numbers were
 * never wrong, the distribution was.
 */
function baselineFor(subjectId: string, scaleMax: number): number {
  const unit = hashUnit(`ability:${subjectId}`);
  // Spans most of the usable scale, so some subjects clear a pass mark of 4 and
  // some are nowhere near it.
  const lo = 1 + (scaleMax - 1) * 0.3;
  const hi = 1 + (scaleMax - 1) * 0.98;
  return lo + unit * (hi - lo);
}

/**
 * One rating: the subject's baseline, jittered per role and criterion.
 *
 * The jitter is what gives the radar a shape and lets two roles disagree. It is
 * deliberately smaller than the spread between subjects, so a subject's overall
 * standing survives the averaging while individual criteria still differ.
 */
function ratingFor(
  subjectId: string,
  role: EvaluationRole,
  criterion: EvaluationCriterion,
  scaleMax: number,
): number {
  const jitter = (hashUnit(`rate:${subjectId}:${role}:${criterion}`) - 0.5) * 1.1;
  return round(clamp(baselineFor(subjectId, scaleMax) + jitter, 1, scaleMax), 2);
}

/**
 * Where this subject sits in one assessor's ordering.
 *
 * Derived from the baseline so it correlates with the ratings, with a little
 * role-specific disagreement - two assessors who ordered a group identically
 * would make the ordering redundant.
 */
function positionFor(
  subjectId: string,
  role: EvaluationRole,
  cohortSize: number,
  scaleMax: number,
): number {
  const standing = (baselineFor(subjectId, scaleMax) - 1) / (scaleMax - 1);
  const disagreement = (hashUnit(`order:${subjectId}:${role}`) - 0.5) * 0.25;
  const fraction = clamp(1 - standing + disagreement, 0, 1);
  return 1 + Math.round(fraction * Math.max(0, cohortSize - 1));
}

function groupsInScope(setup: EvaluationSetup): EvaluationGroup[] {
  return evaluationGroupTable
    .filter((g) => g.courseId === setup.courseId && g.semesterCode === setup.semesterCode)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The subjects one assessee role covers, in a stable order. */
function subjectsFor(
  setup: EvaluationSetup,
  role: EvaluationRole,
): Array<{ id: string; displayName: string; groupName?: string }> {
  if (role === "student" || role === "inspector") {
    return groupsInScope(setup)
      .flatMap((group) =>
        group.memberEnrollmentIds.map((id) => ({
          id,
          displayName: displayNameFor(id),
          groupName: group.name,
        })),
      )
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  const course = courseTable.find((row) => row.id === setup.courseId);
  const label = role === "teacher" ? "teacher" : "TA";
  return [
    {
      id: `staff-${setup.id}-${role}`,
      displayName: `${course?.code ?? setup.courseId} ${label}`,
    },
  ];
}

function displayNameFor(enrollmentId: string): string {
  const enrollment = enrollmentTable.find((row) => row.id === enrollmentId);
  if (!enrollment) return "Unknown";
  const student = studentTable.find((row) => row.id === enrollment.studentId);
  return student
    ? `${student.personal.firstName} ${student.personal.lastName}`
    : "Unknown";
}

/**
 * What each assessor role submitted about one subject.
 *
 * A role's 360 figure is the mean over the criteria **it was asked**, not all
 * seven, so a role with a shorter question set is not penalised for questions
 * it never saw.
 */
function submissionsFor(
  subjectId: string,
  assessee: AssesseeConfig,
  setup: EvaluationSetup,
  cohortSize: number,
): RoleSubmission[] {
  return assessee.assessors
    .filter((assessor) => assessor.enabled)
    .map((assessor) => {
      if (!hasSubmitted(subjectId, assessor.role)) {
        return {
          role: assessor.role,
          threeSixtyScore: null,
          rankingScore: null,
          evaluationCount: 0,
        };
      }

      const ratings = assessor.criteria.map((criterion) =>
        ratingFor(subjectId, assessor.role, criterion, setup.scaleMax),
      );
      const threeSixtyScore =
        ratings.length > 0
          ? round(ratings.reduce((a, b) => a + b, 0) / ratings.length, 2)
          : null;

      // The ordering follows the subject's baseline rather than a fresh hash,
      // so someone who rates well tends to rank well. Two independent draws
      // would make the blend look arbitrary and hide what the weighting does.
      const rankingScore =
        assessor.rankingSharePercent > 0
          ? rankingScoreFor(
              positionFor(subjectId, assessor.role, cohortSize, setup.scaleMax),
              cohortSize,
              setup.scaleMax,
            )
          : null;

      return {
        role: assessor.role,
        threeSixtyScore,
        rankingScore,
        evaluationCount: ratings.length + (rankingScore === null ? 0 : 1),
      };
    });
}

/** The plain, unweighted mean of every rating a subject received. */
function rawScoreFor(
  subjectId: string,
  assessee: AssesseeConfig,
  setup: EvaluationSetup,
): number | null {
  const all: number[] = [];
  for (const assessor of assessee.assessors) {
    if (!assessor.enabled) continue;
    if (!hasSubmitted(subjectId, assessor.role)) continue;
    for (const criterion of assessor.criteria) {
      all.push(ratingFor(subjectId, assessor.role, criterion, setup.scaleMax));
    }
  }
  if (all.length === 0) return null;
  return round(all.reduce((a, b) => a + b, 0) / all.length, 2);
}

/** Mean per criterion across every assessor asked it - the radar's shape. */
function criteriaBreakdownFor(
  subjectId: string,
  assessee: AssesseeConfig,
  setup: EvaluationSetup,
): CriterionBreakdown[] {
  const byCriterion = new Map<EvaluationCriterion, number[]>();

  for (const assessor of assessee.assessors) {
    if (!assessor.enabled) continue;
    if (!hasSubmitted(subjectId, assessor.role)) continue;
    for (const criterion of assessor.criteria) {
      const list = byCriterion.get(criterion) ?? [];
      list.push(ratingFor(subjectId, assessor.role, criterion, setup.scaleMax));
      byCriterion.set(criterion, list);
    }
  }

  return [...byCriterion.entries()]
    .map(([criterion, ratings]) => ({
      criterion,
      selfScore: null as null,
      score: round(ratings.reduce((a, b) => a + b, 0) / ratings.length, 2),
      ratingCount: ratings.length,
    }))
    .sort((a, b) => a.criterion.localeCompare(b.criterion));
}

/**
 * Comments, grouped by role by the caller.
 *
 * Drawn from a fixed pool rather than generated, so they read like something a
 * person wrote. Which comment appears is hashed, so a subject's feedback is
 * stable across reloads.
 */
const COMMENT_POOL = [
  "Kept the group to its commitments without being asked to.",
  "Explains a decision clearly enough that the rest of us can challenge it.",
  "Takes the unglamorous part of the work when nobody else will.",
  "Raises a risk early rather than hoping it resolves itself.",
  "Could ask for help sooner; a blocked afternoon becomes a blocked week.",
  "Strong on delivery, quieter in the discussion that shapes it.",
  "Turns a vague brief into something the group can start on.",
  "Follows up on what was agreed, which sounds small and is not.",
];

function feedbackFor(subjectId: string, assessee: AssesseeConfig): EvaluatorFeedback[] {
  const feedback: EvaluatorFeedback[] = [];

  for (const assessor of assessee.assessors) {
    if (!assessor.enabled) continue;
    if (!hasSubmitted(subjectId, assessor.role)) continue;

    // One or two comments per role, so the section is not uniform.
    const count = hashUnit(`ccount:${subjectId}:${assessor.role}`) > 0.55 ? 2 : 1;
    for (let index = 0; index < count; index += 1) {
      const pick = Math.floor(
        hashUnit(`comment:${subjectId}:${assessor.role}:${index}`) * COMMENT_POOL.length,
      );
      feedback.push({ role: assessor.role, comment: COMMENT_POOL[pick] });
    }
  }

  return feedback;
}

function scoreSubject(
  subjectId: string,
  assessee: AssesseeConfig,
  setup: EvaluationSetup,
  cohortSize: number,
) {
  return calculateEvaluationScore({
    subjectId,
    assessee,
    submissions: submissionsFor(subjectId, assessee, setup, cohortSize),
    scaleMax: setup.scaleMax,
    passThreshold: PASS_THRESHOLD,
  });
}

/**
 * Every assessee in a setup, scored.
 *
 * One row per subject per assessee role, so a setup that assesses students and
 * its teacher produces both in one table - which is what makes the assessee
 * model visible at a glance rather than only in the configuration.
 */
export function evaluationResults(setupId: string): EvaluationResults | undefined {
  const setup = evaluationSetupTable.find((row) => row.id === setupId);
  if (!setup) return undefined;
  const course = courseTable.find((row) => row.id === setup.courseId);
  if (!course) return undefined;

  const rows: EvaluationResultRow[] = [];

  for (const assessee of setup.assessees) {
    const subjects = subjectsFor(setup, assessee.role);
    for (const subject of subjects) {
      const score = scoreSubject(subject.id, assessee, setup, subjects.length);
      rows.push({
        subjectId: subject.id,
        displayName: subject.displayName,
        assesseeRole: assessee.role,
        groupName: subject.groupName,
        rawScore: rawScoreFor(subject.id, assessee, setup),
        calculatedScore: score.totalScore,
        percent: score.percent,
        // §22 is student-only: a teacher is scored and reported, never graded.
        grade: isGradedRole(assessee.role) ? score.grade : null,
        passed: score.passed,
        coveragePercent: score.coveragePercent,
      });
    }
  }

  return {
    setupId: setup.id,
    evaluationName: setup.name,
    shortName: setup.shortName,
    courseCode: course.code,
    courseName: course.name,
    semesterCode: setup.semesterCode,
    scaleMax: setup.scaleMax,
    passThreshold: PASS_THRESHOLD,
    rows,
  };
}

/** One subject's full report. */
export function studentReport(
  setupId: string,
  subjectId: string,
): StudentReport | undefined {
  const setup = evaluationSetupTable.find((row) => row.id === setupId);
  if (!setup) return undefined;
  const course = courseTable.find((row) => row.id === setup.courseId);
  if (!course) return undefined;

  // Which assessee card this subject belongs to. A staff subject id encodes its
  // role; a student id is an enrollment.
  const assessee = setup.assessees.find((entry) =>
    subjectsFor(setup, entry.role).some((subject) => subject.id === subjectId),
  );
  if (!assessee) return undefined;

  const subjects = subjectsFor(setup, assessee.role);
  const subject = subjects.find((entry) => entry.id === subjectId);
  if (!subject) return undefined;

  const score = scoreSubject(subjectId, assessee, setup, subjects.length);
  const enrollment = enrollmentTable.find((row) => row.id === subjectId);
  const student = enrollment
    ? studentTable.find((row) => row.id === enrollment.studentId)
    : undefined;

  return {
    student: student ? toSummary(student) : undefined,
    subjectId,
    displayName: subject.displayName,
    assesseeRole: assessee.role,
    courseId: setup.courseId,
    courseCode: course.code,
    courseName: course.name,
    semesterCode: setup.semesterCode,
    evaluationName: setup.name,
    shortName: setup.shortName,
    evaluationGroupName: subject.groupName,
    score,
    rawScore: rawScoreFor(subjectId, assessee, setup),
    ...rankOf(subjectId, assessee, setup, subjects),
    criteriaBreakdown: criteriaBreakdownFor(subjectId, assessee, setup),
    feedback: feedbackFor(subjectId, assessee),
    // The report date, not the clock: a report regenerated tomorrow must be the
    // same document, and a moving timestamp would make every render differ.
    generatedAt: setup.reportDate,
  };
}

/**
 * Rank within the group, for a student assessee only.
 *
 * §21 requires a ranking to state its scope, so the scope travels with the
 * number rather than being implied by where it is displayed. A staff assessee
 * gets no rank at all.
 */
function rankOf(
  subjectId: string,
  assessee: AssesseeConfig,
  setup: EvaluationSetup,
  subjects: Array<{ id: string; groupName?: string }>,
): Pick<StudentReport, "rank" | "rankOutOf" | "rankScope"> {
  if (!isGradedRole(assessee.role)) return {};

  const groupName = subjects.find((entry) => entry.id === subjectId)?.groupName;
  const peers = subjects.filter((entry) => entry.groupName === groupName);

  const scored = peers
    .map((entry) => ({
      id: entry.id,
      total: scoreSubject(entry.id, assessee, setup, subjects.length).totalScore,
    }))
    // An unscored subject cannot hold a position in an ordering of scores.
    .filter((entry): entry is { id: string; total: number } => entry.total !== null)
    .sort((a, b) => b.total - a.total);

  const index = scored.findIndex((entry) => entry.id === subjectId);
  if (index === -1) return { rankScope: "group", rankOutOf: scored.length };

  return { rank: index + 1, rankOutOf: scored.length, rankScope: "group" };
}

/**
 * The setups worth opening a report for, newest first.
 *
 * Only those with an assessee configured and a window that has opened: a draft
 * evaluation has nothing to report, and offering it in the picker would send a
 * reader to an empty table.
 */
export function reportableSetups(): Array<{
  id: string;
  label: string;
  courseCode: string;
  semesterCode: string;
  status: string;
  subjectCount: number;
}> {
  return evaluationSetupTable
    .filter((setup) => setup.assessees.length > 0 && setup.status !== "draft")
    .flatMap((setup) => {
      const course = courseTable.find((row) => row.id === setup.courseId);
      if (!course) return [];
      const groups = groupsInScope(setup);
      if (groups.length === 0) return [];
      const subjectCount = setup.assessees.reduce(
        (sum, assessee) => sum + subjectsFor(setup, assessee.role).length,
        0,
      );

      return [
        {
          id: setup.id,
          label: `${course.code} · ${setup.semesterCode} · ${setup.shortName} · ${subjectCount} assessed`,
          courseCode: course.code,
          semesterCode: setup.semesterCode,
          status: setup.status,
          subjectCount,
        },
      ];
    })
    // Published first, then the most recent semester, then the larger cohort.
    // Published is not a cosmetic preference: it is the state in which reports
    // are actually available (see 15a), so it is the honest first choice for
    // someone opening this screen to read one.
    .sort(
      (a, b) =>
        Number(b.status === "published") - Number(a.status === "published") ||
        b.semesterCode.localeCompare(a.semesterCode) ||
        b.subjectCount - a.subjectCount ||
        a.courseCode.localeCompare(b.courseCode),
    );
}

/** Role options for the results filter, in the canonical order. */
export function assesseeRoleOptions(setupId: string): EvaluationRole[] {
  const setup = evaluationSetupTable.find((row) => row.id === setupId);
  if (!setup) return [];
  const present = new Set(setup.assessees.map((entry) => entry.role));
  return EVALUATION_ROLES.filter((role) => present.has(role));
}
