import "server-only";

import { calculateCostBreakdown } from "@/lib/calculations";
import { costSheetTable, courseTable } from "@/server/repositories";
import { matchesSearch, paginate, sortRows, type ListQueryInput } from "@/server/query";
import type { CostBreakdown, CostSheet, PaginatedResult } from "@/types";

/**
 * Cost sheet reads (direction.md §11-13).
 *
 * The list row carries the derived totals rather than the nested groups. A
 * table needs the total and the per-student figure; sending four levels of
 * nesting so the browser can add them up would move business math into the
 * client, which is exactly what the calculation layer exists to prevent.
 */

export interface CostQuery extends ListQueryInput {
  courseId?: string;
  semester?: string;
  status?: string;
}

export interface CostSheetListItem {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  semesterCode: string;
  status: CostSheet["status"];
  currency: string;
  studentCount: number;
  totalCost: number;
  costPerStudent: number | null;
  updatedAt: string;
}

export interface CostSheetDetail {
  sheet: CostSheet;
  courseCode: string;
  courseName: string;
  breakdown: CostBreakdown;
}

const SORTABLE: Record<string, (row: CostSheetListItem) => string | number> = {
  courseCode: (s) => s.courseCode,
  semesterCode: (s) => s.semesterCode,
  status: (s) => s.status,
  studentCount: (s) => s.studentCount,
  totalCost: (s) => s.totalCost,
  costPerStudent: (s) => s.costPerStudent ?? -1,
  updatedAt: (s) => s.updatedAt,
};

function buildListItems(): CostSheetListItem[] {
  const coursesById = new Map(courseTable.map((c) => [c.id, c]));

  const items: CostSheetListItem[] = [];
  for (const sheet of costSheetTable) {
    const course = coursesById.get(sheet.courseId);
    if (!course) continue;

    const breakdown = calculateCostBreakdown(sheet);
    items.push({
      id: sheet.id,
      courseId: sheet.courseId,
      courseCode: course.code,
      courseName: course.name,
      semesterCode: sheet.semesterCode,
      status: sheet.status,
      currency: sheet.currency,
      studentCount: breakdown.studentCount,
      totalCost: breakdown.totalCost,
      costPerStudent: breakdown.costPerStudent,
      updatedAt: sheet.updatedAt,
    });
  }
  return items;
}

export function listCostSheets(query: CostQuery): PaginatedResult<CostSheetListItem> {
  const filtered = buildListItems().filter((item) => {
    if (query.courseId && item.courseId !== query.courseId) return false;
    if (query.semester && item.semesterCode !== query.semester) return false;
    if (query.status && item.status !== query.status) return false;
    return matchesSearch(query.search, item.courseCode, item.courseName, item.semesterCode);
  });

  const sorted = sortRows(filtered, SORTABLE, query.sort, query.direction, "courseCode");
  return paginate(sorted, query.page, query.pageSize);
}

export function getCostSheet(costSheetId: string): CostSheetDetail | undefined {
  const sheet = costSheetTable.find((s) => s.id === costSheetId);
  if (!sheet) return undefined;

  const course = courseTable.find((c) => c.id === sheet.courseId);
  if (!course) return undefined;

  return {
    sheet,
    courseCode: course.code,
    courseName: course.name,
    breakdown: calculateCostBreakdown(sheet),
  };
}

/** Cost sheets recorded against one course, for the course detail page. */
export function costSheetsForCourse(courseId: string): CostSheetListItem[] {
  return buildListItems().filter((item) => item.courseId === courseId);
}
