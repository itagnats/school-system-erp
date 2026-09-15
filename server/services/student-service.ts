import "server-only";

import { enrollmentTable, programEnrollmentTable, studentTable } from "@/server/repositories";
import { matchesSearch, paginate, sortRows, type ListQueryInput } from "@/server/query";
import { demoStudentSerial } from "@/lib/calculations/enrollment";
import type { NewStudentInput } from "@/lib/api/contracts";
import type { PaginatedResult, Student, StudentSummary } from "@/types";

/**
 * Student reads (direction.md §9).
 *
 * The list returns `StudentSummary`, not `Student`. A table has no use for the
 * projects, clubs and achievements on a full profile, and sending them would
 * put a reader of the network tab through several kilobytes of unused nesting
 * per row.
 */

export interface StudentQuery extends ListQueryInput {
  program?: string;
  yearLevel?: string;
  /**
   * Narrow to students who held a place in one semester.
   *
   * This is what makes the "previous course" enrolment path (direction.md 7)
   * a different question from the "existing profile" one: the same picker,
   * asked for the people who were here last term rather than everyone.
   * Withdrawn memberships do not count - they are the record of someone who
   * left, not of someone who was on the roster.
   */
  semester?: string;
}

/** Student ids holding a live programme membership in one semester. */
function studentsInSemester(semesterCode: string): Set<string> {
  return new Set(
    programEnrollmentTable
      .filter((row) => row.semesterCode === semesterCode && row.status !== "withdrawn")
      .map((row) => row.studentId),
  );
}

export function toSummary(student: Student): StudentSummary {
  return {
    id: student.id,
    studentId: student.studentId,
    fullName: `${student.personal.firstName} ${student.personal.lastName}`,
    program: student.academic.program,
    major: student.academic.major,
    yearLevel: student.academic.yearLevel,
    avatarUrl: student.personal.avatarUrl,
  };
}

const SORTABLE: Record<string, (row: StudentSummary) => string | number> = {
  studentId: (s) => s.studentId,
  fullName: (s) => s.fullName,
  program: (s) => s.program,
  major: (s) => s.major,
  yearLevel: (s) => s.yearLevel,
};

export function listStudents(query: StudentQuery): PaginatedResult<StudentSummary> {
  const inSemester = query.semester ? studentsInSemester(query.semester) : undefined;

  const filtered = studentTable.filter((student) => {
    if (inSemester && !inSemester.has(student.id)) return false;
    if (query.program && student.academic.program !== query.program) return false;
    if (query.yearLevel && String(student.academic.yearLevel) !== query.yearLevel) {
      return false;
    }
    return matchesSearch(
      query.search,
      student.studentId,
      student.personal.firstName,
      student.personal.lastName,
      student.personal.email,
      student.academic.major,
    );
  });

  const summaries = filtered.map(toSummary);
  const sorted = sortRows(summaries, SORTABLE, query.sort, query.direction, "studentId");
  return paginate(sorted, query.page, query.pageSize);
}

export function getStudent(studentId: string): Student | undefined {
  return studentTable.find(
    (student) => student.id === studentId || student.studentId === studentId,
  );
}

/** Enrollment history for a profile page, newest semester first. */
export function studentEnrollments(studentId: string) {
  const student = getStudent(studentId);
  if (!student) return [];
  return enrollmentTable
    .filter((enrollment) => enrollment.studentId === student.id)
    .sort((a, b) => b.semesterCode.localeCompare(a.semesterCode));
}

export function programOptions(): string[] {
  return [...new Set(studentTable.map((s) => s.academic.program))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/**
 * A profile created on the way into an enrolment (direction.md 7).
 *
 * Six fields, because the spec asks for the minimum necessary for the initial
 * enrolment and everything else on a profile is the job of profile editing.
 * The empty arrays are not placeholders for missing data: a student who has
 * just been created genuinely has no projects, clubs or achievements yet, and
 * the profile screen already renders that as an empty section.
 *
 * Programme is taken from the term rather than typed, so the profile and the
 * membership created beside it cannot disagree - which is the join the seed
 * relies on to answer "who is under this programme".
 */
export function createStudent(
  input: NewStudentInput,
  programName: string,
  stamp: string,
): Student {
  // Step past a suffix already in use. Two different emails can hash to the
  // same three digits; the loop makes that a non-event rather than a duplicate
  // id, and it terminates because the table is finite and fixed.
  let attempt = 0;
  let serial = demoStudentSerial(input.email);
  while (studentTable.some((s) => s.studentId === serial)) {
    attempt += 1;
    serial = demoStudentSerial(input.email, attempt);
  }

  return {
    id: `stu-${serial.toLowerCase()}`,
    studentId: serial,
    personal: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
    },
    academic: {
      program: programName,
      major: input.major,
      yearLevel: input.yearLevel,
      interests: [],
      skills: [],
      certifications: [],
    },
    experience: { projects: [], clubs: [], activities: [], achievements: [] },
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/**
 * An email identifies a person to the institution, so a second profile
 * carrying one is a duplicate rather than a new student - exactly the thing
 * the "reuse the existing profile" instruction in direction.md 7 is guarding
 * against. Compared case-insensitively, because nobody thinks of an address as
 * case-sensitive even where the standard allows it.
 */
export function emailTaken(email: string): boolean {
  const normalised = email.trim().toLowerCase();
  return studentTable.some((student) => student.personal.email.toLowerCase() === normalised);
}
