import "server-only";

import {
  canTransitionWindow,
  formReadiness,
  maxAssesseeShare,
  relationsWithoutQuestions,
  summarizeWeights,
  toStoredDate,
  unbalancedAssessees,
  windowDateErrors,
} from "@/lib/calculations";
import {
  courseTable,
  enrollmentTable,
  evaluationGroupTable,
  evaluationSetupTable,
} from "@/server/repositories";
import { matchesSearch, paginate, sortRows, type ListQueryInput } from "@/server/query";
import type { EvaluationSetupUpdateInput } from "@/lib/api/contracts";
import { isGradedRole } from "@/types";
import type {
  AssesseeConfig,
  AssesseeSummary,
  EvaluationGroup,
  EvaluationGroupSummary,
  EvaluationRelation,
  EvaluationSetup,
  EvaluationSetupDetail,
  EvaluationSetupSummary,
  EvaluationRole,
  FormReadiness,
  PaginatedResult,
  AssessorConfig,
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

/** Enrollments that take part in evaluation. A dropped student is not evaluated. */
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
 * matters is the last one: a configuration that gives a form kind no weight
 * anywhere is not an unfinished setup, it is a deliberate choice to run without
 * that kind. Showing it as a failure would push administrators to "fix" a
 * configuration that is already correct.
 *
 * Aggregated across assessees, because the table has one row per setup: the
 * kind is used if any assessee weights it, and ready only once the setup has
 * groups and has left draft.
 */
function readinessFor(
  sharePercent: number,
  setup: EvaluationSetup,
  groupCount: number,
): FormReadiness {
  return formReadiness({
    sharePercent,
    assesseeCount: setup.assessees.length,
    groupCount,
    isDraft: setup.status === "draft",
  });
}

/** The largest share any assessee gives to one kind of form. */
function maxShare(
  setup: EvaluationSetup,
  pick: (summary: ReturnType<typeof summarizeWeights>) => number,
): number {
  return maxAssesseeShare(setup.assessees, pick);
}

function buildSummary(setup: EvaluationSetup): EvaluationSetupSummary | undefined {
  const course = courseTable.find((row) => row.id === setup.courseId);
  if (!course) return undefined;

  const members = membersInScope(setup.courseId, setup.semesterCode);
  const groups = groupsInScope(setup.courseId, setup.semesterCode);
  const grouped = new Set(groups.flatMap((group) => group.memberEnrollmentIds));

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
    assesseeCount: setup.assessees.length,
    assesseeRoles: setup.assessees.map((assessee) => assessee.role),
    threeSixtyForm: readinessFor(
      maxShare(setup, (w) => w.effective360Percent),
      setup,
      groups.length,
    ),
    rankingForm: readinessFor(
      maxShare(setup, (w) => w.effectiveRankingPercent),
      setup,
      groups.length,
    ),
    unbalancedAssesseeCount: unbalancedAssessees(setup.assessees).length,
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
 * Build one assessee card: its blend, its relations and their counts.
 *
 * The counts are what turn a relation from a restatement of the rules into
 * something worth looking at. An enabled assessor with nobody to do the
 * assessing cannot contribute, and the subject count is what reveals that every
 * peer has been asked for thirty ratings.
 */
function buildAssessee(
  assessee: AssesseeConfig,
  groups: EvaluationGroup[],
): AssesseeSummary {
  const largestGroup = groups.reduce(
    (max, group) => Math.max(max, group.memberEnrollmentIds.length),
    0,
  );
  const groupedTotal = groups.reduce(
    (sum, group) => sum + group.memberEnrollmentIds.length,
    0,
  );

  return {
    role: assessee.role,
    selfEvaluation: false as const,
    graded: isGradedRole(assessee.role),
    subjectCount: subjectCountFor(assessee.role, groupedTotal),
    weights: summarizeWeights(assessee.assessors),
    relations: assessee.assessors.map<EvaluationRelation>((assessor: AssessorConfig) => ({
      assesseeRole: assessee.role,
      assessorRole: assessor.role,
      enabled: assessor.enabled,
      weightPercent: assessor.weightPercent,
      rankingSharePercent: assessor.rankingSharePercent,
      criteria: [...assessor.criteria],
      assessorCount: assessorCountFor(assessor.role, groups, groupedTotal),
      subjectsPerAssessor: subjectsPerAssessorFor(
        assessee.role,
        assessor.role,
        largestGroup,
        groupedTotal,
      ),
    })),
    assessorsMissingQuestions: relationsWithoutQuestions(assessee),
  };
}

/**
 * How many of this role are actually assessed in the course-semester.
 *
 * There is no staff table in this demo, so a teacher and a TA are one each -
 * the count the domain implies rather than a row count. Students come from the
 * grouped total, because an ungrouped student is not assessed by anyone.
 */
function subjectCountFor(role: EvaluationRole, groupedTotal: number): number {
  return role === "student" || role === "inspector" ? groupedTotal : 1;
}

function assessorCountFor(
  role: EvaluationRole,
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

/**
 * How many subjects one assessor of this role is asked about, for this assessee.
 *
 * Depends on the pair, not the assessor alone. A student assessing peers covers
 * their group minus themselves; the same student assessing the teacher covers
 * exactly one.
 */
function subjectsPerAssessorFor(
  assesseeRole: EvaluationRole,
  assessorRole: EvaluationRole,
  largestGroup: number,
  groupedTotal: number,
): number {
  // One teacher, one TA per course-semester, so assessing staff is one subject.
  if (assesseeRole !== "student") return 1;

  switch (assessorRole) {
    // Everyone in your group except you.
    case "student":
      return Math.max(0, largestGroup - 1);
    // A borrowed student assesses a whole group, itself not among them.
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
    assessees: setup.assessees.map((assessee) => buildAssessee(assessee, groups)),
    memberCount: members.length,
    ungroupedCount: members.filter((member) => !grouped.has(member.id)).length,
  };
}

/**
 * A rejected setup change, keyed by the field that is wrong.
 *
 * Two things reach it, and both are well-formed requests that are nonsense
 * anyway: an illegal window move, and three dates that do not run in order.
 * Neither can be expressed in the schema, because both are judged against the
 * stored setup rather than against the payload.
 */
export interface EvaluationSetupUpdateError {
  fieldErrors: Record<string, string>;
}

export function isSetupUpdateError(
  result: EvaluationSetupDetail | EvaluationSetupUpdateError,
): result is EvaluationSetupUpdateError {
  return "fieldErrors" in result;
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
): EvaluationSetupDetail | EvaluationSetupUpdateError | undefined {
  const current = evaluationSetupTable.find((row) => row.id === setupId);
  if (!current) return undefined;

  // Checked on the merge rather than on the payload. A PATCH may carry one date
  // or only the status, so the question is always "is the setup that results
  // from this coherent", never "is this request internally consistent".
  const status = input.status ?? current.status;
  if (!canTransitionWindow(current.status, status)) {
    return {
      fieldErrors: {
        status: `An evaluation cannot go from ${current.status} to ${status}.`,
      },
    };
  }

  const window = {
    opensOn: input.opensOn ? toStoredDate(input.opensOn) : current.opensOn,
    closesOn: input.closesOn ? toStoredDate(input.closesOn) : current.closesOn,
    reportDate: input.reportDate ? toStoredDate(input.reportDate) : current.reportDate,
  };
  const dateErrors = windowDateErrors(window);
  if (dateErrors) return { fieldErrors: dateErrors };

  const next: EvaluationSetup = {
    ...current,
    name: input.name ?? current.name,
    shortName: input.shortName ?? current.shortName,
    status,
    editingLocked: input.editingLocked ?? current.editingLocked,
    ...window,
    scaleMax: input.scaleMax ?? current.scaleMax,
    guidance: input.guidance ?? current.guidance,
    // Replaced wholesale rather than merged. A partial merge would let a client
    // send one assessee and leave another card unbalanced without the server
    // ever seeing its total, and the total is the thing worth validating.
    assessees: input.assessees ? cloneIncoming(input.assessees) : current.assessees,
  };

  return buildDetail(next);
}

/** Copy the validated payload into domain shape, arrays included. */
function cloneIncoming(
  assessees: NonNullable<EvaluationSetupUpdateInput["assessees"]>,
): AssesseeConfig[] {
  return assessees.map((assessee) => ({
    role: assessee.role,
    // Never taken from the client. Nobody assesses themselves, whatever a
    // request claims (direction.md 16).
    selfEvaluation: false as const,
    assessors: assessee.assessors.map((assessor) => ({
      ...assessor,
      criteria: [...assessor.criteria],
    })),
  }));
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
