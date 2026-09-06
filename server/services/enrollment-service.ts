import "server-only";

import {
  courseTable,
  enrollmentTable,
  evaluationGroupTable,
  programEnrollmentTable,
  studentTable,
} from "@/server/repositories";
import { matchesSearch, paginate, sortRows, type ListQueryInput } from "@/server/query";
import { toSummary } from "./student-service";
import { evaluationGroupName } from "@/types";
import type { EnrollmentListItem, PaginatedResult } from "@/types";

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
