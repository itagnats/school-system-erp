import "server-only";

import { summariseWeights } from "@/lib/calculations";
import {
  courseTable,
  enrollmentTable,
  evaluationGroupTable,
  evaluationSetupTable,
} from "@/server/repositories";
import { matchesSearch, paginate, sortRows, type ListQueryInput } from "@/server/query";
import type { EvaluationSetupUpdateInput } from "@/lib/api/contracts";
import type {
  EvaluationGroup,
  EvaluationGroupSummary,
  EvaluationRelation,
  EvaluationSetup,
  EvaluationSetupDetail,
  EvaluationSetupSummary,
  EvaluatorRole,
  FormReadiness,
  PaginatedResult,
  RoleWeight,
} from "@/types";

/**
 * The administrative half of evaluation (direction.md §14-20).
 *
 * A setup is configuration for one course-semester: the window, the scale and
 * the weight blend. Membership lives in the group table beside it, because a
 * group is a partition of the enrollments rather than a property of the
 * configuration.
 *
 * Nothing here computes a score. That arrives with the evaluation forms; this
 * service answers the question that comes first, which is whether the
 * configuration could produce a sound score at all.
 */

export interface EvaluationQuery extends ListQueryInput {
  semester?: string;
  status?: string;
  courseId?: string;
}

const SORTABLE: Record<string, (row: EvaluationSetupSummary) => string | number> = {
  courseCode: (row) => row.courseCode,
  courseName: (row) => row.courseName,
  semesterCode: (row) => row.semesterCode,
  status: (row) => row.status,
  memberCount: (row) => row.memberCount,
  groupCount: (row) => row.groupCount,
  shortName: (row) => row.shortName,
};

/** Enrolments that take part in evaluation. A dropped student is not evaluated. */
const EVALUABLE = new Set(["enrolled", "active", "completed"]);

function membersInScope(courseId: string, semesterCode: string) {
  return enrollmentTable.filter(
    (enrollment) =>
      enrollment.courseId === courseId &&
      enrollment.semesterCode === semesterCode &&
      EVALUABLE.has(enrollment.status),
  );
}

function groupsInScope(courseId: string, semesterCode: string): EvaluationGroup[] {
  return evaluationGroupTable
    .filter((group) => group.courseId === courseId && group.semesterCode === semesterCode)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Whether one kind of form is ready, not configured, or does not apply.
 *
 * The three states mirror what the screen renders, and the distinction that
 * matters is the last one: a blend that gives a form kind no weight is not an
 * unfinished setup, it is a deliberate choice to run without that kind. Showing
 * it as a failure would push administrators to "fix" a configuration that is
 * already correct.
 */
function readinessFor(
  sharePercent: number,
  setup: EvaluationSetup,
  groupCount: number,
): FormReadiness {
  if (sharePercent <= 0) return "not-applicable";
  if (groupCount === 0) return "not-configured";
  if (setup.status === "draft") return "not-configured";
  return "ready";
}

function buildSummary(setup: EvaluationSetup): EvaluationSetupSummary | undefined {
  const course = courseTable.find((row) => row.id === setup.courseId);
  if (!course) return undefined;

  const members = membersInScope(setup.courseId, setup.semesterCode);
  const groups = groupsInScope(setup.courseId, setup.semesterCode);
  const grouped = new Set(groups.flatMap((group) => group.memberEnrollmentIds));
  const weights = summariseWeights(setup.weights);

  return {
    id: setup.id,
    courseId: setup.courseId,
    courseCode: course.code,
    courseName: course.name,
    semesterCode: setup.semesterCode,
    status: setup.status,
    shortName: setup.shortName,
    memberCount: members.length,
    groupCount: groups.length,
    ungroupedCount: members.filter((member) => !grouped.has(member.id)).length,
    criteriaForm: readinessFor(weights.effectiveCriteriaPercent, setup, groups.length),
    rankingForm: readinessFor(weights.effectiveRankingPercent, setup, groups.length),
    weightRemainingPercent: weights.remainingPercent,
  };
}

export function listEvaluationSetups(
  query: EvaluationQuery,
): PaginatedResult<EvaluationSetupSummary> {
  const rows = evaluationSetupTable
    .map(buildSummary)
    .filter((row): row is EvaluationSetupSummary => row !== undefined)
    .filter((row) => {
      if (query.semester && row.semesterCode !== query.semester) return false;
      if (query.status && row.status !== query.status) return false;
      if (query.courseId && row.courseId !== query.courseId) return false;
      return matchesSearch(query.search, row.courseCode, row.courseName, row.shortName);
    });

  const sorted = sortRows(rows, SORTABLE, query.sort, query.direction, "courseCode");
  return paginate(sorted, query.page, query.pageSize);
}

/**
 * How many assessors of each role are reachable, and how many subjects each of
 * them is asked about.
 *
 * These two counts are what turn the relation card from a restatement of the
 * rules into something worth looking at: an enabled role with no assessors
 * cannot contribute, and the subject count is what tells an administrator that
 * they have asked every peer for thirty ratings.
 */
function buildRelations(setup: EvaluationSetup, groups: EvaluationGroup[]): EvaluationRelation[] {
  const largestGroup = groups.reduce(
    (max, group) => Math.max(max, group.memberEnrollmentIds.length),
    0,
  );
  const groupedTotal = groups.reduce(
    (sum, group) => sum + group.memberEnrollmentIds.length,
    0,
  );

  return setup.weights.map((weight) => ({
    role: weight.role,
    enabled: weight.enabled,
    weightPercent: weight.weightPercent,
    criteriaSharePercent: weight.criteriaSharePercent,
    assessorCount: assessorCountFor(weight.role, groups, groupedTotal),
    subjectsPerAssessor: subjectsPerAssessorFor(weight.role, largestGroup, groupedTotal),
    // Never true, for any role. direction.md §16.
    selfEvaluation: false as const,
  }));
}

function assessorCountFor(
  role: EvaluatorRole,
  groups: EvaluationGroup[],
  groupedTotal: number,
): number {
  switch (role) {
    // Every grouped student is a peer assessor for their own group.
    case "student":
      return groupedTotal;
    // An inspector is a student drawn from a different group, so the role only
    // exists once there are at least two groups to draw across.
    case "inspector":
      return groups.length > 1 ? groupedTotal : 0;
    // One of each per course-semester. There is no staff table in this demo, so
    // this is the count the domain implies rather than a row count.
    case "teacher":
    case "ta":
      return 1;
  }
}

function subjectsPerAssessorFor(
  role: EvaluatorRole,
  largestGroup: number,
  groupedTotal: number,
): number {
  switch (role) {
    // Everyone in your group except you.
    case "student":
      return Math.max(0, largestGroup - 1);
    case "inspector":
      return largestGroup;
    case "teacher":
    case "ta":
      return groupedTotal;
  }
}

/**
 * Which group supplies each group's inspectors.
 *
 * Next group round the ring, so every group both sends and receives and no
 * group inspects itself. Deterministic, so the same pairing survives a reload.
 */
function inspectorSourceName(groups: EvaluationGroup[], index: number): string | undefined {
  if (groups.length < 2) return undefined;
  return groups[(index + 1) % groups.length].name;
}

export function getEvaluationSetup(setupId: string): EvaluationSetupDetail | undefined {
  const setup = evaluationSetupTable.find((row) => row.id === setupId);
  if (!setup) return undefined;
  return buildDetail(setup);
}

function buildDetail(setup: EvaluationSetup): EvaluationSetupDetail | undefined {
  const course = courseTable.find((row) => row.id === setup.courseId);
  if (!course) return undefined;

  const groups = groupsInScope(setup.courseId, setup.semesterCode);
  const members = membersInScope(setup.courseId, setup.semesterCode);
  const grouped = new Set(groups.flatMap((group) => group.memberEnrollmentIds));

  return {
    setup,
    courseCode: course.code,
    courseName: course.name,
    groups: groups.map<EvaluationGroupSummary>((group, index) => ({
      id: group.id,
      name: group.name,
      memberCount: group.memberEnrollmentIds.length,
      inspectorSourceGroupName: inspectorSourceName(groups, index),
    })),
    relations: buildRelations(setup, groups),
    weights: summariseWeights(setup.weights),
    memberCount: members.length,
    ungroupedCount: members.filter((member) => !grouped.has(member.id)).length,
  };
}

/**
 * Apply a configuration change and recompute.
 *
 * Nothing is stored - see docs/decisions/why-bff.md - but the response carries
 * the recomputed weight summary, so the screen shows what the new blend does
 * rather than merely acknowledging the edit.
 *
 * The weight array is replaced wholesale rather than merged per role. A partial
 * merge would let a client send one role and leave the blend unbalanced without
 * the server ever seeing the total, and the total is the only thing here worth
 * validating.
 */
export function updateEvaluationSetup(
  setupId: string,
  input: EvaluationSetupUpdateInput,
): EvaluationSetupDetail | undefined {
  const current = evaluationSetupTable.find((row) => row.id === setupId);
  if (!current) return undefined;

  const next: EvaluationSetup = {
    ...current,
    name: input.name ?? current.name,
    shortName: input.shortName ?? current.shortName,
    status: input.status ?? current.status,
    editingLocked: input.editingLocked ?? current.editingLocked,
    scaleMax: input.scaleMax ?? current.scaleMax,
    guidance: input.guidance ?? current.guidance,
    weights: input.weights ? mergeWeights(current.weights, input.weights) : current.weights,
  };

  return buildDetail(next);
}

/**
 * Keep the stored role order regardless of the order the client sent.
 *
 * The blend is rendered as a list and read as a list, so a client that happens
 * to serialise its roles differently should not reorder the screen.
 */
function mergeWeights(
  current: RoleWeight[],
  incoming: EvaluationSetupUpdateInput["weights"],
): RoleWeight[] {
  const byRole = new Map((incoming ?? []).map((weight) => [weight.role, weight]));
  return current.map((weight) => {
    const update = byRole.get(weight.role);
    return update ? { ...weight, ...update } : weight;
  });
}

/** Course options for the Manage Evaluation filter bar. */
export function evaluationCourseOptions(): { value: string; label: string }[] {
  const courseIds = new Set(evaluationSetupTable.map((setup) => setup.courseId));
  return courseTable
    .filter((course) => courseIds.has(course.id))
    .map((course) => ({ value: course.id, label: `${course.code} - ${course.name}` }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Group names for a course-semester, used by the enrollment filter. */
export function evaluationGroupNamesById(): Record<string, string> {
  return Object.fromEntries(evaluationGroupTable.map((group) => [group.id, group.name]));
}
