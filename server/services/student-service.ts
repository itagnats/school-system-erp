import "server-only";

import { enrollmentTable, studentTable } from "@/server/repositories";
import { matchesSearch, paginate, sortRows, type ListQueryInput } from "@/server/query";
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
  const filtered = studentTable.filter((student) => {
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
