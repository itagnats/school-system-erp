import type {
  CatalogueComparison,
  CourseCostBreakdown,
  CourseCostSheet,
  CostSheetStatus,
  ProgramCostBreakdown,
  ProgramCostSheet,
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
  directTotal: number;
  /** Share of its programme's indirect pool. Zero when it has no programme. */
  indirectShare: number;
  totalCost: number;
  costPerStudent: number | null;
  programTermId: string | null;
  updatedAt: string;
}

/** What the detail endpoint returns: the sheet, its course, and the working. */
export interface CostSheetDetailResponse {
  sheet: CourseCostSheet;
  courseCode: string;
  courseName: string;
  breakdown: CourseCostBreakdown;
  /** The programme term this course is costed inside, if any. */
  programTermId: string | null;
  programCostSheetId: string | null;
  /** The programme's pool and markup, so the share can be explained on screen. */
  indirectTotal: number;
  markupPercent: number;
  /** How each line now compares with the catalogue it was copied from (§12a). */
  drift: CatalogueComparison[];
}

/**
 * What the programme cost endpoint returns (direction.md §11, §13).
 *
 * Addressed by the programme term rather than by the sheet's own id: there is
 * exactly one sheet per term, so a second identifier would only be a second
 * thing to look up.
 */
export interface ProgramCostSheetDetailResponse {
  sheet: ProgramCostSheet;
  programTermId: string;
  programCode: string;
  programName: string;
  semesterCode: string;
  packagePrice: number;
  breakdown: ProgramCostBreakdown;
  /** How each line now compares with the catalogue it was copied from (§12a). */
  drift: CatalogueComparison[];
}

/** Filters the programme cost list accepts. */
export interface ProgramCostQueryParams extends ListQuery {
  programId?: string;
  semester?: SemesterCode;
  status?: CostSheetStatus;
}

/**
 * The derived row the programme cost table shows.
 *
 * The package price rides along because the comparison is the reason the list
 * exists: a costing is only interesting against what the programme charges.
 */
export interface ProgramCostRow {
  id: string;
  programTermId: string;
  programId: string;
  programCode: string;
  programName: string;
  semesterCode: string;
  status: CostSheetStatus;
  currency: string;
  courseCount: number;
  studentCount: number;
  directTotal: number;
  indirectTotal: number;
  totalCost: number;
  costPerStudent: number | null;
  preferredPrice: number | null;
  packagePrice: number;
  missingCostSheets: number;
  updatedAt: string;
}
