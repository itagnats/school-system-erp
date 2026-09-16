import "server-only";

import {
  courseTable,
  enrollmentTable,
  evaluationGroupTable,
  programEnrollmentTable,
  programTable,
  programTermTable,
  studentTable,
} from "@/server/repositories";
import { matchesSearch, paginate, sortRows, type ListQueryInput } from "@/server/query";
import { expandCurriculum, findEnrolmentConflict } from "@/lib/calculations/enrollment";
import { createStudent, emailTaken, getStudent, toSummary } from "./student-service";
import { evaluationGroupName } from "@/types";
import type { EnrolRequestInput } from "@/lib/api/contracts";
import type {
  EnrolmentResult,
  ProgramEnrollment,
  EnrollmentListItem,
  PaginatedResult,
  Student,
  TermRosterRow,
} from "@/types";

/**
 * Enrollment reads (direction.md §6-8).
 *
 * The list is a join: an enrollment row on its own is three foreign keys and a
 * status, which is unreadable in a table. Assembling `EnrollmentListItem` here
 * rather than in the component is the difference between one shaped request and
 * a component that fetches students and courses to fill in its own labels.
 */

export interface EnrollmentQuery extends ListQueryInput {
  courseId?: string;
  semester?: string;
  status?: string;
  evaluationGroupId?: string;
  /** Narrow to students enrolled in a programme, per direction.md §7a. */
  programId?: string;
}

/**
 * Group id to group name, read from the group table.
 *
 * This was a hardcoded map of four ids until evaluation groups became real
 * records. A group belongs to one course-semester (direction.md 15), so there
 * are now hundreds of ids and no fixed list to hardcode.
 */
function groupNames(): Map<string, string> {
  return new Map(evaluationGroupTable.map((group) => [group.id, group.name]));
}

const SORTABLE: Record<string, (row: EnrollmentListItem) => string | number> = {
  student: (e) => e.student.fullName,
  studentId: (e) => e.student.studentId,
  courseCode: (e) => e.courseCode,
  semesterCode: (e) => e.semesterCode,
  status: (e) => e.status,
  group: (e) => e.evaluationGroupName ?? "",
};

/**
 * Student ids enrolled in a programme, optionally narrowed to one semester.
 *
 * Enrolment is entered at the programme level, so "who is under this
 * programme" is the programme enrollment table rather than a property of the
 * course rows.
 */
function programMembers(programId: string, semesterCode?: string): Set<string> {
  return new Set(
    programEnrollmentTable
      .filter(
        (enrollment) =>
          enrollment.programId === programId &&
          enrollment.status !== "withdrawn" &&
          (!semesterCode || enrollment.semesterCode === semesterCode),
      )
      .map((enrollment) => enrollment.studentId),
  );
}

function buildListItems(): EnrollmentListItem[] {
  const studentsById = new Map(studentTable.map((s) => [s.id, s]));
  const coursesById = new Map(courseTable.map((c) => [c.id, c]));
  const names = groupNames();

  const items: EnrollmentListItem[] = [];
  for (const enrollment of enrollmentTable) {
    const student = studentsById.get(enrollment.studentId);
    const course = coursesById.get(enrollment.courseId);
    // A row whose student or course is missing is a broken join, not a row to
    // render with blanks in it.
    if (!student || !course) continue;

    items.push({
      id: enrollment.id,
      student: toSummary(student),
      courseId: course.id,
      courseCode: course.code,
      semesterCode: enrollment.semesterCode,
      status: enrollment.status,
      evaluationGroupName: enrollment.evaluationGroupId
        ? names.get(enrollment.evaluationGroupId)
        : undefined,
    });
  }
  return items;
}

export function listEnrollments(query: EnrollmentQuery): PaginatedResult<EnrollmentListItem> {
  const filtered = buildListItems().filter((item) => {
    if (query.programId && !programMembers(query.programId, query.semester).has(item.student.id)) {
      return false;
    }
    if (query.courseId && item.courseId !== query.courseId) return false;
    if (query.semester && item.semesterCode !== query.semester) return false;
    if (query.status && item.status !== query.status) return false;
    // The filter carries a group letter, not an id: a scoped id matches at most
    // one course-semester, so "show me every group A" is the only cross-course
    // question this filter can answer.
    if (query.evaluationGroupId) {
      if (item.evaluationGroupName !== evaluationGroupName(query.evaluationGroupId)) {
        return false;
      }
    }
    return matchesSearch(
      query.search,
      item.student.fullName,
      item.student.studentId,
      item.courseCode,
    );
  });

  const sorted = sortRows(filtered, SORTABLE, query.sort, query.direction, "student");
  return paginate(sorted, query.page, query.pageSize);
}

/** Roster for one course and semester, used by the course detail page. */
export function courseRoster(courseId: string, semesterCode: string): EnrollmentListItem[] {
  return buildListItems().filter(
    (item) => item.courseId === courseId && item.semesterCode === semesterCode,
  );
}

/**
 * Enrolment writes (direction.md 7, 7a).
 *
 * Shaped and validated, and then nothing is stored - the same posture as every
 * other write here, recorded in docs/decisions/why-bff.md. What is real is
 * everything a client can observe: the rules below run, the status code is the
 * one the situation deserves, and the response is the roster as it would look.
 */

export type EnrolOutcome =
  | { ok: true; data: EnrolmentResult }
  | { ok: false; status: 404 | 409 | 422; message: string; fieldErrors?: Record<string, string> };

/**
 * The most recent timestamp in the dataset, standing in for the present.
 *
 * Reading the clock would make two renders of the same page disagree, and this
 * service is reachable from a server component.
 */
function seedNow(): string {
  return enrollmentTable.reduce(
    (latest, row) => (row.updatedAt > latest ? row.updatedAt : latest),
    enrollmentTable[0]?.updatedAt ?? "2026-01-05T00:00:00.000Z",
  );
}

/**
 * Which student the request is about.
 *
 * The three paths differ only here: two name an existing profile and one
 * describes a person who does not have one yet. Pulled out of `enrolStudent`
 * so that function reads as the sequence of rules it is.
 */
function resolveStudent(
  input: EnrolRequestInput,
  program: { id: string; code: string; name: string },
  stamp: string,
): { ok: true; student: Student } | Extract<EnrolOutcome, { ok: false }> {
  if (input.source === "new-student") {
    if (emailTaken(input.student.email)) {
      return {
        ok: false,
        status: 422,
        message: "Some fields need attention",
        fieldErrors: {
          "student.email": "A student with that email already exists - enrol the existing profile",
        },
      };
    }
    return { ok: true, student: createStudent(input.student, program.name, stamp) };
  }

  const existing = getStudent(input.studentId);
  if (!existing) {
    return { ok: false, status: 404, message: "That student does not exist" };
  }

  // One student belongs to one programme, so enrolling them onto another is a
  // contradiction with their own profile rather than a second enrolment.
  // Programme name is the join the seed itself uses; the ids never meet.
  if (existing.academic.program !== program.name) {
    return {
      ok: false,
      status: 422,
      message: "Some fields need attention",
      fieldErrors: {
        studentId: `${existing.personal.firstName} ${existing.personal.lastName} is on ${existing.academic.program}, not ${program.name}`,
      },
    };
  }

  return { ok: true, student: existing };
}

/**
 * One student into one programme term, by any of the three paths.
 *
 * The order of the checks is deliberate: the term first, because a bad term id
 * makes every later message meaningless; then the student; then the two rules
 * about what a student may hold at once. A failure names the field a form can
 * attach it to even when the status is 409, because `lib/api/client.ts` reads
 * `fieldErrors` off any response and keeps only its own vetted prose.
 *
 * Both conflict rules are 409 rather than a field error, which is a departure
 * from `createCourse` - a duplicate course code comes back as 422 on the Code
 * field. The difference is that a code is a value the user can edit until it is
 * free, while "this student already holds a place" is a fact about the world
 * that no amount of retyping changes.
 */
export function enrolStudent(input: EnrolRequestInput): EnrolOutcome {
  const term = programTermTable.find((row) => row.id === input.programTermId);
  if (!term) {
    return { ok: false, status: 404, message: "That programme term does not exist" };
  }

  const program = programTable.find((row) => row.id === term.programId);
  if (!program) {
    // A term whose programme is missing is a broken join, not a user error.
    return { ok: false, status: 404, message: "That programme term does not exist" };
  }

  if (term.status !== "open") {
    return {
      ok: false,
      status: 422,
      message: "Some fields need attention",
      fieldErrors: {
        programTermId: `${program.code} ${term.semesterCode} is ${term.status}, so it is not taking enrolments`,
      },
    };
  }

  const stamp = seedNow();

  const resolved = resolveStudent(input, program, stamp);
  if (!resolved.ok) return resolved;
  const student = resolved.student;

  const conflict = findEnrolmentConflict(programEnrollmentTable, student.id, term);
  if (conflict) {
    const message =
      conflict.kind === "already-enrolled"
        ? `That student already holds a place in ${conflict.semesterCode}`
        : "That student is enrolled on another programme";
    return { ok: false, status: 409, message, fieldErrors: { studentId: message } };
  }

  const draft = expandCurriculum({
    term,
    studentId: student.id,
    source: input.source,
    stamp,
  });

  const coursesById = new Map(courseTable.map((course) => [course.id, course]));
  const summary = toSummary(student);
  const enrollments: EnrollmentListItem[] = [];
  for (const row of draft.enrollments) {
    const course = coursesById.get(row.courseId);
    // Same posture as the list: a row whose course is missing is a broken join,
    // not a row to render with a blank where the code should be.
    if (!course) continue;
    enrollments.push({
      id: row.id,
      student: summary,
      courseId: course.id,
      courseCode: course.code,
      semesterCode: row.semesterCode,
      status: row.status,
    });
  }

  return {
    ok: true,
    data: {
      student: summary,
      programTermId: term.id,
      programId: program.id,
      programName: program.name,
      semesterCode: term.semesterCode,
      source: input.source,
      enrollments,
    },
  };
}

/**
 * The roster of one programme term, one row per student.
 *
 * `programRoster` in the programme service answers the same question for the
 * money screen; this one adds what the enrolment screen needs and nothing the
 * money screen does - how much of the curriculum each student is actually
 * carrying. A package is billed whole (13b), so a head count alone hides the
 * student who dropped three of four courses.
 *
 * Returns undefined for an unknown term, so the page can 404 rather than
 * render an empty roster that looks like a term with no students.
 */
export function programTermRoster(programTermId: string): TermRosterRow[] | undefined {
  const term = programTermTable.find((row) => row.id === programTermId);
  if (!term) return undefined;

  const studentsById = new Map(studentTable.map((student) => [student.id, student]));
  const curriculum = new Set(term.courseIds);

  return programEnrollmentTable
    .filter(
      (row) => row.programId === term.programId && row.semesterCode === term.semesterCode,
    )
    .flatMap((membership) => {
      const student = studentsById.get(membership.studentId);
      if (!student) return [];

      const courses = enrollmentTable.filter(
        (row) =>
          row.studentId === membership.studentId &&
          row.semesterCode === term.semesterCode &&
          curriculum.has(row.courseId),
      );
      const unfinished = courses.filter(
        (row) => row.status === "dropped" || row.status === "cancelled",
      );

      return [
        {
          enrollmentId: membership.id,
          student: toSummary(student),
          status: membership.status,
          enrolledAt: membership.enrolledAt,
          courseCount: courses.length - unfinished.length,
          unfinishedCount: unfinished.length,
        },
      ];
    })
    .sort((a, b) => a.student.studentId.localeCompare(b.student.studentId));
}

/**
 * Withdraw a student from a programme term (direction.md 8, decided
 * 2026-09-16).
 *
 * **A status, not a removal.** Section 8 makes the lifecycle explicit and
 * `withdrawn` is its end state: the person was here and left, which is a fact
 * about the term rather than an absence. Deleting the row instead would take
 * the invoice`s counterparty with it and make a closed term`s head count
 * change retrospectively.
 *
 * The course enrollments go with it, as `cancelled` rather than `dropped`:
 * dropping is a decision about one course taken while the programme continues,
 * and this is the programme ending. The distinction is not cosmetic - a
 * cancelled course credits the whole line on the invoice and a dropped one
 * credits half (13b).
 */
export function withdrawFromTerm(
  programEnrollmentId: string,
): { membership: ProgramEnrollment; cancelled: number } | undefined {
  const membership = programEnrollmentTable.find((row) => row.id === programEnrollmentId);
  if (!membership) return undefined;

  const term = programTermTable.find(
    (row) =>
      row.programId === membership.programId && row.semesterCode === membership.semesterCode,
  );
  const curriculum = new Set(term?.courseIds ?? []);
  const stamp = seedNow();

  const cancelled = enrollmentTable.filter(
    (row) =>
      row.studentId === membership.studentId &&
      row.semesterCode === membership.semesterCode &&
      curriculum.has(row.courseId) &&
      row.status !== "cancelled" &&
      row.status !== "completed",
  ).length;

  return {
    membership: { ...membership, status: "withdrawn", updatedAt: stamp },
    cancelled,
  };
}
