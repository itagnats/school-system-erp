import type {
  CatalogComparison,
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
  /** Share of its program's indirect pool. Zero when it has no program. */
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
  /** The program term this course is costed inside, if any. */
  programTermId: string | null;
  programCostSheetId: string | null;
  /** The program's pool and markup, so the share can be explained on screen. */
  indirectTotal: number;
  markupPercent: number;
  /** How each line now compares with the catalog it was copied from (§12a). */
  drift: CatalogComparison[];
}

/**
 * What the program cost endpoint returns (direction.md §11, §13).
 *
 * Addressed by the program term rather than by the sheet's own id: there is
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
  /** How each line now compares with the catalog it was copied from (§12a). */
  drift: CatalogComparison[];
}

/** Filters the program cost list accepts. */
export interface ProgramCostQueryParams extends ListQuery {
  programId?: string;
  semester?: SemesterCode;
  status?: CostSheetStatus;
}

/**
 * The derived row the program cost table shows.
 *
 * The package price rides along because the comparison is the reason the list
 * exists: a costing is only interesting against what the program charges.
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
  /**
   * The P&L, which used to live on the Curriculum list (§13a, revised
   * 2026-09-20). Academic screens describe the offer; this is where it is
   * judged.
   *
   * `attributedCost` rather than `totalCost` is what `netProfit` is measured
   * against, and the two are different numbers on purpose — see the note on
   * `ProgramCostProfit` in the cost service.
   */
  listRevenue: number;
  revenue: number;
  collected: number;
  outstanding: number;
  attributedCost: number;
  netProfit: number;
  marginPercent: number | null;
}
