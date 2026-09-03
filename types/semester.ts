import type { SemesterCode } from "./common";

export type SemesterStatus = "upcoming" | "active" | "closed";

/**
 * A semester is the context for enrollment, grouping, evaluation, ranking,
 * reporting and cost management (direction.md §5).
 *
 * The code is `YYYYNN`: `202602` is the second term of academic year 2026.
 */
export interface Semester {
  id: string;
  code: SemesterCode;
  /** Display name, e.g. `Second Semester 2026`. */
  name: string;
  academicYear: number;
  /** 1-based term number within the academic year. */
  term: number;
  /** ISO date. */
  startDate: string;
  /** ISO date. */
  endDate: string;
  status: SemesterStatus;
}

export interface SemesterListFilters {
  search?: string;
  status?: SemesterStatus | "all";
  academicYear?: number | "all";
}
