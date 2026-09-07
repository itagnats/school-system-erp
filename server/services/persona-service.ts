import "server-only";

import { threeSixtySharePercent } from "@/lib/calculations";
import {
  courseTable,
  enrollmentTable,
  evaluationGroupTable,
  evaluationSetupTable,
  studentTable,
} from "@/server/repositories";
import type {
  AssesseeConfig,
  DemoPersona,
  EvaluationAssignment,
  EvaluationGroup,
  EvaluationQueue,
  EvaluationRole,
  EvaluationSetup,
  EvaluationSubject,
} from "@/types";

/**
 * The evaluator's half of evaluation (direction.md §14, §19).
 *
 * There is no sign-in, so identity comes from a demo persona. Everything here
 * derives a persona's work from the setup configuration rather than storing it:
 * an assignment exists because some assessee card has this persona's role
 * switched on as an assessor, at a non-zero share.
 *
 * That derivation is the point. It means the Manage Evaluation screen and this
 * one cannot disagree - switch the TA off over there and the TA's queue empties
 * here, with no second place to update.
 */

/** Windows a persona can actually be asked to work in. */
const WORKABLE = new Set(["open", "closed", "published"]);

/**
 * How many course-semesters contribute personas.
 *
 * Capped because the switcher is a control, not a list screen. Four setups at
 * up to four roles each is already sixteen identities to read through.
 */
const PERSONA_SETUP_LIMIT = 3;

function groupsInScope(setup: EvaluationSetup): EvaluationGroup[] {
  return evaluationGroupTable
    .filter(
      (group) =>
        group.courseId === setup.courseId && group.semesterCode === setup.semesterCode,
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Display name for an enrollment, via its student. */
function nameFor(enrollmentId: string): string {
  const enrollment = enrollmentTable.find((row) => row.id === enrollmentId);
  if (!enrollment) return "Unknown student";
  const student = studentTable.find((row) => row.id === enrollment.studentId);
  return student ? `${student.personal.firstName} ${student.personal.lastName}` : "Unknown student";
}

/**
 * Personas for the setups worth demonstrating.
 *
 * One student and one inspector are drawn from real group membership, so their
 * queues contain real peers. A teacher and a TA are synthetic - there is no
 * staff table in this demo - but they are scoped to a course-semester like
 * everyone else, because what they owe depends on it.
 */
export function listPersonas(): DemoPersona[] {
  const setups = evaluationSetupTable
    .filter((setup) => WORKABLE.has(setup.status) && setup.assessees.length > 0)
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, PERSONA_SETUP_LIMIT);

  const personas: DemoPersona[] = [];

  for (const setup of setups) {
    const course = courseTable.find((row) => row.id === setup.courseId);
    if (!course) continue;

    const groups = groupsInScope(setup);
    const base = {
      courseId: setup.courseId,
      courseCode: course.code,
      semesterCode: setup.semesterCode,
    };

    const firstGroup = groups[0];
    if (firstGroup?.memberEnrollmentIds[0]) {
      const enrollmentId = firstGroup.memberEnrollmentIds[0];
      personas.push({
        ...base,
        id: `per-${setup.id}-student`,
        role: "student",
        displayName: nameFor(enrollmentId),
        subjectId: enrollmentId,
        groupId: firstGroup.id,
        groupName: firstGroup.name,
      });
    }

    // An inspector comes from a *different* group and inspects the first one,
    // so the cross-group origin is visible in the persona itself (§16).
    const secondGroup = groups[1];
    if (secondGroup?.memberEnrollmentIds[0] && firstGroup) {
      const enrollmentId = secondGroup.memberEnrollmentIds[0];
      personas.push({
        ...base,
        id: `per-${setup.id}-inspector`,
        role: "inspector",
        displayName: `${nameFor(enrollmentId)} (from ${secondGroup.name})`,
        subjectId: enrollmentId,
        groupId: firstGroup.id,
        groupName: firstGroup.name,
      });
    }

    for (const role of ["teacher", "ta"] as const) {
      personas.push({
        ...base,
        id: `per-${setup.id}-${role}`,
        role,
        displayName: role === "teacher" ? `${course.code} teacher` : `${course.code} TA`,
        subjectId: `staff-${setup.id}-${role}`,
      });
    }
  }

  return personas;
}

export function getPersona(personaId: string): DemoPersona | undefined {
  return listPersonas().find((persona) => persona.id === personaId);
}

/** The persona the evaluation area opens as when none is named. */
export function defaultPersona(): DemoPersona | undefined {
  return listPersonas()[0];
}

/**
 * Who this persona is asked about, for one assessee role.
 *
 * The evaluator is excluded by id, not by role. Excluding by role would remove
 * every peer and leave a student assessing nobody - the mistake that made the
 * setup validator reject its own seed data.
 */
function subjectsFor(
  persona: DemoPersona,
  assesseeRole: EvaluationRole,
  setup: EvaluationSetup,
): EvaluationSubject[] {
  const groups = groupsInScope(setup);
  const course = courseTable.find((row) => row.id === setup.courseId);

  if (assesseeRole === "student" || assesseeRole === "inspector") {
    // A peer assesses their own group; everyone else assesses the whole cohort.
    const inScope =
      persona.role === "student" || persona.role === "inspector"
        ? groups.filter((group) => group.id === persona.groupId)
        : groups;

    return inScope
      .flatMap((group) =>
        group.memberEnrollmentIds.map((id) => ({
          id,
          displayName: nameFor(id),
          groupName: group.name,
        })),
      )
      .filter((subject) => subject.id !== persona.subjectId)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  // One teacher and one TA per course-semester.
  const label = assesseeRole === "teacher" ? "teacher" : "TA";
  return [
    {
      id: `staff-${setup.id}-${assesseeRole}`,
      displayName: `${course?.code ?? setup.courseId} ${label}`,
    },
  ];
}

/**
 * Deterministic pseudo-progress for one assignment.
 *
 * Writes are not persisted, so real progress cannot exist. A queue of uniform
 * zeros would demonstrate none of the states the screen has to render, and
 * `Math.random()` would differ between the server and client renders and break
 * hydration. A hash of the id is stable across reloads and varied across rows.
 */
function seededProgress(assignmentId: string, total: number): number {
  if (total === 0) return 0;
  let hash = 0;
  for (let index = 0; index < assignmentId.length; index += 1) {
    hash = (hash * 31 + assignmentId.charCodeAt(index)) % 100_003;
  }
  // Three outcomes in roughly equal measure: untouched, part-done, finished.
  const bucket = hash % 3;
  if (bucket === 0) return 0;
  if (bucket === 1) return total;
  return 1 + (hash % Math.max(1, total - 1));
}

/**
 * Every assignment this persona owes.
 *
 * One per (setup, assessee role, form kind) where the persona's role is an
 * enabled assessor holding a non-zero share of that kind. A role weighted only
 * for the ordering gets a ranking assignment and no 360 form, which is exactly
 * what its configuration says.
 */
export function assignmentsForPersona(persona: DemoPersona): EvaluationAssignment[] {
  const setups = evaluationSetupTable.filter(
    (setup) =>
      setup.courseId === persona.courseId &&
      setup.semesterCode === persona.semesterCode &&
      WORKABLE.has(setup.status),
  );

  return setups.flatMap((setup) => {
    const course = courseTable.find((row) => row.id === setup.courseId);
    if (!course) return [];
    return setup.assessees.flatMap((assessee) =>
      assignmentsForAssessee(persona, setup, course.code, assessee),
    );
  });
}

/**
 * The assignments one assessee card creates for this persona.
 *
 * Nothing if the persona's role is not an enabled assessor on that card, and at
 * most two if it is: a 360 form when the relation carries a non-zero form share
 * *and* has questions to ask, and a ranking when it carries a non-zero ordering
 * share. A role weighted only for the ordering therefore gets a ranking and no
 * 360 form, which is exactly what its configuration says.
 */
function assignmentsForAssessee(
  persona: DemoPersona,
  setup: EvaluationSetup,
  courseCode: string,
  assessee: AssesseeConfig,
): EvaluationAssignment[] {
  const assessor = assessee.assessors.find(
    (candidate) => candidate.role === persona.role && candidate.enabled,
  );
  if (!assessor) return [];

  const subjects = subjectsFor(persona, assessee.role, setup);
  if (subjects.length === 0) return [];

  const shared = {
    setupId: setup.id,
    evaluationName: setup.name,
    shortName: setup.shortName,
    courseId: setup.courseId,
    courseCode,
    semesterCode: setup.semesterCode,
    assesseeRole: assessee.role,
    assessorRole: persona.role,
    subjects,
    scaleMax: setup.scaleMax,
    guidance: setup.guidance,
    opensOn: setup.opensOn,
    closesOn: setup.closesOn,
    windowOpen: setup.status === "open",
  };

  const assignments: EvaluationAssignment[] = [];

  if (threeSixtySharePercent(assessor) > 0 && assessor.criteria.length > 0) {
    assignments.push(
      withProgress({
        ...shared,
        id: `asg-${setup.id}-${assessee.role}-360-${persona.role}`,
        kind: "360",
        criteria: [...assessor.criteria],
      }),
    );
  }

  // An ordering needs at least two subjects to be an ordering at all.
  if (assessor.rankingSharePercent > 0 && subjects.length > 1) {
    assignments.push(
      withProgress({
        ...shared,
        id: `asg-${setup.id}-${assessee.role}-ranking-${persona.role}`,
        kind: "ranking",
        criteria: [],
      }),
    );
  }

  return assignments;
}

function withProgress(
  draft: Omit<EvaluationAssignment, "completedCount" | "status">,
): EvaluationAssignment {
  const total = draft.subjects.length;
  const completedCount = completedFor(draft.kind, draft.id, total);

  return {
    ...draft,
    completedCount,
    status: statusFor(completedCount, total),
  };
}

/**
 * How many subjects count as done.
 *
 * A ranking is one piece of work - either ordered or not, never part-way -
 * so it reports all or nothing. A 360 form is per subject and can sit halfway.
 */
function completedFor(
  kind: EvaluationAssignment["kind"],
  assignmentId: string,
  total: number,
): number {
  if (kind !== "ranking") return seededProgress(assignmentId, total);
  return seededProgress(assignmentId, 1) > 0 ? total : 0;
}

/**
 * The three states `EvaluationStatus` carries, from a count.
 *
 * Independent of whether the window is open: a closed window with unfinished
 * work is still unfinished, and saying "not started" is more honest than
 * inventing a fourth state for work nobody can pick up. The window governs
 * whether the form is editable, which the form decides for itself.
 */
function statusFor(done: number, total: number): EvaluationAssignment["status"] {
  if (total > 0 && done >= total) return "submitted";
  if (done === 0) return "not-started";
  return "draft";
}

export function evaluationQueue(personaId?: string): EvaluationQueue | undefined {
  const persona = personaId ? getPersona(personaId) : defaultPersona();
  if (!persona) return undefined;
  return { persona, assignments: assignmentsForPersona(persona) };
}

export function getAssignment(
  personaId: string,
  assignmentId: string,
): { persona: DemoPersona; assignment: EvaluationAssignment } | undefined {
  const persona = getPersona(personaId);
  if (!persona) return undefined;
  const assignment = assignmentsForPersona(persona).find((row) => row.id === assignmentId);
  return assignment ? { persona, assignment } : undefined;
}
