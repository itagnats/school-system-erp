import "server-only";

import {
  courseTable,
  enrollmentTable,
  studentTable,
} from "@/server/repositories";
import { matchesSearch, paginate, sortRows, type ListQueryInput } from "@/server/query";
import { toSummary } from "./student-service";
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
}

const GROUP_NAMES: Record<string, string> = {
  "grp-a": "Evaluation Group A",
  "grp-b": "Evaluation Group B",
  "grp-c": "Evaluation Group C",
  "grp-d": "Evaluation Group D",
};

const SORTABLE: Record<string, (row: EnrollmentListItem) => string | number> = {
  student: (e) => e.student.fullName,
  studentId: (e) => e.student.studentId,
  courseCode: (e) => e.courseCode,
  semesterCode: (e) => e.semesterCode,
  status: (e) => e.status,
  group: (e) => e.evaluationGroupName ?? "",
};

function buildListItems(): EnrollmentListItem[] {
  const studentsById = new Map(studentTable.map((s) => [s.id, s]));
  const coursesById = new Map(courseTable.map((c) => [c.id, c]));

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
        ? GROUP_NAMES[enrollment.evaluationGroupId]
        : undefined,
    });
  }
  return items;
}

export function listEnrollments(query: EnrollmentQuery): PaginatedResult<EnrollmentListItem> {
  const filtered = buildListItems().filter((item) => {
    if (query.courseId && item.courseId !== query.courseId) return false;
    if (query.semester && item.semesterCode !== query.semester) return false;
    if (query.status && item.status !== query.status) return false;
    if (query.evaluationGroupId) {
      const expected = GROUP_NAMES[query.evaluationGroupId];
      if (item.evaluationGroupName !== expected) return false;
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
