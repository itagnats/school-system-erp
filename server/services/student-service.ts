import "server-only";

import {
  enrollmentTable,
  invoiceTable,
  programEnrollmentTable,
  programTable,
  programTermTable,
  semesterTable,
  studentTable,
} from "@/server/repositories";
import { matchesSearch, paginate, sortRows, type ListQueryInput } from "@/server/query";
import { demoStudentSerial } from "@/lib/calculations/enrollment";
import type { NewStudentInput, StudentUpdateInput } from "@/lib/api/contracts";
import type {
  PaginatedResult,
  Student,
  StudentProgramTerm,
  StudentSummary,
} from "@/types";
import type { WriteResult } from "./course-service";
import type { RemovalResult } from "@/server/http";

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
   * This is what makes the "previous course" enrollment path (direction.md 7)
   * a different question from the "existing profile" one: the same picker,
   * asked for the people who were here last term rather than everyone.
   * Withdrawn memberships do not count - they are the record of someone who
   * left, not of someone who was on the roster.
   */
  semester?: string;
}

/** Student ids holding a live program membership in one semester. */
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
 * A profile created on the way into an enrollment (direction.md 7).
 *
 * Six fields, because the spec asks for the minimum necessary for the initial
 * enrollment and everything else on a profile is the job of profile editing.
 * The empty arrays are not placeholders for missing data: a student who has
 * just been created genuinely has no projects, clubs or achievements yet, and
 * the profile screen already renders that as an empty section.
 *
 * Program is taken from the term rather than typed, so the profile and the
 * membership created beside it cannot disagree - which is the join the seed
 * relies on to answer "who is under this program".
 */
export function createStudent(
  input: NewStudentInput,
  program: { id: string; name: string },
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
      programId: program.id,
      program: program.name,
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
export function emailTaken(email: string, exceptId?: string): boolean {
  const normalized = email.trim().toLowerCase();
  return studentTable.some(
    (student) =>
      student.id !== exceptId && student.personal.email.toLowerCase() === normalized,
  );
}

/**
 * Profile editing (direction.md 10).
 *
 * One section at a time, because that is how the screen is shaped: a set of
 * focused forms rather than one giant one. The request carries a whole section,
 * so this replaces rather than merges - there is no field whose absence has to
 * be interpreted.
 *
 * Nothing is stored, the same as every other write here. What is real is the
 * validation, the status code and the record as it would have been saved.
 */
export function updateStudent(
  studentId: string,
  input: StudentUpdateInput,
): WriteResult<Student> | undefined {
  const student = getStudent(studentId);
  if (!student) return undefined;

  const stamp = studentStamp();

  if (input.section === "personal") {
    // An email identifies a person to the institution, so two profiles must not
    // carry one. Checked against everybody except this student, or saving a
    // profile without touching its email would reject itself.
    if (emailTaken(input.personal.email, student.id)) {
      return {
        ok: false,
        fieldErrors: { email: "Another student already uses that email address" },
      };
    }

    return {
      ok: true,
      data: {
        ...student,
        // The section arrives whole, avatar included, so this replaces rather
        // than merges. Clearing the picture is an absent `avatarUrl`, which is
        // the same shape as never having had one.
        personal: input.personal,
        updatedAt: stamp,
      },
    };
  }

  if (input.section === "academic") {
    return {
      ok: true,
      data: {
        ...student,
        academic: {
          ...input.academic,
          // Program is not editable here. A student belongs to one program
          // and that is decided by enrollment (direction.md 7a), so letting a
          // profile form change it would put the profile and the membership
          // into a disagreement the seed itself relies on not existing.
          //
          // Both halves are carried over, and the compiler now insists: the
          // section schema has neither field, so omitting `programId` is the
          // error that stopped this edit. Before `AUD-021` there was only the
          // name to preserve, and a forgotten line would have compiled.
          programId: student.academic.programId,
          program: student.academic.program,
        },
        updatedAt: stamp,
      },
    };
  }

  const contact = input.emergencyContact;
  const cleared = !contact.name && !contact.relationship && !contact.phone;
  return {
    ok: true,
    data: {
      ...student,
      emergencyContact: cleared ? undefined : contact,
      updatedAt: stamp,
    },
  };
}

/**
 * The most recent timestamp in the dataset, standing in for the present.
 *
 * Reading the clock would make two renders of the same page disagree, and this
 * service is reachable from a server component.
 */
function studentStamp(): string {
  return studentTable.reduce(
    (latest, student) => (student.updatedAt > latest ? student.updatedAt : latest),
    studentTable[0]?.updatedAt ?? "2026-01-05T00:00:00.000Z",
  );
}

/**
 * Enrollment history for the profile, newest first (direction.md 9).
 *
 * Program grain rather than course grain: a student joins a program term
 * and the courses follow from its curriculum, so "what have they been enrolled
 * in" is answered once per term rather than once per course. The course-level
 * history is still available on the enrollment screens.
 *
 * A membership whose program or semester is missing is a broken join and is
 * dropped rather than rendered with blanks, the same posture the roster takes.
 */
export function studentProgramHistory(studentId: string): StudentProgramTerm[] {
  const student = getStudent(studentId);
  if (!student) return [];

  const programsById = new Map(programTable.map((program) => [program.id, program]));
  const semestersByCode = new Map(semesterTable.map((semester) => [semester.code, semester]));
  const termIdByKey = new Map(
    programTermTable.map((term) => [`${term.programId}|${term.semesterCode}`, term.id]),
  );

  return programEnrollmentTable
    .filter((membership) => membership.studentId === student.id)
    .flatMap((membership) => {
      const program = programsById.get(membership.programId);
      const semester = semestersByCode.get(membership.semesterCode);
      if (!program || !semester) return [];

      return [
        {
          programEnrollmentId: membership.id,
          programTermId: termIdByKey.get(`${membership.programId}|${membership.semesterCode}`),
          programCode: program.code,
          programName: program.name,
          semesterCode: membership.semesterCode,
          status: membership.status,
          startDate: semester.startDate,
          endDate: semester.endDate,
        },
      ];
    })
    .sort((a, b) => b.semesterCode.localeCompare(a.semesterCode));
}

/**
 * Remove a student (direction.md 8, decided 2026-09-16).
 *
 * Refused while anything still points at them. A profile is not the record of
 * a person so much as the thing every enrollment, evaluation and invoice hangs
 * off, and deleting it would leave rows referring to somebody who is not there
 * - which is the one outcome a demo of referential care must not show.
 *
 * A **withdrawn** membership does not block. It is the record of someone who
 * left, and if that is all they have, nothing depends on the profile any more.
 */
export function deleteStudent(studentId: string): RemovalResult | undefined {
  const student = getStudent(studentId);
  if (!student) return undefined;

  const memberships = programEnrollmentTable.filter(
    (row) => row.studentId === student.id && row.status !== "withdrawn",
  ).length;
  const courses = enrollmentTable.filter(
    (row) =>
      row.studentId === student.id && row.status !== "dropped" && row.status !== "cancelled",
  ).length;
  const invoices = invoiceTable.filter((row) => row.studentId === student.id).length;

  const holds: string[] = [];
  if (memberships > 0) holds.push(`${memberships} program ${plural(memberships, "enrollment")}`);
  if (courses > 0) holds.push(`${courses} course ${plural(courses, "enrollment")}`);
  if (invoices > 0) holds.push(`${invoices} ${plural(invoices, "invoice")}`);

  if (holds.length > 0) {
    return {
      ok: false,
      reason: `${sentenceList(holds)} still point at this student. Withdraw them from their program first.`,
    };
  }

  return { ok: true };
}

function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}

/** "a, b and c" - the reason is read by a person, not parsed. */
function sentenceList(parts: string[]): string {
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
