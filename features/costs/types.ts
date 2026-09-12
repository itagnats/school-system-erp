import type {
  CatalogueComparison,
  CostBreakdown,
  CostSheet,
  CostSheetStatus,
  ListQuery,
  SemesterCode,
} from "@/types";

export interface CostQueryParams extends ListQuery {
  courseId?: string;
  semester?: SemesterCode;
  status?: CostSheetStatus;
}

/**
 * The derived row a cost table shows.
 *
 * The nested groups stay on the detail page: a table needs the total and the
 * per-student figure, and sending four levels of nesting so the browser can add
 * them up would move business math into the client.
 */
export interface CostSheetRow {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  semesterCode: string;
  status: CostSheetStatus;
  currency: string;
  studentCount: number;
  totalCost: number;
  costPerStudent: number | null;
  updatedAt: string;
}

/** What the detail endpoint returns: the sheet, its course, and the working. */
export interface CostSheetDetailResponse {
  sheet: CostSheet;
  courseCode: string;
  courseName: string;
  breakdown: CostBreakdown;
  /** How each line now compares with the catalogue it was copied from (§12a). */
  drift: CatalogueComparison[];
}
